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
    <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
      <motion.h1 
        className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Cross-Chain Bridge Template
      </motion.h1>
      
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s <= step ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`h-1 w-full ${
                  s < step ? 'bg-purple-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className={`text-sm ${step >= 1 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>Chain Selection</span>
          <span className={`text-sm ${step >= 2 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>Contract Configuration</span>
          <span className={`text-sm ${step >= 3 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>Mapping</span>
          <span className={`text-sm ${step >= 4 ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>Deployment</span>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-800 shadow-md">
        <CardContent className="p-6">
          <Tabs value={`step${step}`} className="space-y-6">
            <TabsContent value="step1">
              <CardTitle className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Chain Selection</CardTitle>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="originChain" className="text-gray-700 dark:text-gray-300">Origin Chain</Label>
                  <Select value={originChain} onValueChange={(value) => {
                    setOriginChain(value)
                    setOrgChainId(chains.find(chain => chain.name === value)?.id || '')
                  }}>
                    <SelectTrigger id="originChain">
                      <SelectValue placeholder="Select origin chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {chains.map(chain => (
                        <SelectItem key={chain.name} value={chain.name}>{chain.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="destinationChain" className="text-gray-700 dark:text-gray-300">Destination Chain</Label>
                  <Select value={destinationChain} onValueChange={(value) => {
                    setDestinationChain(value)
                    setDesChainId(chains.find(chain => chain.name === value)?.id || '')
                  }}>
                    <SelectTrigger id="destinationChain">
                      <SelectValue placeholder="Select destination chain" />
                    </SelectTrigger>
                    <SelectContent>
                      {chains.map(chain => (
                        <SelectItem key={chain.name} value={chain.name}>{chain.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {originChain && destinationChain && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      {originChain} to {destinationChain} bridge is supported
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="step2">
              <CardTitle className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Contract Configuration</CardTitle>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="originContract" className="text-gray-700 dark:text-gray-300">Origin Contract Address</Label>
                  <Input
                    id="originContract"
                    placeholder="0x..."
                    value={originAddress}
                    onChange={(e) => setOriginAddress(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="destinationContract" className="text-gray-700 dark:text-gray-300">Destination Contract Address</Label>
                  <Input
                    id="destinationContract"
                    placeholder="0x..."
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3">
              <CardTitle className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Mapping Configuration</CardTitle>
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
              <CardTitle className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Deployment</CardTitle>
              <div className="space-y-4">
                {reactiveContract && (
                  <div className="mb-6">
                    <Button
                      onClick={toggleContractVisibility}
                      className="w-full flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"
                    >
                      <span>View Generated Contract</span>
                      {isContractVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {isContractVisible && (
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {reactiveContract}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-4">
                  <Button onClick={handleCompile} className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isLoading || !reactiveContract}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Compile Contract
                  </Button>
                  
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Status</AlertTitle>
                      <AlertDescription>{deploymentStatus}</AlertDescription>
                    </Alert>
                  )}

                  {deployedAddress && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Deployed Address</AlertTitle>
                      <AlertDescription>{deployedAddress}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6">
            <Button onClick={prevStep} disabled={step === 1} variant="outline">
              Previous
            </Button>
            <Button onClick={nextStep} disabled={step === 4}>
              {step === 4 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}