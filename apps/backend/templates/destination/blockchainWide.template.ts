// templates/p2p/destination.template.ts

export default `
// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./AbstractCallback.sol";
{{PROTOCOL_IMPORTS}}

contract DestinationContract is AbstractCallback {
    // Protocol interfaces
    {{PROTOCOL_INTERFACES}}

    // State variables
    {{STATE_VARIABLES}}
    
    // Events
    event ActionExecuted(
        bytes32 indexed id,
        address indexed sender,
        uint256 timestamp
    );

    mapping(bytes32 => bool) public processedActions;

    constructor(address callbackSender) AbstractCallback(callbackSender) {
        {{CONSTRUCTOR_LOGIC}}
    }

    // Protocol interaction functions
    {{PROTOCOL_FUNCTIONS}}

    // Wrapper functions that will be called by RSC
    {{WRAPPER_FUNCTIONS}}

    // Helper functions
    {{HELPER_FUNCTIONS}}

    receive() external payable {}
}`;