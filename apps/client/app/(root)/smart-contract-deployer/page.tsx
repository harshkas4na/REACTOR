'use client'

import { useState, useEffect } from 'react';
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
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/data/constants';
import { CALLBACK_PROXIES } from '@/components/smart-contract-deployer/DeploymentHistory';
import { motion } from 'framer-motion';
import { Code, Network, Merge, Info } from 'lucide-react';

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
  42161: 'Arbitrum',
  10: 'Optimism',
  56: 'BSC',
  43114: 'Avalanche',
  250: 'Fantom',
  // Add other networks as needed
}

export default function SmartContractDeployer() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { web3, account } = useWeb3();
  const router = useRouter();
  
  const [showInitialDialog, setShowInitialDialog] = useState(true);
  const [useLibraries, setUseLibraries] = useState(false);
  const [contractType, setContractType] = useState<'origin' | 'destination' | 'both' | null>(null);
  const [manualABI, setManualABI] = useState('');
  const [manualBytecode, setManualBytecode] = useState('');
  
  const [compilationStatus, setCompilationStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [abi, setAbi] = useState<any>(null);
  const [bytecode, setBytecode] = useState<string>('');
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const { 
    originAddress, 
    setOriginAddress, 
    destinationAddress, 
    setDestinationAddress,
    callbackSender,
    setCallbackSender
  } = useAutomationContext();

  useEffect(() => {
    // Set default callback sender when contract type changes
    if (web3 && (contractType === 'destination' || contractType === 'both')) {
      web3.eth.getChainId().then((chainId: bigint) => {
        const chainIdStr = chainId.toString();
        if (CALLBACK_PROXIES[chainIdStr]) {
          setCallbackSender(CALLBACK_PROXIES[chainIdStr]);
        }
      }).catch(console.error);
    }
  }, [web3, contractType, setCallbackSender]);

  const handleCompile = async (sourceCode: string) => {
    setCompilationStatus('compiling');
    setCompilationError(null);
    
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile contract');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing');
      }
      
      setAbi(abi);
      setBytecode(bytecode);
      setCompilationStatus('success');
      toast({
        title: "Compilation Successful",
        description: "Your contract has been compiled successfully.",
      });
    } catch (error: any) {
      console.error('Compilation error:', error);
      setCompilationStatus('error');
      setCompilationError(error.message);
      toast({
        variant: "destructive",
        title: "Compilation Failed",
        description: error.message,
      });
    }
  }

  const getNetworkName = async (web3: any) => {
    try {
      const chainId = await web3.eth.getChainId();
      return NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`;
    } catch (error) {
      console.error('Error getting network name:', error);
      return 'Unknown Network';
    }
  }

  const handleDeploy = async () => {
    if (manualABI && manualBytecode) {
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
    
    // Check for callback sender if deploying destination contract
    if ((contractType === 'destination' || contractType === 'both') && !callbackSender) {
      toast({
        variant: "destructive",
        title: "Deployment Error",
        description: "Callback sender address is required for destination contracts",
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
      let deployObj: any = {
        data: bytecode
      };
      
      // For destination contracts, add callback sender as constructor parameter
      if (contractType === 'destination' || contractType === 'both') {
        deployObj.arguments = [callbackSender];
      }
      
      // Set value for destination contracts (0.1 native currency)
      let value = '0';
      if (contractType === 'destination' || contractType === 'both') {
        value = web3.utils.toWei('0.1', 'ether');
      }
  
      const deploy = contract.deploy(deployObj);

      // Estimate gas
      const gasEstimate = await deploy.estimateGas({ 
        from: account,
        value: value
      });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      // Check balance including the deployment fee for destination contracts
      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice) + BigInt(value);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`);
      }

      let transactionHash = '';
      
      // Deploy with event tracking
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
          value: value
        })
        .on('transactionHash', (hash: string | Uint8Array) => {
          transactionHash = hash as string;
          
          // Save pending deployment
          const pendingDeployment: DeploymentRecord = {
            id: Date.now(),
            contractName: contractType === 'origin' ? "Origin Contract" : 
                        contractType === 'destination' ? "Destination Contract" :
                        "Combined Contract",
            contractType: contractType as 'origin' | 'destination' | 'both',
            address: "Deploying...",
            network: networkName,
            txHash: transactionHash,
            status: 'pending',
            timestamp: new Date().toISOString(),
          };
          const history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]');
          localStorage.setItem('deploymentHistory', JSON.stringify([...history, pendingDeployment]));
        })
        .on('error', (error: any) => {
          const history = JSON.parse(localStorage.getItem('deploymentHistory') || '[]');
          const updatedHistory = history.map((dep: DeploymentRecord) => {
            if (dep.txHash === transactionHash) {
              return { ...dep, status: 'error' };
            }
            return dep;
          });
          localStorage.setItem('deploymentHistory', JSON.stringify(updatedHistory));
          reject(error);
        })
        .then(resolve);
      });

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
      console.error('Deployment error:', error);
      setDeploymentStatus('error');
      setDeploymentError(error.message);
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error.message,
      });
    }
  }

  const contractTypes = [
    {
      type: 'origin',
      title: 'Origin Contract',
      description: 'Emits events that trigger actions on other chains. These contracts generate the data that RSCs monitor.',
      icon: Code,
      color: 'bg-primary/10 border-primary/20'
    },
    {
      type: 'destination',
      title: 'Destination Contract',
      description: 'Receives and executes functions triggered by events from origin contracts via RSCs.',
      icon: Network,
      color: 'bg-secondary/10 border-secondary/20'
    },
    {
      type: 'both',
      title: 'Combined Contract',
      description: 'A single contract that can both emit events and receive function calls from RSCs.',
      icon: Merge,
      color: 'bg-accent/10 border-accent/20'
    }
  ];

  if (showInitialDialog) {
    return (
      <Dialog open={showInitialDialog} onOpenChange={setShowInitialDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Contract Configuration</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please provide some information about your smart contract.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contract Type</label>
              <Select onValueChange={(value: 'origin' | 'destination' | 'both') => setContractType(value)}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="origin" className="text-foreground">Origin Contract</SelectItem>
                  <SelectItem value="destination" className="text-foreground">Destination Contract</SelectItem>
                  <SelectItem value="both" className="text-foreground">Combined Origin & Destination Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Does your contract use external libraries?</label>
              <Select onValueChange={(value) => setUseLibraries(value === 'true')}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="false" className="text-foreground">No</SelectItem>
                  <SelectItem value="true" className="text-foreground">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {useLibraries && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Contract ABI</label>
                  <Textarea
                    className="bg-input border-border text-foreground"
                    placeholder="Paste your contract ABI here"
                    value={manualABI}
                    onChange={(e) => setManualABI(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Contract Bytecode</label>
                  <Textarea
                    className="bg-input border-border text-foreground"
                    placeholder="Paste your contract bytecode here"
                    value={manualBytecode}
                    onChange={(e) => setManualBytecode(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
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
    <div className="min-h-screen  text-foreground">
      <div className="container mx-auto py-12 px-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold mb-6  bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Smart Contract Deployer
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Deploy your smart contracts with confidence. Whether you're creating origin contracts that emit events, 
            destination contracts that receive actions, or combined contracts that do both - we've got you covered.
          </p>
        </motion.div>

        {/* Key Concepts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Key Concepts</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Understanding the different types of contracts in the Reactive ecosystem
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contractTypes.map((concept, index) => (
              <motion.div
                key={concept.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
              >
                <Card className={`bg-card border-border h-full ${concept.color}`}>
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <concept.icon className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-foreground">{concept.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{concept.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Deployment Tools */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader className="bg-accent/10 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">
                    {contractType === 'origin' ? 'Origin Contract Deployment' :
                     contractType === 'destination' ? 'Destination Contract Deployment' :
                     'Combined Contract Deployment'}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {contractType === 'origin' ? 'Deploy a contract that emits events for RSCs to monitor' :
                     contractType === 'destination' ? 'Deploy a contract that receives function calls from RSCs' :
                     'Deploy a contract that can both emit events and receive function calls'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!useLibraries ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <ContractEditor 
                      onCompile={handleCompile}
                      compilationStatus={compilationStatus}
                      contractType={contractType as 'origin' | 'destination'}
                    />
                  </div>
                  <div>
                    <DeploymentConfig
                      compilationStatus={compilationStatus}
                      compilationError={compilationError}
                      onDeploy={handleDeploy}
                      deploymentStatus={deploymentStatus}
                      deploymentError={deploymentError}
                      contractType={contractType as 'origin' | 'destination' | 'both'}
                      abi={abi}
                      bytecode={bytecode}
                    />
                  </div>
                </div>
              ) : (
                <DeploymentConfig
                  compilationStatus={"success"}
                  compilationError={compilationError}
                  onDeploy={handleDeploy}
                  deploymentStatus={deploymentStatus}
                  deploymentError={deploymentError}
                  abi={manualABI ? JSON.parse(manualABI) : null}
                  bytecode={manualBytecode}
                  contractType={contractType as 'origin' | 'destination' | 'both'}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Deployment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Deployment History</CardTitle>
              <p className="text-muted-foreground">Track your previous contract deployments</p>
            </CardHeader>
            <CardContent>
              <DeploymentHistory/>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}