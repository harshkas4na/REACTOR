"use client";

import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Info } from "lucide-react";
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { AutomationType } from '../../../types/Automation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface AutomationCardProps {
  automation: AutomationType;
  index: number;
}

export default function AutomationCard({
  automation,
  index
}: AutomationCardProps) {
  const { automations, setAutomations } = useAutomationContext();
  
  // Improved validation functions with broader type support
  const validateEventInput = useCallback((input: string): boolean => {
    // More comprehensive regex that supports various Solidity types including int, uint with different bit sizes
    const eventRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(([a-zA-Z0-9\[\]]+)(\,[a-zA-Z0-9\[\]]+)*\)$/;
    return eventRegex.test(input);
  }, []);

  const validateFunctionInput = useCallback((input: string): boolean => {
    // Check if input follows basic function signature pattern
    const basicPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(([a-zA-Z0-9\[\]]+)(\,[a-zA-Z0-9\[\]]+)*\)$/;
    
    // If it doesn't match the basic pattern, it's invalid
    if (!basicPattern.test(input)) return false;
    
    // Extract parameters from the function signature
    const paramsMatch = input.match(/\((.*)\)/);
    if (!paramsMatch || !paramsMatch[1]) return false;
    
    // Split parameters and check if the first one is 'address'
    const params = paramsMatch[1].split(',');
    return params.length > 0 && params[0].trim() === 'address';
  }, []);

  // Automation change handler
  const handleAutomationChange = useCallback((field: 'event' | 'function' | 'topic0', value: string) => {
    setAutomations(prevAutomations => 
      prevAutomations.map((a, i) => {
        if (i !== index) return a;

        const updatedAutomation = { ...a, [field]: value };

        if (field === 'event') {
          const isEventValid = validateEventInput(value);
          
          if (isEventValid) {
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
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 bg-blend-normal border-zinc-800">
      <CardContent className="space-y-4 p-4">
        {/* Event Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300">Event Signature</Label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-zinc-100">Event Format</h4>
                  <p className="text-sm text-zinc-300">
                    The event signature from your origin contract that you want to monitor.
                    Format: EventName(type1,type2,...)
                  </p>
                  <p className="text-sm text-zinc-300 mt-2">
                    Supports all Solidity types including:
                    • address
                    • uint/int (any bit size)
                    • string
                    • bool
                    • bytes (fixed and dynamic)
                    • arrays
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    Example: Transfer(address,address,uint256) or
                    PositionRegistered(address,uint256,address,int24,int24,int24)
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input
            value={automation.event}
            onChange={(e) => handleAutomationChange('event', e.target.value)}
            placeholder="Event(type1,type2,...)"
            required
            className={`bg-gray-900/50 border ${
              automation.event && !validateEventInput(automation.event) 
                ? 'border-red-500'
                : automation.event 
                ? 'border-green-500' 
                : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500`}
          />
          {automation.event && !validateEventInput(automation.event) && (
            <p className="text-red-400 text-sm">
              Invalid event signature format
            </p>
          )}
        </div>

        {/* Function Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300">Function Signature</Label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-zinc-100">Function Format</h4>
                  <p className="text-sm text-zinc-300">
                    The function to execute on your destination contract.
                    First parameter must be address (for ReactVM).
                  </p>
                  <div className="mt-2 p-2 bg-gray-900/50 rounded-md">
                    <p className="text-sm text-zinc-300">
                      Format: functionName(address,type1,type2,...)
                      First parameter is reserved for ReactVM address.
                    </p>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">
                    Example: executeTransfer(address,uint256)
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input
            value={automation.function}
            onChange={(e) => handleAutomationChange('function', e.target.value)}
            placeholder="functionName(address,type1,type2,...)"
            required
            className={`bg-gray-900/50 border ${
              automation.function && !validateFunctionInput(automation.function) 
                ? 'border-red-500'
                : automation.function 
                ? 'border-green-500' 
                : 'border-zinc-700'
            } text-zinc-100 placeholder-zinc-500`}
          />
          {automation.function && !validateFunctionInput(automation.function) && (
            <p className="text-red-400 text-sm">
              First parameter must be address
            </p>
          )}
        </div>

        {/* Topic0 Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300">Topic0 (auto-generated)</Label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-zinc-100">Event Topic Hash</h4>
                  <p className="text-sm text-zinc-300">
                    The keccak256 hash of your event signature. This is automatically 
                    generated and used to identify events on the blockchain.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input
            value={automation.topic0 || ''}
            readOnly
            className="bg-gray-900/50 border-zinc-700 text-zinc-400"
          />
        </div>

        {/* Remove Button */}
        {index > 0 && (
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveAutomation}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-800 text-zinc-200">
                  <p>Remove this automation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}