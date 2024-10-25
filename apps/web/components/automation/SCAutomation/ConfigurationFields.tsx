"use client";
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAutomationContext } from '@/app/_context/AutomationContext';

export default function ConfigurationFields() {
  const {
    chainId,
    setChainId,
    originAddress,
    setOriginAddress,
    destinationAddress,
    setDestinationAddress,
    isPausable,
    setIsPausable,
  } = useAutomationContext();

  return (
    <>
      <div>
        <Label htmlFor="chainId" className="text-gray-300">Chain ID</Label>
        <Input
          id="chainId"
          className="bg-gray-700 text-gray-100 border-gray-600"
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          placeholder="Chain ID (e.g., 11155111 for Sepolia)"
          required
        />
      </div>

      <div>
        <Label htmlFor="originAddress" className="text-gray-300">Origin Contract Address</Label>
        <Input
          className="bg-gray-700 text-gray-100 border-gray-600"
          id="originAddress"
          value={originAddress}
          onChange={(e) => setOriginAddress(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>

      <div>
        <Label htmlFor="destinationAddress" className="text-gray-300">Destination Contract Address</Label>
        <Input
          className="bg-gray-700 text-gray-100 border-gray-600"
          id="destinationAddress"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="pausable-mode"
          checked={isPausable}
          className='bg-gray-700 text-gray-100 border-gray-600 focus:ring-primary'
          onCheckedChange={setIsPausable}
        />
        <Label htmlFor="pausable-mode" className="text-gray-300">Enable Pausable Functionality</Label>
      </div>
    </>
  );
}