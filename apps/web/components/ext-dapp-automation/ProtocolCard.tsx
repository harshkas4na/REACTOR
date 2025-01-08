import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Protocol } from '@/types/automation'

interface ProtocolCardProps {
  protocol: Protocol
}

export default function ProtocolCard({ protocol }: ProtocolCardProps) {
  return (
    <Card className="w-64">
      <CardHeader className="flex flex-row items-center space-x-2 pb-2">
        <img src={protocol.icon} alt={protocol.name} className="w-6 h-6" />
        <CardTitle className="text-lg">{protocol.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{protocol.description}</CardDescription>
      </CardContent>
    </Card>
  )
}

