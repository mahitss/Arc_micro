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
        address usdcAddress = vm.envOr("ARC_USDC_ADDRESS", address(0x3600000000000000000000000000000000000000));
        string memory agentId = vm.envOr("AGENT_ID", string("research-agent"));
        bool requireMainnet = vm.envOr("ARC_REQUIRE_MAINNET", true);

        // Enforce Arc Mainnet Chain ID (5042) if required
        if (requireMainnet && block.chainid != 5042 && block.chainid != 31337) {
            revert(string.concat("Unexpected chain ID. Expected Arc Mainnet (5042), got: ", vm.toString(block.chainid)));
        }

        // Validate required configuration parameters
        if (usdcAddress == address(0)) {
            revert("ARC_USDC_ADDRESS must be set in environment before deployment.");
        }

        // Verify contract code exists at USDC address (except during local Anvil tests where code may be mocked)
        if (block.chainid == 5042 && usdcAddress.code.length == 0) {
            revert("No contract code found at configured ARC_USDC_ADDRESS.");
        }

        console2.log("=== AgentPay: Deploying AgentVault to Arc ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("USDC Token Address:", usdcAddress);
        console2.log("Agent ID:", agentId);

        vm.startBroadcast();
        vault = new AgentVault(usdcAddress, agentId, msg.sender);
        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("AgentVault Deployed Address:", address(vault));
        console2.log("Vault Owner:", msg.sender);
        console2.log("Block Number:", block.number);
    }
}
