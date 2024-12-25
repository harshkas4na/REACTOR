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
      <div className="space-y-2">
        <Label htmlFor="originAddress" className="text-gray-900 dark:text-gray-300">
          Origin Contract Address
        </Label>
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
        {!originAddress && (
          <Alert className="mt-2 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700">
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
              Need to deploy your origin contract first?{' '}
              <Link href="/smart-contract-deployer" className="underline hover:text-blue-800 dark:hover:text-blue-300">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="destinationAddress" className="text-gray-900 dark:text-gray-300">
          Destination Contract Address
        </Label>
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
        {!destinationAddress && (
          <Alert className="mt-2 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700">
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
              Need to deploy your destination contract first?{' '}
              <Link href="/smart-contract-deployer" className="underline hover:text-blue-800 dark:hover:text-blue-300">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="pausable-mode"
          checked={isPausable}
          className="bg-gray-700 text-gray-100 border-gray-600 focus:ring-primary"
          onCheckedChange={setIsPausable}
        />
        <Label htmlFor="pausable-mode" className="text-gray-300">
          Enable Pausable Functionality
        </Label>
      </div>
    </>
  );
}