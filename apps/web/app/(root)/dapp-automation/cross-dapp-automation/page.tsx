'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, PlusCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useWeb3 } from '@/app/_context/Web3Context'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useContractGeneration } from '@/hooks/automation/useContractGeneration'
import AutomationForm2 from '@/components/automation/SCAutomation/AutomationForm2'

export default function CrossDAppAutomation() {
  const [availableEvents, setAvailableEvents] = useState([])
  const [isValidating, setIsValidating] = useState(false)
  const [isContractValid, setIsContractValid] = useState(false)
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null)
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [isTemplateVisible, setIsTemplateVisible] = useState(false)
  
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
      const response = await fetch('http://localhost:5000/DappAutomation', {
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
          // If it's the first event, replace the previous state
          return [{ event: eventSignature, function: '', topic0 }];
        } else {
          // For subsequent events, add to the existing state
          return [...prev, { event: eventSignature, function: '', topic0 }];
        }
      })
      setAvailableEvents(prev => prev.filter(e => e.name !== event.name))
    } catch (error) {
      console.error('Error generating topic0:', error)
    }
  }


  

  const handleCompile = async () => {
    try {
      const response = await fetch('http://localhost:5000/compile', {
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
      setDeploymentStatus('Failed to compile contract');
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

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-slate-900">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Cross-DApp Automation Template</h1>
      
      <Card className="bg-white dark:bg-slate-800 shadow-md mb-6">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Origin Contract Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="originAddress" className="text-gray-700 dark:text-gray-300">Origin DApp Address</Label>
              <Input
                id="originAddress"
                placeholder="0x..."
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={validateContract} 
              disabled={isValidating || !originAddress}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isValidating ? 'Validating...' : 'Validate Contract'}
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
        <Card className="bg-white dark:bg-slate-800 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Event Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white flex justify-between items-center"
                    >
                      <span>{event.name}{event.inputs.length > 0 ? `(${event.inputs.map((input: any) => input.type).join(',')})` : ''}</span>
                      <PlusCircle className="h-4 w-4 ml-2" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="bg-white dark:bg-slate-800 shadow-md mb-6">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Destination Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="destinationAddress" className="text-gray-700 dark:text-gray-300">Destination Contract Address</Label>
              <Input
                id="destinationAddress"
                placeholder="0x..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="orgChainId" className="text-gray-700 dark:text-gray-300">Origin Chain ID</Label>
              <Input
                id="orgChainId"
                type="number"
                value={OrgChainId}
                onChange={(e) => setOrgChainId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="desChainId" className="text-gray-700 dark:text-gray-300">Destination Chain ID</Label>
              <Input
                id="desChainId"
                type="number"
                value={DesChainId}
                onChange={(e) => setDesChainId(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {automations.length > 0 && (
        <Card className="bg-white dark:bg-slate-800 shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Automations</CardTitle>
          </CardHeader>
          <CardContent>
            
            <AutomationForm2
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error=""
              isValidForm={automations.length > 0}
            />
          </CardContent>
        </Card>
      )}

      

      

      <div className="space-y-4">
        {reactiveContract && (
          <>
            <Button 
              onClick={handleCompile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Compile Contract
            </Button>
            <Button
              onClick={() => setIsTemplateVisible(!isTemplateVisible)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white flex justify-between items-center"
            >
              <span>{isTemplateVisible ? 'Hide' : 'Show'} Generated Template</span>
              {isTemplateVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {isTemplateVisible && (
              <Card className="bg-white dark:bg-slate-800 shadow-md">
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">{reactiveContract}</pre>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {abi && bytecode && (
          <Button 
            onClick={handleDeploy}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Deploy Contract
          </Button>
        )}

        {deploymentStatus && (
          <Alert variant={deploymentStatus.includes('successfully') ? 'success' : 'destructive'}>
            <AlertCircle className="h-4  w-4" />
            <AlertTitle>Deployment Status</AlertTitle>
            <AlertDescription>{deploymentStatus}</AlertDescription>
          </Alert>
        )}

        {deployedAddress && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Contract Deployed</AlertTitle>
            <AlertDescription>Deployed at: {deployedAddress}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}