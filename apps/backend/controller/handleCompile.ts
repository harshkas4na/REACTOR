import { Request, Response } from "express";
const solc = require('solc');


export default async function handleCompile(req: Request, res: Response){
    try {
      const { sourceCode } = req.body;
      const { abi, bytecode } = await compileContract(sourceCode);
      res.json({ abi, bytecode });
    } catch (error) {
      console.error('Error in recompile:', error);
      res.status(500).json({ error: 'An error occurred while recompiling the contract' });
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