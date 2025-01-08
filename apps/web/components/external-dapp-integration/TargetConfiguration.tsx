// components/external-dapp-integration/TargetConfiguration.tsx

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { api } from '@/services/api'

export default function TargetConfiguration() {
  const { 
    destinationAddress, 
    setDestinationAddress, 
    DesChainId, 
    setDesChainId,
    setAutomations 
  } = useAutomationContext()

  const [isVerifying, setIsVerifying] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState('')
  const [verificationError, setVerificationError] = useState('')

  const protocols = [
    { id: 'uniswap', name: 'Uniswap', address: '0x...' },
    { id: 'aave', name: 'Aave', address: '0x...' },
    { id: 'compound', name: 'Compound', address: '0x...' },
    { id: 'custom', name: 'Custom', address: '' }
  ]

  const chains = [
    { name: 'Ethereum', id: '1' },
    { name: 'Polygon', id: '137' },
    { name: 'Arbitrum', id: '42161' },
    { name: 'Optimism', id: '10' }
  ]

  const handleProtocolSelect = (protocolId: string) => {
    setSelectedProtocol(protocolId)
    const protocol = protocols.find(p => p.id === protocolId)
    if (protocol && protocol.address) {
      setDestinationAddress(protocol.address)
      handleVerifyContract(protocol.address)
    }
  }

  const handleVerifyContract = async (address: string) => {
    setIsVerifying(true)
    setVerificationError('')
    try {
      const { data } = await api.verifyContract(address)
      if (data.functions) {
        setDestinationAddress(address)
        // Reset any existing automation configurations
        setAutomations([])
      }
    } catch (error: any) {
      setVerificationError(error.message || 'Failed to verify contract')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="protocol">Target Protocol</Label>
        <Select value={selectedProtocol} onValueChange={handleProtocolSelect}>
          <SelectTrigger id="protocol">
            <SelectValue placeholder="Select a protocol" />
          </SelectTrigger>
          <SelectContent>
            {protocols.map(protocol => (
              <SelectItem key={protocol.id} value={protocol.id}>
                {protocol.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProtocol === 'custom' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="destinationAddress">Custom Contract Address</Label>
            <Input
              id="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <Button 
            onClick={() => handleVerifyContract(destinationAddress)}
            disabled={isVerifying || !destinationAddress}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Contract
          </Button>
          {verificationError && (
            <div className="text-red-500 text-sm">{verificationError}</div>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="destinationChain">Destination Chain</Label>
        <Select value={DesChainId} onValueChange={setDesChainId}>
          <SelectTrigger id="destinationChain">
            <SelectValue placeholder="Select a chain" />
          </SelectTrigger>
          <SelectContent>
            {chains.map(chain => (
              <SelectItem key={chain.id} value={chain.id}>
                {chain.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}