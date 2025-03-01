import { Request, Response } from "express";

// Updated interfaces to match new requirements
interface EventInput {
    topic0: string;  // The event's topic_0 hash
    eventABI: string; // The event ABI (e.g., "Transfer(address,uint256,address)")
    indexedParams: number[]; // Array of param indices that should use topic_1, topic_2, etc.
}

interface ContractInput {
    events: EventInput[];
    originChainId: number;
    destinationChainId: number;
    originContract: string;
    destinationContract: string;
    ownerAddress?: string;
    isPausable?: boolean;
    contractName?: string;
}

// Interface for the response to frontend
interface GeneratorResponse {
    reactiveSmartContractTemplate: string;
    generatedFunctions: string[]; // Array of function signatures like ["function_1(address,uint256,uint256,address)"]
}

export default async function handleLiveDataAutomation(req: Request, res: Response) {
    try {
        const input = req.body;
        const result = generateReactiveContract(input);

        res.json(result);
    } catch (error) {
        console.error('Error in handleGenerate:', error);
        res.status(500).json({ error: 'An error occurred while generating the contract' });
    }
}

function parseEventABI(eventABI: string): { name: string; params: { type: string }[] } {
    const match = eventABI.match(/^(\w+)\((.*)\)$/);
    if (!match) {
        throw new Error(`Invalid event ABI: ${eventABI}`);
    }
    
    const [, name, paramsString] = match;
    const params = paramsString.split(',')
        .map(type => ({ type: type.trim() }))
        .filter(param => param.type !== '');

    return { name, params };
}

function generateEventConstants(events: EventInput[]): string {
    return events.map((event, index) => {
        return `    uint256 private constant EVENT_${index}_TOPIC_0 = ${event.topic0};`;
    }).join('\n');
}

function generateSubscriptions(events: EventInput[], originChainId: number, originContract: string): string {
    return events.map((event, index) => `
            service.subscribe(
                ORIGIN_CHAIN_ID,
                ORIGIN_CONTRACT,
                EVENT_${index}_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );`).join('\n');
}

function generatePausableSubscriptionsFunction(events: EventInput[]): string {
    const subscriptionsArray = events.map((_, index) => `
        result[${index}] = Subscription(
            ORIGIN_CHAIN_ID,
            ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );`).join('\n');
    
    return `
    function getPausableSubscriptions() internal pure override returns (Subscription[] memory) {
        Subscription[] memory result = new Subscription[](${events.length});${subscriptionsArray}
        return result;
    }`;
}

function generateReactLogic(events: EventInput[]): {
    reactLogic: string;
    generatedFunctions: string[];
} {
    const generatedFunctions: string[] = [];
    
    const reactLogic = events.map((event, index) => {
        const { params } = parseEventABI(event.eventABI);
        
        // Generate function signature
        const functionParams = ['address', ...params.map(p => p.type)];
        const functionSignature = `function_${index + 1}(${functionParams.join(',')})`;
        generatedFunctions.push(functionSignature);
        
        // Create an array of default values for all parameters
        const defaultValues: string[] = functionParams.map(paramType => {
            switch (paramType) {
                case 'address':
                    return 'address(0)';
                case 'uint256':
                    return '0';
                case 'bool':
                    return 'false';
                default:
                    return '0'; // Default fallback
            }
        });

        // Replace default values with actual topic values for indexed parameters
        event.indexedParams.forEach((paramIndex, topicIndex) => {
            // Add 1 to skip the first parameter (address)
            const actualParamIndex = paramIndex + 1;
            const paramType = params[paramIndex].type;
            
            if (actualParamIndex < defaultValues.length) {
                switch (paramType) {
                    case 'address':
                        defaultValues[actualParamIndex] = `address(uint160(log.topic_${topicIndex + 1}))`;
                        break;
                    case 'uint256':
                        defaultValues[actualParamIndex] = `log.topic_${topicIndex + 1}`;
                        break;
                    case 'bool':
                        defaultValues[actualParamIndex] = `log.topic_${topicIndex + 1} != 0`;
                        break;
                    default:
                        defaultValues[actualParamIndex] = `log.topic_${topicIndex + 1}`;
                }
            }
        });

        return `
        if (log.topic_0 == EVENT_${index}_TOPIC_0) {
            bytes memory payload = abi.encodeWithSignature(
                "${functionSignature}",
                ${defaultValues.join(', ')}
            );
            emit Callback(DESTINATION_CHAIN_ID, DESTINATION_CONTRACT, CALLBACK_GAS_LIMIT, payload);
        }`;
    }).join(' else ');

    return { reactLogic, generatedFunctions };
}

function generateReactiveContract(input: ContractInput): GeneratorResponse {
    const { 
        events,
        originChainId, 
        destinationChainId, 
        originContract, 
        destinationContract,
        ownerAddress,
        isPausable = true,
        contractName = "ReactiveContract"
    } = input;

    const eventConstants = generateEventConstants(events);
    const subscriptions = generateSubscriptions(events, originChainId, originContract);
    const { reactLogic, generatedFunctions } = generateReactLogic(events);

    const baseContract = isPausable ? 'AbstractPausableReactive' : 'AbstractReactive';
    const pausedInitialization = isPausable ? 'paused = false;' : '';
    const ownerInitialization = isPausable || ownerAddress ? `owner = ${ownerAddress || 'msg.sender'};` : '';
    const pausableSubscriptionsFunction = isPausable ? generatePausableSubscriptionsFunction(events) : '';


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


contract ${contractName} is ${baseContract} {
    // Chain and contract constants
    uint256 private constant ORIGIN_CHAIN_ID = ${originChainId};
    uint256 private constant DESTINATION_CHAIN_ID = ${destinationChainId};
    address private constant ORIGIN_CONTRACT = ${originContract};
    address private constant DESTINATION_CONTRACT = ${destinationContract};
    uint64 private constant CALLBACK_GAS_LIMIT = 1000000;

    // Event topic constants
${eventConstants}

    constructor() payable {
        ${ownerInitialization}
        ${pausedInitialization}
        
        // Subscribe to events
        if (!vm) {
${subscriptions}
        }
    }


${pausableSubscriptionsFunction}

    function react(LogRecord calldata log) external vmOnly {
        // Only process logs from our target contract
        if (log._contract == ORIGIN_CONTRACT) {
${reactLogic}
        }
    }
}`;

    return {
        reactiveSmartContractTemplate: template,
        generatedFunctions
    };
}