import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AutomationType } from '@/types/automation'

const automationTypes: { type: AutomationType; title: string; description: string }[] = [
  {
    type: 'PROTOCOL_TO_PROTOCOL',
    title: 'Protocol to Protocol',
    description: 'Automate interactions between different protocols',
  },
  {
    type: 'ORIGIN_TO_PROTOCOL',
    title: 'Origin to Protocol',
    description: 'Automate actions from a specific origin to a protocol',
  },
  {
    type: 'BLOCKCHAIN_WIDE',
    title: 'Blockchain Wide',
    description: 'Automate actions based on blockchain-wide events',
  },
]

export default function AutomationTypeSelection({ onComplete }: { onComplete: () => void }) {
  const { updateAutomationConfig, automationConfig } = useAutomationStore()

  const handleTypeSelect = (type: AutomationType) => {
    updateAutomationConfig({ type })
    onComplete()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Select Automation Type</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {automationTypes.map((type) => (
          <Card
            key={type.type}
            className={`cursor-pointer transition-all ${
              automationConfig.type === type.type ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleTypeSelect(type.type)}
          >
            <CardHeader>
              <CardTitle>{type.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{type.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

