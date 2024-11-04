'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"

export default function ExternalDAppIntegration() {
  const [targetAddress, setTargetAddress] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [isContractValid, setIsContractValid] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [availableFunctions, setAvailableFunctions] = useState([])
  const [selectedFunctions, setSelectedFunctions] = useState<any>([])
  const [availableEvents, setAvailableEvents] = useState([])
  const [eventMappings, setEventMappings] = useState<any>({})
  const [callbackContractCode, setCallbackContractCode] = useState('')
  const [reactiveContractCode, setReactiveContractCode] = useState('')
  const [deploymentStep, setDeploymentStep] = useState(1)
  const [callbackContractAddress, setCallbackContractAddress] = useState('')

  const networks = ['Ethereum Mainnet', 'Polygon', 'Arbitrum', 'Optimism']

  const validateContract = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('http://localhost:5000/validate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: targetAddress, network: selectedNetwork }),
      })
      const data = await response.json()
      if (response.ok) {
        setIsContractValid(true)
        setAvailableFunctions(data.functions)
        setAvailableEvents(data.events)
      } else {
        throw new Error(data.message || 'Failed to validate contract')
      }
    } catch (error) {
      console.error('Error validating contract:', error)
      setIsContractValid(false)
    } finally {
      setIsValidating(false)
    }
  }

  const handleFunctionSelection = (functionName:any) => {
    setSelectedFunctions((prev:any) => 
      prev.includes(functionName) 
        ? prev.filter((f:any) => f !== functionName)
        : [...prev, functionName]
    )
  }

  const handleEventMapping = (functionName:any, eventName:any) => {
    setEventMappings((prev:any) => ({
      ...prev,
      [functionName]: eventName
    }))
  }

  const generateContracts = async () => {
    try {
      const response = await fetch('http://localhost:5000/generate-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAddress,
          selectedFunctions,
          eventMappings
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setCallbackContractCode(data.callbackContract)
        setReactiveContractCode(data.reactiveContract)
      } else {
        throw new Error(data.message || 'Failed to generate contracts')
      }
    } catch (error) {
      console.error('Error generating contracts:', error)
    }
  }

  const deployCallbackContract = async () => {
    try {
      const response = await fetch('http://localhost:5000/deploy-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: callbackContractCode }),
      })
      const data = await response.json()
      if (response.ok) {
        setCallbackContractAddress(data.address)
        setDeploymentStep(2)
      } else {
        throw new Error(data.message || 'Failed to deploy callback contract')
      }
    } catch (error) {
      console.error('Error deploying callback contract:', error)
    }
  }

  const deployReactiveContract = async () => {
    try {
      const response = await fetch('http://localhost:5000/deploy-reactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: reactiveContractCode,
          callbackAddress: callbackContractAddress
        }),
      })
      const data = await response.json()
      if (response.ok) {
        console.log('Reactive contract deployed successfully:', data.address)
        // Handle successful deployment (e.g., show success message, update UI)
      } else {
        throw new Error(data.message || 'Failed to deploy reactive contract')
      }
    } catch (error) {
      console.error('Error deploying reactive contract:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">External DApp Integration Template</h1>
      
      <Card className="mb-6 bg-white dark:bg-slate-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Target DApp Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="targetAddress" className="text-gray-700 dark:text-gray-300">Contract Address</Label>
              <Input
                id="targetAddress"
                placeholder="0x..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="networkSelector" className="text-gray-700 dark:text-gray-300">Select Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger id="networkSelector" className="mt-1">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map(network => (
                    <SelectItem key={network} value={network}>{network}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={validateContract} 
              disabled={!targetAddress || !selectedNetwork || isValidating}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Validate Contract'}
            </Button>
            {isContractValid && (
              <div className="flex items-center text-green-500">
                <CheckCircle2 className="mr-2" />
                Contract validated successfully
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isContractValid && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Function Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableFunctions.map((func:any) => (
                <div key={func.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={func.name}
                    checked={selectedFunctions.includes(func.name)}
                    onCheckedChange={() => handleFunctionSelection(func.name)}
                  />
                  <Label htmlFor={func.name} className="text-gray-700 dark:text-gray-300">{func.name}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedFunctions.length > 0 && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Event Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedFunctions.map((func:any) => (
                <div key={func} className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">{func}</Label>
                  <Select value={eventMappings[func] || ''} onValueChange={(eventName) => handleEventMapping(func, eventName)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEvents.map((event:any) => (
                        <SelectItem key={event.name} value={event.name}>{event.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button 
              onClick={generateContracts} 
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
              disabled={Object.keys(eventMappings).length !== selectedFunctions.length}
            >
              Generate Contracts
            </Button>
          </CardContent>
        </Card>
      )}

      {callbackContractCode && reactiveContractCode && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={`step${deploymentStep}`}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="step1">Step 1: Callback Contract</TabsTrigger>
                <TabsTrigger value="step2" disabled={deploymentStep < 2}>Step 2: Reactive Contract</TabsTrigger>
              </TabsList>
              <TabsContent value="step1">
                <div className="space-y-4">
                  <Textarea
                    value={callbackContractCode}
                    readOnly
                    className="h-48 font-mono text-sm"
                  />
                  <Button 
                    onClick={deployCallbackContract} 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Deploy Callback Contract
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="step2">
                <div className="space-y-4">
                  <Textarea
                    value={reactiveContractCode}
                    readOnly
                    className="h-48 font-mono text-sm"
                  />
                  <Button 
                    onClick={deployReactiveContract} 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Deploy Reactive Contract
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Alert variant="warning" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Ensure you have thoroughly tested this integration in a safe environment before deploying to mainnet.
        </AlertDescription>
      </Alert>
    </div>
  )
}