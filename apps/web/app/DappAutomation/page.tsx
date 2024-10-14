"use client";
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, CheckCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { useAutomationContext } from '../_context/AutomationContext';

export default function AutomationPage() {
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

  const [automationType, setAutomationType] = useState('single');
  const [contractData, setContractData] = useState(null);
  const [selectedPairs, setSelectedPairs] = useState([]);
  const [functionInputs, setFunctionInputs] = useState({});
  const [conditions, setConditions] = useState({});
  const [applicableAddresses, setApplicableAddresses] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('automationConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setAutomationType(parsedConfig.automationType);
      setOriginAddress(parsedConfig.originAddress);
      setDestinationAddress(parsedConfig.destinationAddress);
      setSelectedPairs(parsedConfig.selectedPairs);
      setFunctionInputs(parsedConfig.functionInputs);
      setConditions(parsedConfig.conditions);
      setApplicableAddresses(parsedConfig.applicableAddresses);
    }
  }, []);

  const saveConfiguration = () => {
    const config = {
      automationType,
      originAddress,
      destinationAddress,
      selectedPairs,
      functionInputs,
      conditions,
      applicableAddresses,
    };
    localStorage.setItem('automationConfig', JSON.stringify(config));
  };

  const handleAutomationTypeChange = (value) => {
    setAutomationType(value);
    if (value === 'single') {
      setDestinationAddress('');
    }
  };

  const fetchContractData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/DappAutomation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originAddress, destinationAddress }),
      });
      if (!response.ok) throw new Error('Failed to fetch contract data');
      const data = await response.json();
      setContractData(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePairSelection = (eventName, functionName) => {
    const pair = { event: eventName, function: functionName };
    const pairExists = selectedPairs.some(
      (p) => p.event === eventName && p.function === functionName
    );

    if (pairExists) {
      setSelectedPairs(selectedPairs.filter((p) => p.event !== eventName || p.function !== functionName));
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  const handleFunctionInputChange = (functionName, inputName, value) => {
    setFunctionInputs((prev) => ({
      ...prev,
      [functionName]: {
        ...(prev[functionName] || {}),
        [inputName]: value,
      },
    }));
  };

  const handleConditionChange = (functionName, condition) => {
    setConditions((prev) => ({
      ...prev,
      [functionName]: condition,
    }));
  };

  const generateContract = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/generateDA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationType,
          originAddress,
          destinationAddress,
          selectedPairs,
          functionInputs,
          conditions,
          applicableAddresses: applicableAddresses.split(',').map(addr => addr.trim()),
        }),
      });
      if (!response.ok) throw new Error('Failed to generate contract');
      const data = await response.json();
      setReactiveContract(data.reactiveSmartContractTemplate);
      setSuccessMessage('Contract generated successfully!');
      setStep(3);
      saveConfiguration();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Automation</h1>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Step 1: Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Automation Type</Label>
            <RadioGroup value={automationType} onValueChange={handleAutomationTypeChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single">Single Contract</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="multiple" />
                <Label htmlFor="multiple">Multiple Contracts</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="originAddress">Origin Contract Address</Label>
            <Input
              id="originAddress"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          
          {automationType === 'multiple' && (
            <div className="mb-4">
              <Label htmlFor="destinationAddress">Destination Contract Address</Label>
              <Input
                id="destinationAddress"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
          )}
          
          <Button onClick={fetchContractData} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Fetch Contract Data
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {contractData && step >= 2 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Step 2: Event-Function Pairing</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              {contractData.events.map((event) => (
                <div key={event.name} className="mb-4">
                  <h3 className="font-semibold">{event.name}</h3>
                  {contractData.functions.map((func) => (
                    <div key={func.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${event.name}-${func.name}`}
                        checked={selectedPairs.some(
                          (pair) => pair.event === event.name && pair.function === func.name
                        )}
                        onCheckedChange={() => handlePairSelection(event.name, func.name)}
                      />
                      <Label htmlFor={`${event.name}-${func.name}`}>{func.name}</Label>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {selectedPairs.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Step 3: Function Inputs and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPairs.map(({ event, function: funcName }) => (
              <div key={`${event}-${funcName}`} className="mb-4">
                <h3 className="font-semibold">{`${event} -> ${funcName}`}</h3>
                {contractData.functions
                  .find((f) => f.name === funcName)
                  .inputs.map((input) => (
                    <div key={input.name} className="mb-2">
                      <Label htmlFor={`${funcName}-${input.name}`}>{input.name}</Label>
                      <Input
                        id={`${funcName}-${input.name}`}
                        value={functionInputs[funcName]?.[input.name] || ''}
                        onChange={(e) =>
                          handleFunctionInputChange(funcName, input.name, e.target.value)
                        }
                        placeholder={input.type}
                      />
                    </div>
                  ))}
                <div className="mb-2">
                  <Label htmlFor={`${funcName}-condition`}>Condition</Label>
                  <Input
                    id={`${funcName}-condition`}
                    value={conditions[funcName] || ''}
                    onChange={(e) => handleConditionChange(funcName, e.target.value)}
                    placeholder="e.g., msg.value > 1 ether"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Step 4: Additional Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="applicableAddresses">Applicable Addresses (comma-separated)</Label>
            <Input
              id="applicableAddresses"
              value={applicableAddresses}
              onChange={(e) => setApplicableAddresses(e.target.value)}
              placeholder="0x..., 0x..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPausable"
              checked={isPausable}
              onCheckedChange={setIsPausable}
            />
            <Label htmlFor="isPausable">Make contract pausable</Label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={generateContract} disabled={isLoading || selectedPairs.length === 0}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Generate Contract
      </Button>

      {successMessage && (
        <Alert className="mt-4">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {reactiveContract && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Generated Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={reactiveContract}
              readOnly
              className="h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}