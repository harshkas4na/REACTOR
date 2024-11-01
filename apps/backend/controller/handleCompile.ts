import { Request, Response } from "express";
const solc = require('solc');

export default async function handleCompile(req: Request, res: Response) {
    try {
        const { sourceCode } = req.body;
        console.log('Received source code:', sourceCode);
        const { abi, bytecode } = await compileContract(sourceCode);
        console.log("Compilation successful. ABI and bytecode generated.");
        res.json({ abi, bytecode });
    } catch (error:any) {
        console.error('Error in compile:', error);
        res.status(500).json({ error: 'An error occurred while compiling the contract', details: error.message });
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
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    try {
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        
        // Check for compilation errors
        if (output.errors) {
            const errors = output.errors.filter((error: any) => error.severity === 'error');
            if (errors.length > 0) {
                console.error('Compilation errors:', errors);
                throw new Error('Contract compilation failed: ' + errors[0].message);
            }
        }

        // Specifically target the ReactiveContract
        if (!output.contracts['Contract.sol']['ReactiveContract']) {
            throw new Error('ReactiveContract not found in compilation output');
        }

        const contract = output.contracts['Contract.sol']['ReactiveContract'];
        
        return {
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object
        };
    } catch (error:any) {
        console.error('Compilation error:', error);
        throw new Error(`Failed to compile contract: ${error.message}`);
    }
}