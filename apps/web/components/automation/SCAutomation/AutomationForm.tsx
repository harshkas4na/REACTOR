"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
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
  } = useAutomationContext();

  const handleAddAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }]);
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

      <ConfigurationFields />

      {error && <p className="text-red-400">{error}</p>}

      <Button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary-foreground" 
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Contract'}
      </Button>
    </form>
  );
}