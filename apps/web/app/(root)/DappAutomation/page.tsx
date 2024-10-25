"use client";
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, HelpCircle, Loader2, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const AutomationPage = () => {
  // State Management
  const [state, setState] = useState({
    automationType: 'single',
    originAddress: '',
    destinationAddress: '',
    contractData: null,
    selectedEvent: null,
    selectedPairs: [],
    inputConfigurations: {},
    eventDecodingConfig: {},
    validationErrors: {},
    isLoading: false,
    error: '',
    successMessage: '',
    step: 1,
    isPausable: false,
    applicableAddresses: '',
    reactiveContract: '',
  });

  const [inputConfig, setInputConfig] = useState({
    mappings: {},
    staticValues: {},
    decodedData: {},
    conditions: {},
  });

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('automationConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      setState(prev => ({ ...prev, ...parsedConfig }));
    }
  }, []);

  // Save configuration
  const saveConfiguration = () => {
    const config = {
      automationType: state.automationType,
      originAddress: state.originAddress,
      destinationAddress: state.destinationAddress,
      selectedPairs: state.selectedPairs,
      inputConfigurations: state.inputConfigurations,
      applicableAddresses: state.applicableAddresses,
      isPausable: state.isPausable,
    };
    localStorage.setItem('automationConfig', JSON.stringify(config));
  };

  // Handlers
  const handleAutomationTypeChange = (value) => {
    setState(prev => ({
      ...prev,
      automationType: value,
      destinationAddress: value === 'single' ? '' : prev.destinationAddress
    }));
  };

  const fetchContractData = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    try {
      const response = await fetch('http://localhost:5000/DappAutomation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAddress: state.originAddress,
          destinationAddress: state.destinationAddress
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch contract data');
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        contractData: data,
        isLoading: false,
        step: 2,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  };

  const handleEventSelection = (eventName) => {
    setState(prev => ({
      ...prev,
      selectedEvent: prev.selectedEvent === eventName ? null : eventName
    }));
  };

  const handlePairSelection = (eventName, functionName) => {
    setState(prev => {
      const pair = { event: eventName, function: functionName };
      const exists = prev.selectedPairs.some(
        p => p.event === eventName && p.function === functionName
      );

      return {
        ...prev,
        selectedPairs: exists 
          ? prev.selectedPairs.filter(p => p.event !== eventName || p.function !== functionName)
          : [...prev.selectedPairs, pair],
      };
    });
  };

  const handleInputConfigChange = (functionName, inputName, value) => {
    setInputConfig(prev => ({
      ...prev,
      staticValues: {
        ...prev.staticValues,
        [functionName]: {
          ...(prev.staticValues[functionName] || {}),
          [inputName]: value
        }
      }
    }));
  };

  const handleConditionChange = (functionName, condition) => {
    setInputConfig(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [functionName]: condition
      }
    }));
  };

  const generateContract = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));
    try {
      const response = await fetch('http://localhost:5000/generateDA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationType: state.automationType,
          originAddress: state.originAddress,
          destinationAddress: state.destinationAddress,
          selectedPairs: state.selectedPairs,
          functionInputs: inputConfig.staticValues,
          conditions: inputConfig.conditions,
          applicableAddresses: state.applicableAddresses.split(',').map(addr => addr.trim()),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate contract');
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        reactiveContract: data.reactiveSmartContractTemplate,
        successMessage: 'Contract generated successfully!',
        step: 3,
        isLoading: false,
      }));
      saveConfiguration();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Automation</h1>
      
      {/* Step 1: Initial Configuration */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Step 1: Contract Configuration</CardTitle>
          <CardDescription>Set up your automation parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="mb-4">
              <Label>Automation Type</Label>
              <RadioGroup 
                value={state.automationType} 
                onValueChange={handleAutomationTypeChange}
                className="mt-2"
              >
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

            <div>
              <Label htmlFor="originAddress">Origin Contract Address</Label>
              <Input
                id="originAddress"
                value={state.originAddress}
                onChange={(e) => setState(prev => ({ ...prev, originAddress: e.target.value }))}
                placeholder="0x..."
                className="mt-1"
              />
            </div>
            
            {state.automationType === 'multiple' && (
              <div>
                <Label htmlFor="destinationAddress">Destination Contract Address</Label>
                <Input
                  id="destinationAddress"
                  value={state.destinationAddress}
                  onChange={(e) => setState(prev => ({ ...prev, destinationAddress: e.target.value }))}
                  placeholder="0x..."
                  className="mt-1"
                />
              </div>
            )}
            
            <Button 
              onClick={fetchContractData} 
              disabled={state.isLoading}
              className="w-full"
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching Contract Data...
                </>
              ) : (
                'Fetch Contract Data'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Step 2: Event-Function Pairing */}
      {state.contractData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Select events to pair with functions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {state.contractData.events.map((event) => (
                  <div 
                    key={event.name} 
                    className={`mb-4 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                      state.selectedEvent === event.name ? 'bg-slate-100' : ''
                    }`}
                    onClick={() => handleEventSelection(event.name)}
                  >
                    <div className="flex items-center">
                      <h3 className="font-semibold flex-grow">{event.name}</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to select this event for pairing</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="ml-4 mt-2">
                      {event.inputs.map((input) => (
                        <div key={input.name} className="text-sm">
                          {input.name}: {input.type}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Functions</CardTitle>
              <CardDescription>
                {state.selectedEvent 
                  ? `Select functions to pair with event: ${state.selectedEvent}`
                  : 'Select an event first to pair with functions'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {state.contractData.functions.map((func) => (
                  <div key={func.name} className="mb-4 p-2">
                    <div className="flex items-center space-x-2">
                      {state.selectedEvent && (
                        <Checkbox
                          id={`${state.selectedEvent}-${func.name}`}
                          checked={state.selectedPairs.some(
                            pair => pair.event === state.selectedEvent && pair.function === func.name
                          )}
                          onCheckedChange={() => handlePairSelection(state.selectedEvent, func.name)}
                        />
                      )}
                      <Label
                        htmlFor={`${state.selectedEvent}-${func.name}`}
                        className="font-semibold cursor-pointer flex-grow"
                      >
                        {func.name}
                      </Label>
                    </div>
                    <div className="ml-4 mt-2">
                      {func.inputs.map((input) => (
                        <div key={input.name} className="text-sm">
                          {input.name}: {input.type}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Function Input Configuration */}
      {state.selectedPairs.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Selected Pairs Configuration</CardTitle>
            <CardDescription>Configure inputs and conditions for selected pairs</CardDescription>
          </CardHeader>
          <CardContent>
            {state.selectedPairs.map((pair, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-medium mb-2">{pair.event} → {pair.function}</h3>
                {state.contractData.functions
                  .find(f => f.name === pair.function)
                  .inputs.map((input) => (
                    <div key={input.name} className="mb-2">
                      <Label htmlFor={`${pair.function}-${input.name}`}>
                        {input.name} ({input.type})
                      </Label>
                      <Input
                        id={`${pair.function}-${input.name}`}
                        value={inputConfig.staticValues[pair.function]?.[input.name] || ''}
                        onChange={(e) => handleInputConfigChange(pair.function, input.name, e.target.value)}
                        placeholder={`Enter ${input.type} value`}
                        className="mt-1"
                      />
                    </div>
                  ))}
                <div className="mt-2">
                  <Label htmlFor={`${pair.function}-condition`}>Execution Condition</Label>
                  <Input
                    id={`${pair.function}-condition`}
                    value={inputConfig.conditions[pair.function] || ''}
                    onChange={(e) => handleConditionChange(pair.function, e.target.value)}
                    placeholder="e.g., msg.value > 1 ether"
                    className="mt-1"
                  />
                </div>
                {index < state.selectedPairs.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Additional Settings */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>Configure contract behavior and restrictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="applicableAddresses">Whitelisted Addresses (comma-separated)</Label>
              <Input
                id="applicableAddresses"
                value={state.applicableAddresses}
                onChange={(e) => setState(prev => ({ ...prev, applicableAddresses: e.target.value }))}
                placeholder="0x123..., 0x456..."
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
            <Checkbox
                  id="isPausable"
                  checked={state.isPausable}
                  onCheckedChange={(checked) => setState(prev => ({ ...prev, isPausable: checked }))}
                />
                <Label htmlFor="isPausable" className="cursor-pointer">
                  Allow pausing automation
                </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      {state.selectedPairs.length > 0 && (
        <Button
          onClick={generateContract}
          disabled={state.isLoading}
          className="mt-4 w-full"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Contract...
            </>
          ) : (
            'Generate Contract'
          )}
        </Button>
      )}

      {/* Success Message */}
      {state.successMessage && (
        <Alert className="mt-4">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{state.successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Generated Contract Display */}
      {state.reactiveContract && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Generated Contract</CardTitle>
            <CardDescription>Your reactive smart contract code</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              <Textarea
                value={state.reactiveContract}
                readOnly
                className="font-mono"
              />
            </ScrollArea>
            <Button
              onClick={() => navigator.clipboard.writeText(state.reactiveContract)}
              className="mt-4"
            >
              Copy to Clipboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomationPage;