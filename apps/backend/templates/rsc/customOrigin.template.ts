// templates/customOrigin/rsc.template.ts

export const customOriginRSCTemplate = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "../AbstractPausableReactive.sol";

contract ReactiveSmartContract is {{BASE_CONTRACT}} {
    event Subscribed(
        address indexed service_address,
        address indexed _contract,
        uint256 indexed topic_0
    );
    
    event CallbackSent();
    event Done();

    // Chain and protocol constants
    uint256 private constant ORIGIN_CHAIN_ID = {{ORIGIN_CHAIN_ID}};
    uint256 private constant DESTINATION_CHAIN_ID = {{DESTINATION_CHAIN_ID}};
    address private constant ORIGIN_CONTRACT = {{ORIGIN_CONTRACT}};
    address private constant DESTINATION_CONTRACT = {{DESTINATION_CONTRACT}};
    uint64 private constant CALLBACK_GAS_LIMIT = 1000000;

    // Event topic constants
    {{EVENT_CONSTANTS}}

    // State variables
    {{STATE_VARIABLES}}
    bool private triggered;
    bool private done;

    constructor() {
        triggered = false;
        done = false;

        if (!vm) {
            {{SUBSCRIPTIONS}}
        }
    }

    {{REACT_FUNCTION}}
}`;

// templates/customOrigin/destination.template.ts

export const customOriginDestTemplate = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./AbstractCallback.sol";
{{PROTOCOL_IMPORTS}}

contract DestinationContract is AbstractCallback {
    {{PROTOCOL_INTERFACES}}
    {{STATE_VARIABLES}}
    
    event ActionExecuted(
        bytes32 indexed id,
        address indexed sender,
        uint256 timestamp
    );

    mapping(bytes32 => bool) public processedActions;

    constructor(address callbackSender) AbstractCallback(callbackSender) {
        {{CONSTRUCTOR_LOGIC}}
    }

    {{PROTOCOL_FUNCTIONS}}
    {{WRAPPER_FUNCTIONS}}
    {{HELPER_FUNCTIONS}}

    receive() external payable {}
}`;