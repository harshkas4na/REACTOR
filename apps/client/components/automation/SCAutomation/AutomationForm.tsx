"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PlusCircle } from 'lucide-react';
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
    destinationAddress
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
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-6">
        <Label className="text-lg font-semibold text-gray-300">Automations</Label>
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
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200 hover:border-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 dark:hover:border-blue-700 transition-all duration-200"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Automation
        </Button>
      </div>

      <Alert className="bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-800">
        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
          <strong className="font-semibold">Input Rules:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Event format: EventName(type1,type2,...)</li>
            <li>Function format: functionName(address,type2,...)</li>
            <li>Valid types: address, uint256, string, bool, bytes32, uint8</li>
            <li>Addresses must be valid Ethereum addresses (0x...)</li>
            <li>Chain IDs must be positive numbers</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Checkbox 
            id="sameChain" 
            checked={sameChain}
            onCheckedChange={handleSameChainToggle}
            className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded checked:bg-blue-500 dark:checked:bg-blue-400"
          />
          <Label 
            htmlFor="sameChain" 
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Origin and destination chains are the same
          </Label>
        </div>

        {sameChain ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chain ID</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="number"
                    contentEditable={true}
                    value={OrgChainId}
                    onChange={(e) => {
                      setOrgChainId(e.target.value);
                      setDesChainId(e.target.value);
                    }}
                    placeholder="Enter Chain ID"
                    className={`w-full p-2 bg-white dark:bg-gray-800 border ${validations.OrgChainId ? 'border-green-500' : 'border-red-500'} rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-white dark:bg-white dark:text-gray-800 p-2 rounded-md shadow-lg">
                  <p>Enter a valid positive number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Origin Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={OrgChainId}
                      onChange={(e) => setOrgChainId(e.target.value)}
                      placeholder="Enter Origin Chain ID"
                      className={`w-full p-2 bg-white dark:bg-gray-800 border ${validations.OrgChainId ? 'border-green-500' : 'border-red-500'} rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 text-white dark:bg-white dark:text-gray-800 p-2 rounded-md shadow-lg">
                    <p>Enter a valid positive number</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destination Chain ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="number"
                      value={DesChainId}
                      onChange={(e) => setDesChainId(e.target.value)}
                      placeholder="Enter Destination Chain ID"
                      className={`w-full p-2 bg-white dark:bg-gray-800 border ${validations.DesChainId ? 'border-green-500' : 'border-red-500'} rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-800 text-white dark:bg-white dark:text-gray-800 p-2 rounded-md shadow-lg">
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
        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}

      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
        disabled={isLoading || !isValidForm}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}

