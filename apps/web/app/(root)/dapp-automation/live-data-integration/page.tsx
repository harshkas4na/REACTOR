'use client'

import { useState, useCallback } from 'react'
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
  const [isCompiling, setIsCompiling] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [compilationSuccess, setCompilationSuccess] = useState(false)
  const [deploymentSuccess, setDeploymentSuccess] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState('')
  const [deploymentError, setDeploymentError] = useState('')
  const { account, web3 } = useWeb3();

 

  const validateContract = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('http://localhost:5000/DappAutomation', {
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
      originChainId: 11155111, // Assuming Ethereum sepolia, adjust as needed
      destinationChainId: 11155111, // Assuming same chain, adjust as needed
      originContract: contractAddress,
      destinationContract: "0x0000000000000000000000000000000000000000" // Placeholder
    }
  
    try {
      const response = await fetch('http://localhost:5000/live-data-automation', {
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

  const updateAndCompileContract = async () => {
    if (!destinationAddress) return
    setIsCompiling(true)
    setCompilationSuccess(false)

    const updatedTemplate = previewCode.replace(
      "0x0000000000000000000000000000000000000000",
      destinationAddress
    )
    setPreviewCode(updatedTemplate)

    try {
      const response = await fetch('http://localhost:5000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: updatedTemplate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile contract');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing');
      }
      setAbi(abi);
      setBytecode(bytecode);
      setCompilationSuccess(true);
    } catch (error: any) {
      console.error('Error in compile:', error);
      // Handle error (e.g., show error message to user)
    } finally {
      setIsCompiling(false);
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account) {
      console.error('Web3 or account not available');
      return;
    }

    try {
      const parsedAbi = JSON.parse(abi);
      const contract = new web3.eth.Contract(parsedAbi);
      const deployTransaction = contract.deploy({
        data: bytecode,
        arguments: []
      });
      console.log('Deploying contract:', deployTransaction);
      const gasEstimate = await deployTransaction.estimateGas({ from: account });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`);
      }

      const deployedContract = await deployTransaction.send({
        from: account,
        gas: String(gasLimit),
        gasPrice: String(gasPrice),
      });
      // console.log('Contract deployed:', deployedContract);
      setDeployedAddress(String(deployedContract.options.address));
      // setDeploymentTxHash(deployTransaction);

      const code = await web3.eth.getCode(String(deployedContract.options.address));
      if (code === '0x' || code === '0x0') {
        throw new Error('Contract deployment failed - no code at contract address');
      }
      setDeploymentSuccess(true);

    } catch (error: any) {
      console.error('Deployment error details:', error);
      setDeploymentError(`Failed to deploy contract: ${error.message}`);
    }
  };


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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Live Data Integration Template</h1>
      
      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertTitle>Important Information</AlertTitle>
        <AlertDescription>
          To use this template, you must know which events of your contract provide the data you need. We can only list all event ABIs and cannot explain the logic behind their workings or how they are released.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 w-full ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <span key={step} className={`text-sm ${
              index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}>
              {step}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-semibold mb-4">Contract Input</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contractAddress">Origin DApp's Contract Address</Label>
                  <Input
                    id="contractAddress"
                    placeholder="0x..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                  />
                </div>
                <Button onClick={validateContract} disabled={!contractAddress || isValidating}>
                  {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isValidating ? 'Validating...' : 'Validate Contract'}
                </Button>
                {isContractValid && (
                  <div className="flex items-center text-green-500">
                    <CheckCircle2 className="mr-2" />
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
            >
              <h2 className="text-2xl font-semibold mb-4">Event Selection</h2>
              <div className="space-y-4">
                {events.map((event:any) => (
                  <div key={event.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.name}
                      checked={selectedEvents.includes(event)}
                      onCheckedChange={() => handleEventSelection(event)}
                    />
                    <Label htmlFor={event.name}>
                      {event.name}({event.inputs.map((input:any) => input.type).join(',')})
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
            >
              <h2 className="text-2xl font-semibold mb-4">Input Selection</h2>
              <div className="space-y-6">
                {selectedEvents.map((event: any) => (
                  <div key={event.name} className="border p-4 rounded-lg">
                    <h3 className="text-xl font-medium mb-2">{event.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">Topic0: {event.topic0}</p>
                    {event.inputs.map((input: any, index: number) => (
                      <div key={input.name} className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`${event.name}-${input.name}`}
                          checked={selectedInputs[event.name]?.includes(index)}
                          onCheckedChange={() => handleInputSelection(event.name, index)}
                        />
                        <Label htmlFor={`${event.name}-${input.name}`}>{input.name} ({input.type})</Label>
                      </div>
                    ))}
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
            >
              <h2 className="text-2xl font-semibold mb-4">Template Preview</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Reactive Contract Template</h3>
                  <Textarea
                    value={previewCode}
                    readOnly
                    className="h-64 font-mono"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Destination Contract Functions</h3>
                  <Textarea
                    value={destinationFunctions}
                    readOnly
                    className="h-64 font-mono"
                  />
                </div>
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Ensure you have deployed your destination contract with the provided functions before proceeding.
                  </AlertDescription>
                </Alert>
                <div>
                  <p className='text-gray-200 text-sm my-4'>Implement the above generated function(s) in your destination contract to store the datas in some state with help of these functions, deploy it, and paste the address here.</p>
                  <p className='text-gray-200 text-sm my-4'>
                        Important: Before deploying your destination contract, please ensure the following requirements are met:
                        <p className='my-2 text-gray-400'>1. Implement the AbstractCallback interface in your destination contract.</p>
                        <p className='my-2 text-gray-400'>2. Configure your constructor as payable and pass the Callback_sender parameter to AbstractCallback.</p>
                        <p className='my-2 text-gray-400'>3. When deploying, include at least 0.1 native tokens (e.g., 0.1 sepETH) to ensure successful callback execution.</p>

                    For comprehensive implementation details and best practices, please refer to our   
                     <br /><a href="https://dev.reactive.network/" className='text-blue-400' target='_blank'>REACTIVE NETWORK documentation</a>
                  </p>
                  <Label htmlFor="destinationAddress">Destination Contract Address</Label>

                  <Input
                    id="destinationAddress"
                    placeholder="0x..."
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                  />
                </div>
                <Button onClick={updateAndCompileContract} disabled={!destinationAddress || isCompiling} className="w-full">
                  
                  {isCompiling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isCompiling ? 'Compiling...' : 'Update and Compile Contract'}
                </Button>
                {compilationSuccess && (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Reactive contract has been successfully compiled.
                    </AlertDescription>
                  </Alert>
                )}
                {abi && bytecode && (
                  <Button onClick={handleDeploy} disabled={isDeploying} className="w-full mt-4">
                    {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isDeploying ? 'Deploying...' : 'Deploy on Reactive Network'}
                  </Button>
                )}
                {deploymentSuccess && (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      Contract successfully deployed at address: {deployedAddress}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={prevStep} disabled={currentStep === 0} variant="outline">
            Previous
          </Button>
          <Button onClick={nextStep} disabled={currentStep === steps.length - 1}>
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}