import { Request, Response } from "express";
import { validateContractInput } from "../zod/validateContractInput";
var solc = require('solc');

export default async function handleGenerate(req: Request, res: Response) {
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
    const contractName = 'BasicDemoReactiveContract'; // Make sure this matches your contract name

    if (output.errors) {
        console.error('Compilation errors:', output.errors);
        throw new Error('Contract compilation failed');
    }

    const contract = output.contracts['Contract.sol'][contractName];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

export const generateReactiveSmartContractTemplate = (input: any) => {
    const result = validateContractInput(input);
    if (!result.success) {
      throw new Error('Invalid input');
    }
  
    const { eventFunctionPairs } = result.data;
  
    const template = `
    // SPDX-License-Identifier: UNLICENSED

    pragma solidity >=0.8.0;
    
    interface IReactive {
        event DESTINATION_CONTRACT(
            uint256 indexed chain_id,
            address indexed ORIGIN_CONTRACT,
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
    
    contract BasicDemoReactiveContract is IReactive {
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
    
        uint256 private constant SEPOLIA_CHAIN_ID = 11155111;

        uint256 private constant EVENT_TOPIC_0 = 0x81b9c57fe7f61efea7e67d0add56f05cfc1eb0739ce8f328576502b545b7bed4;

    
        uint64 private constant GAS_LIMIT = 1000000;
    
        /**
         * Indicates whether this is a ReactVM instance of the contract.
         */
        bool private vm;
    
        // State specific to reactive network instance of the contract
    
        ISubscriptionService private service;
        address private _ORIGIN_CONTRACT;
        address private _DESTINATION_CONTRACT;
    
        // State specific to ReactVM instance of the contract
    
        uint256 public counter;
    
        constructor(address service_address, address ORIGIN_CONTRACT, address DESTINATION_CONTRACT) {
            service = ISubscriptionService(service_address);
            bytes memory payload = abi.encodeWithSignature(
                "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
                SEPOLIA_CHAIN_ID,
                ORIGIN_CONTRACT,
                EVENT_TOPIC_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
            (bool subscription_result,) = address(service).call(payload);
            if (!subscription_result) {
                vm = true;
            }
            _ORIGIN_CONTRACT = ORIGIN_CONTRACT;
            _DESTINATION_CONTRACT = DESTINATION_CONTRACT;
        }
    
        modifier vmOnly() {
            require(vm, 'VM only');
            _;
        }
    
        // Methods specific to ReactVM instance of the contract
    
        function react(
            uint256 chain_id,
            address ORIGIN_CONTRACT,
            uint256 topic_0,
            uint256 topic_1,
            uint256 topic_2,
            uint256 topic_3,
            bytes calldata data,
            uint256 /* block_number */,
            uint256 /* op_code */
        ) external vmOnly {
            emit Event(chain_id, ORIGIN_CONTRACT, topic_0, topic_1, topic_2, topic_3, data, ++counter);
            
            // Add your event-function pairs logic here
            ${generateEventFunctionPairsLogic(eventFunctionPairs)}
        }
    
        // Methods for testing environment only
    
        function subscribe(address ORIGIN_CONTRACT, uint256 topic_0) external {
            service.subscribe(
                SEPOLIA_CHAIN_ID,
                ORIGIN_CONTRACT,
                topic_0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
        }
    
        function unsubscribe(address ORIGIN_CONTRACT, uint256 topic_0) external {
            service.unsubscribe(
                SEPOLIA_CHAIN_ID,
                ORIGIN_CONTRACT,
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

function generateEventFunctionPairsLogic(eventFunctionPairs) {
    return eventFunctionPairs.map(pair => `
        if (topic_0 == uint256(keccak256(bytes("${pair.event}")))) {
            bytes memory payload = abi.encodeWithSignature("${pair.function}(address,uint256,uint256,uint256,bytes)", ORIGIN_CONTRACT, topic_1, topic_2, topic_3, data);
            emit DESTINATION_CONTRACT(chain_id, _DESTINATION_CONTRACT, GAS_LIMIT, payload);
        }
    `).join('\n');
}