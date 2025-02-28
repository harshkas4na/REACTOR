import { Request, Response } from "express";
import { validateContractInput } from "../zod/validateContractInput";
import crypto from 'crypto';
const solc = require('solc');

export default async function handleGenerateDA(req: Request, res: Response) {
    try {
        const input = req.body;
        const reactiveSmartContractTemplate = generateReactiveSmartContractTemplate(input);

        // Compile the contract to get ABI and bytecode
        const { abi, bytecode } = await compileContract(reactiveSmartContractTemplate);

        res.json({
            reactiveSmartContractTemplate,
            abi,
            bytecode
        });
    } catch (error) {
        console.error('Error in handleGenerate:', error);
        res.status(500).json({ error: 'An error occurred while generating the contract' });
    }
}

async function compileContract(sourceCode: string): Promise<{ abi: any, bytecode: string }> {
    const input = {
        language: 'Solidity',
        sources: {
            'Contract.sol': {
                content: sourceCode
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const contractName = 'ReactiveSmartContract';

    if (output.errors) {
        const errors = output.errors.filter((error: any) => error.severity === 'error');
        if (errors.length > 0) {
            console.error('Compilation errors:', errors);
            throw new Error('Contract compilation failed');
        }
    }

    const contract = output.contracts['Contract.sol'][contractName];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

interface EventFunctionPair {
    event: {
        name: string;
        topic0: string;
    };
    function: {
        name: string;
        inputs: any[];
    };
}

interface ContractInput {
    automationType: string;
    originAddress: string;
    destinationAddress: string;
    selectedPairs: EventFunctionPair[];
    functionInputs: Record<string, Record<string, string>>;
    conditions: Record<string, string>;
    applicableAddresses: string[];
}

function generateEventConstants(selectedPairs: EventFunctionPair[]): string {
    return selectedPairs.map((pair, index) => {
        return `uint256 private constant EVENT_${index}_TOPIC_0 = ${pair.event.topic0};`;
    }).join('\n    ');
}

function generateSubscriptions(selectedPairs: EventFunctionPair[]): string {
    return selectedPairs.map((pair, index) => `
    bytes memory payload_${index} = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            CHAIN_ID,
            _ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        (bool subscription_result_${index},) = address(service).call(payload_${index});
        vm = !subscription_result_${index};`).join('\n');
}

function generateReactLogic(input: ContractInput): string {
    const { selectedPairs, functionInputs, conditions, applicableAddresses } = input;

    const addressCheck = applicableAddresses.length > 0 
        ? `require(isApplicableAddress(msg.sender), "Address not allowed");`
        : '';

    const reactLogic = selectedPairs.map((pair, index) => {
        const condition = conditions[pair.function.name] 
            ? `require(${conditions[pair.function.name]}, "Condition not met");`
            : '';

        const functionInputsStr = pair.function.inputs
            .map(input => functionInputs[pair.function.name]?.[input.name] || '0')
            .join(', ');

        return `
        if (log.topic_0 == EVENT_${index}_TOPIC_0) {
            ${condition}
            bytes memory payload = abi.encodeWithSignature(
                "${pair.function.name}(${pair.function.inputs.map(i => i.type).join(',')})",
                ${functionInputsStr}
            );
            emit Callback(log.chain_id, _DESTINATION_CONTRACT, CALLBACK_GAS_LIMIT, payload);
        }`;
    }).join(' else ');

    return `${addressCheck} ${reactLogic}`;
}

export const generateReactiveSmartContractTemplate = (input: ContractInput) => {
    const { automationType, originAddress, destinationAddress, selectedPairs, applicableAddresses } = input;

    const eventConstants = generateEventConstants(selectedPairs);
    const subscriptions = generateSubscriptions(selectedPairs);
    const reactLogic = generateReactLogic(input);

    const applicableAddressesArray = applicableAddresses.length > 0
        ? `address[] private applicableAddresses = [${applicableAddresses.join(', ')}];`
        : '';

    const isApplicableAddressFunction = applicableAddresses.length > 0
        ? `
    function isApplicableAddress(address addr) private view returns (bool) {
        for (uint i = 0; i < applicableAddresses.length; i++) {
            if (applicableAddresses[i] == addr) {
                return true;
            }
        }
        return false;
    }`
        : '';

    const template = `
// SPDX-License-Identifier: UNLICENSED
    
pragma solidity >=0.8.0;

interface IPayer {
    /// @notice Method called by the system contract and/or proxies when payment is due.
    /// @dev Make sure to check the msg.sender.
    /// @param amount Amount owed due to reactive transactions and/or callbacks.
    function pay(uint256 amount) external;

    /// @notice Allows the reactive contracts and callback contracts to receive funds for their operational expenses.
    receive() external payable;
}

// @title Interface for reactive contracts.
// @notice Reactive contracts receive notifications about new events matching the criteria of their event subscriptions.
interface IReactive is IPayer {
    struct LogRecord {
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
        bytes data;
        uint256 block_number;
        uint256 op_code;
        uint256 block_hash;
        uint256 tx_hash;
        uint256 log_index;
    }

    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );

    /// @notice Entry point for handling new event notifications.
    /// @param log Data structure containing the information about the intercepted log record.
    function react(LogRecord calldata log) external;
}

interface IPayable {
    /// @notice Allows contracts to pay their debts and resume subscriptions.
    receive() external payable;

    /// @notice Allows reactive contracts to check their outstanding debt.
    /// @param _contract Reactive contract's address.
    /// @return Reactive contract's current debt due to unpaid reactive transactions and/or callbacks.
    function debt(address _contract) external view returns (uint256);
}




abstract contract AbstractPayer is IPayer {
    IPayable internal vendor;

    /// @notice ACL for addresses allowed to make callbacks and/or request payment.
    mapping(address => bool) senders;

    constructor() {
    }

    /// @inheritdoc IPayer
    receive() virtual external payable {
    }

    modifier authorizedSenderOnly() {
        require(senders[msg.sender], 'Authorized sender only');
        _;
    }

    /// @inheritdoc IPayer
    function pay(uint256 amount) external authorizedSenderOnly {
        _pay(payable(msg.sender), amount);
    }

    /// @notice Automatically cover the outstanding debt to the system contract or callback proxy, provided the contract has sufficient funds.
    function coverDebt() external {
        uint256 amount = vendor.debt(address(this));
        _pay(payable(vendor), amount);
    }

    /// @notice Attempts to safely transfer the specified sum to the given address.
    /// @param recipient Address of the transfer's recipient.
    /// @param amount Amount to be transferred.
    function _pay(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, 'Insufficient funds');
        if (amount > 0) {
            (bool success,) = payable(recipient).call{value: amount}(new bytes(0));
            require(success, 'Transfer failed');
        }
    }

    /// @notice Adds the given address to the ACL.
    /// @param sender Sender address to add.
    function addAuthorizedSender(address sender) internal {
        senders[sender] = true;
    }

    /// @notice Removes the given address from the ACL.
    /// @param sender Sender address to remove.
    function removeAuthorizedSender(address sender) internal {
        senders[sender] = false;
    }
}




// @title Interface for event subscription service.
// @notice Reactive contracts receive notifications about new events matching the criteria of their event subscriptions.
interface ISubscriptionService is IPayable {
    /// @notice Subscribes the calling contract to receive events matching the criteria specified.
    /// @param chain_id EIP155 source chain ID for the event (as a 'uint256'), or '0' for all chains.
    /// @param _contract Contract address to monitor, or '0' for all contracts.
    /// @param topic_0 Topic 0 to monitor, or 'REACTIVE_IGNORE' for all topics.
    /// @param topic_1 Topic 1 to monitor, or 'REACTIVE_IGNORE' for all topics.
    /// @param topic_2 Topic 2 to monitor, or 'REACTIVE_IGNORE' for all topics.
    /// @param topic_3 Topic 3 to monitor, or 'REACTIVE_IGNORE' for all topics.
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    /// @notice Removes active subscription of the calling contract, matching the criteria specified, if one exists.
    /// @param chain_id Chain ID criterion of the original subscription.
    /// @param _contract Contract address criterion of the original subscription.
    /// @param topic_0 Topic 0 criterion of the original subscription.
    /// @param topic_1 Topic 0 criterion of the original subscription.
    /// @param topic_2 Topic 0 criterion of the original subscription.
    /// @param topic_3 Topic 0 criterion of the original subscription.
    function unsubscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;
}


interface ISystemContract is IPayable, ISubscriptionService {
}


abstract contract AbstractReactive is IReactive, AbstractPayer {
    uint256 internal constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
    ISystemContract internal constant SERVICE_ADDR = ISystemContract(payable(0x0000000000000000000000000000000000fffFfF));

    /// @notice Indicates whether this is a ReactVM instance of the contract.
    bool internal vm;

    ISystemContract internal service;

    constructor() {
        vendor = service = SERVICE_ADDR;
        addAuthorizedSender(address(SERVICE_ADDR));
        detectVm();
    }

    modifier rnOnly() {
        require(!vm, 'Reactive Network only');
        _;
    }

    modifier vmOnly() {
        require(vm, 'VM only');
        _;
    }

    /// @notice Determines whether this copy of the contract is deployed to an RVM or the top-level Reactive Network by checking for the presence of the system contract at the predetermined address.
    function detectVm() internal {
        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(0x0000000000000000000000000000000000fffFfF) }
        vm = size == 0;
    }
}


abstract contract AbstractPausableReactive is IReactive, AbstractReactive {
    struct Subscription{
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
    }

    address internal owner;
    bool internal paused;

    constructor() {
        owner = msg.sender;
    }

    /// @notice This function should return the list of subscriptions to pause/resume.
    /// @return The list of subscriptions to pause/resume.
    function getPausableSubscriptions() virtual internal view returns (Subscription[] memory);

    modifier onlyOwner() {
        require(msg.sender == owner, 'Unauthorized');
        _;
    }

    /// @notice Pauses the reactive contract by unsubscribing from events using the criteria provided by the implementation.
    function pause() external rnOnly onlyOwner {
        require(!paused, 'Already paused');
        Subscription[] memory subscriptions = getPausableSubscriptions();
        for (uint256 ix = 0; ix != subscriptions.length; ++ix) {
            service.unsubscribe(
                subscriptions[ix].chain_id,
                subscriptions[ix]._contract,
                subscriptions[ix].topic_0,
                subscriptions[ix].topic_1,
                subscriptions[ix].topic_2,
                subscriptions[ix].topic_3
            );
        }
        paused = true;
    }

    /// @notice Resumed the reactive contract by subscribing to events using the criteria provided by the implementation.
    function resume() external rnOnly onlyOwner {
        require(paused, 'Not paused');
        Subscription[] memory subscriptions = getPausableSubscriptions();
        for (uint256 ix = 0; ix != subscriptions.length; ++ix) {
            service.subscribe(
                subscriptions[ix].chain_id,
                subscriptions[ix]._contract,
                subscriptions[ix].topic_0,
                subscriptions[ix].topic_1,
                subscriptions[ix].topic_2,
                subscriptions[ix].topic_3
            );
        }
        paused = false;
    }
}

    
    contract ReactiveSmartContract is AbstractReactive {
        event Event(
            uint256 indexed chain_id,
            address indexed ORIGIN_CONTRACT,
            uint256 indexed topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3,
            bytes data,
            uint256 counter
        );
    
        uint256 private constant CHAIN_ID = 1; // Assuming Ethereum mainnet, adjust as needed
        address private immutable _ORIGIN_CONTRACT;
        address private immutable _DESTINATION_CONTRACT;
    
        uint64 private constant CALLBACK_GAS_LIMIT = 1000000;

        ${applicableAddressesArray}
    
        ${eventConstants}
    
        uint256 public counter;
    
        constructor() {
            _ORIGIN_CONTRACT = ${originAddress};
            _DESTINATION_CONTRACT = ${destinationAddress};
            
            ${subscriptions}
        }
    
        receive() external payable {}
    
        function react(LogRecord calldata log) external vmOnly {
            emit Event(log.chain_id, _ORIGIN_CONTRACT, log.topic_0, log.topic_1, log.topic_2, log.topic_3, log.data, ++counter);
            
            // Only process logs from our target contract
            if (log._contract == _ORIGIN_CONTRACT) {
                ${reactLogic}
            }
        }
    
        function subscribe(uint256 topic_0) external {
            service.subscribe(
                CHAIN_ID,
                _ORIGIN_CONTRACT,
                topic_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    
        function unsubscribe(uint256 topic_0) external {
            service.unsubscribe(
                CHAIN_ID,
                _ORIGIN_CONTRACT,
                topic_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    
        function resetCounter() external {
            counter = 0;
        }

        ${isApplicableAddressFunction}
    }
    `;

    return template;
};