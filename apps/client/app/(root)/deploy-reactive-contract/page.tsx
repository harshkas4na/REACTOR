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
import { Loader2, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DeployButton from '@/components/DeployButton';

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
    { id: 5318008, name: 'Kopli Testnet' }
  ],
  DESTINATIONS: [
    { id: 11155111, name: 'Ethereum Sepolia' },
    { id: 43114, name: 'Avalanche C-Chain' },
    { id: 169, name: 'Manta Pacific' },
    { id: 8453, name: 'Base Chain' },
    { id: 5318008, name: 'Kopli Testnet' }
  ]
};

const NETWORK_NAMES: { [key: number]: string } = {
  5318008: 'Kopli'
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

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto space-y-8">
        {/* Info Card */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-zinc-100 mb-4">
              Create Your Reactive Smart Contract
            </CardTitle>
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800">
              <p className="text-zinc-300">
                Reactive Smart Contracts (RSCs) enable automated blockchain interactions through event monitoring.
                Learn more in the{' '}
                <a 
                  href="https://dev.reactive.network/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Reactive Network Documentation
                </a>
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Main Form */}
        <Card className="relative z-20 pointer-events-auto bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-zinc-100">
                Automation Configuration
              </CardTitle>
              <HoverCard>
                <HoverCardTrigger>
                  <Info className="h-5 w-5 text-zinc-400" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-zinc-100">About RSC Configuration</h4>
                    <p className="text-sm text-zinc-300">
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

        {/* Contract Display */}
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

        {/* Error and Status Displays */}
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

        {/* Deployment Success Card */}
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
}