// components/external-dapp-integration/LogicConfiguration.tsx

import { useEffect, useState } from 'react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PlusCircle, MinusCircle, ArrowRight } from 'lucide-react'
import { api } from '@/services/api'

interface ContractDetails {
  events: any[];
  functions: any[];
}

export default function LogicConfiguration() {
  const { 
    automations, 
    setAutomations,
    originAddress,
    destinationAddress,
    triggerType
  } = useAutomationContext()

  const [originDetails, setOriginDetails] = useState<ContractDetails | null>(null)
  const [destinationDetails, setDestinationDetails] = useState<ContractDetails | null>(null)

  useEffect(() => {
    const fetchContractDetails = async () => {
      if (originAddress) {
        const originData = await api.getProtocolDetails(originAddress)
        setOriginDetails(originData.data)
      }
      if (destinationAddress) {
        const destData = await api.getProtocolDetails(destinationAddress)
        setDestinationDetails(destData.data)
      }
    }

    fetchContractDetails()
  }, [originAddress, destinationAddress])

  const addAutomation = () => {
    setAutomations([...automations, { event: '', function: '', topic0: '' }])
  }

  const removeAutomation = (index: number) => {
    const newAutomations = automations.filter((_, i) => i !== index)
    setAutomations(newAutomations)
  }

  const updateAutomation = (index: number, field: keyof typeof automations[0], value: string) => {
    const newAutomations = [...automations]
    newAutomations[index] = { ...newAutomations[index], [field]: value }
    setAutomations(newAutomations)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Event-Function Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {automations.map((automation, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <Label>Origin Event</Label>
                  <Select
                    value={automation.event}
                    onValueChange={(value) => updateAutomation(index, 'event', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      {originDetails?.events.map((event: any) => (
                        <SelectItem 
                          key={event.signature} 
                          value={event.signature}
                        >
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ArrowRight className="w-6 h-6" />
                <div className="flex-1">
                  <Label>Target Function</Label>
                  <Select
                    value={automation.function}
                    onValueChange={(value) => updateAutomation(index, 'function', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select function" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationDetails?.functions.map((func: any) => (
                        <SelectItem 
                          key={func.signature} 
                          value={func.signature}
                        >
                          {func.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAutomation(index)}
                >
                  <MinusCircle className="h-5 w-5" />
                </Button>
              </div>
              {/* Parameter mapping UI can be added here */}
            </div>
          ))}
          
          <Button 
            onClick={addAutomation}
            className="w-full"
            variant="outline"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Add Event-Function Pair
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}