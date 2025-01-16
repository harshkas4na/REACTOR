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
import { BASE_URL } from '@/data/constants'

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
      originChainId: 11155111, // Assuming Ethereum sepolia, adjust as needed
      destinationChainId: 11155111, // Assuming same chain, adjust as needed
      originContract: contractAddress,
      destinationContract: "0x0000000000000000000000000000000000000000" // Placeholder
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
      const response = await fetch(`${BASE_URL}/compile`, {
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

        <div className="relative z-20 mb-6 sm:mb-8 overflow-x-auto">
  <div className="flex justify-between items-center min-w-[600px] sm:min-w-0">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center">
        <div className={`relative w-8 sm:w-10 h-8 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 ${
          index <= currentStep 
            ? 'bg-primary text-white scale-110' 
            : 'bg-blue-900/20 text-zinc-400'
        }`}>
          {index + 1}
        </div>
        {index < steps.length - 1 && (
          <div className={`h-1 w-12 sm:w-24 transition-all duration-200 ${
            index < currentStep ? 'bg-primary' : 'bg-blue-900/20'
          }`} />
        )}
      </div>
    ))}
  </div>
  <div className="flex justify-between mt-2 text-xs sm:text-sm min-w-[600px] sm:min-w-0">
    {steps.map((step, index) => (
      <span key={step} className={`${
        index <= currentStep ? 'text-primary font-medium' : 'text-zinc-500'
      }`}>
        {step}
      </span>
    ))}
  </div>
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
                      className="flex items-center space-x-3 p-3 rounded-lg bg-blue-900/20 border border-zinc-800"
                    >
                      <Checkbox
                        id={event.name}
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => handleEventSelection(event)}
                        className="border-blue-500/50"
                      />
                      <Label htmlFor={event.name} className="text-zinc-300">
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
                  className="border-blue-500/50 flex-shrink-0"
                />
                <Label 
                  htmlFor={`${event.name}-${input.name}`} 
                  className="text-zinc-300 text-sm sm:text-base"
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
                    <Textarea
                      value={previewCode}
                      readOnly
                      className="h-64 font-mono bg-blue-900/20 border-zinc-700 text-zinc-200"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2 text-zinc-200">Destination Contract Functions</h3>
                    <Textarea
                      value={destinationFunctions}
                      readOnly
                      className="h-64 font-mono bg-blue-900/20 border-zinc-700 text-zinc-200"
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
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-zinc-800">
                      <p className='text-zinc-200 mb-4'>
                        Implement the above generated function(s) in your destination contract to store the datas in some state with help of these functions, deploy it, and paste the address here.
                      </p>
                      <p className='text-zinc-200'>
                        Important: Before deploying your destination contract, please ensure the following requirements are met:
                      </p>
                      <ul className="list-disc list-inside space-y-2 mt-2 text-zinc-300">
                        <li>Implement the AbstractCallback interface in your destination contract.</li>
                        <li>Configure your constructor as payable and pass the Callback_sender parameter to AbstractCallback.</li>
                        <li>Include minimum 0.1 native tokens for successful callbacks.</li>
                      </ul>
                      <p className='mt-4 text-zinc-200'>
                        For comprehensive implementation details, check our{' '}
                        <a href="https://dev.reactive.network/" 
                          className='text-blue-400 hover:text-blue-300 transition-colors' 
                          target='_blank'>
                          REACTIVE NETWORK documentation
                        </a>
                      </p>
                    </div>

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

                    <Button 
                      onClick={updateAndCompileContract} 
                      disabled={!destinationAddress || isCompiling}
                      className="w-60 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isCompiling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isCompiling ? 'Compiling...' : 'Update and Compile Contract'}
                    </Button>

                    {compilationSuccess && (
                      <Alert className="bg-green-900/20 border-green-500/50">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-300">Success</AlertTitle>
                        <AlertDescription className="text-green-200">
                          Reactive contract has been successfully compiled.
                        </AlertDescription>
                      </Alert>
                    )}

                    {abi && bytecode && (
                      <Button 
                        onClick={handleDeploy} 
                        disabled={isDeploying}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isDeploying ? 'Deploying...' : 'Deploy on Reactive Network'}
                      </Button>
                    )}

                    {deploymentSuccess && (
                      <Alert className="bg-green-900/20 border-green-500/50">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-300">Success</AlertTitle>
                        <AlertDescription className="text-green-200">
                          Contract successfully deployed at address: {deployedAddress}
                        </AlertDescription>
                      </Alert>
                    )}
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
    <Button 
      onClick={nextStep} 
      disabled={currentStep === steps.length - 1}
      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
    >
      {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
    </Button>
  </CardFooter>
        </Card>
      </div>
    </div>
  )
}