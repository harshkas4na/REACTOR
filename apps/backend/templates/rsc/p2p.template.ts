// templates/p2p/rsc.template.ts

export default `
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
    {{ORIGIN_PROTOCOL_CONSTANTS}}
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
            // Subscribe to all events
            {{SUBSCRIPTIONS}}
        }
    }

    receive() external payable {}

    {{PAUSABLE_SUBSCRIPTIONS_FUNCTION}}

    function react(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256,
        uint256
    ) external vmOnly {
        assert(!done);

        {{REACT_LOGIC}}
    }

    // Helper functions
    {{HELPER_FUNCTIONS}}

    // Custom logic
    {{CUSTOM_LOGIC}}
}`;