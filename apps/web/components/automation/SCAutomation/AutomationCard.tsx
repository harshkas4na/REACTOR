"use client";

import React from 'react';
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
  isEventValid: boolean;
  isFunctionValid: boolean;
  onChange: (field: 'event' | 'function' | 'topic0', value: string) => void;
}


export default function AutomationCard({
  automation,
  index,
  isEventValid,
  isFunctionValid,
  onChange
}: AutomationCardProps) {
  const { automations, setAutomations } = useAutomationContext();
  // console.log("isEventValid", isEventValid);
  // console.log("isFunctionValid", isFunctionValid);
  const handleAutomationChange = (field: 'event' | 'function' | 'topic0', value: string) => {
    const newAutomations = automations.map((a, i) => {
      if (i === index) {
        const updatedAutomation = { ...a, [field]: value };
        if (field === 'event') {
          updatedAutomation.topic0 = ethers.keccak256(ethers.toUtf8Bytes(value));
        }
        return updatedAutomation;
      }
      return a;
    });
    setAutomations(newAutomations);
  };

  const handleRemoveAutomation = () => {
    const newAutomations = automations.filter((_, i) => i !== index);
    setAutomations(newAutomations);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Event</Label>
          <Input
            value={automation.event}
            onChange={(e) => handleAutomationChange('event', e.target.value)}
            placeholder="Event name and parameters"
            required
            className={`bg-gray-700 text-gray-100 border ${
              isEventValid ? 'border-green-500' : 'border-red-500'
            }`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Function</Label>
          <Input
            value={automation.function}
            onChange={(e) => handleAutomationChange('function', e.target.value)}
            placeholder="Function name and parameters"
            required
            className={`bg-gray-700 text-gray-100 border ${
              isFunctionValid ? 'border-green-500' : 'border-red-500'
            }`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Topic0 (auto-generated)</Label>
          <Input
            value={automation.topic0}
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