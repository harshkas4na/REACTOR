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
  import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
  import { Loader2, ExternalLink, Info, Zap, ArrowRight, Eye, Code, Rocket, DollarSign } from 'lucide-react';
  import { useToast } from '@/hooks/use-toast';
  import DeployButton from '@/components/DeployButton';
  import { motion } from 'framer-motion';

  // Supported chains configuration
  const SUPPORTED_CHAINS = {
    ORIGINS: [
      { id: 11155111, name: 'Ethereum Sepolia' },
      { id: 1, name: 'Ethereum Mainnet' },
      { id: 43114, name: 'Avalanche C-Chain' },
      { id: 42161, name: 'Arbitrum One' },
      { id: 169, name: 'Manta Pacific' },
      { id: 8453, name: 'Base Chain' },
      { id: 56, name: 'Binance Smart Chain' },
      { id: 137, name: 'Polygon PoS' },
      { id: 5318007, name: 'Lasna Testnet' }
    ],
    DESTINATIONS: [
      { id: 11155111, name: 'Ethereum Sepolia' },
      { id: 43114, name: 'Avalanche C-Chain' },
      { id: 169, name: 'Manta Pacific' },
      { id: 8453, name: 'Base Chain' },
      { id: 5318007, name: 'Lasna Testnet' }
    ]
  };

  const NETWORK_NAMES: { [key: number]: string } = {
    5318007: 'Lasna'
  };

  export default function AutomationPage() {
    // Existing state management
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
    const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

    const { toast } = useToast();

    // Context hooks
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

    // Utility functions
    const isEthereumAddress = (address: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Effect for form validation
    useEffect(() => {
      validateForm();
    }, [automations, OrgChainId, DesChainId, originAddress, destinationAddress]);

    // Form validation
    const validateForm = () => {
      const isValidAutomations = automations.every(automation => {
        const eventRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\((address|uint256|string|bool|bytes32|uint8)(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
        const functionRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(address(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
        return eventRegex.test(automation.event) && functionRegex.test(automation.function);
      });
      
      const isValidAddresses = isEthereumAddress(originAddress) && isEthereumAddress(destinationAddress);
      const isValidChainIds = !isNaN(Number(OrgChainId)) && !isNaN(Number(DesChainId));
    
      setIsValidForm(isValidAutomations && isValidAddresses && isValidChainIds);
    };

    // Form submission handler
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

    // Contract editing handlers
    const handleSaveEditedContract = () => {
      setReactiveContract(editedContract);
      setEditingContract(false);
    };

    const handleContractChange = (value: string) => {
      setEditedContract(value);
    };

    // Network handling
    const getNetworkName = async (web3: any) => {
      try {
        const chainId = await web3.eth.getChainId();
        return NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`;
      } catch (error) {
        console.error('Error getting network name:', error);
        return 'Unknown Network';
      }
    }

    const buildExamples = [
      {
        title: "Cross-Chain Swaps",
        description: "Automatically execute trades on one chain when conditions are met on another",
        icon: "🔄"
      },
      {
        title: "Oracle Triggers",
        description: "React to price feeds, data updates, or external events in real-time",
        icon: "📡"
      },
      {
        title: "Liquidation Protection",
        description: "Monitor lending positions and automatically protect against liquidation",
        icon: "🛡️"
      },
      {
        title: "Yield Optimization",
        description: "Automatically move funds between protocols for maximum returns",
        icon: "📈"
      },
      {
        title: "Governance Automation",
        description: "Execute governance actions based on proposal outcomes or voting thresholds",
        icon: "🗳️"
      },
      {
        title: "Portfolio Rebalancing",
        description: "Maintain target allocations by automatically rebalancing your portfolio",
        icon: "⚖️"
      }
    ];

    const steps = [
      {
        number: "1",
        title: "Monitor Events",
        description: "Your RSC watches for specific events across multiple blockchains",
        icon: Eye
      },
      {
        number: "2", 
        title: "Process Logic",
        description: "When conditions are met, your contract automatically processes the event",
        icon: Code
      },
      {
        number: "3",
        title: "Execute Actions",
        description: "The contract triggers actions on destination chains without manual intervention",
        icon: Rocket
      }
    ];

    return (
      <div className="relative container mx-auto py-12 px-4">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold mb-6 text-transparent/1100 bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Build Reactive Smart Contracts
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Create autonomous smart contracts that monitor blockchain events and execute actions across multiple networks. 
            No manual intervention required - your contracts work 24/7.
          </p>
          <div className="bg-accent/20 p-4 rounded-lg border border-border max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              Reactive Smart Contracts (RSCs) use event-driven architecture to enable autonomous blockchain automation.
              Learn more in the{' '}
              <a 
                href="https://dev.reactive.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline"
              >
                Reactive Network Documentation
              </a>
            </p>
          </div>
        </motion.div>

        {/* What Can You Build Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">What Can You Build?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Reactive Smart Contracts open up endless possibilities for blockchain automation
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildExamples.map((example, index) => (
              <motion.div
                key={example.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
              >
                <Card className="bg-card/70 border-border h-full group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-3xl mb-3">{example.icon}</div>
                    <CardTitle className="text-foreground text-lg">{example.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{example.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
        

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Reactive Smart Contracts operate through a simple three-step process
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + (index * 0.1) }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="hidden md:block w-8 h-8 text-muted-foreground ml-4" />
                  )}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-secondary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Funding Requirements Card */}
        <Card className="relative bg-card/70 border-border my-4 sm:mt-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-amber-100 mb-2 text-sm sm:text-base">Protection Setup Costs</h3>
                  <p className="text-xs sm:text-sm text-amber-200 mb-3">
                    RSC Monitoring: 0.05 REACT • Plus gas fees
                  </p>
                  <div className="">
                    <p className="text-xs sm:text-sm text-amber-200 mb-2">
                      📝 <span className="font-medium">Note:</span> To fund a Reactive Smart Contract, you will need gas on the Reactive Network.
                    </p>
                    <a
                      href="/markets" // Changed href to the new page route
                      className="inline-flex items-center text-xs sm:text-sm text-amber-300 hover:text-amber-200 underline"
                    >
                      See here where you can obtain REACT tokens
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Automation Studio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mb-8"
        >
          <Card className="bg-card/70 border-border">
            <CardHeader className="bg-accent/10 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-foreground mb-2">
                    Automation Studio
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Configure your reactive smart contract by mapping events to functions across chains
                  </p>
                </div>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">About RSC Configuration</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure how your RSC will monitor events and execute functions across chains.
                        Make sure your contracts are deployed before creating the automation.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
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
        </motion.div>

        {/* Contract Display */}
        {reactiveContract && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mb-8"
          >
            <Card className="bg-card border-border">
              <CardHeader className="bg-accent/10 border-b border-border">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Generated Smart Contract
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
          </motion.div>
        )}

        {/* Error and Status Displays */}
        {compileError && (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle className="font-semibold">
              Compilation Error
            </AlertTitle>
            <AlertDescription>
              {compileError}
            </AlertDescription>
          </Alert>
        )}

        {deploymentError && (
          <Alert variant="destructive" className="mb-8">
            <AlertTitle className="font-semibold">
              Deployment Error
            </AlertTitle>
            <AlertDescription>
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }