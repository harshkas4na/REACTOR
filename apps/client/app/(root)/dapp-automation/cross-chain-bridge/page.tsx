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
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useContractGeneration } from '@/hooks/automation/useContractGeneration'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import AutomationForm2 from '@/components/automation/SCAutomation/AutomationForm2'
import { useWeb3 } from '@/app/_context/Web3Context'
import { BASE_URL } from '@/data/constants'

export default function CrossChainBridge() {
  const [step, setStep] = useState(1)
  const [originChain, setOriginChain] = useState('')
  const [destinationChain, setDestinationChain] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null)
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null)
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState('')
  const [isContractVisible, setIsContractVisible] = useState(false)
  
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
  const chains = [
    { name: 'Ethereum', id: '1' },
    { name: 'Sepolia', id: '11155111' },
    { name: 'Kopli', id: '5318008' },
    { name: 'Avalanche', id: '43114' }
  ]

  const handleCompile = async () => {
    try {
      const response = await fetch(`${BASE_URL}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: reactiveContract }),
      });

      if (!response.ok) {
        throw new Error('Failed to compile contract');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing');
      }
      setAbi(abi);
      setBytecode(bytecode);
      setDeploymentStatus('Contract compiled successfully');
    } catch (error: any) {
      console.error('Error in compile:', error);
    }
  };

  const handleDeploy = async () => {
    if (!web3 || !account) {
      console.error('Web3 or account not available');
      return;
    }

    try {
      const contract = new web3.eth.Contract(abi);
      const deployTransaction = contract.deploy({
        data: bytecode,
        arguments: []
      });
      
      const gasEstimate = await deployTransaction.estimateGas({ from: account });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        setDeploymentStatus('Insufficient balance for deployment');
        return;
      }

      const deployedContract = await deployTransaction.send({
        from: account,
        gas: String(gasLimit),
        gasPrice: String(gasPrice),
      });
      
      setDeployedAddress(String(deployedContract.options.address));
      setDeploymentStatus('Contract deployed successfully');

      const code = await web3.eth.getCode(String(deployedContract.options.address));
      if (code === '0x' || code === '0x0') {
        setDeploymentStatus('Contract deployment failed - no code at contract address');
      }

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentStatus('Failed to deploy contract');
    }
  };

  const { generateContractTemplate, isLoading } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
    },
  });
  
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

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4))
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const toggleContractVisibility = () => setIsContractVisible(!isContractVisible)

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-64">
      <div className="relative z-20 max-w-8xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Cross-Chain Bridge Template
        </motion.h1>
        
        {/* Progress Steps */}
        <div className="relative z-20 mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                  s <= step 
                    ? 'bg-primary text-white scale-110' 
                    : 'bg-blue-900/50 text-zinc-400'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`h-1 w-full sm:w-24 transition-all duration-200 ${
                    s < step ? 'bg-primary' : 'bg-blue-900/50'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["Chain Selection", "Contract Configuration", "Mapping", "Deployment"].map((label, idx) => (
              <span key={label} className={`text-sm ${
                step >= idx + 1 ? 'text-primary font-medium' : 'text-zinc-500'
              }`}>
                {label}
              </span>
            ))}
          </div>
        </div>
  
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs value={`step${step}`} className="space-y-6">
              <TabsContent value="step1">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Chain Selection
                </CardTitle>
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
                      <SelectContent className="bg-zinc-800 border-zinc-700">
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
                      <SelectContent className="bg-zinc-800 border-zinc-700">
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
  
              <TabsContent value="step2">
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
  
              <TabsContent value="step3">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Mapping Configuration
                </CardTitle>
                <div className="space-y-4">
                  <AutomationForm2
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    error={null}
                    isValidForm={true}
                  />
                </div>
              </TabsContent>
  
              <TabsContent value="step4">
                <CardTitle className="text-2xl font-bold mb-4 text-zinc-100">
                  Deployment
                </CardTitle>
                <div className="space-y-4">
                  {reactiveContract && (
                    <div className="mb-6">
                      <Button
                        onClick={toggleContractVisibility}
                        className="w-full flex justify-between items-center p-4 bg-blue-900/20 text-zinc-200 border border-blue-500/20 hover:bg-blue-900/30"
                      >
                        <span>View Generated Contract</span>
                        {isContractVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {isContractVisible && (
                        <div className="mt-2 p-4 bg-blue-900/20 rounded-lg border border-zinc-800">
                          <pre className="whitespace-pre-wrap overflow-x-auto text-zinc-300">
                            {reactiveContract}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <Button 
                      onClick={handleCompile} 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                      disabled={isLoading || !reactiveContract}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Compile Contract
                    </Button>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={handleDeploy}
                      disabled={isLoading || !originChain || !destinationChain || !abi || !bytecode}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        'Deploy Bridge'
                      )}
                    </Button>
  
                    {deploymentStatus && (
                      <Alert className="bg-blue-900/20 border-blue-500/50">
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                        <AlertTitle className="text-blue-300">Status</AlertTitle>
                        <AlertDescription className="text-blue-200">
                          {deploymentStatus}
                        </AlertDescription>
                      </Alert>
                    )}
  
                    {deployedAddress && (
                      <Alert className="bg-green-900/20 border-green-500/50">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <AlertTitle className="text-green-300">Deployed Address</AlertTitle>
                        <AlertDescription className="text-green-200">
                          {deployedAddress}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
  
            <div className="flex justify-between mt-6">
              <Button 
                onClick={prevStep} 
                disabled={step === 1} 
                variant="outline"
                className="border-blue-500/20 hover:bg-blue-900/20 text-zinc-200"
              >
                Previous
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={step === 4}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {step === 4 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}