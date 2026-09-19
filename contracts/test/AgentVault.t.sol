// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AgentVaultTest is Test {
    AgentVault public vault;
    MockUSDC public usdc;

    address public owner = address(0x1111);
    address public nonOwner = address(0x2222);
    address public recipient1 = address(0x3333);
    address public recipient2 = address(0x4444);
    address public blockedRecipient = address(0x9999);

    string public constant AGENT_ID = "research-agent";
    bytes32 public constant TEST_PURPOSE = keccak256("api_compute_usage");

    // Standard policy parameters (6 decimals)
    uint256 public constant PER_TX_LIMIT = 500_000; // 0.50 USDC
    uint256 public constant DAILY_LIMIT = 5_000_000; // 5.00 USDC
    uint256 public constant MAX_TX_PER_DAY = 10;
    uint256 public constant INITIAL_VAULT_FUNDING = 100_000_000; // 100 USDC

    event AgentVaultInitialized(address indexed owner, address indexed usdc, string agentId);
    event PolicyUpdated(bool enabled, uint256 perTransactionLimit, uint256 dailyLimit, uint256 maxTransactionsPerDay);
    event RecipientAllowed(address indexed recipient, bool allowed);
    event RecipientBlocked(address indexed recipient, bool blocked);
    event PaymentExecuted(address indexed recipient, uint256 amount, bytes32 indexed purpose, uint256 indexed day);
    event Withdrawal(address indexed recipient, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new AgentVault(address(usdc), AGENT_ID, owner);

        // Fund the vault with USDC
        usdc.mint(address(vault), INITIAL_VAULT_FUNDING);

        // Configure default policy by owner
        vm.startPrank(owner);
        vault.setPolicy(true, PER_TX_LIMIT, DAILY_LIMIT, MAX_TX_PER_DAY);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // 1-3: Deployment & Basic Properties
    // -------------------------------------------------------------------------

    function test_01_deployment_succeeds() public view {
        assertTrue(address(vault) != address(0));
        assertEq(vault.agentId(), AGENT_ID);
    }

    function test_02_correct_owner_assigned() public view {
        assertEq(vault.owner(), owner);
    }

    function test_03_correct_usdc_token_configured() public view {
        assertEq(address(vault.usdc()), address(usdc));
    }

    // -------------------------------------------------------------------------
    // 4-5: Policy Configuration Access Control
    // -------------------------------------------------------------------------

    function test_04_owner_can_configure_policy() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit PolicyUpdated(true, 100_000, 1_000_000, 5);
        vault.setPolicy(true, 100_000, 1_000_000, 5);

        AgentVault.Policy memory p = vault.getPolicy();
        assertTrue(p.enabled);
        assertEq(p.perTransactionLimit, 100_000);
        assertEq(p.dailyLimit, 1_000_000);
        assertEq(p.maxTransactionsPerDay, 5);
    }

    function test_05_non_owner_cannot_configure_policy() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        vault.setPolicy(true, 100_000, 1_000_000, 5);
    }

    // -------------------------------------------------------------------------
    // 6-8: Recipient Allow / Block Management
    // -------------------------------------------------------------------------

    function test_06_owner_can_allow_recipient() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecipientAllowed(recipient1, true);
        vault.setRecipientAllowed(recipient1, true);

        assertTrue(vault.allowedRecipients(recipient1));
    }

    function test_07_non_owner_cannot_allow_recipient() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        vault.setRecipientAllowed(recipient1, true);
    }

    function test_08_owner_can_block_recipient() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecipientBlocked(blockedRecipient, true);
        vault.setRecipientBlocked(blockedRecipient, true);

        assertTrue(vault.blockedRecipients(blockedRecipient));
    }

    // -------------------------------------------------------------------------
    // 9-11: Recipient Enforcement Rules
    // -------------------------------------------------------------------------

    function test_09_blocked_recipient_payment_reverts() public {
        vm.startPrank(owner);
        vault.setRecipientBlocked(blockedRecipient, true);

        vm.expectRevert(abi.encodeWithSelector(AgentVault.RecipientIsBlocked.selector, blockedRecipient));
        vault.executePayment(blockedRecipient, 100_000, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_10_non_allowed_recipient_reverts_when_allowlist_active() public {
        vm.startPrank(owner);
        vault.setAllowlistEnabled(true);
        // recipient1 is not yet allowed

        vm.expectRevert(abi.encodeWithSelector(AgentVault.RecipientNotAllowed.selector, recipient1));
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_11_allowed_recipient_can_receive_payment() public {
        vm.startPrank(owner);
        vault.setAllowlistEnabled(true);
        vault.setRecipientAllowed(recipient1, true);

        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();

        assertEq(usdc.balanceOf(recipient1), 100_000);
    }

    // -------------------------------------------------------------------------
    // 12-16: Amount & Limits Enforcement
    // -------------------------------------------------------------------------

    function test_12_zero_payment_reverts() public {
        vm.prank(owner);
        vm.expectRevert(AgentVault.InvalidAmount.selector);
        vault.executePayment(recipient1, 0, TEST_PURPOSE);
    }

    function test_13_payment_above_per_transaction_limit_reverts() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(AgentVault.TransactionLimitExceeded.selector, PER_TX_LIMIT + 1, PER_TX_LIMIT)
        );
        vault.executePayment(recipient1, PER_TX_LIMIT + 1, TEST_PURPOSE);
    }

    function test_14_payment_exactly_at_per_transaction_limit_succeeds() public {
        vm.prank(owner);
        vault.executePayment(recipient1, PER_TX_LIMIT, TEST_PURPOSE);
        assertEq(usdc.balanceOf(recipient1), PER_TX_LIMIT);
    }

    function test_15_payment_exceeding_daily_limit_reverts() public {
        vm.startPrank(owner);
        // Allow up to 20 transactions so daily spending limit triggers before transaction count limit
        vault.setPolicy(true, PER_TX_LIMIT, DAILY_LIMIT, 20);
        // 10 payments of 500k = 5M (daily limit)
        for (uint256 i = 0; i < 10; i++) {
            vault.executePayment(recipient1, 500_000, TEST_PURPOSE);
        }

        // 11th payment exceeds daily limit
        vm.expectRevert(abi.encodeWithSelector(AgentVault.DailyLimitExceeded.selector, 5_000_001, DAILY_LIMIT));
        vault.executePayment(recipient1, 1, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_16_payment_exactly_reaching_daily_limit_succeeds() public {
        vm.startPrank(owner);
        for (uint256 i = 0; i < 10; i++) {
            vault.executePayment(recipient1, 500_000, TEST_PURPOSE);
        }
        vm.stopPrank();

        assertEq(vault.getPolicy().dailySpent, DAILY_LIMIT);
        assertEq(vault.getRemainingDailyBudget(), 0);
    }

    // -------------------------------------------------------------------------
    // 17-20: Daily Transaction Count & Accounting
    // -------------------------------------------------------------------------

    function test_17_maximum_transaction_count_is_enforced() public {
        vm.startPrank(owner);
        // Execute MAX_TX_PER_DAY (10) small payments
        for (uint256 i = 0; i < 10; i++) {
            vault.executePayment(recipient1, 10_000, TEST_PURPOSE);
        }

        // 11th payment reverts due to transaction count
        vm.expectRevert(abi.encodeWithSelector(AgentVault.DailyTransactionLimitExceeded.selector, 10, MAX_TX_PER_DAY));
        vault.executePayment(recipient1, 10_000, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_18_payment_increments_daily_spending_correctly() public {
        vm.startPrank(owner);
        vault.executePayment(recipient1, 150_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailySpent, 150_000);

        vault.executePayment(recipient1, 200_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailySpent, 350_000);
        vm.stopPrank();
    }

    function test_19_payment_increments_transaction_count_correctly() public {
        vm.startPrank(owner);
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailyTransactionCount, 1);

        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailyTransactionCount, 2);
        vm.stopPrank();
    }

    function test_20_daily_accounting_resets_after_utc_day_changes() public {
        vm.startPrank(owner);
        vault.executePayment(recipient1, 500_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailySpent, 500_000);
        assertEq(vault.getPolicy().dailyTransactionCount, 1);

        // Warp time forward by 1 full day (86400 seconds)
        vm.warp(block.timestamp + 1 days + 1);

        // Next payment should reset daily counters and succeed
        vault.executePayment(recipient1, 300_000, TEST_PURPOSE);
        assertEq(vault.getPolicy().dailySpent, 300_000);
        assertEq(vault.getPolicy().dailyTransactionCount, 1);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    // 21-23: Vault Balance, Token Transfer & Events
    // -------------------------------------------------------------------------

    function test_21_vault_balance_is_checked() public {
        // Drain vault to 100k
        vm.prank(owner);
        vault.withdraw(owner, INITIAL_VAULT_FUNDING - 100_000);

        // Attempting to pay 200k reverts with InsufficientBalance
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AgentVault.InsufficientBalance.selector, 200_000, 100_000));
        vault.executePayment(recipient1, 200_000, TEST_PURPOSE);
    }

    function test_22_successful_payment_transfers_correct_usdc_amount() public {
        uint256 beforeVault = usdc.balanceOf(address(vault));
        uint256 beforeRecipient = usdc.balanceOf(recipient1);

        vm.prank(owner);
        vault.executePayment(recipient1, 250_000, TEST_PURPOSE);

        assertEq(usdc.balanceOf(address(vault)), beforeVault - 250_000);
        assertEq(usdc.balanceOf(recipient1), beforeRecipient + 250_000);
    }

    function test_23_payment_event_is_emitted_correctly() public {
        uint256 currentDay = block.timestamp / 1 days;

        vm.prank(owner);
        vm.expectEmit(true, false, true, true);
        emit PaymentExecuted(recipient1, 180_000, TEST_PURPOSE, currentDay);
        vault.executePayment(recipient1, 180_000, TEST_PURPOSE);
    }

    // -------------------------------------------------------------------------
    // 24-25: Withdrawal Administrative Controls
    // -------------------------------------------------------------------------

    function test_24_withdrawal_works_for_owner() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit Withdrawal(recipient1, 1_000_000);
        vault.withdraw(recipient1, 1_000_000);

        assertEq(usdc.balanceOf(recipient1), 1_000_000);
    }

    function test_25_non_owner_withdrawal_reverts() public {
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        vault.withdraw(recipient1, 1_000_000);
    }

    // -------------------------------------------------------------------------
    // 26-27: Pause / Unpause Controls
    // -------------------------------------------------------------------------

    function test_26_pause_prevents_payment() public {
        vm.startPrank(owner);
        vault.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_27_unpause_restores_payment_functionality() public {
        vm.startPrank(owner);
        vault.pause();
        vault.unpause();

        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();

        assertEq(usdc.balanceOf(recipient1), 100_000);
    }

    // -------------------------------------------------------------------------
    // 28-33: Edge Cases, Invariants, & Configuration Validation
    // -------------------------------------------------------------------------

    function test_28_blocked_recipient_cannot_receive_funds_even_if_allowlisted() public {
        vm.startPrank(owner);
        vault.setAllowlistEnabled(true);
        vault.setRecipientAllowed(recipient1, true);
        // Now block recipient1
        vault.setRecipientBlocked(recipient1, true);

        // Blocked check takes strict precedence
        vm.expectRevert(abi.encodeWithSelector(AgentVault.RecipientIsBlocked.selector, recipient1));
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();
    }

    function test_29_invalid_policy_configurations_revert() public {
        vm.startPrank(owner);
        // perTransactionLimit > dailyLimit
        vm.expectRevert(
            abi.encodeWithSelector(AgentVault.InvalidConfiguration.selector, "per-tx limit exceeds daily limit")
        );
        vault.setPolicy(true, 1_000_001, 1_000_000, 10);

        // maxTransactionsPerDay == 0 when enabled
        vm.expectRevert(
            abi.encodeWithSelector(
                AgentVault.InvalidConfiguration.selector, "max tx per day cannot be zero when enabled"
            )
        );
        vault.setPolicy(true, 100_000, 1_000_000, 0);
        vm.stopPrank();
    }

    function test_30_large_uint256_values_do_not_cause_unexpected_arithmetic() public {
        vm.startPrank(owner);
        // Daily limit at uint256 max
        vault.setPolicy(true, type(uint128).max, type(uint256).max, 10);
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vm.stopPrank();

        assertEq(vault.getPolicy().dailySpent, 100_000);
    }

    function test_31_multiple_payments_accumulate_daily_spending_correctly() public {
        vm.startPrank(owner);
        vault.executePayment(recipient1, 100_000, TEST_PURPOSE);
        vault.executePayment(recipient2, 200_000, TEST_PURPOSE);
        vault.executePayment(recipient1, 150_000, TEST_PURPOSE);
        vm.stopPrank();

        assertEq(vault.getPolicy().dailySpent, 450_000);
        assertEq(vault.getPolicy().dailyTransactionCount, 3);
    }

    function test_32_new_day_payment_starts_fresh_accounting() public {
        vm.startPrank(owner);
        vault.executePayment(recipient1, 500_000, TEST_PURPOSE);
        assertEq(vault.getRemainingDailyBudget(), 4_500_000);

        // Move 2 days into the future
        vm.warp(block.timestamp + 2 days);
        assertEq(vault.getRemainingDailyBudget(), DAILY_LIMIT);
        assertEq(vault.getRemainingDailyTransactions(), MAX_TX_PER_DAY);
        vm.stopPrank();
    }

    function test_33_repeated_payment_attempts_cannot_bypass_limits() public {
        vm.startPrank(owner);
        // Fill budget to the brim
        for (uint256 i = 0; i < 10; i++) {
            vault.executePayment(recipient1, 500_000, TEST_PURPOSE);
        }

        // Multiple attempts all fail
        for (uint256 i = 0; i < 3; i++) {
            vm.expectRevert();
            vault.executePayment(recipient1, 1, TEST_PURPOSE);
        }
        vm.stopPrank();
    }

    function test_34_withdrawal_zero_recipient_reverts() public {
        vm.prank(owner);
        vm.expectRevert(AgentVault.ZeroAddress.selector);
        vault.withdraw(address(0), 1_000_000);
    }

    function test_35_withdrawal_zero_amount_reverts() public {
        vm.prank(owner);
        vm.expectRevert(AgentVault.InvalidAmount.selector);
        vault.withdraw(owner, 0);
    }

    function test_36_withdrawal_excessive_amount_reverts() public {
        uint256 excessAmount = INITIAL_VAULT_FUNDING + 1_000_000;
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AgentVault.InsufficientBalance.selector, excessAmount, INITIAL_VAULT_FUNDING));
        vault.withdraw(owner, excessAmount);
    }

    // -------------------------------------------------------------------------
    // Fuzz Tests
    // -------------------------------------------------------------------------

    function testFuzz_PaymentNeverExceedsDailyLimit(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1, PER_TX_LIMIT);
        amount2 = bound(amount2, 1, PER_TX_LIMIT);

        vm.startPrank(owner);
        vault.executePayment(recipient1, amount1, TEST_PURPOSE);

        if (amount1 + amount2 <= DAILY_LIMIT) {
            vault.executePayment(recipient1, amount2, TEST_PURPOSE);
            assertTrue(vault.getPolicy().dailySpent <= DAILY_LIMIT);
        } else {
            vm.expectRevert();
            vault.executePayment(recipient1, amount2, TEST_PURPOSE);
        }
        vm.stopPrank();
    }

    function testFuzz_PaymentAbovePerTxLimitAlwaysFails(uint256 amount) public {
        amount = bound(amount, PER_TX_LIMIT + 1, type(uint128).max);

        vm.prank(owner);
        vm.expectRevert();
        vault.executePayment(recipient1, amount, TEST_PURPOSE);
    }

    function testFuzz_NonOwnerCannotExecutePayment(address caller, uint256 amount) public {
        vm.assume(caller != owner);
        amount = bound(amount, 1, PER_TX_LIMIT);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, caller));
        vault.executePayment(recipient1, amount, TEST_PURPOSE);
    }
}
