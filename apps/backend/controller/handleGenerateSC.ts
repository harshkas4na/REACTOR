import { Request, Response } from "express";
import { validateContractInput } from "../zod/validateContractInput";
import crypto from 'crypto';
const solc = require('solc');

interface EventInput {
    name: string;
    type: string;
    indexed: boolean;
}

interface TopicFunctionPair {
    event: string;
    function: string;
    topic0: string;
    eventInputs?: EventInput[];
}

interface ContractInput {
    topicFunctionPairs: TopicFunctionPair[];
    chainId: number;
    originContract: string;
    destinationContract: string;
    ownerAddress?: string;
    isPausable: boolean;
}

export default async function handleGenerateSC(req: Request, res: Response) {
    try {
        const input: ContractInput = req.body;
        const reactiveSmartContractTemplate = generateReactiveSmartContractTemplate(input);

        res.json({
            reactiveSmartContractTemplate,
        });
    } catch (error) {
        console.error('Error in handleGenerate:', error);
        res.status(500).json({ error: 'An error occurred while generating the contract' });
    }
}

function generateEventConstants(topicFunctionPairs: TopicFunctionPair[]): string {
    return topicFunctionPairs.map((pair, index) => {
        return `uint256 private constant EVENT_${index}_TOPIC_0 = ${pair.topic0};`;
    }).join('\n    ');
}

function generateSubscriptions(topicFunctionPairs: TopicFunctionPair[], chainId: number, originContract: string): string {
    return topicFunctionPairs.map((pair, index) => `
        bytes memory payload_${index} = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            CHAIN_ID,
            ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        (bool subscription_result_${index},) = address(service).call(payload_${index});
        vm = !subscription_result_${index};`).join('\n');
}

function generateReactLogic(topicFunctionPairs: TopicFunctionPair[], destinationContract: string): string {
    return topicFunctionPairs.map((pair, index) => {
        const { event, function: functionName, eventInputs } = pair;
        let decodingLogic = '';
        let functionInputs = '';

        if (eventInputs && eventInputs.length > 0) {
            const structName = `${event}Data`;
            decodingLogic = `
            ${structName} memory eventData = abi.decode(data, (${structName}));`;
            functionInputs = eventInputs.map(input => `eventData.${input.name}`).join(', ');
        }

        return `
        if (topic_0 == EVENT_${index}_TOPIC_0) {
            ${decodingLogic}
            bytes memory payload = abi.encodeWithSignature(
                "${functionName}(${eventInputs ? eventInputs.map(i => i.type).join(',') : ''})",
                ${functionInputs}
            );
            emit Callback(chain_id, DESTINATION_CONTRACT, CALLBACK_GAS_LIMIT, payload);
        }`;
    }).join(' else ');
}

export const generateReactiveSmartContractTemplate = (input: ContractInput) => {
    const { topicFunctionPairs, chainId, originContract, destinationContract, ownerAddress, isPausable } = input;

    const eventConstants = generateEventConstants(topicFunctionPairs);
    const subscriptions = generateSubscriptions(topicFunctionPairs, chainId, originContract);
    const reactLogic = generateReactLogic(topicFunctionPairs, destinationContract);

    const baseContract = isPausable ? 'AbstractPausableReactive' : 'AbstractReactive';
    const pausableImport = isPausable ? "import '../../AbstractPausableReactive.sol';" : "import '../../AbstractReactive.sol';";
    const pausedInitialization = isPausable ? 'paused = false;' : '';
    const getPausableSubscriptionsFunction = isPausable ? `
    function getPausableSubscriptions() override internal pure returns (Subscription[] memory) {
        Subscription[] memory result = new Subscription[](${topicFunctionPairs.length});
        ${topicFunctionPairs.map((_, index) => `
        result[${index}] = Subscription(
            CHAIN_ID,
            ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );`).join('\n')}
        return result;
    }` : '';

    const template = `
    // SPDX-License-Identifier: GPL-2.0-or-later
    pragma solidity >=0.8.0;
    
    import '../../IReactive.sol';
    ${pausableImport}
    import '../../ISubscriptionService.sol';
    
    contract ReactiveSmartContract is IReactive, ${baseContract} {
        event Callback(
            uint256 indexed chain_id,
            address indexed _contract,
            uint64 indexed gas_limit,
            bytes payload
        );
    
        uint256 private constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
    
        uint256 private constant CHAIN_ID = ${chainId};
        address private immutable ORIGIN_CONTRACT = ${originContract};
        address private immutable DESTINATION_CONTRACT = ${destinationContract};
    
        uint64 private constant CALLBACK_GAS_LIMIT = 1000000;
    
        ${eventConstants}
    
        constructor() {
            ${pausedInitialization}
            owner = ${ownerAddress || 'msg.sender'};
            
            ${subscriptions}
        }
    
        receive() external payable {}
    
        ${getPausableSubscriptionsFunction}
    
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
        ) external vmOnly {
            ${reactLogic}
        }
    }
    `;

    return template;
};