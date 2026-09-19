// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentVault} from "../src/AgentVault.sol";

/**
 * @title DeployAgentVault
 * @notice Foundry deployment script skeleton for AgentVault on Arc network.
 * @dev Reads configuration parameters from environment variables.
 *      DO NOT run against mainnet in this task.
 *      DO NOT hardcode or expose private keys in source files.
 */
contract DeployAgentVault is Script {
    function run() external returns (AgentVault vault) {
        // Read configuration from environment
        address usdcAddress = vm.envOr("ARC_USDC_ADDRESS", address(0));
        string memory agentId = vm.envOr("AGENT_ID", string("research-agent"));

        // Validate required configuration parameters
        if (usdcAddress == address(0)) {
            revert("ARC_USDC_ADDRESS must be set in environment before deployment.");
        }

        console2.log("--- Deploying AgentVault ---");
        console2.log("USDC Token Address:", usdcAddress);
        console2.log("Agent ID:", agentId);

        vm.startBroadcast();
        vault = new AgentVault(usdcAddress, agentId, msg.sender);
        vm.stopBroadcast();

        console2.log("AgentVault deployed successfully at:", address(vault));
        console2.log("Owner configured as:", msg.sender);
    }
}
