"use client";
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAutomationContext } from '@/app/_context/AutomationContext';

export default function ConfigurationFields({isOriginAddressValid,isDestinationAddressValid}: {isOriginAddressValid: boolean,isDestinationAddressValid: boolean}) {
  const {
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
        <Label htmlFor="originAddress" className="text-gray-900 dark:text-gray-300">Origin Contract Address</Label>
        <Input
          className={`bg-gray-200 text-gray-100 dark:bg-gray-700 border-gray-600
            ${isOriginAddressValid ? 'border-green-500' : 'border-red-500'}
            `}
          id="originAddress"
          value={originAddress}
          onChange={(e) => setOriginAddress(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>

      <div>
        <Label htmlFor="destinationAddress" className="text-gray-900 dark:text-gray-300">Destination Contract Address</Label>
        <Input
          className={`bg-gray-200 text-gray-100 dark:bg-gray-700 border-gray-600
          ${isDestinationAddressValid ? 'border-green-500' : 'border-red-500'}
          `}
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