"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AutomationCard from './AutomationCard';
import { useAutomationContext } from '@/app/_context/AutomationContext';

interface AutomationForm2Props {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isValidForm: boolean;
}

export default function AutomationForm2({ 
  onSubmit, 
  isLoading, 
  error,
  isValidForm
}: AutomationForm2Props) {
  const { automations, setAutomations } = useAutomationContext();

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
        <Label className="text-zinc-300 text-lg font-medium">Automations</Label>
        
        <div className="space-y-4">
          {automations.map((automation, index) => (
            <AutomationCard
              key={index}
              automation={automation}
              index={index}
            />
          ))}
        </div>

        <Button 
          type="button" 
          variant="outline" 
          onClick={handleAddAutomation} 
          className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-zinc-200 border-blue-500/20 flex items-center justify-center transition-colors"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      <Alert className="bg-blue-900/20 border-blue-500/50">
        <AlertDescription className="text-zinc-200">
          <strong className="text-blue-400 font-medium">Input Rules:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Event format: EventName(type1,type2,...)</li>
            <li>Function format: functionName(address,type1,...) [Keep the first argument fix as address]</li>
            <li>Valid types: address, uint256, string, bool, bytes32, uint8</li>
            <li>Addresses must be valid Ethereum addresses (0x...)</li>
            <li>Chain IDs must be positive numbers</li>
          </ul>
        </AlertDescription>
      </Alert>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-400">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-white transition-colors" 
        disabled={isLoading || !isValidForm}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}