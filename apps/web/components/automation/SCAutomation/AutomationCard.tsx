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

interface AutomationCardProps {
  automation: AutomationType;
  index: number;
}

export default function AutomationCard({ automation, index }: AutomationCardProps) {
  const { automations, setAutomations } = useAutomationContext();

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
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`event-${index}`} className="text-gray-300">Event</Label>
            <Input
              id={`event-${index}`}
              value={automation.event}
              onChange={(e) => handleAutomationChange('event', e.target.value)}
              placeholder="Event name"
              required
              className="bg-gray-700 text-gray-100 border-gray-600"
            />
          </div>
          <div>
            <Label htmlFor={`function-${index}`} className="text-gray-300">Function</Label>
            <Input
              id={`function-${index}`}
              value={automation.function}
              onChange={(e) => handleAutomationChange('function', e.target.value)}
              placeholder="Function name"
              required
              className="bg-gray-700 text-gray-100 border-gray-600"
            />
          </div>
        </div>
        <div className="mt-2">
          <Label htmlFor={`topic0-${index}`} className="text-gray-300">Topic0 (auto-generated)</Label>
          <Input
            id={`topic0-${index}`}
            value={automation.topic0}
            readOnly
            className="bg-gray-600 text-gray-300 border-gray-700"
          />
        </div>
        {index > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="mt-2"
            onClick={handleRemoveAutomation}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </CardContent>
    </Card>
  );
}