// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AgentVault
 * @notice On-chain programmable USDC vault for autonomous AI agents on the Arc blockchain.
 * @dev Enforces critical financial limits, daily accounting windows, recipient allowlists,
 *      and emergency controls. Serves as the on-chain enforcement layer following off-chain
 *      authorization by the Rust Policy Engine.
 *
 * CRITICAL INVARIANTS:
 * 1. Zero Trust: The contract validates all financial limits, daily allowances, and recipient
 *    rules directly on-chain regardless of off-chain recommendations.
 * 2. Checks-Effects-Interactions: State variables are updated prior to any external token call.
 * 3. Integer Base Units: All monetary values are integer base units (6 decimals for USDC).
 * 4. Blocked Precedence: Blocked recipients can NEVER receive funds under any condition.
 * 5. Reentrancy Protection: All value-transferring entrypoints are guarded by ReentrancyGuard.
 */
contract AgentVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Custom Errors ---
    error PolicyDisabled();
    error InvalidAmount();
    error TransactionLimitExceeded(uint256 amount, uint256 limit);
    error DailyLimitExceeded(uint256 attempted, uint256 limit);
    error DailyTransactionLimitExceeded(uint256 count, uint256 maxCount);
    error RecipientIsBlocked(address recipient);
    error RecipientNotAllowed(address recipient);
    error InsufficientBalance(uint256 required, uint256 available);
    error ZeroAddress();
    error InvalidConfiguration(string reason);

    // --- Structs ---
    struct Policy {
        bool enabled;
        uint256 perTransactionLimit;
        uint256 dailyLimit;
        uint256 dailySpent;
        uint256 dailyTransactionCount;
        uint256 maxTransactionsPerDay;
        uint256 currentDay;
    }

    // --- State Variables ---
    string public agentId;
    IERC20 public immutable usdc;
    Policy public policy;

    bool public allowlistEnabled;
    mapping(address => bool) public allowedRecipients;
    mapping(address => bool) public blockedRecipients;

    // --- Events ---
    event AgentVaultInitialized(address indexed owner, address indexed usdc, string agentId);
    event PolicyUpdated(bool enabled, uint256 perTransactionLimit, uint256 dailyLimit, uint256 maxTransactionsPerDay);
    event RecipientAllowed(address indexed recipient, bool allowed);
    event RecipientBlocked(address indexed recipient, bool blocked);
    event AllowlistToggled(bool enabled);
    event PaymentExecuted(address indexed recipient, uint256 amount, bytes32 indexed purpose, uint256 indexed day);
    event Withdrawal(address indexed recipient, uint256 amount);
    event VaultPaused(address indexed account);
    event VaultUnpaused(address indexed account);

    /**
     * @notice Construct a new AgentVault.
     * @param _usdc Address of the ERC-20 USDC token contract on Arc network.
     * @param _agentId Identifier string for the autonomous agent.
     * @param _initialOwner Address of the vault owner/controller.
     */
    constructor(address _usdc, string memory _agentId, address _initialOwner) Ownable(_initialOwner) {
        if (_usdc == address(0) || _initialOwner == address(0)) revert ZeroAddress();
        if (bytes(_agentId).length == 0) revert InvalidConfiguration("agentId cannot be empty");

        usdc = IERC20(_usdc);
        agentId = _agentId;

        // Initialize policy in disabled state with current day
        policy.currentDay = block.timestamp / 1 days;

        emit AgentVaultInitialized(_initialOwner, _usdc, _agentId);
    }

    // =========================================================================
    // Payment Execution
    // =========================================================================

    /**
     * @notice Execute an authorized payment to a recipient service provider.
     * @dev Enforces all policy limits and updates accounting state before transferring tokens.
     * @param recipient Target address receiving USDC.
     * @param amount Payment amount in USDC base units (6 decimals).
     * @param purpose Audit identifier / hash representing payment intent purpose.
     */
    function executePayment(address recipient, uint256 amount, bytes32 purpose)
        external
        nonReentrant
        onlyOwner
        whenNotPaused
    {
        // 1. Validate policy state
        if (!policy.enabled) revert PolicyDisabled();

        // 2. Validate recipient address
        if (recipient == address(0)) revert ZeroAddress();

        // 3. Validate positive amount
        if (amount == 0) revert InvalidAmount();

        // 4. Blocked recipients take strict precedence
        if (blockedRecipients[recipient]) revert RecipientIsBlocked(recipient);

        // 5. Allowlist check if enabled
        if (allowlistEnabled && !allowedRecipients[recipient]) {
            revert RecipientNotAllowed(recipient);
        }

        // 6. Per-transaction limit check
        if (amount > policy.perTransactionLimit) {
            revert TransactionLimitExceeded(amount, policy.perTransactionLimit);
        }

        // 7. Refresh daily window accounting if day has rolled over
        _refreshDailyWindow();

        // 8. Daily transaction count limit check
        if (policy.dailyTransactionCount >= policy.maxTransactionsPerDay) {
            revert DailyTransactionLimitExceeded(policy.dailyTransactionCount, policy.maxTransactionsPerDay);
        }

        // 9. Daily spending budget limit check (safe checked arithmetic)
        uint256 newDailySpent = policy.dailySpent + amount;
        if (newDailySpent > policy.dailyLimit) {
            revert DailyLimitExceeded(newDailySpent, policy.dailyLimit);
        }

        // 10. Balance check
        uint256 vaultBalance = usdc.balanceOf(address(this));
        if (vaultBalance < amount) {
            revert InsufficientBalance(amount, vaultBalance);
        }

        // 11. State update (Checks-Effects)
        policy.dailySpent = newDailySpent;
        policy.dailyTransactionCount += 1;

        // 12. External Token Transfer (Interactions)
        usdc.safeTransfer(recipient, amount);

        // 13. Audit Log Event
        emit PaymentExecuted(recipient, amount, purpose, policy.currentDay);
    }

    // =========================================================================
    // Administrative Operations
    // =========================================================================

    /**
     * @notice Withdraw funds from the vault to a designated recipient.
     * @dev Administrative emergency or treasury operation. NOT subject to agent spending limits.
     *      Can be executed even when paused to enable emergency fund extraction.
     * @param recipient Target address receiving the withdrawn funds.
     * @param amount Amount in USDC base units to withdraw.
     */
    function withdraw(address recipient, uint256 amount) external nonReentrant onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 vaultBalance = usdc.balanceOf(address(this));
        if (vaultBalance < amount) {
            revert InsufficientBalance(amount, vaultBalance);
        }

        usdc.safeTransfer(recipient, amount);
        emit Withdrawal(recipient, amount);
    }

    /**
     * @notice Configure or update the spending policy for this vault.
     * @param enabled Whether policy allows payments.
     * @param perTransactionLimit Maximum USDC base units per single payment.
     * @param dailyLimit Maximum cumulative USDC base units per UTC calendar day.
     * @param maxTransactionsPerDay Maximum number of payment transactions allowed per day.
     */
    function setPolicy(bool enabled, uint256 perTransactionLimit, uint256 dailyLimit, uint256 maxTransactionsPerDay)
        external
        onlyOwner
    {
        if (perTransactionLimit > dailyLimit) {
            revert InvalidConfiguration("per-tx limit exceeds daily limit");
        }
        if (enabled && maxTransactionsPerDay == 0) {
            revert InvalidConfiguration("max tx per day cannot be zero when enabled");
        }

        _refreshDailyWindow();

        policy.enabled = enabled;
        policy.perTransactionLimit = perTransactionLimit;
        policy.dailyLimit = dailyLimit;
        policy.maxTransactionsPerDay = maxTransactionsPerDay;

        emit PolicyUpdated(enabled, perTransactionLimit, dailyLimit, maxTransactionsPerDay);
    }

    /**
     * @notice Configure whether an address is allowed to receive payments.
     * @dev Reverts if the recipient is currently blocked to prevent contradictory state.
     * @param recipient Target address.
     * @param allowed True to allow, false to remove.
     */
    function setRecipientAllowed(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (allowed && blockedRecipients[recipient]) {
            revert RecipientIsBlocked(recipient);
        }

        allowedRecipients[recipient] = allowed;
        emit RecipientAllowed(recipient, allowed);
    }

    /**
     * @notice Configure whether an address is blocked from receiving payments.
     * @dev If blocking an address, automatically clears allowed status to ensure consistency.
     * @param recipient Target address.
     * @param blocked True to block, false to unblock.
     */
    function setRecipientBlocked(address recipient, bool blocked) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();

        if (blocked) {
            allowedRecipients[recipient] = false;
        }

        blockedRecipients[recipient] = blocked;
        emit RecipientBlocked(recipient, blocked);
    }

    /**
     * @notice Toggle recipient allowlist enforcement.
     * @param enabled When true, only allowlisted recipients may receive payments.
     */
    function setAllowlistEnabled(bool enabled) external onlyOwner {
        allowlistEnabled = enabled;
        emit AllowlistToggled(enabled);
    }

    /**
     * @notice Pause all payment executions.
     */
    function pause() external onlyOwner {
        _pause();
        emit VaultPaused(_msgSender());
    }

    /**
     * @notice Unpause payment executions.
     */
    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused(_msgSender());
    }

    // =========================================================================
    // View Functions & Helpers
    // =========================================================================

    /**
     * @notice Returns remaining daily spending budget for current UTC day.
     */
    function getRemainingDailyBudget() external view returns (uint256) {
        uint256 currentUtcDay = block.timestamp / 1 days;
        if (currentUtcDay > policy.currentDay) {
            return policy.dailyLimit;
        }
        if (policy.dailySpent >= policy.dailyLimit) {
            return 0;
        }
        return policy.dailyLimit - policy.dailySpent;
    }

    /**
     * @notice Returns remaining transaction count for current UTC day.
     */
    function getRemainingDailyTransactions() external view returns (uint256) {
        uint256 currentUtcDay = block.timestamp / 1 days;
        if (currentUtcDay > policy.currentDay) {
            return policy.maxTransactionsPerDay;
        }
        if (policy.dailyTransactionCount >= policy.maxTransactionsPerDay) {
            return 0;
        }
        return policy.maxTransactionsPerDay - policy.dailyTransactionCount;
    }

    /**
     * @notice Returns current USDC balance held in the vault.
     */
    function getVaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Returns full policy struct.
     */
    function getPolicy() external view returns (Policy memory) {
        return policy;
    }

    /**
     * @dev Internal helper to reset daily counters when rolling over to a new UTC epoch day.
     */
    function _refreshDailyWindow() internal {
        uint256 day = block.timestamp / 1 days;
        if (day > policy.currentDay) {
            policy.dailySpent = 0;
            policy.dailyTransactionCount = 0;
            policy.currentDay = day;
        }
    }
}
