'use client'

import { useEffect, useState } from 'react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PlusCircle, MinusCircle, ArrowRight } from 'lucide-react'
import { ethers } from 'ethers'

interface ContractEvent {
  name: string;
  inputs: Array<{ type: string; name: string }>;
  topic0: string;
}

interface ContractFunction {
  name: string;
  inputs: Array<{ type: string; name: string }>;
}

interface ContractDetails {
  events: ContractEvent[];
  functions: ContractFunction[];
}

interface Automation {
  event: string;
  function: string;
  topic0: string;
}

export default function LogicConfiguration() {
  const { 
    automations, 
    setAutomations,
    originAddress,
    destinationAddress,
    triggerType
  } = useAutomationContext()

  const [originDetails, setOriginDetails] = useState<ContractDetails>({ events: [], functions: [] })
  const [destinationDetails, setDestinationDetails] = useState<ContractDetails>({ events: [], functions: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchContractDetails = async () => {
      setIsLoading(true)
      setError('')
      
      try {
        // Fetch destination contract details
        if (destinationAddress) {
          const destDetails = await getContractDetails(destinationAddress)
          setDestinationDetails(destDetails)
        }

        // Fetch origin contract details based on trigger type
        if (triggerType === 'protocol' && originAddress) {
          const originAddresses = originAddress.split(',')
          const originData = await Promise.all(
            originAddresses.map(address => getContractDetails(address))
          )
          
          // Combine events and functions from all origin contracts
          const combinedEvents = originData.flatMap(data => data.events)
          const combinedFunctions = originData.flatMap(data => data.functions)
          
          setOriginDetails({
            events: combinedEvents,
            functions: combinedFunctions
          })
        }
      } catch (err) {
        setError('Failed to fetch contract details')
        console.error('Error fetching contract details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContractDetails()
  }, [originAddress, destinationAddress, triggerType])

  const getContractDetails = async (address: string): Promise<ContractDetails> => {
    try {
      const response = await fetch('http://localhost:5000/DappAutomation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originAddress: address }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch contract details')
      }
      
      const data = await response.json()
      
      const eventsWithTopic0 = data.events.map((event: any) => ({
        ...event,
        inputs: event.inputs || [],
        topic0: ethers.keccak256(
          ethers.toUtf8Bytes(
            `${event.name}(${event.inputs.map((input: any) => input.type).join(',')})`
          )
        )
      }))

      const functionsWithInputs = data.functions.map((func: any) => ({
        ...func,
        inputs: func.inputs || []
      }))

      return { 
        events: eventsWithTopic0, 
        functions: functionsWithInputs 
      }
    } catch (error) {
      console.error('Error fetching contract details:', error)
      return { events: [], functions: [] }
    }
  }

  const addAutomation = () => {
    if (triggerType === 'custom' || triggerType === 'blockchain' && automations.length > 0) {
      const firstAutomation = automations[0]
      setAutomations([...automations, { 
        event: firstAutomation.event,
        function: '',
        topic0: firstAutomation.topic0
      }])
    } else {
      setAutomations([...automations, { event: '', function: '', topic0: '' }])
    }
  }

  const removeAutomation = (index: number) => {
    const newAutomations = automations.filter((_, i) => i !== index)
    setAutomations(newAutomations)
  }

  const updateAutomation = (index: number, field: keyof Automation, value: string) => {
    const newAutomations = [...automations]
    
    if (field === 'event') {
      // Find the selected event to get its topic0
      const selectedEvent = originDetails.events.find(event => 
        `${event.name}(${event.inputs.map(input => input.type).join(',')})` === value
      )
      
      // For custom trigger type, update event and topic0 for all automations
      if (triggerType === 'custom') {
        newAutomations.forEach(automation => {
          automation.event = value
          automation.topic0 = selectedEvent?.topic0 || ''
        })
      } else {
        newAutomations[index] = { 
          ...newAutomations[index], 
          event: value,
          topic0: selectedEvent?.topic0 || ''
        }
      }
    } else {
      newAutomations[index] = { 
        ...newAutomations[index], 
        [field]: value 
      }
    }
    
    setAutomations(newAutomations)
  }

  const renderEventInput = (automation: Automation, index: number) => {
    if (triggerType === 'custom' || triggerType === 'blockchain') {
      return (
        <Input
          value={automation.event || ''}  // Show the event from automations state
          readOnly
          disabled
        />
      )
    }

    // For protocol trigger type
    return (
      <Select
        value={automation.event}
        onValueChange={(value) => updateAutomation(index, 'event', value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select event" />
        </SelectTrigger>
        <SelectContent>
          {originDetails.events.map((event) => (
            <SelectItem 
              key={`${event.name}-${event.topic0}`}
              value={`${event.name}(${event.inputs.map(input => input.type).join(',')})`}
            >
              {`${event.name}(${event.inputs.map(input => input.type).join(', ')})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          Loading contract details...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-red-500 py-6">
          {error}
        </CardContent>
      </Card>
    )
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
                  {renderEventInput(automation, index)}
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
                      {destinationDetails.functions.map((func) => (
                        <SelectItem 
                          key={`${func.name}-${func.inputs.map(i => i.type).join('')}`}
                          value={`${func.name}(${func.inputs.map(input => input.type).join(',')})`}
                        >
                          {`${func.name}(${func.inputs.map(input => input.type).join(', ')})`}
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