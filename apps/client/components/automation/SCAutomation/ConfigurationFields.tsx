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
        <Label htmlFor="originAddress" className="text-zinc-300">
          Origin Contract Address
        </Label>
        <Input
          className={`bg-gray-900/50 border ${
            isOriginAddressValid ? 'border-green-500' : 'border-red-500'
          } text-zinc-100 placeholder-zinc-500`}
          id="originAddress"
          value={originAddress}
          onChange={(e) => setOriginAddress(e.target.value)}
          placeholder="0x..."
          required
        />
        {!originAddress && (
          <Alert className="bg-blue-900/20 border-blue-800">
            <AlertDescription className="text-blue-300">
              Need to deploy your origin contract first?{' '}
              <Link href="/smart-contract-deployer" className="text-blue-400 hover:text-blue-300 underline">
                Click here to deploy your contract
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-3">
        <Label htmlFor="destinationAddress" className="text-zinc-300">
          Destination Contract Address
        </Label>
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

      <div className="flex items-center space-x-3">
        <Switch
          id="pausable-mode"
          checked={isPausable}
          onCheckedChange={setIsPausable}
          className="bg-gray-700 data-[state=checked]:bg-blue-600"
        />
        <Label htmlFor="pausable-mode" className="text-zinc-300">
          Enable Pausable Functionality
        </Label>
      </div>
    </>
  );
}