// src/services/CompilationService.ts

import solc from 'solc';
import { GeneratedContracts } from '../types/ExtDAppAutomationTypes';
import { CompilationError } from '../utils/error';

export class CompilationService {
    async compileContracts(
        rscCode: string,
        destCode: string
    ): Promise<GeneratedContracts> {
        const input = {
            language: 'Solidity',
            sources: {
                'RSC.sol': { content: rscCode },
                'Destination.sol': { content: destCode }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode']
                    }
                },
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        };

        try {
            const output = JSON.parse(solc.compile(JSON.stringify(input)));

            if (output.errors) {
                const errors = output.errors.filter(
                    (error: any) => error.severity === 'error'
                );
                if (errors.length > 0) {
                    throw new CompilationError(errors[0].message);
                }
            }

            const rscContract = output.contracts['RSC.sol']['ReactiveSmartContract'];
            const destContract = 
                output.contracts['Destination.sol']['DestinationContract'];

            return {
                rsc: {
                    code: rscCode,
                    abi: rscContract.abi,
                    bytecode: rscContract.evm.bytecode.object
                },
                destination: {
                    code: destCode,
                    abi: destContract.abi,
                    bytecode: destContract.evm.bytecode.object
                }
            };
        } catch (error:any) {
            throw new CompilationError(
                `Compilation failed: ${error.message}`
            );
        }
    }
}