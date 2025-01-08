import { useState } from 'react'
import { useAutomationStore } from '@/lib/automationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import ContractInput from '@/components/ext-dapp-automation/ContractInput'

export default function ContractConfiguration({ onComplete }: { onComplete: () => void }) {
  const { updateAutomationConfig, automationConfig } = useAutomationStore()
  const { toast } = useToast()
  const [contracts, setContracts] = useState<Record<string, string>>(
    automationConfig.contracts || {}
  )

  const handleVerify = async (address: string, chainId: number) => {
    // This would typically be an API call to verify the contract
    console.log('Verifying contract:', address, 'on chain:', chainId)
    toast({
      title: 'Contract Verified',
      description: `Contract at ${address} has been verified on chain ${chainId}.`,
    })
    setContracts((prev) => ({ ...prev, [address]: chainId.toString() }))
    return true
  }

  const handleSave = () => {
    updateAutomationConfig({ contracts })
    onComplete()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Configure Contracts</h2>
      {automationConfig.selectedProtocols?.map((protocolId:any) => (
        <div key={protocolId} className="space-y-2">
          <Label>{`Contract Address for Protocol ${protocolId}`}</Label>
          <ContractInput onVerify={handleVerify} />
        </div>
      ))}
      <Button onClick={handleSave} disabled={Object.keys(contracts).length === 0}>
        Save and Continue
      </Button>
    </div>
  )
}

