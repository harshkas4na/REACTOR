'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ethers } from 'ethers'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { useWeb3 } from '@/app/_context/Web3Context'
import { BASE_URL } from '@/data/constants'
import DeployButton from '@/components/DeployButton'
import ContractPreview from '@/components/contract-preview'
import { useRouter } from 'next/navigation';

const steps = ['Contract Input', 'Event Selection', 'Input Selection', 'Template Preview']

export default function LiveDataIntegration() {
  const [currentStep, setCurrentStep] = useState(0)
  const [contractAddress, setContractAddress] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isContractValid, setIsContractValid] = useState(false)
  const [events, setEvents] = useState([])
  const [selectedEvents, setSelectedEvents] = useState<any>([])
  const [selectedInputs, setSelectedInputs] = useState<any>({})
  const [previewCode, setPreviewCode] = useState('')
  const [destinationFunctions, setDestinationFunctions] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [abi, setAbi] = useState('')
  const [bytecode, setBytecode] = useState('')
  const [deployedAddress, setDeployedAddress] = useState('')
  const [deploymentError, setDeploymentError] = useState('')
  const [deploymentTxHash, setDeploymentTxHash] = useState('')
  const { account, web3 } = useWeb3()

  const router = useRouter();

  const validateContract = async () => {
    setIsValidating(true)
    try {
      const response = await fetch(`${BASE_URL}/DappAutomation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originAddress: contractAddress }),
      })
      const data = await response.json()
      if (response.ok) {
        const eventsWithTopic0 = data.events.map((event: any) => ({
          ...event,
          topic0: ethers.keccak256(ethers.toUtf8Bytes(event.name + '(' + event.inputs.map((input:any) => input.type).join(',') + ')'))
        }))
        setEvents(eventsWithTopic0)
        setIsContractValid(true)
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

  const handleEventSelection = (event: any) => {
    setSelectedEvents((prev: any) => 
      prev.includes(event) 
        ? prev.filter((e:any) => e !== event)
        : [...prev, event]
    )
    if (!selectedInputs[event.name]) {
      setSelectedInputs((prev:any) => ({...prev, [event.name]: []}))
    }
  }

  const handleInputSelection = (eventName: string, inputIndex: number) => {
    setSelectedInputs((prev:any) => ({
      ...prev,
      [eventName]: prev[eventName].includes(inputIndex)
        ? prev[eventName].filter((i:any) => i !== inputIndex)
        : [...prev[eventName], inputIndex]
    }))
  }

  const generateTemplates = async () => {
    const input = {
      events: selectedEvents.map((event: any) => ({
        topic0: event.topic0,
        eventABI: `${event.name}(${event.inputs.map((input:any) => input.type).join(',')})`,
        indexedParams: selectedInputs[event.name]
      })),
      originChainId: 11155111,
      destinationChainId: 11155111,
      originContract: contractAddress,
      destinationContract: "0x0000000000000000000000000000000000000000"
    }
  
    try {
      const response = await fetch(`${BASE_URL}/live-data-automation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const data = await response.json()
      if (response.ok) {
        setPreviewCode(data.reactiveSmartContractTemplate)
        setDestinationFunctions(data.generatedFunctions)
      } else {
        throw new Error(data.message || 'Failed to generate templates')
      }
    } catch (error) {
      console.error('Error generating templates:', error)
      setPreviewCode('Error generating templates. Please try again.')
    }
  }


  const nextStep = () => {
    if (currentStep === 2) {
      generateTemplates()
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  return (
    <div className="relative min-h-screen py-8 sm:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Live Data Integration Template
        </h1>
        
        <Alert className="mb-4 sm:mb-8 bg-blue-900/20 border-blue-500/50">
          <Info className="h-4 w-4 text-blue-400" />
          <AlertTitle className="text-blue-300 text-sm sm:text-base">Important Information</AlertTitle>
          <AlertDescription className="text-blue-200 text-xs sm:text-sm">
            To use this template, you must know which events of your contract provide the data you need. 
            We can only list all event ABIs and cannot explain the logic behind their workings or how they are released.
          </AlertDescription>
        </Alert>

        {/* Progress Steps */}
        <div className="relative z-20 flex w-full mb-6 sm:mb-8">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              <div className="flex items-center w-full">
                <div
                  className={`relative z-20 w-8 sm:w-10 h-8 sm:h-10 shrink-0 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 ${
                    index <= currentStep 
                      ? 'bg-primary text-white scale-110' 
                      : 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`relative z-10 h-1 w-full  transition-all duration-200 ${
                      index < currentStep ? 'bg-primary' : 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800'
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardContent className="pt-6">
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold mb-4 text-zinc-100">Contract Input</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="contractAddress" className="text-zinc-200">
                      Origin DApp's Contract Address
                    </Label>
                    <Input
                      id="contractAddress"
                      placeholder="0x..."
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200"
                    />
                  </div>
                  <Button 
                    onClick={validateContract} 
                    disabled={!contractAddress || isValidating}
                    className="w-40 bg-primary hover:bg-primary/90 text-white"
                  >
                    {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isValidating ? 'Validating...' : 'Validate Contract'}
                  </Button>
                  {isContractValid && (
                    <div className="flex items-center text-green-400">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Contract validated successfully
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold mb-4 text-zinc-100">Event Selection</h2>
                <div className="space-y-4">
                  {events.map((event:any) => (
                    <div key={event.name} 
                    className="flex items-start space-x-3 p-3 rounded-lg bg-blue-900/20 border border-zinc-800"
                  >
                    <Checkbox
                      id={event.name}
                      checked={selectedEvents.includes(event)}
                      onCheckedChange={() => handleEventSelection(event)}
                      className="border-blue-500/50 mt-1"
                    />
                    <Label htmlFor={event.name} className="text-zinc-300 break-all">
                      <span className="break-words">{event.name}</span>
                      <span className="break-all">({event.inputs.map((input:any) => input.type).join(',')})</span>
                    </Label>
                  </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-semibold mb-4 text-zinc-100">Input Selection</h2>
                <div className="space-y-6">
                  {selectedEvents.map((event: any) => (
                    <div key={event.name} 
                      className="border border-zinc-800 bg-blue-900/20 p-3 sm:p-4 rounded-lg"
                    >
                      <h3 className="text-lg sm:text-xl font-medium mb-2 text-zinc-100">{event.name}</h3>
                      <div className="mb-4 overflow-hidden">
                        <p className="text-xs sm:text-sm text-blue-400 font-mono break-all">
                          <span className="font-semibold mr-1">Topic0:</span> 
                          {event.topic0}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {event.inputs.map((input: any, index: number) => (
                          <div key={input.name} 
                            className="flex items-center space-x-2 sm:space-x-3 p-2 rounded-md hover:bg-blue-900/30"
                          >
                            <Checkbox
                              id={`${event.name}-${input.name}`}
                              checked={selectedInputs[event.name]?.includes(index)}
                              onCheckedChange={() => handleInputSelection(event.name, index)}
                              className="border-blue-500/50"
                            />
                            <Label 
                              htmlFor={`${event.name}-${input.name}`} 
                              className="text-zinc-300"
                            >
                              {input.name} ({input.type})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold mb-4 text-zinc-100">Template Preview</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-zinc-200">Reactive Contract Template</h3>
                  <ContractPreview 
                    fullCode={previewCode} 
                    showSimplified={true} 
                    destinationAddress={destinationAddress}
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 text-zinc-200">Destination Contract Functions</h3>
                  <Textarea
                    value={destinationFunctions}
                    readOnly
                    className="h-24 font-mono bg-blue-900/20 border-zinc-700 text-zinc-200"
                  />
                </div>

                <Alert className="bg-yellow-900/20 border-yellow-500/50">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertTitle className="text-yellow-300">Warning</AlertTitle>
                  <AlertDescription className="text-yellow-200">
                    Ensure you have deployed your destination contract with the provided functions before proceeding.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  

                  <div>
                    <Label htmlFor="destinationAddress" className="text-zinc-200">
                      Destination Contract Address
                    </Label>
                    <Input
                      id="destinationAddress"
                      placeholder="0x..."
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200"
                    />
                  </div>

                  {destinationAddress && (
                    <DeployButton
                      editedContract={previewCode.replace(
                        "0x0000000000000000000000000000000000000000",
                        destinationAddress
                      )}
                      
                      onCompileSuccess={(abi, bytecode) => {
                        setAbi(abi);
                        setBytecode(bytecode);
                      }}
                      onDeploySuccess={(address, txHash) => {
                        setDeployedAddress(address);
                        setDeploymentTxHash(txHash);
                      }}
                      web3={web3}
                      account={account}
                    />
                  )}

                {/* {deployedAddress && (
                    <Alert className="bg-green-900/20 border-green-500/50">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertTitle className="text-green-300">Deployment Successful</AlertTitle>
                      <AlertDescription className="text-green-200">
                        <div className="mt-2 space-y-2">
                          <p className="break-all">
                            <span className="font-semibold">Contract Address:</span> {deployedAddress}
                          </p>
                          <p className="break-all">
                            <span className="font-semibold">Transaction Hash:</span> {deploymentTxHash}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )} */}
                </div>
              </div>
            </motion.div>
          )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 p-4 sm:p-6 border-t border-zinc-800">
          <Button 
            onClick={prevStep} 
            disabled={currentStep === 0} 
            variant="outline"
            className="w-full sm:w-auto border-blue-500/20 hover:bg-blue-900/20 text-zinc-200"
          >
            Previous
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={() => router.push('/dapp-automation')}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            >
              Finish
            </Button>
          ) : (
            <Button 
              onClick={nextStep} 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            >
              Next
            </Button>
          )}
        </CardFooter>
        </Card>
      </div>
    </div>
  )
}