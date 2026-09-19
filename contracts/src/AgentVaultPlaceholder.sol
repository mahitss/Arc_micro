// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title AgentVaultPlaceholder
 * @notice Foundation placeholder contract for AgentPay toolchain validation.
 * @dev The full AgentVault implementation, spending controls, and Arc settlement
 *      will be implemented in a dedicated subsequent task.
 */
contract AgentVaultPlaceholder {
    string public constant VERSION = "0.1.0";
    bool public initialized;

    event Initialized(address indexed owner);

    constructor() {
        initialized = true;
        emit Initialized(msg.sender);
    }

    function isReady() external pure returns (bool) {
        return true;
    }
}
