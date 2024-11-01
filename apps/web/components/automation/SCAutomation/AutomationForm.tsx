"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AutomationCard from './AutomationCard';
import ConfigurationFields from './ConfigurationFields';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AutomationForm({ 
  onSubmit, 
  isLoading, 
  error,
  isValidForm
}: { 
  onSubmit: (e: React.FormEvent) => Promise<void>,
  isLoading: boolean,
  error: string,
  isValidForm: boolean
}) {
  const {
    automations,
    setAutomations,
    OrgChainId,
    DesChainId,
    setOrgChainId,
    setDesChainId,
    originAddress,
    destinationAddress,
    setOriginAddress,
    setDestinationAddress,
  } = useAutomationContext();

  const [sameChain, setSameChain] = useState(false);
  const [validations, setValidations] = useState({
    event: Array(automations.length).fill(false),
    function: Array(automations.length).fill(false),
    originAddress: false,
    destinationAddress: false,
    OrgChainId: false,
    DesChainId: false,
  });

  const handleAddAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }]);
    setValidations(prev => ({
      ...prev,
      event: [...prev.event, true],
      function: [...prev.function, true],
    }));
  };

  const handleSameChainToggle = (checked: boolean) => {
    setSameChain(checked);
    if (checked) {
      setDesChainId(OrgChainId);
    }
  };


  const validateEthereumAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateChainId = (chainId: string) => {
    return !isNaN(Number(chainId)) && Number(chainId) > 0;
  };

  

  useEffect(() => {
    setValidations(prev => ({
      ...prev,
      originAddress: validateEthereumAddress(originAddress),
      destinationAddress: validateEthereumAddress(destinationAddress),
      OrgChainId: validateChainId(OrgChainId),
      DesChainId: validateChainId(DesChainId),
    }));
  }, [originAddress, destinationAddress, OrgChainId, DesChainId]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <Label className="text-gray-300">Automations</Label>
        {automations.map((automation, index) => (
          <AutomationCard
            key={index}
            automation={automation}
            index={index}
            
          />
        ))}
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAddAutomation} 
          className="text-gray-300 border-gray-600 hover:bg-gray-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Input Rules:</strong>
          <ul className="list-disc pl-5 mt-2">
            <li>Event format: EventName(type1,type2,...)</li>
            <li>Function format: functionName(address,type2,...)</li>
            <li>Valid types: address, uint256, string, bool, bytes32, uint8</li>
            <li>Addresses must be valid Ethereum addresses (0x...)</li>
            <li>Chain IDs must be positive numbers</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="space-y-4 text-gray-200">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sameChain" 
            checked={sameChain}
            className="bg-gray-700 text-gray-100 border-gray-600 focus:ring-primary"
            onCheckedChange={handleSameChainToggle}
          />
          <Label 
            htmlFor="sameChain" 
            className="text-gray-300"
          >
            Origin and destination chains are the same
          </Label>
        </div>

        {sameChain ? (
          <div className="space-y-2">
            <Label className="text-gray-300">Chain ID</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="number"
                    value={OrgChainId}
                    onChange={(e) => {
                      setOrgChainId(e.target.value);
                      setDesChainId(e.target.value);
                    }}
                    placeholder="Enter Chain ID"
                    className={`w-full p-2 bg-gray-800 border rounded-md text-gray-300 ${
                      validations.OrgChainId ? 'border-green-500' : 'border-red-500'
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter a valid positive number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Origin Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={OrgChainId}
                      onChange={(e) => setOrgChainId(e.target.value)}
                      placeholder="Enter Origin Chain ID"
                      className={`w-full p-2 bg-gray-800 border rounded-md text-gray-300 ${
                        validations.OrgChainId ? 'border-green-500' : 'border-red-500'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter a valid positive number</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Destination Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={DesChainId}
                      onChange={(e) => setDesChainId(e.target.value)}
                      placeholder="Enter Destination Chain ID"
                      className={`w-full p-2 bg-gray-800 border rounded-md text-gray-300 ${
                        validations.DesChainId ? 'border-green-500' : 'border-red-500'
                      }`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter a valid positive number</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>

      <ConfigurationFields 
        isOriginAddressValid={validations.originAddress}
        isDestinationAddressValid={validations.destinationAddress}
      />

      {error && <p className="text-red-400">{error}</p>}

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary-foreground hover:text-gray-100" 
        disabled={isLoading || !isValidForm}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}