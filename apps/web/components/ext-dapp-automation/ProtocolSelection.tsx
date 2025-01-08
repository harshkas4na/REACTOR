import { useQuery } from '@tanstack/react-query'
import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchProtocols } from '@/lib/api'
import { Protocol } from '@/types/automation'

export default function ProtocolSelection({ onComplete }: { onComplete: () => void }) {
  const { data: protocols, isLoading, isError } = useQuery<Protocol[]>({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
  })

  const { updateAutomationConfig, automationConfig } = useAutomationStore()

  const handleProtocolSelect = (protocol: Protocol) => {
    const selectedProtocols = automationConfig.selectedProtocols || []
    const updatedProtocols = selectedProtocols.includes(protocol.id)
      ? selectedProtocols.filter((id) => id !== protocol.id)
      : [...selectedProtocols, protocol.id]
    updateAutomationConfig({ selectedProtocols: updatedProtocols })
  }

  if (isLoading) return <div>Loading protocols...</div>
  if (isError) return <div>Error loading protocols</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Select Protocols</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {protocols?.map((protocol) => (
          <Card
            key={protocol.id}
            className={`cursor-pointer transition-all ${
              automationConfig.selectedProtocols?.includes(protocol.id) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleProtocolSelect(protocol)}
          >
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <img src={protocol.icon} alt={protocol.name} className="w-6 h-6" />
                <span>{protocol.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{protocol.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={onComplete} disabled={!automationConfig.selectedProtocols?.length}>
        Next
      </Button>
    </div>
  )
}

