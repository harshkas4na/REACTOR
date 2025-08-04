'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Loader2, AlertTriangle, Rocket } from 'lucide-react';

// Updated Stop Order Contract ABI (simplified)
const STOP_ORDER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "pair", "type": "address" },
      { "internalType": "bool", "name": "sellToken0", "type": "bool" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "coefficient", "type": "uint256" },
      { "internalType": "uint256", "name": "threshold", "type": "uint256" }
    ],
    "name": "createStopOrder",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Updated contract addresses
const CONTRACT_ADDRESSES = {
  CALLBACK: '0xAff550C16085915eeA2D7fc3C72A47f9bA5C47cC',
  RSC: '0x59F30360c984ee7A4a84F3Ba61930DD9e79784A4'
};

// Supported chains configuration
const SUPPORTED_CHAINS = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net/'
    }
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net'
    }
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain',
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net'
    }
  }
];

interface AIDeploymentHandlerProps {
  automationConfig: any;
  onDeploymentComplete: (success: boolean, result?: any) => void;
  onCancel: () => void;
}

type DeploymentStep = 'idle' | 'checking-approval' | 'approving' | 'switching-rsc' | 'funding-rsc' | 'switching-back' | 'creating' | 'complete';

export const AIDeploymentHandler: React.FC<AIDeploymentHandlerProps> = ({
  automationConfig,
  onDeploymentComplete,
  onCancel
}) => {
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  // Network switching functions
  const switchNetwork = async (targetChainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

    try {
      const targetChainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === targetChainId) {
        console.log(`Already on chain ${targetChainId}`);
        return true;
      }

      console.log(`Switching from ${currentNetwork.chainId} to chain ${targetChainId}`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log(`Chain ${targetChainId} not added to wallet, attempting to add it`);
          
          let chainConfig;
          const chain = SUPPORTED_CHAINS.find(c => c.id === targetChainId);
          if (!chain) throw new Error('Chain not supported');
          
          chainConfig = {
            chainId: targetChainIdHex,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.name.includes('Ethereum') ? 'ETH' : 'AVAX',
              symbol: chain.name.includes('Ethereum') ? 'ETH' : 'AVAX',
              decimals: 18
            },
            rpcUrls: [
              chain.id === '1' ? 'https://ethereum.publicnode.com' : 
              chain.id === '11155111' ? 'https://rpc.sepolia.org' :
              chain.id === '43114' ? 'https://api.avax.network/ext/bc/C/rpc' : ''
            ],
            blockExplorerUrls: [
              chain.id === '1' ? 'https://etherscan.io' : 
              chain.id === '11155111' ? 'https://sepolia.etherscan.io' :
              chain.id === '43114' ? 'https://snowtrace.io' : ''
            ]
          };
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          throw switchError;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newNetwork = await newProvider.getNetwork();
      
      if (newNetwork.chainId.toString() !== targetChainId) {
        throw new Error(`Network switch failed. Expected ${targetChainId}, got ${newNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to chain ${targetChainId}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  const switchToRSCNetwork = async (originalChainId: string) => {
    const selectedChain = SUPPORTED_CHAINS.find(c => c.id === originalChainId);
    if (!selectedChain) throw new Error('Chain not supported');
    
    const rscNetwork = selectedChain.rscNetwork;
    const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === rscNetwork.chainId) {
        console.log(`Already on ${rscNetwork.name}`);
        return true;
      }

      console.log(`Switching to ${rscNetwork.name}...`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: rscChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log(`${rscNetwork.name} not added to wallet, attempting to add it`);
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: rscChainIdHex,
              chainName: rscNetwork.name,
              nativeCurrency: {
                name: rscNetwork.currencySymbol,
                symbol: rscNetwork.currencySymbol,
                decimals: 18
              },
              rpcUrls: [rscNetwork.rpcUrl],
              blockExplorerUrls: [rscNetwork.explorerUrl]
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let attempts = 0;
      let switched = false;
      
      while (attempts < 3 && !switched) {
        try {
          const updatedProvider = new ethers.BrowserProvider(window.ethereum);
          const updatedNetwork = await updatedProvider.getNetwork();
          
          if (updatedNetwork.chainId.toString() === rscNetwork.chainId) {
            switched = true;
            console.log(`Successfully switched to ${rscNetwork.name} (attempt ${attempts + 1})`);
          } else {
            console.log(`Network not switched yet, attempt ${attempts + 1}, got: ${updatedNetwork.chainId}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (verifyError) {
          console.log(`Verification attempt ${attempts + 1} failed:`, verifyError);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        attempts++;
      }
      
      if (!switched) {
        throw new Error(`Failed to verify RSC network switch after ${attempts} attempts`);
      }
      
      toast.success(`Switched to ${rscNetwork.name}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeployment = async () => {
    try {
      setDeploymentError(null);
      setDeploymentStep('idle');

      // Validate configuration
      if (!automationConfig.deploymentReady) {
        throw new Error('Configuration not ready for deployment');
      }

      // Get the selected chain configuration
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === automationConfig.chainId);
      if (!selectedChain) {
        throw new Error('Invalid chain configuration');
      }

      // Check wallet connection
      if (!window.ethereum) {
        throw new Error('Please connect your wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Check if user is on correct network
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== automationConfig.chainId) {
        throw new Error(`Please switch to ${selectedChain.name} network`);
      }

      const originalChainId = automationConfig.chainId;

      // Step 1: Check and approve tokens if needed
      setDeploymentStep('checking-approval');
      toast.loading('Checking token approval...', { id: 'deployment' });
      
      // Get token to approve based on sellToken0 flag
      let tokenToApprove;
      if (automationConfig.sellToken0) {
        tokenToApprove = await getToken0FromPair(automationConfig.pairAddress);
      } else {
        tokenToApprove = await getToken1FromPair(automationConfig.pairAddress);
      }

      const tokenContract = new ethers.Contract(
        tokenToApprove,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        signer
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
      
      // Parse amount - handle different amount formats
      let requiredAmount;
      if (automationConfig.amount === 'all' || automationConfig.amount.includes('%')) {
        // For percentage amounts, we'll use a large allowance
        requiredAmount = ethers.parseUnits('1000000', decimals); // Large allowance
      } else {
        requiredAmount = ethers.parseUnits(automationConfig.amount, decimals);
      }

      const currentAllowance = await tokenContract.allowance(signerAddress, CONTRACT_ADDRESSES.CALLBACK);

      if (currentAllowance < requiredAmount) {
        setDeploymentStep('approving');
        toast.loading('Approving tokens...', { id: 'deployment' });
        
        // Reset allowance to 0 first if needed
        if (currentAllowance > 0) {
          const resetTx = await tokenContract.approve(CONTRACT_ADDRESSES.CALLBACK, 0);
          await resetTx.wait();
        }

        // Approve the required amount
        const approvalTx = await tokenContract.approve(CONTRACT_ADDRESSES.CALLBACK, requiredAmount);
        await approvalTx.wait();
        toast.success('Token approval confirmed');
      } else {
        toast.success('Tokens already approved');
      }

      // Step 2: Switch to RSC network and fund it
      setDeploymentStep('switching-rsc');
      toast.loading(`Switching to ${selectedChain.rscNetwork.name}...`, { id: 'deployment' });
      await switchToRSCNetwork(originalChainId);
      
      // Wait for network to settle
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDeploymentStep('funding-rsc');
      toast.loading('Funding RSC monitor...', { id: 'deployment' });
      
      // Create fresh provider and signer after network switch
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscSigner = await rscProvider.getSigner();
      
      const rscFundingTx = await rscSigner.sendTransaction({
        to: CONTRACT_ADDRESSES.RSC,
        value: ethers.parseEther(automationConfig.rscFunding || "0.05")
      });
      await rscFundingTx.wait();

      // Step 3: Switch back to original network
      setDeploymentStep('switching-back');
      toast.loading(`Switching back to ${selectedChain.name}...`, { id: 'deployment' });
      await switchNetwork(originalChainId);
      
      // Verify we're back on the original network
      const finalProvider = new ethers.BrowserProvider(window.ethereum);
      const finalNetwork = await finalProvider.getNetwork();
      
      if (finalNetwork.chainId.toString() !== originalChainId) {
        throw new Error(`Failed to switch back to original network. Current: ${finalNetwork.chainId}, Expected: ${originalChainId}`);
      }

      toast.success(`Switched back to ${selectedChain.name}`);

      // Step 4: Create the stop order
      setDeploymentStep('creating');
      toast.loading('Creating stop order...', { id: 'deployment' });
      
      const finalSigner = await finalProvider.getSigner();
      
      // Create the stop order contract instance
      const stopOrderContract = new ethers.Contract(
        CONTRACT_ADDRESSES.CALLBACK,
        STOP_ORDER_ABI,
        finalSigner
      );

      // Parse the actual amount for the contract call
      let contractAmount;
      if (automationConfig.amount === 'all') {
        // Get current balance for 'all'
        const tokenContractForBalance = new ethers.Contract(
          tokenToApprove,
          ['function balanceOf(address) view returns (uint256)'],
          finalSigner
        );
        contractAmount = await tokenContractForBalance.balanceOf(signerAddress);
      } else if (automationConfig.amount.includes('%')) {
        // Handle percentage amounts
        const percentage = parseInt(automationConfig.amount.replace('%', ''));
        const tokenContractForBalance = new ethers.Contract(
          tokenToApprove,
          ['function balanceOf(address) view returns (uint256)'],
          finalSigner
        );
        const balance = await tokenContractForBalance.balanceOf(signerAddress);
        contractAmount = balance * BigInt(percentage) / BigInt(100);
      } else {
        contractAmount = ethers.parseUnits(automationConfig.amount, decimals);
      }

      console.log('Creating stop order with params:', {
        pair: automationConfig.pairAddress,
        sellToken0: automationConfig.sellToken0,
        amount: contractAmount.toString(),
        coefficient: automationConfig.coefficient,
        threshold: automationConfig.threshold,
        funding: automationConfig.destinationFunding
      });

      // Call createStopOrder function
      const createOrderTx = await stopOrderContract.createStopOrder(
        automationConfig.pairAddress,
        automationConfig.sellToken0,
        contractAmount,
        parseInt(automationConfig.coefficient),
        parseInt(automationConfig.threshold),
        { 
          value: ethers.parseEther(automationConfig.destinationFunding || "0.03"),
          gasLimit: 500000
        }
      );

      const receipt = await createOrderTx.wait();
      
      // Extract order ID from transaction logs
      let orderId = null;
      try {
        const orderCreatedEvent = receipt.logs.find((log: any) => 
          log.topics[0] === ethers.id('StopOrderCreated(address,uint256,address,bool,address,address,uint256,uint256,uint256)')
        );
        
        if (orderCreatedEvent) {
          orderId = parseInt(orderCreatedEvent.topics[2], 16);
        }
      } catch (logError) {
        console.log('Could not extract order ID from logs:', logError);
      }
      
      setDeploymentStep('complete');
      toast.success('🎉 Your stop order is now active and monitoring prices 24/7', { id: 'deployment' });

      const result = {
        destinationAddress: CONTRACT_ADDRESSES.CALLBACK,
        rscAddress: CONTRACT_ADDRESSES.RSC,
        orderId,
        chainId: automationConfig.chainId,
        chainName: selectedChain.name
      };

      setDeploymentResult(result);
      onDeploymentComplete(true, result);

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentError(error.message || 'Deployment failed');
      setDeploymentStep('idle');
      toast.error(error.message || 'Deployment failed', { id: 'deployment' });
      onDeploymentComplete(false, { error: error.message });
    }
  };

  // Helper function to get token addresses from pair
  const getToken0FromPair = async (pairAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const pairContract = new ethers.Contract(
      pairAddress,
      ['function token0() view returns (address)'],
      provider
    );
    return await pairContract.token0();
  };

  const getToken1FromPair = async (pairAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const pairContract = new ethers.Contract(
      pairAddress,
      ['function token1() view returns (address)'],
      provider
    );
    return await pairContract.token1();
  };

  const getStepIcon = (step: DeploymentStep) => {
    if (step === deploymentStep && deploymentStep !== 'complete' && deploymentStep !== 'idle') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    }
    if (deploymentStep === 'complete' || 
        (deploymentStep === 'switching-back' && step !== 'complete' && step !== 'switching-back') ||
        (deploymentStep === 'creating' && step !== 'complete' && step !== 'creating' && step !== 'switching-back') ||
        (deploymentStep === 'funding-rsc' && (step === 'checking-approval' || step === 'approving' || step === 'switching-rsc')) ||
        (deploymentStep === 'switching-rsc' && (step === 'checking-approval' || step === 'approving')) ||
        (deploymentStep === 'approving' && step === 'checking-approval')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    return <Clock className="h-4 w-4 text-zinc-400" />;
  };

  const getStepStatus = (step: DeploymentStep): 'pending' | 'active' | 'complete' => {
    const stepOrder: DeploymentStep[] = ['checking-approval', 'approving', 'switching-rsc', 'funding-rsc', 'switching-back', 'creating', 'complete'];
    const currentIndex = stepOrder.indexOf(deploymentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex || deploymentStep === 'complete') return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center space-x-2">
          <Rocket className="h-5 w-5" />
          <span>Deploy Stop Order</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Summary */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
          <h3 className="text-zinc-100 font-medium mb-2">Configuration Summary</h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p><span className="font-medium">Network:</span> {SUPPORTED_CHAINS.find(c => c.id === automationConfig.chainId)?.name}</p>
            <p><span className="font-medium">Amount:</span> {automationConfig.amount}</p>
            <p><span className="font-medium">Drop Percentage:</span> {automationConfig.dropPercentage}%</p>
            <p><span className="font-medium">Total Cost:</span> {automationConfig.destinationFunding} ETH + {automationConfig.rscFunding} REACT</p>
          </div>
        </div>

        {/* Deployment Steps */}
        {deploymentStep !== 'idle' && (
          <div className="space-y-3">
            <h3 className="text-zinc-100 font-medium">Deployment Progress</h3>
            
            {[
              { step: 'checking-approval' as DeploymentStep, label: 'Check Token Approval' },
              { step: 'approving' as DeploymentStep, label: 'Approve Token Spending' },
              { step: 'switching-rsc' as DeploymentStep, label: 'Switch to RSC Network' },
              { step: 'funding-rsc' as DeploymentStep, label: 'Fund RSC Monitor' },
              { step: 'switching-back' as DeploymentStep, label: 'Switch Back to Original Network' },
              { step: 'creating' as DeploymentStep, label: 'Create Stop Order' }
            ].map(({ step, label }) => (
              <div key={step} className="flex items-center space-x-3">
                {getStepIcon(step)}
                <span className={`text-sm ${
                  getStepStatus(step) === 'complete' ? 'text-green-400' :
                  getStepStatus(step) === 'active' ? 'text-blue-400' : 'text-zinc-400'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {deploymentError && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Alert className="bg-green-900/20 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              Stop order created successfully! Your automation is now active and monitoring prices.
              {deploymentResult.orderId && ` Order ID: ${deploymentResult.orderId}`}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {deploymentStep === 'idle' && (
            <>
              <Button
                onClick={handleDeployment}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Stop Order
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </>
          )}
          
          {(deploymentStep === 'complete' || deploymentStep === 'idle') && deploymentError && (
            <Button
              onClick={onCancel}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
            >
              Close
            </Button>
          )}

          {deploymentStep === 'complete' && !deploymentError && (
            <Button
              onClick={onCancel}
              className="w-full bg-green-700 hover:bg-green-600"
            >
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};