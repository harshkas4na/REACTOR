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
        <Label className="dark:text-gray-300 light:text-gray-700">Automations</Label>
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
          className="transition-colors
            dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-100
            light:text-gray-700 light:border-gray-300 light:hover:bg-gray-100 light:hover:text-gray-900"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      <Alert className="dark:bg-gray-800 light:bg-gray-100 border dark:border-gray-700 light:border-gray-200">
        <AlertDescription className="dark:text-gray-300 light:text-gray-700">
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

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sameChain" 
            checked={sameChain}
            className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600
                     light:bg-gray-100 light:text-gray-900 light:border-gray-300 
                     focus:ring-primary"
            onCheckedChange={handleSameChainToggle}
          />
          <Label 
            htmlFor="sameChain" 
            className="dark:text-gray-300 light:text-gray-700"
          >
            Origin and destination chains are the same
          </Label>
        </div>

        {sameChain ? (
          <div className="space-y-2">
            <Label className="dark:text-gray-300 light:text-gray-700">Chain ID</Label>
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
                    className={`w-full p-2 transition-colors
                      dark:bg-gray-800 dark:text-gray-300 
                      light:bg-gray-50 light:text-gray-900 
                      ${validations.OrgChainId ? 'border-green-500' : 'border-red-500'}`}
                  />
                </TooltipTrigger>
                <TooltipContent className="dark:bg-gray-800 dark:text-gray-200 light:bg-white light:text-gray-800">
                  <p>Enter a valid positive number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="dark:text-gray-300 light:text-gray-700">Origin Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={OrgChainId}
                      onChange={(e) => setOrgChainId(e.target.value)}
                      placeholder="Enter Origin Chain ID"
                      className={`w-full p-2 transition-colors
                        dark:bg-gray-800 dark:text-gray-300 
                        light:bg-gray-50 light:text-gray-900 
                        ${validations.OrgChainId ? 'border-green-500' : 'border-red-500'}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-800 dark:text-gray-200 light:bg-white light:text-gray-800">
                    <p>Enter a valid positive number</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2">
              <Label className="dark:text-gray-300 light:text-gray-700">Destination Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={DesChainId}
                      onChange={(e) => setDesChainId(e.target.value)}
                      placeholder="Enter Destination Chain ID"
                      className={`w-full p-2 transition-colors
                        dark:bg-gray-800 dark:text-gray-300 
                        light:bg-gray-50 light:text-gray-900 
                        ${validations.DesChainId ? 'border-green-500' : 'border-red-500'}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-800 dark:text-gray-200 light:bg-white light:text-gray-800">
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

      {error && (
        <p className="dark:text-red-400 light:text-red-600">{error}</p>
      )}

      <Button 
        type="submit" 
        className="w-full transition-colors
          dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-100
          light:bg-blue-500 light:hover:bg-blue-600 light:text-white" 
        disabled={isLoading || !isValidForm}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}