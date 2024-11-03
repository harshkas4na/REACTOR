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
        return `uint256 private constant EVENT_${index}_TOPIC_0 = ${event.topic0};`;
    }).join('\n    ');
}

function generateSubscriptions(events: EventInput[], originChainId: number, originContract: string): string {
    return events.map((event, index) => `
        bytes memory payload_${index} = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            ORIGIN_CHAIN_ID,
            ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        (bool subscription_result_${index},) = address(service).call(payload_${index});
        vm = !subscription_result_${index};`).join('\n');
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
                        defaultValues[actualParamIndex] = `address(uint160(topic_${topicIndex + 1}))`;
                        break;
                    case 'uint256':
                        defaultValues[actualParamIndex] = `topic_${topicIndex + 1}`;
                        break;
                    case 'bool':
                        defaultValues[actualParamIndex] = `topic_${topicIndex + 1} != 0`;
                        break;
                    default:
                        defaultValues[actualParamIndex] = `topic_${topicIndex + 1}`;
                }
            }
        });

        return `
        if (topic_0 == EVENT_${index}_TOPIC_0) {
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
        destinationContract 
    } = input;

    const eventConstants = generateEventConstants(events);
    const subscriptions = generateSubscriptions(events, originChainId, originContract);
    const { reactLogic, generatedFunctions } = generateReactLogic(events);

    const baseContract = 'AbstractPausableReactive';
    const pausedInitialization = 'paused = false;';
    
    const getPausableSubscriptionsFunction = `
    function getPausableSubscriptions() override internal pure returns (Subscription[] memory) {
        Subscription[] memory result = new Subscription[](${events.length});
        ${events.map((_, index) => `
        result[${index}] = Subscription(
            ORIGIN_CHAIN_ID,
            ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );`).join('\n')}
        return result;
    }`;

    const template = ` // SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.8.0;
// @title Interface for reactive contracts.
// @notice Reactive contracts receive notifications about new events matching the criteria of their event subscriptions.
interface IReactive {
    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );

    // @notice Entry point for handling new event notifications.
    // @param chain_id EIP155 origin chain ID for the event (as a uint256).
    // @param _contract Address of the originating contract for the received event.
    // @param topic_0 Topic 0 of the event (or 0 for LOG0).
    // @param topic_1 Topic 1 of the event (or 0 for LOG0 and LOG1).
    // @param topic_2 Topic 2 of the event (or 0 for LOG0 .. LOG2).
    // @param topic_3 Topic 3 of the event (or 0 for LOG0 .. LOG3).
    // @param data Event data as a byte array.
    // @param block_number Block number where the log record is located in its chain of origin.
    // @param op_code Number of topics in the log record (0 to 4).
    function react(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256 block_number,
        uint256 op_code
    ) external;
}


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
}

abstract contract AbstractPayer is IPayer {
    IPayable internal vendor;

    constructor() {
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



// @title Interface for event subscription service.
// @notice Reactive contracts receive notifications about new events matching the criteria of their event subscriptions.
interface ISubscriptionService {
    // @notice Subscribes the calling contract to receive events matching the criteria specified.
    // @param chain_id EIP155 origin chain ID for the event (as a uint256), or 0 for all chains.
    // @param _contract Contract address to monitor, or 0 for all contracts.
    // @param topic_0 Topic 0 to monitor, or REACTIVE_IGNORE for all topics.
    // @param topic_1 Topic 1 to monitor, or REACTIVE_IGNORE for all topics.
    // @param topic_2 Topic 2 to monitor, or REACTIVE_IGNORE for all topics.
    // @param topic_3 Topic 3 to monitor, or REACTIVE_IGNORE for all topics.
    // @dev At least one of criteria above must be non-REACTIVE_IGNORE.
    // @dev Will allow duplicate or overlapping subscriptions, clients must ensure idempotency.
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;

    // @notice Removes active subscription of the calling contract, matching the criteria specified, if one exists.
    // @param chain_id Chain ID criterion of the original subscription.
    // @param _contract Contract address criterion of the original subscription.
    // @param topic_0 Topic 0 criterion of the original subscription.
    // @param topic_1 Topic 0 criterion of the original subscription.
    // @param topic_2 Topic 0 criterion of the original subscription.
    // @param topic_3 Topic 0 criterion of the original subscription.
    // @dev This is very expensive.
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

    /**
     * Indicates whether this is a ReactVM instance of the contract.
     */
    bool internal vm;

    ISystemContract internal service;

    constructor() {
        vendor = service = SERVICE_ADDR;
    }

    modifier rnOnly() {
        // require(!vm, 'Reactive Network only');
        _;
    }

    modifier vmOnly() {
        // require(vm, 'VM only');
        _;
    }

    modifier sysConOnly() {
        require(msg.sender == address(service), 'System contract only');
        _;
    }

    function detectVm() internal {
        bytes memory payload = abi.encodeWithSignature("ping()");
        (bool result,) = address(service).call(payload);
        vm = !result;
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

    function getPausableSubscriptions() virtual internal view returns (Subscription[] memory);

    modifier onlyOwner() {
        require(msg.sender == owner, 'Unauthorized');
        _;
    }

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

contract ReactiveContract is ${baseContract} {
    // Chain and contract constants
    uint256 private constant ORIGIN_CHAIN_ID = ${originChainId};
    uint256 private constant DESTINATION_CHAIN_ID = ${destinationChainId};
    address private constant ORIGIN_CONTRACT = ${originContract};
    address private constant DESTINATION_CONTRACT = ${destinationContract};
    uint64 private constant CALLBACK_GAS_LIMIT = 1000000;

    // Event topic constants
    ${eventConstants}

    constructor() {
        ${pausedInitialization}
        
        // Subscribe to all events
        ${subscriptions}
    }

    receive() external payable {}

    ${getPausableSubscriptionsFunction}

    function react(
        uint256 /*chain_id*/,
        address /*_contract*/,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata /*data*/,
        uint256 /*block_number*/,
        uint256 /*op_code*/
    ) external vmOnly {
        ${reactLogic}
    }
}`;

    return {
        reactiveSmartContractTemplate: template,
        generatedFunctions
    };
}