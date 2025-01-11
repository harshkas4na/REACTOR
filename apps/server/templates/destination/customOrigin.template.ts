// templates/p2p/destination.template.ts

export const customOriginDestTemplate = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

interface IPayable {
    // @notice Allows contracts to pay their debts and resume subscriptions.
    receive() external payable;
    // @notice Allows reactive contracts to check their outstanding debt.
    // @param _contract Reactive contract's address.
    function debt(address _contract) external view returns (uint256);
}

interface IPayer {
    // @dev Make sure to check the msg.sender
    function pay(uint256 amount) external;
    receive() external payable;
}

abstract contract AbstractPayer is IPayer {
    IPayable internal vendor;
    constructor() {
    }
    receive() virtual external payable {
    }
    modifier authorizedSenderOnly() {
        require(address(vendor) == address(0) || msg.sender == address(vendor), 'Authorized sender only');
        _;
    }
    function pay(uint256 amount) external authorizedSenderOnly {
        _pay(payable(msg.sender), amount);
    }
    function coverDebt() external {
        uint256 amount = vendor.debt(address(this));
        _pay(payable(vendor), amount);
    }
    function _pay(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, 'Insufficient funds');
        if (amount > 0) {
            (bool success,) = payable(recipient).call{value: amount}(new bytes(0));
            require(success, 'Transfer failed');
        }
    }
}

abstract contract AbstractCallback is AbstractPayer {
    address internal rvm_id;
    constructor(address _callback_sender) {
        rvm_id = msg.sender;
        vendor = IPayable(payable(_callback_sender));
    }
    modifier rvmIdOnly(address _rvm_id) {
        require(rvm_id == address(0) || rvm_id == _rvm_id, 'Authorized RVM ID only');
        _;
    }
}

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

    
}`;