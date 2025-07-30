'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from 'lucide-react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { ethers } from 'ethers'

const destinationSupportedChains = [
  { id: '11155111', name: 'Ethereum Sepolia' },
  { id: '43114', name: 'Avalanche C-Chain' },
  { id: '169', name: 'Manta Pacific' },
  { id: '8453', name: 'Base Chain' },
  { id: '5318007', name: 'Lasna Testnet' }
]

export default function TargetConfiguration() {
  const { 
    destinationAddress, 
    setDestinationAddress, 
    DesChainId, 
    setDesChainId
  } = useAutomationContext()

  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [destinationFunctions, setDestinationFunctions] = useState([])
  const [successMessage, setSuccessMessage] = useState('')


  const validateContract = async (address: string) => {
    setIsVerifying(true)
    setVerificationError('')
    try {
      const response = await fetch('http://BASE_URL/DappAutomation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originAddress: address }),
      })
      const data = await response.json()
      if (response.ok) {
        setDestinationFunctions(data.functions)
        return true
      } else {
        throw new Error(data.message || 'Failed to validate contract')
      }
    } catch (error: any) {
      console.error('Error validating contract:', error)
      setVerificationError(error.message || 'Failed to validate contract')
      return false
    } finally {
      setIsVerifying(false)
    }
  }

  const handleVerifyContract = async () => {
    if (!destinationAddress) return

    const isValid = await validateContract(destinationAddress)
    if (isValid) {
      setDestinationAddress(destinationAddress)
      // Set Success Message
      setSuccessMessage('Contract verified successfully')
    }
  }

  return (
    <div className="space-y-6 bg-black p-4 rounded-lg">
      <div>
        <Label htmlFor="destinationAddress">Target Contract Address</Label>
        <Input
          id="destinationAddress"
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>

      <Button 
        onClick={handleVerifyContract}
        disabled={isVerifying || !destinationAddress}
      >
        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify Contract
      </Button>

      {successMessage && (
        <div className="text-green-500 text-sm mt-2 px-6 pb-4 flex items-center">
          <CheckCircle className="mr-2 h-4 w-4" />
          {successMessage}
        </div>
      )}

      {verificationError && (
        <div className="text-red-500 text-sm">{verificationError}</div>
      )}

      
        <div>
          <Label htmlFor="destinationChain">Destination Chain</Label>
          <Select value={DesChainId} onValueChange={setDesChainId}>
            <SelectTrigger id="destinationChain">
              <SelectValue placeholder="Select a chain" />
            </SelectTrigger>
            <SelectContent>
              {destinationSupportedChains.map(chain => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      

      

      {destinationFunctions.length > 0 && (
        <div>
          <Label>Available Functions</Label>
          <ul className="list-disc pl-5 mt-2">
            {destinationFunctions.map((func: any, index: any) => (
              <li key={index} className="text-sm text-gray-600">{func.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

