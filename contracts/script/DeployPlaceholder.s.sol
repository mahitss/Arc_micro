// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/AgentVaultPlaceholder.sol";

/**
 * @notice Placeholder deployment script for Foundry.
 * @dev Live contract deployment on Arc network will occur in a later task.
 */
contract DeployPlaceholder {
    function run() external returns (AgentVaultPlaceholder) {
        return new AgentVaultPlaceholder();
    }
}
