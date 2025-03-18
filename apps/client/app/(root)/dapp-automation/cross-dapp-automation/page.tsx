'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, PlusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useWeb3 } from '@/app/_context/Web3Context'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useContractGeneration } from '@/hooks/automation/useContractGeneration'
import AutomationForm2 from '@/components/automation/SCAutomation/AutomationForm2'
import DeployButton from '@/components/DeployButton'
import { BASE_URL } from '@/data/constants'
import ContractPreview from '@/components/contract-preview'

export default function CrossDAppAutomation() {
  const [availableEvents, setAvailableEvents] = useState([])
  const [isValidating, setIsValidating] = useState(false)
  const [isContractValid, setIsContractValid] = useState(false)
  const [isTemplateVisible, setIsTemplateVisible] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deploymentTxHash, setDeploymentTxHash] = useState<string>('')
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState('')
  
  const {
    OrgChainId,
    setOrgChainId,
    DesChainId,
    setDesChainId,
    originAddress,
    setOriginAddress,
    destinationAddress,
    setDestinationAddress,
    automations,
    setAutomations,
    reactiveContract,
    setReactiveContract
  } = useAutomationContext();

  const { account, web3 } = useWeb3();

  const { generateContractTemplate, isLoading } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
    },
  });

  const validateContract = async () => {
    setIsValidating(true)
    try {
      const response = await fetch(`${BASE_URL}/DappAutomation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originAddress: originAddress }),
      })
      const data = await response.json()
      if (response.ok) {
        setAvailableEvents(data.events)
        setIsContractValid(true)
        setOriginAddress(originAddress)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateContractTemplate({
      automations,
      OrgChainId: Number(OrgChainId),
      DesChainId: Number(DesChainId),
      originAddress,
      destinationAddress,
      isPausable: false,
    });
  };

  const handleAddAutomation = (event: any) => {
    const eventSignature = `${event.name}(${event.inputs.map((input: any) => input.type).join(',')})`
    try {
      const topic0 = ethers.keccak256(ethers.toUtf8Bytes(eventSignature))
      setAutomations(prev => {
        if (prev.length === 1 && prev[0].event === '') {
          return [{ event: eventSignature, function: '', topic0 }];
        } else {
          return [...prev, { event: eventSignature, function: '', topic0 }];
        }
      })
      setAvailableEvents(prev => prev.filter((e:any) => e.name !== event.name))
    } catch (error) {
      console.error('Error generating topic0:', error)
    }
  }

  return (
    <div className="relative min-h-screen py-8 sm:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Cross-DApp Automation Template
        </h1>
          
        {/* Origin Contract Configuration */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-4 sm:mb-6">
          <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-zinc-100">Origin Contract Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="originAddress" className="text-sm sm:text-base text-zinc-200">
                  Origin DApp Address
                </Label>
                <Input
                  id="originAddress"
                  placeholder="0x..."
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-400 text-sm sm:text-base"
                />
              </div>
              <div className="flex justify-start">
                <Button 
                  onClick={validateContract} 
                  disabled={isValidating || !originAddress}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isValidating ? 'Validating...' : 'Validate Contract'}
                </Button>
              </div>
              {isContractValid && (
                <div className="flex items-center text-green-400 text-sm sm:text-base">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Contract validated successfully
                </div>
              )}
            </div>
          </CardContent>
        </Card>
  
        {/* Event Selection */}
        {isContractValid && (
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-4 sm:mb-6">
            <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-zinc-100">Event Selection</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <AnimatePresence>
                  {availableEvents.map((event: any) => (
                    <motion.div
                      key={event.name}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button 
                        onClick={() => handleAddAutomation(event)}
                        className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-zinc-200 flex justify-between items-center p-3 sm:p-4 text-sm sm:text-base"
                      >
                        <span className="truncate mr-2">
                          {event.name}
                          {event.inputs.length > 0 
                            ? `(${event.inputs.map((input: any) => input.type).join(',')})` 
                            : ''
                          }
                        </span>
                        <PlusCircle className="h-4 w-4 flex-shrink-0" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        )}
  
        {/* Destination Configuration */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-4 sm:mb-6">
          <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl text-zinc-100">Destination Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="destinationAddress" className="text-sm sm:text-base text-zinc-200">
                  Destination Contract Address
                </Label>
                <Input
                  id="destinationAddress"
                  placeholder="0x..."
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-400 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="orgChainId" className="text-sm sm:text-base text-zinc-200">
                  Origin Chain ID
                </Label>
                <Input
                  id="orgChainId"
                  type="number"
                  value={OrgChainId}
                  onChange={(e) => setOrgChainId(e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="desChainId" className="text-sm sm:text-base text-zinc-200">
                  Destination Chain ID
                </Label>
                <Input
                  id="desChainId"
                  type="number"
                  value={DesChainId}
                  onChange={(e) => setDesChainId(e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 text-sm sm:text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>
          
        {/* Automations */}
        {automations.length > 0 && (
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-4 sm:mb-6">
            <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-zinc-100">Automations</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <AutomationForm2
                onSubmit={handleSubmit}
                isLoading={isLoading}
                error={null}
                isValidForm={automations.length > 0}
              />
            </CardContent>
          </Card>
        )}
  
        {/* Contract Actions */}
        <div className="space-y-3 sm:space-y-4">
          {reactiveContract && (
            <>
              <Button
                onClick={() => setIsTemplateVisible(!isTemplateVisible)}
                className=" bg-blue-900/20 hover:bg-blue-900/30 text-zinc-200 flex justify-between items-center border border-blue-500/20 text-sm sm:text-base py-2 sm:py-3"
              >
                <span>{isTemplateVisible ? 'Hide' : 'Show'} Generated Template</span>
                {isTemplateVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {isTemplateVisible && (
                <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
                  <CardContent className="p-3 sm:p-6">
                  <ContractPreview 
                    fullCode={reactiveContract} 
                    showSimplified={true} 
                    destinationAddress={destinationAddress}
                  />
                  </CardContent>
                </Card>
              )}

              <DeployButton
                editedContract={reactiveContract}
                onCompileSuccess={(abi:any, bytecode:any) => {
                  setAbi(abi);
                  setBytecode(bytecode);
                }}
                onDeploySuccess={(address:any, txHash:any) => {
                  setDeployedAddress(address);
                  setDeploymentTxHash(txHash);
                }}
                web3={web3}
                account={account}
              />

              {/* {deployedAddress && (
                <Alert className="bg-green-900/20 border-green-500/50 p-3 sm:p-4">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertTitle className="text-sm sm:text-base text-green-300">
                    Contract Deployed Successfully
                  </AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm mt-1 text-green-200">
                    <div className="space-y-2">
                      <p className="break-all">Contract Address: {deployedAddress}</p>
                      {deploymentTxHash && (
                        <>
                          <p className="break-all">Transaction Hash: {deploymentTxHash}</p>
                          <Button 
                            onClick={() => window.open(`https://kopli.reactscan.net/tx/${deploymentTxHash}`, '_blank')}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-sm"
                          >
                            View on Explorer
                          </Button>
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )} */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}