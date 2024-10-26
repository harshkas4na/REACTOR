"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AutomationCard from './AutomationCard';
import ConfigurationFields from './ConfigurationFields';
import { useAutomationContext } from '@/app/_context/AutomationContext';

export default function AutomationForm({ 
  onSubmit, 
  isLoading, 
  error 
}: { 
  onSubmit: (e: React.FormEvent) => Promise<void>,
  isLoading: boolean,
  error: string
}) {
  const {
    automations,
    setAutomations,
    OrgChainId,
    DesChainId,
    setOrgChainId,
    setDesChainId,
  } = useAutomationContext();

  const [sameChain, setSameChain] = useState(false);

  const handleAddAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }]);
  };

  const handleSameChainToggle = (checked: boolean) => {
    setSameChain(checked);
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
            <input
              type="number"
              name="chainId"
              placeholder="Enter Chain ID"
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Origin Chain ID</Label>
              <input
                type="number"
                value={OrgChainId}
                onChange={(e) => setOrgChainId(e.target.value)}
                name="originChainId"
                placeholder="Enter Origin Chain ID"
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Destination Chain ID</Label>
              <input
                type="number"
                name="destinationChainId"
                value={DesChainId}
                onChange={(e) => setDesChainId(e.target.value)}
                placeholder="Enter Destination Chain ID"
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300"
              />
            </div>
          </div>
        )}
      </div>

      <ConfigurationFields />

      {error && <p className="text-red-400">{error}</p>}

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary-foreground hover:text-gray-900" 
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}