"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AutomationCard from './AutomationCard';
import { useAutomationContext } from '@/app/_context/AutomationContext';


export default function AutomationForm2({ 
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
    setAutomations
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