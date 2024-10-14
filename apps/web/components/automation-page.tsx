"use client";
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, ChevronDown, ChevronUp, Edit, Save,ArrowRight  } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAutomationContext } from '@/app/_context/AutomationContext';
// import { useRouter } from 'next/router';
import Link from 'next/link';


export function AutomationPageComponent() {
  const {
    automations,
    setAutomations,
    reactiveContract,
    setReactiveContract,
    isPausable,
    setIsPausable,
    chainId,
    setChainId,
    originAddress,
    setOriginAddress,
    destinationAddress,
    setDestinationAddress,
  } = useAutomationContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContract, setShowContract] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [editedContract, setEditedContract] = useState('');
  // const router = useRouter();

  const handleAddAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }]);
  };

  const handleRemoveAutomation = (index: number) => {
    const newAutomations = automations.filter((_, i) => i !== index);
    setAutomations(newAutomations);
  };

  const handlePausableToggle = async (checked: boolean) => {
    setIsPausable(checked);
    await regenerateContract(checked);
  };

  const regenerateContract = async (isPausable: boolean) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/generateSC', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicFunctionPairs: automations.map(({ topic0, function: func }) => ({ topic0, function: func })),
          chainId: parseInt(chainId),
          originContract: originAddress,
          destinationContract: destinationAddress,
          isPausable: isPausable,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract');
      }

      const data = await response.json();
      setReactiveContract(data.reactiveSmartContractTemplate);
    } catch (err) {
      setError('An error occurred while regenerating the contract. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reactiveContract) {
      setEditedContract(reactiveContract);
    }
  }, [reactiveContract]);

  const handleAutomationChange = (index: number, field: 'event' | 'function' | 'topic0', value: string) => {
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
          isPausable,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate contract');
      }

      const data = await response.json();
      setReactiveContract(data.reactiveSmartContractTemplate);
    } catch (err) {
      setError('An error occurred while generating the contract. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditContract = () => {
    setEditingContract(true);
    setEditedContract(reactiveContract);
  };

  const handleSaveEditedContract = () => {
    setReactiveContract(editedContract);
    setEditingContract(false);
  };

  // const handleMoveToNextPage = () => {
  //   router.push('/deployment-guide');
  // };
 
 
  

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-100 mb-8">Create Your Automation</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className="text-gray-300">Automations</Label>
            {automations.map((automation, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`event-${index}`} className="text-gray-300">Event</Label>
                      <Input
                        id={`event-${index}`}
                        value={automation.event}
                        onChange={(e) => handleAutomationChange(index, 'event', e.target.value)}
                        placeholder="Event name"
                        required
                        className="bg-gray-700 text-gray-100 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`function-${index}`} className="text-gray-300">Function</Label>
                      <Input
                        id={`function-${index}`}
                        value={automation.function}
                        onChange={(e) => handleAutomationChange(index, 'function', e.target.value)}
                        placeholder="Function name"
                        required
                        className="bg-gray-700 text-gray-100 border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`topic0-${index}`} className="text-gray-300">Topic0 (auto-generated)</Label>
                    <Input
                      id={`topic0-${index}`}
                      value={automation.topic0}
                      readOnly
                      className="bg-gray-600 text-gray-300 border-gray-700"
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
            <Button type="button" variant="outline" onClick={handleAddAutomation} className="text-gray-300 border-gray-600 hover:bg-gray-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Automation
            </Button>
          </div>

          <div>
            <Label htmlFor="chainId" className="text-gray-300">Chain ID</Label>
            <Input
              id="chainId"
              className="bg-gray-700 text-gray-100 border-gray-600"
              value={chainId}
              onChange={(e) => setChainId(e.target.value)}
              placeholder="Chain ID (e.g., 11155111 for Sepolia)"
              required
            />
          </div>
          

          <div>
            <Label htmlFor="originAddress" className="text-gray-300">Origin Contract Address</Label>
            <Input
              className="bg-gray-700 text-gray-100 border-gray-600"
              id="originAddress"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <Label htmlFor="destinationAddress" className="text-gray-300">Destination Contract Address</Label>
            <Input
              className="bg-gray-700 text-gray-100 border-gray-600"
              id="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

        <div className="flex items-center space-x-2">
            <Switch
              id="pausable-mode"
              checked={isPausable}
              className='bg-gray-700 text-gray-100 border-gray-600 focus:ring-primary'
              onCheckedChange={handlePausableToggle}
            />
            <Label htmlFor="pausable-mode" className="text-gray-300">Enable Pausable Functionality</Label>
          </div>
          {error && <p className="text-red-400">{error}</p>}

          <Button type="submit" className="w-full bg-primary hover:bg-primary-foreground" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Contract'}
          </Button>
        </form>




        {reactiveContract && (
          <Card className="mt-8 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-gray-100">
                <span>Reactive Contract</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContract(!showContract)}
                  className="text-gray-300 hover:text-gray-100"
                >
                  {showContract ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CardTitle>
            </CardHeader>
            {showContract && (
              <CardContent>
                {!editingContract ? (
                  <>
                    <div className="bg-gray-700 p-4 rounded-md">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap">{reactiveContract}</pre>
                    </div>
                    <Button onClick={handleEditContract} className="mt-4 bg-primary hover:bg-primary-foreground">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Contract
                    </Button>
                  </>
                ) : (
                  <>
                    <Textarea
                      value={editedContract}
                      onChange={(e) => setEditedContract(e.target.value)}
                      className="h-64 mb-4 bg-gray-700 text-gray-100 border-gray-600"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button onClick={() => setEditingContract(false)} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEditedContract} className="bg-primary hover:bg-primary-foreground">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
                
                <Card className="bg-gray-800 mt-4 border-gray-700 mb-6">
                  <CardHeader>
                    <CardTitle className="text-gray-100">Is Your Template Complete?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-4">
                      If you're satisfied with your Reactive Smart Contract template, you can proceed to the deployment guide.
                      If you need to make changes, you can edit the contract using the "View Contract" button below.
                    </p>
                    <div className="mt-4 flex justify-between">
                  
                        <Link href={"/deployment-guide"}>
                      <Button className="bg-green-600 hover:bg-green-700">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Proceed to Deployment Guide
                      </Button>
                        </Link>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}