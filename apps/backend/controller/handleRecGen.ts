import { Request, Response } from "express";
import { validateContractInput } from "../zod/validateContractInput";
import crypto from 'crypto';
const solc = require('solc');

export default async function handleRecGen(req: Request, res: Response) {
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

interface TopicFunctionPair {
    topic0: string;
    function: string;
}

interface ContractInput {
    topicFunctionPairs: TopicFunctionPair[];
    chainId: number;
    originContract: string;
    destinationContract: string;
    ownerAddress?: string;  // Optional ownerAddress parameter
}

function generateEventConstants(topicFunctionPairs: TopicFunctionPair[]): string {
    return topicFunctionPairs.map((pair, index) => {
        return `uint256 private constant EVENT_${index}_TOPIC_0 = ${pair.topic0};`;
    }).join('\n    ');
}

function generateSubscriptions(topicFunctionPairs: TopicFunctionPair[]): string {
    return topicFunctionPairs.map((pair, index) => `
    bytes memory payload_${index} = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            CHAIN_ID,
            _ORIGIN_CONTRACT,
            EVENT_${index}_TOPIC_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        (subscription_result,) = address(service).call(payload_${index});
        if (!subscription_result) {
            vm = true;
        }`).join('\n');
}

function generateReactLogic(topicFunctionPairs: TopicFunctionPair[], ownerCheck: boolean): string {
    const ownerCondition = ownerCheck ? `
        require(msg.sender == _OWNER, 'Only owner can trigger react');` : '';

    const reactLogic = topicFunctionPairs.map((pair, index) => `
        if (topic_0 == EVENT_${index}_TOPIC_0) {
            bytes memory payload = abi.encodeWithSignature(
                "${pair.function}(address,uint256)",
                address(0),
                topic_1
            );
            emit Callback(chain_id, _DESTINATION_CONTRACT, CALLBACK_GAS_LIMIT, payload);
        }`).join(' else ');

    return `${ownerCondition} ${reactLogic}`;
}

export const generateReactiveSmartContractTemplate = (input: ContractInput) => {
    const { topicFunctionPairs, chainId, originContract, destinationContract, ownerAddress } = input;

    const eventConstants = generateEventConstants(topicFunctionPairs);
    const subscriptions = generateSubscriptions(topicFunctionPairs);
    const reactLogic = generateReactLogic(topicFunctionPairs, !!ownerAddress);

    const ownerDeclaration = ownerAddress ? `address private immutable _OWNER = ${ownerAddress};` : '';

    const template = `
    // SPDX-License-Identifier: UNLICENSED

    pragma solidity >=0.8.0;
    
    interface IReactive {
        event Callback(
            uint256 indexed chain_id,
            address indexed _contract,
            uint64 indexed gas_limit,
            bytes payload
        );
    
        function react(
            uint256 chain_id,
            address ORIGIN_CONTRACT,
            uint256 topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3,
            bytes calldata data,
            uint256 block_number,
            uint256 op_code
        ) external;
    }

    interface ISubscriptionService {
        function subscribe(
            uint256 chain_id,
            address ORIGIN_CONTRACT,
            uint256 topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3
        ) external;
    
        function unsubscribe(
            uint256 chain_id,
            address ORIGIN_CONTRACT,
            uint256 topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3
        ) external;
    }
    
    contract ReactiveSmartContract is IReactive {
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
    
        uint256 private constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
    
        uint256 private constant CHAIN_ID = ${chainId};
        address private immutable _ORIGIN_CONTRACT;
        address private immutable _DESTINATION_CONTRACT;
    
        uint64 private constant CALLBACK_GAS_LIMIT = 1000000;

        ${ownerDeclaration}
    
        ${eventConstants}
    
        bool private vm;
        ISubscriptionService private immutable service;
        uint256 public counter;
    
        constructor(address service_address) {
            service = ISubscriptionService(service_address);
            bool subscription_result;
            
            _ORIGIN_CONTRACT = ${originContract};
            _DESTINATION_CONTRACT = ${destinationContract};
            
            ${subscriptions}
        }
    
        modifier vmOnly() {
            require(vm, 'VM only');
            _;
        }
    
        function react(
            uint256 chain_id,
            address /* ORIGIN_CONTRACT */,
            uint256 topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3,
            bytes calldata data,
            uint256 /* block_number */,
            uint256 /* op_code */
        ) external vmOnly {
            emit Event(chain_id, _ORIGIN_CONTRACT, topic_0, topic_1, topic_2, topic_3, data, ++counter);
            
            ${reactLogic}
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

        
    }
    `;

    return template;
};