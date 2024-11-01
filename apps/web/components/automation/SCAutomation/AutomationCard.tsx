"use client";

import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { AutomationType } from '../../../types/Automation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutomationCardProps {
  automation: AutomationType;
  index: number;
}

export default function AutomationCard({
  automation,
  index
}: AutomationCardProps) {
  const { automations, setAutomations } = useAutomationContext();
  
  // Improved validation functions
  const validateEventInput = useCallback((input: string): boolean => {
    // Regex for event signature: event_name(type1,type2,...)
    const eventRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\((address|uint256|string|bool|bytes32|uint8)(,(address|uint256|string|bool|bytes32|uint8))*\)$/;
    return eventRegex.test(input);
  }, []);

  const validateFunctionInput = useCallback((input: string): boolean => {
    // Regex for function signature: function_name(address,type1,type2,...)
    const functionRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(address(,(address|uint256|string|bool|bytes32|uint8))*\)$/;
    return functionRegex.test(input);
  }, []);

  // Improved handleAutomationChange function
  const handleAutomationChange = useCallback((field: 'event' | 'function' | 'topic0', value: string) => {
    setAutomations(prevAutomations => 
      prevAutomations.map((a, i) => {
        if (i !== index) return a;

        const updatedAutomation = { ...a, [field]: value };

        if (field === 'event') {
          // Validate event input
          const isEventValid = validateEventInput(value);
          
          if (isEventValid) {
            // Generate topic0 only for valid event signatures
            try {
              updatedAutomation.topic0 = ethers.keccak256(ethers.toUtf8Bytes(value));
            } catch (error) {
              console.error('Error generating topic0:', error);
              updatedAutomation.topic0 = '';
            }
          } else {
            updatedAutomation.topic0 = '';
          }
        }

        return updatedAutomation;
      })
    );
  }, [index, setAutomations, validateEventInput]);

  // Remove automation handler
  const handleRemoveAutomation = useCallback(() => {
    setAutomations(prevAutomations => 
      prevAutomations.filter((_, i) => i !== index)
    );
  }, [index, setAutomations]);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Event</Label>
          <Input
            value={automation.event}
            onChange={(e) => handleAutomationChange('event', e.target.value)}
            placeholder="Event(address,uint256)"
            required
            className={`bg-gray-700 text-gray-100 border ${
              validateEventInput(automation.event) ? 'border-green-500' : 'border-red-500'
            }`}
          />
          {!validateEventInput(automation.event) && (
            <p className="text-red-400 text-sm">
              Invalid event signature. Use format: EventName(type1,type2,...)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Function</Label>
          <Input
            value={automation.function}
            onChange={(e) => handleAutomationChange('function', e.target.value)}
            placeholder="FunctionName(address,uint256)"
            required
            className={`bg-gray-700 text-gray-100 border ${
              validateFunctionInput(automation.function) ? 'border-green-500' : 'border-red-500'
            }`}
          />
          {!validateFunctionInput(automation.function) && (
            <p className="text-red-400 text-sm">
              Invalid function signature. Use format: FunctionName(address,type1,type2,...)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Topic0 (auto-generated)</Label>
          <Input
            value={automation.topic0 || ''}
            readOnly
            className="bg-gray-700 text-gray-100 border-gray-600"
          />
        </div>

        {index > 0 && (
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveAutomation}
                    className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove automation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}