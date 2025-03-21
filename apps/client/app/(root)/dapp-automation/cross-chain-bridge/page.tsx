'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useContractGeneration } from '@/hooks/automation/useContractGeneration'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import AutomationForm2 from '@/components/automation/SCAutomation/AutomationForm2'
import DeployButton from '@/components/DeployButton'
import { useWeb3 } from '@/app/_context/Web3Context'
import ContractPreview from '@/components/contract-preview'
import { useRouter } from 'next/navigation';

const steps = [
  "Chain Selection",
  "Contract Configuration",
  "Mapping",
  "Deployment"
];

export default function CrossChainBridge() {
  const [originChain, setOriginChain] = useState('')
  const [destinationChain, setDestinationChain] = useState('')
  const [isContractVisible, setIsContractVisible] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState('')
  const [deploymentTxHash, setDeploymentTxHash] = useState('')
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  const {
    OrgChainId,
    setOrgChainId,
    setDesChainId,
    originAddress,
    setOriginAddress,
    destinationAddress,
    setDestinationAddress,
    DesChainId,
    automations,
    reactiveContract,
    setReactiveContract
  } = useAutomationContext();

  const { account, web3 } = useWeb3();
  const router = useRouter();

  const chains = [
    { name: 'Ethereum', id: '1' },
    { name: 'Sepolia', id: '11155111' },
    { name: 'Kopli', id: '5318008' },
    { name: 'Avalanche', id: '43114' }
  ]

  const { generateContractTemplate, isLoading } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
      nextStep();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originAddress || !destinationAddress || !OrgChainId || !DesChainId || automations.length === 0) {
      console.error('Missing required fields');
      return;
    }

    try {
      await generateContractTemplate({
        automations,
        OrgChainId: Number(OrgChainId),
        DesChainId: Number(DesChainId),
        originAddress,
        destinationAddress,
        isPausable: false,
      });
    } catch (error) {
      console.error('Error generating contract:', error);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const toggleContractVisibility = () => setIsContractVisible(!isContractVisible);

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Chain Selection
        return originChain && destinationChain;
      case 1: // Contract Configuration
        return originAddress && destinationAddress;
      case 2: // Mapping
        return automations.length > 0 && automations.every(a => a.event && a.function);
      case 3: // Deployment
        return true; // No next step from deployment
      default:
        return false;
    }
  };

  return (
    <div className="relative min-h-screen py-8 sm:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Cross-Chain Bridge Template
        </motion.h1>
        
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
          <CardContent className="p-6">
            <Tabs value={`step${currentStep}`} className="space-y-6">
              {/* Step 0: Chain Selection */}
              <TabsContent value="step0">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Chain Selection
                </CardTitle>
                {/* Chain selection content */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="originChain" className="text-zinc-200">Origin Chain</Label>
                    <Select 
                      value={originChain} 
                      onValueChange={(value) => {
                        setOriginChain(value)
                        setOrgChainId(chains.find(chain => chain.name === value)?.id || '')
                      }}
                    >
                      <SelectTrigger id="originChain" className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200">
                        <SelectValue placeholder="Select origin chain" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-zinc-700">
                        {chains.map(chain => (
                          <SelectItem 
                            key={chain.name} 
                            value={chain.name}
                            className="text-zinc-200 focus:bg-blue-600/20 cursor-pointer hover:bg-blue-600/20"
                          >
                            {chain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="destinationChain" className="text-zinc-200">
                      Destination Chain
                    </Label>
                    <Select 
                      value={destinationChain} 
                      onValueChange={(value) => {
                        setDestinationChain(value)
                        setDesChainId(chains.find(chain => chain.name === value)?.id || '')
                      }}
                    >
                      <SelectTrigger id="destinationChain" className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200">
                        <SelectValue placeholder="Select destination chain" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-zinc-700">
                        {chains.map(chain => (
                          <SelectItem 
                            key={chain.name} 
                            value={chain.name}
                            className="text-zinc-200 focus:bg-blue-600/20 cursor-pointer hover:bg-blue-600/20"
                          >
                            {chain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {originChain && destinationChain && (
                    <Alert className="bg-green-900/20 border-green-500/50">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertTitle className="text-green-300">Success</AlertTitle>
                      <AlertDescription className="text-green-200">
                        {originChain} to {destinationChain} bridge is supported
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>

              {/* Step 1: Contract Configuration */}
              <TabsContent value="step1">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Contract Configuration
                </CardTitle>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="originContract" className="text-zinc-200">
                      Origin Contract Address
                    </Label>
                    <Input
                      id="originContract"
                      placeholder="0x..."
                      value={originAddress}
                      onChange={(e) => setOriginAddress(e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="destinationContract" className="text-zinc-200">
                      Destination Contract Address
                    </Label>
                    <Input
                      id="destinationContract"
                      placeholder="0x..."
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Step 2: Mapping */}
              <TabsContent value="step2">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Mapping Configuration
                </CardTitle>
                <div className="space-y-4">
                  <AutomationForm2
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={null}
                    isValidForm={canProceedToNext() as boolean}
                  />
                </div>
              </TabsContent>

              {/* Step 3: Deployment */}
              <TabsContent value="step3">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Deployment
                </CardTitle>
                <div className="space-y-4">
                  {reactiveContract && (
                    <div className="mb-6">
                      <Button
                        onClick={toggleContractVisibility}
                        className="flex justify-between items-center p-4 bg-blue-900/20 text-zinc-200 border border-blue-500/20 hover:bg-blue-900/30"
                      >
                        <span>View Generated Contract</span>
                        {isContractVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {isContractVisible && (
                        <div className="mt-2 bg-blue-900/20 rounded-lg border border-zinc-800">
                          <ContractPreview 
                            fullCode={reactiveContract} 
                            showSimplified={true} 
                            destinationAddress={destinationAddress}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {reactiveContract && (
                      <DeployButton
                        editedContract={reactiveContract}
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
                        <AlertTitle className="text-green-300">Contract Deployed Successfully</AlertTitle>
                        <AlertDescription className="text-green-200">
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
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button 
                onClick={prevStep} 
                disabled={currentStep === 0} 
                variant="outline"
                className="border-blue-500/20 hover:bg-blue-900/20 text-zinc-200"
              >
                Previous
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button 
                  onClick={() => router.push('/dapp-automation')}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Finish
                </Button>
              ) : (
                <Button 
                  onClick={nextStep} 
                  disabled={!canProceedToNext()}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}