// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {DeployAgentVault} from "../script/DeployAgentVault.s.sol";
import {AgentVault} from "../src/AgentVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract DeployAgentVaultTest is Test {
    DeployAgentVault internal deployScript;
    MockUSDC internal mockUsdc;
    address internal coldMultisig = makeAddr("coldMultisig");

    function setUp() public {
        vm.setEnv("ARC_REQUIRE_MAINNET", "true");
        vm.setEnv("ARC_CHAIN_ID", "0");
        deployScript = new DeployAgentVault();
        mockUsdc = new MockUSDC();
    }

    function test_DeployRunWithArgs_Success() public {
        AgentVault vault = deployScript.runWithArgs(address(mockUsdc), "autonomous-agent-1", coldMultisig);

        assertEq(address(vault.usdc()), address(mockUsdc), "USDC address mismatch");
        assertEq(vault.agentId(), "autonomous-agent-1", "Agent ID mismatch");
        assertEq(vault.owner(), coldMultisig, "Owner should be cold multisig");
    }

    function test_DeployRunWithEnv_Success() public {
        vm.setEnv("ARC_USDC_ADDRESS", vm.toString(address(mockUsdc)));
        vm.setEnv("AGENT_ID", "env-agent-007");
        vm.setEnv("COLD_MULTISIG_OWNER", vm.toString(coldMultisig));

        AgentVault vault = deployScript.run();

        assertEq(address(vault.usdc()), address(mockUsdc));
        assertEq(vault.agentId(), "env-agent-007");
        assertEq(vault.owner(), coldMultisig);
    }

    function test_RevertIf_ZeroUSDC() public {
        vm.expectRevert(bytes("ARC_USDC_ADDRESS must be set in environment before deployment."));
        deployScript.runWithArgs(address(0), "agent-1", coldMultisig);
    }

    function test_RevertIf_ZeroOwner() public {
        vm.expectRevert(bytes("COLD_MULTISIG_OWNER must be configured as a non-zero address before deployment."));
        deployScript.runWithArgs(address(mockUsdc), "agent-1", address(0));
    }

    function test_RevertIf_EmptyAgentId() public {
        vm.expectRevert(bytes("agentId cannot be empty"));
        deployScript.runWithArgs(address(mockUsdc), "", coldMultisig);
    }

    function test_RevertIf_InvalidChainId() public {
        // Change chain ID to an arbitrary testnet (e.g. Sepolia 11155111)
        vm.chainId(11155111);
        vm.expectRevert(bytes("Unexpected chain ID. Expected Arc Mainnet (5042), got: 11155111"));
        deployScript.deployWithConfig(address(mockUsdc), "agent-1", coldMultisig, true, 0);
    }

    function test_Allow_ArcMainnetChainId() public {
        vm.chainId(5042);
        // On 5042, if code length is 0 at USDC address it would revert, but mockUsdc has code
        AgentVault vault = deployScript.deployWithConfig(address(mockUsdc), "agent-1", coldMultisig, true, 0);
        assertEq(vault.owner(), coldMultisig);
    }

    function test_Allow_ArcTestnetChainId() public {
        vm.chainId(5042002);
        AgentVault vault = deployScript.deployWithConfig(address(mockUsdc), "agent-1", coldMultisig, false, 0);
        assertEq(vault.owner(), coldMultisig);
    }

    function test_RevertIf_InvalidChainId_WhenNotRequireMainnet() public {
        vm.chainId(999999);
        vm.expectRevert(bytes("Unexpected chain ID. Expected Arc Mainnet (5042) or Testnet (5042002), got: 999999"));
        deployScript.deployWithConfig(address(mockUsdc), "agent-1", coldMultisig, false, 0);
    }

    function test_RevertIf_ArcChainIdMismatch() public {
        vm.chainId(5042);
        vm.expectRevert(bytes("Unexpected chain ID. Expected: 5042002, got: 5042"));
        deployScript.deployWithConfig(address(mockUsdc), "agent-1", coldMultisig, false, 5042002);
    }
}

