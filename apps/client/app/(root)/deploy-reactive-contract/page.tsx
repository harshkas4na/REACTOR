"use client"

import React, { useState, useEffect } from 'react';
import AutomationForm from '@/components/automation/SCAutomation/AutomationForm';
import ContractDisplay from '@/components/automation/SCAutomation/ContractDispaly';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { useContractGeneration } from '@/hooks/automation/useContractGeneration';
import { useWeb3 } from '@/app/_context/Web3Context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DeployButton from '@/components/DeployButton';

const NETWORK_NAMES: { [key: number]: string } = {
  5318008: 'Kopli', // Assuming this is the chain ID for Kopli
  // Add other network names if needed
};

export default function AutomationPage() {
  const [showContract, setShowContract] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [editedContract, setEditedContract] = useState('');
  const [abi, setAbi] = useState<any>(null);
  const [bytecode, setBytecode] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [compileError, setCompileError] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentTxHash, setDeploymentTxHash] = useState<string | null>(null);
  const [isValidForm, setIsValidForm] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')

  const { toast } = useToast()

  const {
    OrgChainId,
    DesChainId,
    automations,
    reactiveContract,
    setReactiveContract,
    originAddress,
    destinationAddress,
    isPausable,
  } = useAutomationContext();

  const { account, web3 } = useWeb3();

  const { generateContractTemplate, isLoading, error } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
      setEditedContract(contract);
    },
  });

  const isEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  useEffect(() => {
    validateForm();
  }, [automations, OrgChainId, DesChainId, originAddress, destinationAddress]);

  const validateForm = () => {
    const isValidAutomations = automations.every(automation => {
      const eventRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\((address|uint256|string|bool|bytes32|uint8)(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
      const functionRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(address(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
      return eventRegex.test(automation.event) && functionRegex.test(automation.function);
    });
    
    // console.log('isValidAutomations:', isValidAutomations);
    const isValidAddresses = isEthereumAddress(originAddress) && isEthereumAddress(destinationAddress);
    // console.log('isValidAddresses:', isValidAddresses);
  
    const isValidChainIds = !isNaN(Number(OrgChainId)) && !isNaN(Number(DesChainId));
    // console.log('isValidChainIds:', isValidChainIds);
  
    setIsValidForm(isValidAutomations && isValidAddresses && isValidChainIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidForm) {
      await generateContractTemplate({
        automations,
        OrgChainId: Number(OrgChainId),
        DesChainId: Number(DesChainId),
        originAddress,
        destinationAddress,
        isPausable,
      });
    }
  };

  const handleSaveEditedContract = () => {
    setReactiveContract(editedContract);
    setEditingContract(false);
  };

  const handleContractChange = (value: string) => {
    setEditedContract(value);
  };

  const handleCompile = async () => {
    setCompileError(null);
    try {
      const response = await fetch('http://localhost:5000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: editedContract }),
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
    } catch (error: any) {
      console.error('Error in compile:', error);
      setCompileError(error.message);
    }
  };

  const getNetworkName = async (web3: any) => {
    try {
      const chainId = await web3.eth.getChainId()
      return NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`
    } catch (error) {
      console.error('Error getting network name:', error)
      return 'Unknown Network'
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account || !abi || !bytecode) {
      toast({
        variant: "destructive",
        title: "Deployment Error",
        description: "Missing required deployment configuration",
      })
      return
    }

    setDeploymentStatus('deploying')
    setDeploymentError(null)

    try {
      // Create new contract instance
      const contract = new web3.eth.Contract(abi)
      
      // Get network name before deployment
      const networkName = await getNetworkName(web3)
      
      // Check if the network is Kopli
      if (networkName !== 'Kopli') {
        throw new Error('Deployment is only allowed on the Kopli network')
      }

      // Prepare deployment transaction
      const deploy = contract.deploy({
        data: bytecode,
        arguments: []
      })

      // Estimate gas
      const gasEstimate = await deploy.estimateGas({ from: account })
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2)
      const gasPrice = await web3.eth.getGasPrice()

      // Check balance
      const balance = await web3.eth.getBalance(account)
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice)

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`)
      }

      let transactionHash = ''
      
      // Deploy with event tracking
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
        })
        .on('transactionHash', (hash: string | Uint8Array) => {
          console.log('Transaction Hash:', hash)
          transactionHash = hash as string
          setDeploymentTxHash(hash as string)
        })
        .on('error', (error: any) => {
          reject(error)
        })
        .then(resolve)
      })

      // Update final deployment status
      if (deployedContract) {
        const contractAddress = (deployedContract as any).options.address
        setDeployedAddress(contractAddress)
        setDeploymentStatus('success')

        toast({
          title: "Deployment Successful",
          description: `Contract deployed at ${contractAddress} on ${networkName}`,
        })

        return {
          transactionHash,
          contractAddress,
          networkName
        }
      }

    } catch (error: any) {
      console.error('Deployment error:', error)
      setDeploymentStatus('error')
      setDeploymentError(error.message)
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error.message,
      })
    }
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      {/* Main content wrapper with explicit z-index */}
      <div className="relative z-20 max-w-4xl mx-auto space-y-8">
        <h1 className="relative text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Create Your Automation
        </h1>
        
        {/* Cards with explicit z-index and pointer-events-auto */}
        <Card className="relative z-20 pointer-events-auto bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-zinc-800">
          <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-6 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Automation Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AutomationForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              isValidForm={isValidForm}
            />
          </CardContent>
        </Card>

        {reactiveContract && (
          <Card className="relative z-20 pointer-events-auto bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-zinc-800">
            <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-6 rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-zinc-100">
                Smart Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContractDisplay
                reactiveContract={reactiveContract}
                editedContract={editedContract}
                showContract={showContract}
                editingContract={editingContract}
                onToggleShow={() => setShowContract(!showContract)}
                onEdit={() => setEditingContract(true)}
                onSave={handleSaveEditedContract}
                onCancelEdit={() => setEditingContract(false)}
                onContractChange={handleContractChange}
              />
              <div className="mt-6 space-y-4">
                
                <DeployButton
                    editedContract={editedContract}
                    onCompileSuccess={(abi, bytecode) => {
                      setAbi(abi);
                      setBytecode(bytecode);
                    }}
                    onDeploySuccess={(address, transactionHash) => {
                      setDeployedAddress(address);
                      setDeploymentTxHash(transactionHash);
                    }}
                    web3={web3}
                    account={account}
                  />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts and status cards with proper z-index */}
        {compileError && (
          <Alert variant="destructive" className="relative z-20 pointer-events-auto bg-red-900/20 border-red-800">
            <AlertTitle className="text-red-200 font-semibold">
              Compilation Error
            </AlertTitle>
            <AlertDescription className="text-red-300">
              {compileError}
            </AlertDescription>
          </Alert>
        )}

        {deploymentError && (
          <Alert variant="destructive" className="relative z-20 pointer-events-auto bg-red-900/20 border-red-800">
            <AlertTitle className="text-red-200 font-semibold">
              Deployment Error
            </AlertTitle>
            <AlertDescription className="text-red-300">
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

        {deployedAddress && (
          <Card className="relative z-20 pointer-events-auto bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-zinc-800">
            <CardHeader className="bg-gradient-to-r from-green-600/10 to-teal-600/10 p-6 rounded-t-lg">
              <CardTitle className="text-2xl font-bold text-zinc-100">
                Deployment Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                <span className="text-zinc-300 font-semibold">Contract Address:</span>
                <span className="font-mono text-blue-400">{deployedAddress}</span>
              </div>
              {deploymentTxHash && (
                <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                  <span className="text-zinc-300 font-semibold">Transaction Hash:</span>
                  <span className="font-mono text-blue-400">{deploymentTxHash}</span>
                </div>
              )}
              <Button 
                className="relative z-20 w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open(`https://kopli.reactscan.net/tx/${deploymentTxHash}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
