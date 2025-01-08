import { useState } from 'react'
import { useAutomationStore } from '@/lib/automationStore'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function EventFunctionMapping({ onComplete }: { onComplete: () => void }) {
  const { updateAutomationConfig, automationConfig } = useAutomationStore()
  const [mappings, setMappings] = useState<Record<string, { event: string; function: string }>>(
    automationConfig.eventFunctionMappings || {}
  )

  const handleMappingChange = (protocolId: string, field: 'event' | 'function', value: string) => {
    setMappings((prev) => ({
      ...prev,
      [protocolId]: { ...prev[protocolId], [field]: value },
    }))
  }

  const handleSave = () => {
    updateAutomationConfig({ eventFunctionMappings: mappings })
    onComplete()
  }

  // This would typically come from the API based on the selected protocols and contracts
  const mockEvents = ['Deposit', 'Withdraw', 'Swap']
  const mockFunctions = ['executeDeposit', 'executeWithdraw', 'executeSwap']

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Event/Function Mapping</h2>
      {automationConfig.selectedProtocols?.map((protocolId:any) => (
        <Card key={protocolId}>
          <CardHeader>
            <CardTitle>{`Mapping for Protocol ${protocolId}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Event</Label>
              <Select
                value={mappings[protocolId]?.event}
                onValueChange={(value) => handleMappingChange(protocolId, 'event', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {mockEvents.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Function</Label>
              <Select
                value={mappings[protocolId]?.function}
                onValueChange={(value) => handleMappingChange(protocolId, 'function', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent>
                  {mockFunctions.map((func) => (
                    <SelectItem key={func} value={func}>
                      {func}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        onClick={handleSave}
        disabled={Object.keys(mappings).length !== automationConfig.selectedProtocols?.length}
      >
        Save Mappings
      </Button>
    </div>
  )
}

