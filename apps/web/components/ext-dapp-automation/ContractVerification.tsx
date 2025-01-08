import { useState } from 'react'
import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function ContractVerification({ onComplete }: { onComplete: () => void }) {
  const [contractAddress, setContractAddress] = useState('')
  const { updateAutomationConfig } = useAutomationStore()
  const { toast } = useToast()

  const handleVerify = async () => {
    // This would typically be an API call to verify the contract
    console.log('Verifying contract:', contractAddress)
    toast({
      title: 'Contract Verified',
      description: `Contract at ${contractAddress} has been verified.`,
    })
    updateAutomationConfig({ contractAddress })
    onComplete()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contractAddress">Contract Address</Label>
        <Input
          id="contractAddress"
          placeholder="0x..."
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
        />
      </div>
      <Button onClick={handleVerify} disabled={!contractAddress}>
        Verify Contract
      </Button>
    </div>
  )
}

