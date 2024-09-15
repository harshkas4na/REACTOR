"use client";

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2 } from "lucide-react";

interface Automation {
  event: string;
  function: string;
  topic0: string;
}

export function AutomationPageComponent() {
  const [automations, setAutomations] = useState<Automation[]>([{ event: '', function: '', topic0: '' }]);
  const [reactiveContract, setReactiveContract] = useState('');
  const [abi, setAbi] = useState<any>(null);
  const [bytecode, setBytecode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [chainId, setChainId] = useState('11155111'); // Default to Sepolia

  const handleAddAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }]);
  };

  const handleRemoveAutomation = (index: number) => {
    const newAutomations = automations.filter((_, i) => i !== index);
    setAutomations(newAutomations);
  };

  const handleAutomationChange = (index: number, field: 'event' | 'function', value: string) => {
    const newAutomations = automations.map((automation, i) => {
      if (i === index) {
        const updatedAutomation = { ...automation, [field]: value };
        if (field === 'event') {
          updatedAutomation.topic0 = ethers.keccak256(ethers.toUtf8Bytes(value));
        }
        return updatedAutomation;
      }
      return automation;
    });
    setAutomations(newAutomations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicFunctionPairs: automations.map(({ topic0, function: func }) => ({ topic0, function: func })),
          chainId: parseInt(chainId),
          originContract: originAddress,
          destinationContract: destinationAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract');
      }

      const data = await response.json();
      setReactiveContract(data.reactiveSmartContractTemplate);
      setAbi(data.abi);
      setBytecode(data.bytecode);
    } catch (err) {
      setError('An error occurred while generating the contract. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const deployContract = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask to deploy the contract.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Switch to Kopli Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x512578' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x512578',
                chainName: 'Kopli Testnet',
                nativeCurrency: {
                  name: 'REACT',
                  symbol: 'REACT',
                  decimals: 18
                },
                rpcUrls: ['https://kopli-rpc.rkt.ink'],
                blockExplorerUrls: ['https://kopli.reactscan.net']
              }],
            });
          } catch (addError) {
            throw new Error('Failed to add Kopli Testnet to MetaMask');
          }
        } else {
          throw switchError;
        }
      }

      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      
      const contract = await factory.deploy("0x0000000000000000000000000000000000FFFFFF");
      await contract.waitForDeployment();

      setDeployedAddress(await contract.getAddress());
    } catch (err) {
      if (err instanceof Error) {
        setError('Failed to deploy the contract. ' + err.message);
      } else {
        setError('Failed to deploy the contract. An unknown error occurred.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Create Your Automation</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className='text-gray-800'>Automations</Label>
            {automations.map((automation, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`event-${index}`}>Event</Label>
                      <Input
                        id={`event-${index}`}
                        value={automation.event}
                        onChange={(e) => handleAutomationChange(index, 'event', e.target.value)}
                        placeholder="Event name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`function-${index}`}>Function</Label>
                      <Input
                        id={`function-${index}`}
                        value={automation.function}
                        onChange={(e) => handleAutomationChange(index, 'function', e.target.value)}
                        placeholder="Function name"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`topic0-${index}`}>Topic0 (auto-generated)</Label>
                    <Input
                    
                      id={`topic0-${index}`}
                      value={automation.topic0}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleRemoveAutomation(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={handleAddAutomation} className='text-gray-800'>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Automation
            </Button>
          </div>

          <div>
            <Label htmlFor="chainId" className='text-gray-900'>Chain ID</Label>
            <Input
              id="chainId"
              className='text-gray-900'
              value={chainId}
              onChange={(e) => setChainId(e.target.value)}
              placeholder="Chain ID (e.g., 11155111 for Sepolia)"
              required
            />
          </div>

          <div>
            <Label htmlFor="originAddress" className='text-gray-900'>Origin Contract Address</Label>
            <Input
            className='text-gray-900'
              id="originAddress"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <Label htmlFor="destinationAddress" className='text-gray-900'>Destination Contract Address</Label>
            <Input
            className='text-gray-900'
              id="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Contract'}
          </Button>
        </form>

        {reactiveContract && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Reactive Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-200 p-4 rounded-md">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">{reactiveContract}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        {abi && bytecode && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Deploy Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={deployContract} className="w-full" disabled={isLoading}>
                {isLoading ? 'Deploying...' : 'Deploy Contract with MetaMask'}
              </Button>
            </CardContent>
          </Card>
        )}

        {deployedAddress && (
          <div className="mt-4">
            <p className="text-green-600">Contract deployed successfully!</p>
            <p className="text-gray-700">Deployed address: {deployedAddress}</p>
            <a 
              href={`https://custom-block-explorer.com/address/${deployedAddress}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              View on Block Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
}