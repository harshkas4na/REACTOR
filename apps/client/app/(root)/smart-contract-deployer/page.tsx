'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import DeploymentConfig from '@/components/smart-contract-deployer/DeploymentConfig'; 
import ContractEditor from '@/components/smart-contract-deployer/ContractEditor';
import DeploymentHistory from '@/components/smart-contract-deployer/DeploymentHistory';
import { preprocessOriginContract, preprocessDestinationContract } from '@/lib/contractPreprocessor';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/app/_context/Web3Context';
import {useAutomationContext} from '@/app/_context/AutomationContext'
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/data/constants';

export interface DeploymentRecord {
  id: number;
  contractName: string;
  address: string;
  network: string;
  txHash: string;
  status: 'success' | 'pending' | 'error';
  timestamp: string;
  contractType: 'origin' | 'destination' | 'both';
}

const NETWORK_NAMES: { [key: number]: string } = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia',
  5318008: 'Kopli',
  137: 'Polygon',
  80001: 'Mumbai',
  // Add other networks as needed
}

export default function SmartContractDeployer() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { web3, account } = useWeb3()
  const router = useRouter();
  const [showInitialDialog, setShowInitialDialog] = useState(true);
  const [useLibraries, setUseLibraries] = useState(false);
  const [contractType, setContractType] = useState<'origin' | 'destination' | 'both' | null>(null);
  const [manualABI, setManualABI] = useState('');
  const [manualBytecode, setManualBytecode] = useState('');
  
  const [compilationStatus, setCompilationStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle')
  const [compilationError, setCompilationError] = useState<string | null>(null)
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState<string>('')
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [deploymentError, setDeploymentError] = useState<string | null>(null)

  const {setOriginAddress, setDestinationAddress} = useAutomationContext();

  const handleCompile = async (sourceCode: string) => {
    setCompilationStatus('compiling')
    setCompilationError(null)
    
    try {
      // Preprocess contract based on type
      const processedCode = contractType === 'origin' 
        ? preprocessOriginContract(sourceCode)
        : preprocessDestinationContract(sourceCode);

      const response = await fetch(`${BASE_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: processedCode }),
      });

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to compile contract')
      }

      const { abi, bytecode } = await response.json()
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing')
      }
      
      setAbi(abi)
      setBytecode(bytecode)
      setCompilationStatus('success')
      toast({
        title: "Compilation Successful",
        description: "Your contract has been compiled successfully.",
      })
    } catch (error: any) {
      console.error('Compilation error:', error)
      setCompilationStatus('error')
      setCompilationError(error.message)
      toast({
        variant: "destructive",
        title: "Compilation Failed",
        description: error.message,
      })
    }
  }

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
      if(manualABI && manualBytecode){
        setAbi(JSON.parse(manualABI));
        setBytecode(manualBytecode);
      }
      if (!web3 || !account || !abi || !bytecode) {
        toast({
          variant: "destructive",
          title: "Deployment Error",
          description: "Missing required deployment configuration",
        });
        return;
      }
    
      const networkName = await getNetworkName(web3);      
    
      setDeploymentStatus('deploying');
      setDeploymentError(null);
    
      try {
        // Create new contract instance
        const contract = new web3.eth.Contract(abi);
        
        // Prepare deployment transaction
        let value = '0';
        let deployObj = {
          data: bytecode
        };
        
        if (contractType === 'destination' || contractType === 'both') {
          // Add 0.1 native currency as value for destination contract deployment
          value = web3.utils.toWei('0.1', 'ether');
        }
    
        const deploy = contract.deploy(deployObj);

        // Estimate gas
        const gasEstimate = await deploy.estimateGas({ 
          from: account,
          value: value
        })
        const gasLimit = Math.ceil(Number(gasEstimate) * 1.2)
        const gasPrice = await web3.eth.getGasPrice()

        // Check balance including the deployment fee for destination contracts
        const balance = await web3.eth.getBalance(account)
        const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice) + BigInt(value)

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
            value: value
          })
          .on('transactionHash', (hash: string | Uint8Array) => {
            console.log('Transaction Hash:', hash)
            transactionHash = hash as string
            
            // Save pending deployment
            const pendingDeployment: DeploymentRecord = {
              id: Date.now(),
              contractName: contractType === 'origin' ? "Origin Contract" : 
                          contractType === 'both' ? "Destination Contract" :
                          "Destination Contract",
              contractType: contractType as 'origin' | 'destination' | 'both',
              address: "Deploying...",
              network: networkName,
              txHash: transactionHash,
              status: 'pending',
              timestamp: new Date().toISOString(),
            };
            const history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]')
            localStorage.setItem('deploymentHistory', JSON.stringify([...history, pendingDeployment]))
          })
          .on('error', (error: any) => {
            const history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]')
            const updatedHistory = history.map((dep: DeploymentRecord) => {
              if (dep.txHash === transactionHash) {
                return { ...dep, status: 'error' }
              }
              return dep
            })
            localStorage.setItem('deploymentHistory', JSON.stringify(updatedHistory))
            reject(error)
          })
          .then(resolve)
        })

        // Update final deployment status
        if (deployedContract) {
          const contractAddress = (deployedContract as any).options.address;
          setDeployedAddress(contractAddress);
          setDeploymentStatus('success');
          
          // Update contract addresses based on type
          if (contractType === 'origin') {
            setOriginAddress(contractAddress);
          } else if (contractType === 'destination') {
            setDestinationAddress(contractAddress);
          } else if (contractType === 'both') {
            setOriginAddress(contractAddress);
            setDestinationAddress(contractAddress);
          }
        
          // Update the deployment record
          const history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]');
          const updatedHistory = history.map((dep: DeploymentRecord) => {
            if (dep.txHash === transactionHash) {
              return {
                ...dep,
                status: 'success',
                address: contractAddress,
              };
            }
            return dep;
          });
          localStorage.setItem('deploymentHistory', JSON.stringify(updatedHistory));
        
          toast({
            title: "Deployment Successful",
            description: `Contract deployed at ${contractAddress} on ${networkName}`,
          });
        
          setTimeout(() => {
            router.back();
          }, 1500);
        
          return {
            transactionHash,
            contractAddress,
            networkName
          };
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

  if (showInitialDialog) {
    return (
      <Dialog open={showInitialDialog} onOpenChange={setShowInitialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contract Configuration</DialogTitle>
            <DialogDescription>
              Please provide some information about your smart contract.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contract Type</label>
              <Select onValueChange={(value: 'origin' | 'destination' | 'both') => setContractType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="origin">Origin Contract</SelectItem>
                  <SelectItem value="destination">Destination Contract</SelectItem>
                  <SelectItem value="both">Combined Origin & Destination Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Does your contract use external libraries?</label>
              <Select onValueChange={(value) => setUseLibraries(value === 'true')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useLibraries && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract ABI</label>
                  <Textarea
                    placeholder="Paste your contract ABI here"
                    value={manualABI}
                    onChange={(e) => setManualABI(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract Bytecode</label>
                  <Textarea
                    placeholder="Paste your contract bytecode here"
                    value={manualBytecode}
                    onChange={(e) => setManualBytecode(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => setShowInitialDialog(false)}
            disabled={!contractType || (useLibraries && (!manualABI || !manualBytecode))}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen  text-slate-900 dark:text-slate-50">
      <header className=" shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Deploy Smart Contract</h1>
          
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!useLibraries ? (
            <>
              <Card className="p-6">
                <ContractEditor 
                  onCompile={handleCompile}
                  compilationStatus={compilationStatus}
                  contractType={contractType as 'origin' | 'destination'}
                />
              </Card>
              <Card className="p-6">
                <DeploymentConfig
                  compilationStatus={compilationStatus}
                  compilationError={compilationError}
                  onDeploy={handleDeploy}
                  deploymentStatus={deploymentStatus}
                  deploymentError={deploymentError}
                  contractType={contractType as 'origin' | 'destination'}
                  abi={abi}
                  bytecode={bytecode}
                />
              </Card>
            </>
          ) : (
            <Card className="p-6 col-span-2 z-100">
              <CardHeader>
                <CardTitle>Manual ABI & Bytecode Deployment</CardTitle>
              </CardHeader>
              <CardContent>
                <DeploymentConfig

                  compilationStatus={"success"}
                  compilationError={compilationError}
                  onDeploy={handleDeploy}
                  deploymentStatus={deploymentStatus}
                  deploymentError={deploymentError}
                  abi={JSON.parse(manualABI)}
                  bytecode={manualBytecode}
                  contractType={contractType as 'origin' | 'destination'}
                />
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="mt-8 p-6">
          <DeploymentHistory/>
        </Card>
      </main>
    </div>
  );
}

