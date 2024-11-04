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
    <Card className="transition-colors
      dark:bg-gray-800 dark:border-gray-700
      light:bg-white light:border-gray-200">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label className="dark:text-gray-300 light:text-gray-700">Event</Label>
          <Input
            value={automation.event}
            onChange={(e) => handleAutomationChange('event', e.target.value)}
            placeholder="Event(address,uint256)"
            required
            className={`transition-colors
              dark:bg-gray-700 dark:text-gray-100 
              light:bg-gray-50 light:text-gray-900 
              ${validateEventInput(automation.event) 
                ? 'border-green-500' 
                : 'border-red-500'
              }`}
          />
          {!validateEventInput(automation.event) && (
            <p className="dark:text-red-400 light:text-red-600 text-sm">
              Invalid event signature. Use format: EventName(type1,type2,...)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="dark:text-gray-300 light:text-gray-700">Function</Label>
          <Input
            value={automation.function}
            onChange={(e) => handleAutomationChange('function', e.target.value)}
            placeholder="FunctionName(address,uint256)"
            required
            className={`transition-colors
              dark:bg-gray-700 dark:text-gray-100 
              light:bg-gray-50 light:text-gray-900 
              ${validateFunctionInput(automation.function) 
                ? 'border-green-500' 
                : 'border-red-500'
              }`}
          />
          {!validateFunctionInput(automation.function) && (
            <p className="dark:text-red-400 light:text-red-600 text-sm">
              Invalid function signature. Use format: FunctionName(address,type1,type2,...)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="dark:text-gray-300 light:text-gray-700">Topic0 (auto-generated)</Label>
          <Input
            value={automation.topic0 || ''}
            readOnly
            className="transition-colors
              dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600
              light:bg-gray-50 light:text-gray-900 light:border-gray-300"
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
                    className="transition-colors
                      dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-700
                      light:text-red-600 light:hover:text-red-500 light:hover:bg-gray-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="dark:bg-gray-800 dark:text-gray-200 light:bg-white light:text-gray-800">
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