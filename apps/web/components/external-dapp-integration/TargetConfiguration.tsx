import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAutomationContext } from '@/app/_context/AutomationContext'

export default function TargetConfiguration() {
  const { destinationAddress, setDestinationAddress, DesChainId, setDesChainId } = useAutomationContext()
  const [selectedProtocol, setSelectedProtocol] = useState('')

  const protocols = ['Uniswap', 'Aave', 'Compound', 'Custom']
  const chains = [
    { name: 'Ethereum', id: '1' },
    { name: 'Polygon', id: '137' },
    { name: 'Arbitrum', id: '42161' },
    { name: 'Optimism', id: '10' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="protocol">Target Protocol</Label>
        <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
          <SelectTrigger id="protocol">
            <SelectValue placeholder="Select a protocol" />
          </SelectTrigger>
          <SelectContent>
            {protocols.map(protocol => (
              <SelectItem key={protocol} value={protocol}>{protocol}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProtocol === 'Custom' && (
        <div>
          <Label htmlFor="destinationAddress">Custom Contract Address</Label>
          <Input
            id="destinationAddress"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="0x..."
          />
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
              <SelectItem key={chain.id} value={chain.id}>{chain.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

