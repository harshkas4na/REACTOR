import { useState } from 'react'
import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ParameterConfiguration({ onComplete }: { onComplete: () => void }) {
  const { updateAutomationConfig, automationConfig } = useAutomationStore()
  const [parameters, setParameters] = useState<Record<string, Record<string, string>>>(
    automationConfig.parameters || {}
  )

  const handleParameterChange = (protocolId: string, paramName: string, value: string) => {
    setParameters((prev) => ({
      ...prev,
      [protocolId]: { ...prev[protocolId], [paramName]: value },
    }))
  }

  const handleParameterTypeChange = (protocolId: string, paramName: string, type: 'fixed' | 'event') => {
    setParameters((prev) => ({
      ...prev,
      [protocolId]: {
        ...prev[protocolId],
        [paramName]: { value: prev[protocolId]?.[paramName]?.value || '', type },
      },
    }))
  }

  const handleSave = () => {
    updateAutomationConfig({ parameters })
    onComplete()
  }

  // This would typically come from the API based on the selected protocols and contracts
  const mockParameters = ['gasPrice', 'gasLimit', 'slippage']

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Parameter Configuration</h2>
      {automationConfig.selectedProtocols?.map((protocolId) => (
        <Card key={protocolId}>
          <CardHeader>
            <CardTitle>{`Parameters for Protocol ${protocolId}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockParameters.map((param) => (
              <div key={param} className="space-y-2">
                <Label>{param}</Label>
                <div className="flex space-x-2">
                  <Select
                    value={parameters[protocolId]?.[param]?.type || 'fixed'}
                    onValueChange={(value) => handleParameterTypeChange(protocolId, param, value as 'fixed' | 'event')}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Value</SelectItem>
                      <SelectItem value="event">From Event</SelectItem>
                    </SelectContent>
                  </Select>
                  {parameters[protocolId]?.[param]?.type === 'fixed' && (
                    <Input
                      value={parameters[protocolId]?.[param]?.value || ''}
                      onChange={(e) => handleParameterChange(protocolId, param, e.target.value)}
                      placeholder={`Enter ${param}`}
                    />
                  )}
                  {parameters[protocolId]?.[param]?.type === 'event' && (
                    <Input
                      value={parameters[protocolId]?.[param]?.value || ''}
                      onChange={(e) => handleParameterChange(protocolId, param, e.target.value)}
                      placeholder="Enter event field"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Button onClick={handleSave} disabled={Object.keys(parameters).length === 0}>
        Save Parameters
      </Button>
    </div>
  )
}

