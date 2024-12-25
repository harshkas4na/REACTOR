"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAutomationContext } from '@/app/_context/AutomationContext';
import Link from 'next/link';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ConfigurationFields({
  isOriginAddressValid,
  isDestinationAddressValid
}: {
  isOriginAddressValid: boolean,
  isDestinationAddressValid: boolean
}) {
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
      <div className="space-y-3">
        <Label htmlFor="originAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Origin Contract Address
        </Label>
        <Input
          className={`w-full p-2 bg-white dark:bg-gray-800 border ${isOriginAddressValid ? 'border-green-500' : 'border-red-500'} rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
          id="originAddress"
          value={originAddress}
          onChange={(e) => setOriginAddress(e.target.value)}
          placeholder="0x..."
          required
        />
        {!originAddress && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              Need to deploy your origin contract first?{' '}
              <Link href="/smart-contract-deployer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="destinationAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Destination Contract Address
        </Label>
        <Input
          className={`w-full p-2 bg-white dark:bg-gray-800 border ${isDestinationAddressValid ? 'border-green-500' : 'border-red-500'} rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
          id="destinationAddress"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder="0x..."
          required
        />
        {!destinationAddress && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              Need to deploy your destination contract first?{' '}
              <Link href="/smart-contract-deployer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <Switch
          id="pausable-mode"
          checked={isPausable}
          onCheckedChange={setIsPausable}
          className="h-6 w-11 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <Label htmlFor="pausable-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enable Pausable Functionality
        </Label>
      </div>
    </>
  );
}

