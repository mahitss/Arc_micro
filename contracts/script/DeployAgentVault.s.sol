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
        address initialOwner = vm.envOr("COLD_MULTISIG_OWNER", vm.envOr("INITIAL_OWNER", address(0)));

        return deploy(usdcAddress, agentId, initialOwner);
    }

    function runWithArgs(address _usdc, string calldata _agentId, address _initialOwner) external returns (AgentVault vault) {
        return deploy(_usdc, _agentId, _initialOwner);
    }

    function deploy(address usdcAddress, string memory agentId, address initialOwner) public returns (AgentVault vault) {
        string memory requireMainnetStr = vm.envOr("ARC_REQUIRE_MAINNET", string("true"));
        bool requireMainnet = keccak256(bytes(requireMainnetStr)) != keccak256(bytes("false")) &&
                              keccak256(bytes(requireMainnetStr)) != keccak256(bytes("0"));

        // Enforce Arc Mainnet Chain ID (5042) if required
        if (requireMainnet && block.chainid != 5042 && block.chainid != 31337) {
            revert(string.concat("Unexpected chain ID. Expected Arc Mainnet (5042), got: ", vm.toString(block.chainid)));
        }

        // If requireMainnet is false, enforce valid Arc network (5042 or 5042002)
        if (!requireMainnet && block.chainid != 5042 && block.chainid != 5042002 && block.chainid != 31337) {
            revert(string.concat("Unexpected chain ID. Expected Arc Mainnet (5042) or Testnet (5042002), got: ", vm.toString(block.chainid)));
        }

        // Validate required configuration parameters
        if (usdcAddress == address(0)) {
            revert("ARC_USDC_ADDRESS must be set in environment before deployment.");
        }
        if (initialOwner == address(0)) {
            revert("COLD_MULTISIG_OWNER must be configured as a non-zero address before deployment.");
        }
        if (bytes(agentId).length == 0) {
            revert("agentId cannot be empty");
        }

        // Verify contract code exists at USDC address (except during local Anvil tests where code may be mocked)
        if ((block.chainid == 5042 || block.chainid == 5042002) && usdcAddress.code.length == 0) {
            revert("No contract code found at configured ARC_USDC_ADDRESS.");
        }

        console2.log("=== AgentPay: Deploying AgentVault to Arc ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("USDC Token Address:", usdcAddress);
        console2.log("Agent ID:", agentId);
        console2.log("Initial Owner (Cold Multisig):", initialOwner);

        vm.startBroadcast();
        vault = new AgentVault(usdcAddress, agentId, initialOwner);
        vm.stopBroadcast();

        console2.log("=== Deployment Summary ===");
        console2.log("AgentVault Deployed Address:", address(vault));
        console2.log("Vault Owner:", initialOwner);
        console2.log("Block Number:", block.number);
    }
}
