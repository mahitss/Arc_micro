// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/AgentVaultPlaceholder.sol";

contract AgentVaultPlaceholderTest {
    AgentVaultPlaceholder internal placeholder;

    function setUp() public {
        placeholder = new AgentVaultPlaceholder();
    }

    function test_Initialization() public view {
        require(placeholder.initialized(), "Contract should be initialized");
        require(placeholder.isReady(), "Contract should be ready");
    }

    function test_Version() public view {
        bytes32 vHash = keccak256(bytes(placeholder.VERSION()));
        require(vHash == keccak256(bytes("0.1.0")), "Version mismatch");
    }
}
