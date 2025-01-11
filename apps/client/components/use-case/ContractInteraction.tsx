import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContractFunction {
  name: string;
  inputs: Array<{
    name: string;
    type: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
  stateMutability: string;
}

interface ContractInteractionProps {
  abi: string;
  contractAddress: string;
  web3: any;
  account: string;
}

const ContractInteraction: React.FC<ContractInteractionProps> = ({
    abi,
    contractAddress,
    web3,
    account
  }) => {
    const [functionInputs, setFunctionInputs] = useState<{[key: string]: {[key: string]: string}}>({});
    const [functionOutputs, setFunctionOutputs] = useState<{[key: string]: string}>({});
    const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  
    const parsedABI = JSON.parse(abi);
    const functions = parsedABI.filter((item: any) => 
      item.type === 'function'
    ) as ContractFunction[];
  
    const handleInputChange = (functionName: string, inputName: string, value: string) => {
      setFunctionInputs(prev => ({
        ...prev,
        [functionName]: {
          ...(prev[functionName] || {}),
          [inputName]: value
        }
      }));
    };
  
    // Helper function to format contract response
    const formatContractResponse = (response: any): string => {
      if (response === null || response === undefined) {
        return 'null';
      }
  
      if (typeof response === 'bigint') {
        return response.toString();
      }
  
      if (Array.isArray(response)) {
        return '[' + response.map(item => formatContractResponse(item)).join(', ') + ']';
      }
  
      if (typeof response === 'object') {
        // Handle objects that might contain BigInt values
        const formattedObj: any = {};
        Object.entries(response).forEach(([key, value]) => {
          formattedObj[key] = formatContractResponse(value);
        });
        return JSON.stringify(formattedObj, null, 2);
      }
  
      return String(response);
    };
  
    const callFunction = async (functionName: string, inputs: Array<{name: string, type: string}>, stateMutability: string) => {
      setIsLoading(prev => ({ ...prev, [functionName]: true }));
      try {
        const contract = new web3.eth.Contract(parsedABI, contractAddress);
        const inputValues = inputs.map(input => {
          const value = functionInputs[functionName]?.[input.name] || '';
          // Convert string inputs to appropriate types for contract call
          if (input.type.includes('int')) {
            return value === '' ? '0' : value; // Handle empty inputs for numbers
          }
          return value;
        });
  
        let result;
        if (stateMutability === 'view' || stateMutability === 'pure') {
          result = await contract.methods[functionName](...inputValues).call();
        } else {
          result = await contract.methods[functionName](...inputValues).send({ 
            from: account,
            // Add value if the function is payable
            ...(stateMutability === 'payable' ? { 
              value: web3.utils.toWei('0.1', 'ether') // Default to 0.1 ETH, adjust as needed
            } : {})
          });
        }
  
        const formattedResult = formatContractResponse(result);
        setFunctionOutputs(prev => ({
          ...prev,
          [functionName]: formattedResult
        }));
        
        toast.success(`Function ${functionName} executed successfully!`);
      } catch (error: any) {
        console.error(`Error calling function ${functionName}:`, error);
        toast.error(`Error: ${error.message}`);
      } finally {
        setIsLoading(prev => ({ ...prev, [functionName]: false }));
      }
    };
  
    return (
      <div className="space-y-4">
        {functions.map((func) => (
          <Accordion type="single" collapsible key={func.name}>
            <AccordionItem value={func.name}>
              <AccordionTrigger className="text-gray-200 hover:text-gray-100">
                <div className="flex items-center space-x-2">
                  <span>{func.name}</span>
                  <span className="text-sm text-gray-400">
                    ({func.stateMutability})
                  </span>
                  {func.stateMutability === 'payable' && (
                    <span className="text-xs text-yellow-500 ml-2">
                      Requires ETH
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gray-900 rounded-md">
                {func.inputs.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {func.inputs.map((input) => (
                      <div key={input.name}>
                        <Label className="text-gray-300">
                          {input.name} ({input.type})
                        </Label>
                        <Input
                          value={functionInputs[func.name]?.[input.name] || ''}
                          onChange={(e) => handleInputChange(func.name, input.name, e.target.value)}
                          placeholder={`Enter ${input.type}`}
                          className="mt-1 bg-gray-800 text-gray-200"
                        />
                      </div>
                    ))}
                  </div>
                )}
  
                <Button
                  onClick={() => callFunction(func.name, func.inputs, func.stateMutability)}
                  disabled={isLoading[func.name]}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  {isLoading[func.name] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    'Execute Function'
                  )}
                </Button>
  
                {functionOutputs[func.name] && (
                  <div className="mt-4">
                    <Label className="text-gray-300">Output</Label>
                    <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-700 text-gray-200 font-mono break-all whitespace-pre-wrap">
                      {functionOutputs[func.name]}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    );
  };
  
export default ContractInteraction;