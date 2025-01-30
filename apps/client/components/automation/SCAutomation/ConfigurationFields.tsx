"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAutomationContext } from '@/app/_context/AutomationContext';
import Link from 'next/link';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export default function ConfigurationFields({
  isOriginAddressValid,
  isDestinationAddressValid,
  sameChain
}: {
  isOriginAddressValid: boolean,
  isDestinationAddressValid: boolean,
  sameChain: boolean
}) {
  const {
    originAddress,
    setOriginAddress,
    destinationAddress,
    setDestinationAddress,
    isPausable,
    setIsPausable,
  } = useAutomationContext();

  // Handle contract address change when same chain is true
  const handleContractAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOriginAddress(value);
    if (sameChain) {
      setDestinationAddress(value);
    }
  };

  return (
    <>
      {/* Contract Address Input */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Label htmlFor="contractAddress" className="text-zinc-300">
            {sameChain ? 'Contract Address' : 'Origin Contract Address'}
          </Label>
          <HoverCard>
            <HoverCardTrigger>
              <Info className="h-4 w-4 text-zinc-400" />
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-zinc-100">
                  {sameChain ? 'Contract Details' : 'Origin Contract'}
                </h4>
                <p className="text-sm text-zinc-300">
                  {sameChain 
                    ? 'The smart contract address that will both emit events and execute functions. This contract must exist on your selected chain.'
                    : 'The smart contract address whose events you want to monitor. This contract must exist on your selected origin chain and emit the events specified in your automations.'}
                </p>
                <div className="mt-2 p-2 bg-gray-900/50 rounded-md">
                  <p className="text-xs text-zinc-400">
                    Must be a valid Ethereum address (0x...)
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        
        <Input
          className={`bg-gray-900/50 border ${
            isOriginAddressValid ? 'border-green-500' : 'border-red-500'
          } text-zinc-100 placeholder-zinc-500`}
          id="contractAddress"
          value={originAddress}
          onChange={handleContractAddressChange}
          placeholder="0x..."
          required
        />
        {!originAddress && (
          <Alert className="bg-blue-900/20 border-blue-800">
            <AlertDescription className="text-blue-300">
              Need to deploy your contract first?{' '}
              <Link href="/smart-contract-deployer" className="text-blue-400 hover:text-blue-300 underline">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Destination Contract Address - Only show if chains are different */}
      {!sameChain && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label htmlFor="destinationAddress" className="text-zinc-300">
              Destination Contract Address
            </Label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-zinc-100">Destination Contract</h4>
                  <p className="text-sm text-zinc-300">
                    The smart contract address where functions will be executed. This 
                    contract must exist on your selected destination chain and contain 
                    the functions specified in your automations.
                  </p>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-zinc-300">
                      Requirements:
                    </p>
                    <ul className="text-xs text-zinc-400 list-disc list-inside">
                      <li>Valid Ethereum address (0x...)</li>
                      <li>Must have specified functions</li>
                      <li>First parameter of functions must be address</li>
                    </ul>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          
          <Input
            className={`bg-gray-900/50 border ${
              isDestinationAddressValid ? 'border-green-500' : 'border-red-500'
            } text-zinc-100 placeholder-zinc-500`}
            id="destinationAddress"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="0x..."
            required
          />
          {!destinationAddress && (
            <Alert className="bg-blue-900/20 border-blue-800">
              <AlertDescription className="text-blue-300">
                Need to deploy your destination contract first?{' '}
                <Link href="/smart-contract-deployer" className="text-blue-400 hover:text-blue-300 underline">
                  Click here to deploy your contract
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Pausable Switch */}
      <div className="flex items-center space-x-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <Label htmlFor="pausable-mode" className="text-zinc-300">
              Enable Pausable Functionality
            </Label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-zinc-100">Pausable RSC</h4>
                  <p className="text-sm text-zinc-300">
                    Adds functionality to pause event monitoring. This allows you to:
                  </p>
                  <ul className="text-sm text-zinc-300 list-disc list-inside">
                    <li>Temporarily stop event processing</li>
                    <li>Resume monitoring when ready</li>
                    <li>Control automation execution</li>
                  </ul>
                  <p className="text-xs text-zinc-400 mt-2">
                    Recommended for production deployments
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <p className="text-sm text-zinc-500">
            Allows pausing and resuming event monitoring
          </p>
        </div>
        <Switch
          id="pausable-mode"
          checked={isPausable}
          onCheckedChange={setIsPausable}
          className="bg-gray-700 data-[state=checked]:bg-blue-600"
        />
      </div>
    </>
  );
}