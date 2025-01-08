import { useAutomationContext } from '@/app/_context/AutomationContext'
import AutomationForm2 from '@/components/automation/SCAutomation/AutomationForm2'
import { useContractGeneration } from '@/hooks/automation/useContractGeneration'

export default function LogicConfiguration() {
  const { automations, OrgChainId, DesChainId, originAddress, destinationAddress } = useAutomationContext()

  const { generateContractTemplate, isLoading, error } = useContractGeneration({
    onSuccess: (contract) => {
      console.log('Contract template generated:', contract)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await generateContractTemplate({
      automations,
      OrgChainId: Number(OrgChainId),
      DesChainId: Number(DesChainId),
      originAddress,
      destinationAddress,
      isPausable: false,
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Configure Automation Logic</h2>
      <AutomationForm2
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        isValidForm={automations.length > 0}
      />
    </div>
  )
}

