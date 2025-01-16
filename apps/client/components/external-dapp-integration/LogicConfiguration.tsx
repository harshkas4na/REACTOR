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

  // function renderEventInput(automation: Automation, index: number) {
  //   const { triggerType } = useAutomationContext();
  
  //   if (triggerType === 'custom' || triggerType === 'blockchain') {
  //     return (
  //       <Input
  //         value={automation.event || ''}
  //         readOnly
  //         disabled
  //         className="bg-zinc-900/50 border-zinc-700 text-zinc-400"
  //       />
  //     );
  //   }
  
  //   return (
  //     <Select
  //       value={automation.event}
  //       onValueChange={(value) => updateAutomation(index, 'event', value)}
  //     >
  //       <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-700 text-sm sm:text-base">
  //         <SelectValue placeholder="Select event" />
  //       </SelectTrigger>
  //       {/* <SelectContent className="bg-zinc-800 border-zinc-700">
  //         {originDetails.events.map((event) => (
  //           <SelectItem 
  //             key={`${event.name}-${event.topic0}`}
  //             value={`${event.name}(${event.inputs.map(input => input.type).join(',')})`}
  //             className="text-zinc-200"
  //           >
  //             {`${event.name}(${event.inputs.map(input => input.type).join(', ')})`}
  //           </SelectItem>
  //         ))} */}
  //       {/* </SelectContent> */}
  //     </Select>
  //   );
  // }

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
      <div className="space-y-4 sm:space-y-6">
        <Card className="bg-black/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-zinc-100">
              Configure Event-Function Mappings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Automations Mapping */}
            <div className="space-y-4 sm:space-y-6">
              {automations.map((automation, index) => (
                <div 
                  key={index} 
                  className="p-3 sm:p-4 border rounded-lg border-zinc-800 bg-black/20 space-y-4"
                >
                  {/* Event-Function Pair Layout */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* Origin Event Section */}
                    <div className="w-full sm:w-[45%] space-y-2">
                      <Label className="text-sm sm:text-base text-zinc-300">
                        Origin Event
                      </Label>
                      {renderEventInput(automation, index)}
                    </div>
  
                    {/* Arrow Divider */}
                    <div className="hidden sm:flex items-center justify-center w-[10%]">
                      <ArrowRight className="w-5 h-5 text-zinc-500" />
                    </div>
  
                    {/* Target Function Section */}
                    <div className="w-full sm:w-[45%] space-y-2">
                      <Label className="text-sm sm:text-base text-zinc-300">
                        Target Function
                      </Label>
                      <Select
                        value={automation.function}
                        onValueChange={(value) => updateAutomation(index, 'function', value)}
                      >
                        <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-700 text-sm sm:text-base">
                          <SelectValue placeholder="Select function" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          {destinationDetails.functions.map((func) => (
                            <SelectItem 
                              key={`${func.name}-${func.inputs.map(i => i.type).join('')}`}
                              value={`${func.name}(${func.inputs.map(input => input.type).join(',')})`}
                              className="text-zinc-200"
                            >
                              {`${func.name}(${func.inputs.map(input => input.type).join(', ')})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
  
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAutomation(index)}
                      className="sm:ml-2"
                    >
                      <MinusCircle className="h-5 w-5 text-zinc-400 hover:text-red-400" />
                    </Button>
                  </div>
  
                  {/* Function Parameters Section */}
                  {automation.function && (
                    <div className="mt-4 pl-4 border-l-2 border-zinc-800">
                      <h4 className="text-sm font-medium text-zinc-400 mb-3">
                        Function Parameters
                      </h4>
                      <div className="space-y-4">
                        {destinationDetails.functions
                          .find(f => `${f.name}(${f.inputs.map(i => i.type).join(',')})` === automation.function)
                          ?.inputs.map((input, paramIndex) => (
                            <div key={paramIndex} className="space-y-2">
                              <Label className="text-sm text-zinc-300">
                                {input.name} ({input.type})
                              </Label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                  placeholder={`Value for ${input.name}`}
                                  className="w-full sm:w-2/3 bg-zinc-900/50 border-zinc-700 text-zinc-200"
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
  
            {/* Add Button */}
            <Button 
              onClick={addAutomation}
              className="w-full mt-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              variant="outline"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Event-Function Pair
            </Button>
  
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
  
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Helper function for rendering event input based on trigger type
  