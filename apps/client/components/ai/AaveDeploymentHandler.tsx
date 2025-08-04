'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Loader2, AlertTriangle, Shield, Network, Coins } from 'lucide-react';

interface AaveDeploymentHandlerProps {
  automationConfig: any;
  onDeploymentComplete: (success: boolean, result?: any) => void;
  onCancel: () => void;
}

type AaveDeploymentStep = 'idle' | 'checking-position' | 'approving-collateral' | 'approving-debt' | 'switching-rsc' | 'funding-rsc' | 'switching-back' | 'subscribing' | 'complete';

interface ChainConfig {
  id: string;
  name: string;
  lendingPoolAddress: string;
  protocolDataProviderAddress: string;
  addressesProviderAddress: string;
  protectionManagerAddress: string;
  rpcUrl?: string;
  nativeCurrency: string;
  wethAddress?: string;
}

interface AssetConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  canBorrow?: boolean;
}

// Updated configuration to match the protection page
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    lendingPoolAddress: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    protocolDataProviderAddress: '0x3e9708d80f7B3e43118013075F7e95CE3AB31F31',
    addressesProviderAddress: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    protectionManagerAddress: '0xC789a1c6ef9764626bd95D376984FE35Ac0A579B',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH',
    wethAddress: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c'
  },
  {
    id: '1',
    name: 'Ethereum Mainnet (Coming Soon)',
    lendingPoolAddress: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    protocolDataProviderAddress: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
    addressesProviderAddress: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
    protectionManagerAddress: '',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH',
    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  }
];

// Enhanced asset configuration with more tokens
const AAVE_ASSETS: Record<string, AssetConfig[]> = {
  '11155111': [
    { 
      address: 'ETH',
      symbol: 'ETH', 
      name: 'Ethereum',
      decimals: 18,
      canBorrow: true
    },
    { 
      address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5', 
      symbol: 'LINK', 
      name: 'Chainlink',
      decimals: 18,
      canBorrow: true
    },
    { 
      address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      canBorrow: true
    },
    { 
      address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', 
      symbol: 'DAI', 
      name: 'Dai Stablecoin',
      decimals: 18,
      canBorrow: true
    },
    { 
      address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6,
      canBorrow: true
    },
    {
      address: '0x88541670e55cc00beefd87eb59edd1b7c511ac9a',
      symbol: 'AAVE',
      name: 'Aave Token',
      decimals: 18,
      canBorrow: false
    },
    {
      address: '0x6d906e526a4e2ca02097ba9d0caa3c382f52278e',
      symbol: 'EURS',
      name: 'STASIS EURS',
      decimals: 2,
      canBorrow: true
    }
  ],
  '1': [
    { 
      address: 'ETH',
      symbol: 'ETH', 
      name: 'Ethereum',
      decimals: 18,
      canBorrow: true
    },
    { 
      address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', 
      symbol: 'AAVE', 
      name: 'Aave Token',
      decimals: 18,
      canBorrow: false
    },
    { 
      address: '0xA0b86a33E6441b4B576fb3D43bF18E5c73b49c90', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6,
      canBorrow: true
    },
    { 
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 
      symbol: 'DAI', 
      name: 'Dai Stablecoin',
      decimals: 18,
      canBorrow: true
    },
    { 
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6,
      canBorrow: true
    }
  ]
};

// RSC Contract address
const RSC_CONTRACT_ADDRESS = '0xC789a1c6ef9764626bd95D376984FE35Ac0A579B';

export const AaveDeploymentHandler: React.FC<AaveDeploymentHandlerProps> = ({
  automationConfig,
  onDeploymentComplete,
  onCancel
}) => {
  const [deploymentStep, setDeploymentStep] = useState<AaveDeploymentStep>('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  // Enhanced network switching functions
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
          if (targetChainId === '11155111') {
            chainConfig = {
              chainId: '0xaa36a7',
              chainName: 'Ethereum Sepolia',
              nativeCurrency: { name: 'SEP', symbol: 'SEP', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            };
          } else if (targetChainId === '1') {
            chainConfig = {
              chainId: '0x1',
              chainName: 'Ethereum Mainnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://ethereum.publicnode.com'],
              blockExplorerUrls: ['https://etherscan.io']
            };
          } else {
            throw new Error('Chain not supported');
          }
          
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
    const rscNetworks = {
      '11155111': {
        chainId: '5318007',
        name: 'Reactive Lasna',
        rpcUrl: 'https://lasna-rpc.rnk.dev/',
        currencySymbol: 'REACT',
        explorerUrl: 'https://lasna.reactscan.net/'
      },
      '1': {
        chainId: '1597',
        name: 'Reactive Mainnet',
        rpcUrl: 'https://mainnet-rpc.rnk.dev/',
        currencySymbol: 'REACT',
        explorerUrl: 'https://reactscan.net'
      }
    };
    
    const rscNetwork = rscNetworks[originalChainId as keyof typeof rscNetworks];
    if (!rscNetwork) throw new Error('RSC network not supported for this chain');
    
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
      
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const updatedNetwork = await updatedProvider.getNetwork();
      
      if (updatedNetwork.chainId.toString() !== rscNetwork.chainId) {
        throw new Error(`RSC network switch failed. Expected ${rscNetwork.chainId}, got ${updatedNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to ${rscNetwork.name}`);
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

      // Step 1: Check Aave Position
      setDeploymentStep('checking-position');
      toast.loading('Checking your Aave position...', { id: 'deployment' });
      
      const hasPosition = await checkAavePosition(selectedChain, signerAddress);
      if (!hasPosition) {
        throw new Error('No active Aave position found for this address');
      }

      // Step 2: Approve Collateral Token if needed
      if ((automationConfig.protectionType === '0' || automationConfig.protectionType === '2') && automationConfig.collateralAsset) {
        const collateralAsset = getAssetConfig(automationConfig.collateralAsset, automationConfig.chainId);
        
        // Only approve if it's not ETH
        if (automationConfig.collateralAsset !== 'ETH') {
          setDeploymentStep('approving-collateral');
          toast.loading(`Approving ${collateralAsset?.symbol || 'collateral token'}...`, { id: 'deployment' });
          
          await approveToken(
            automationConfig.collateralAsset,
            selectedChain.protectionManagerAddress,
            collateralAsset?.symbol || 'Collateral Token'
          );
        }
      }

      // Step 3: Approve Debt Token if needed
      if ((automationConfig.protectionType === '1' || automationConfig.protectionType === '2') && automationConfig.debtAsset) {
        const debtAsset = getAssetConfig(automationConfig.debtAsset, automationConfig.chainId);
        
        // Only approve if it's not ETH
        if (automationConfig.debtAsset !== 'ETH') {
          setDeploymentStep('approving-debt');
          toast.loading(`Approving ${debtAsset?.symbol || 'debt token'}...`, { id: 'deployment' });
          
          await approveToken(
            automationConfig.debtAsset,
            selectedChain.protectionManagerAddress,
            debtAsset?.symbol || 'Debt Token'
          );
        }
      }

      // Step 4: Switch to RSC Network and fund it
      setDeploymentStep('switching-rsc');
      toast.loading('Switching to RSC network...', { id: 'deployment' });
      await switchToRSCNetwork(originalChainId);
      
      // Wait for network to settle
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDeploymentStep('funding-rsc');
      toast.loading('Funding RSC monitor...', { id: 'deployment' });
      
      // Create fresh provider and signer after network switch
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscSigner = await rscProvider.getSigner();
      
      const RSC_FUNDING_AMOUNT = '0.05';
      const rscFundingTx = await rscSigner.sendTransaction({
        to: RSC_CONTRACT_ADDRESS,
        value: ethers.parseEther(RSC_FUNDING_AMOUNT)
      });
      await rscFundingTx.wait();

      // Step 5: Switch back to original network
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

      // Step 6: Subscribe to Protection
      setDeploymentStep('subscribing');
      toast.loading('Subscribing to liquidation protection...', { id: 'deployment' });
      
      await subscribeToProtection(selectedChain, automationConfig);

      // Deployment complete
      setDeploymentStep('complete');
      toast.success('Aave protection subscribed successfully!', { id: 'deployment' });

      const result = {
        protectionAddress: selectedChain.protectionManagerAddress,
        rscAddress: RSC_CONTRACT_ADDRESS,
        chainId: automationConfig.chainId,
        chainName: selectedChain.name,
        protectionType: automationConfig.protectionType,
        healthFactorThreshold: automationConfig.healthFactorThreshold,
        targetHealthFactor: automationConfig.targetHealthFactor
      };

      setDeploymentResult(result);
      onDeploymentComplete(true, result);

    } catch (error: any) {
      console.error('Aave deployment error:', error);
      setDeploymentError(error.message || 'Deployment failed');
      setDeploymentStep('idle');
      toast.error(error.message || 'Deployment failed', { id: 'deployment' });
      onDeploymentComplete(false, { error: error.message });
    }
  };

  // Helper function to check Aave position
  const checkAavePosition = async (chain: ChainConfig, userAddress: string): Promise<boolean> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const lendingPoolInterface = new ethers.Interface([
        'function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
      ]);

      const lendingPoolContract = new ethers.Contract(
        chain.lendingPoolAddress,
        lendingPoolInterface,
        provider
      );

      const userData = await lendingPoolContract.getUserAccountData(userAddress);
      
      // Check if user has any collateral or debt
      const hasCollateral = userData.totalCollateralETH > 0;
      const hasDebt = userData.totalDebtETH > 0;
      
      return hasCollateral && hasDebt;
    } catch (error) {
      console.error('Error checking Aave position:', error);
      return false;
    }
  };

  // Enhanced token approval with ETH handling
  const approveToken = async (tokenAddress: string, spenderAddress: string, tokenName: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function symbol() view returns (string)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      // Check current allowance
      const signerAddress = await signer.getAddress();
      const currentAllowance = await tokenContract.allowance(signerAddress, spenderAddress);
      
      // If allowance is already sufficient, skip approval
      if (currentAllowance > 0) {
        return;
      }

      // Approve maximum amount
      const tx = await tokenContract.approve(spenderAddress, ethers.MaxUint256);
      await tx.wait();
      
    } catch (error: any) {
      console.error(`Error approving ${tokenName}:`, error);
      throw new Error(`${tokenName} approval failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Enhanced subscription function with ETH handling
  const subscribeToProtection = async (chain: ChainConfig, config: any) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const protectionManagerInterface = new ethers.Interface([
        'function subscribeToProtection(uint8 _protectionType, uint256 _healthFactorThreshold, uint256 _targetHealthFactor, address _collateralAsset, address _debtAsset, bool _preferDebtRepayment) external payable'
      ]);

      const protectionManagerContract = new ethers.Contract(
        chain.protectionManagerAddress,
        protectionManagerInterface,
        signer
      );

      // Convert health factors to wei (18 decimals)
      const thresholdWei = ethers.parseEther(config.healthFactorThreshold);
      const targetWei = ethers.parseEther(config.targetHealthFactor);

      // Handle asset addresses properly - use default USDC for unused strategies
      let collateralAddress = config.collateralAsset;
      let debtAddress = config.debtAsset;
      
      // For collateral-only strategy, use placeholder for debt
      if (config.protectionType === '0') {
        debtAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // USDC as placeholder
      }
      
      // For debt-only strategy, use placeholder for collateral  
      if (config.protectionType === '1') {
        collateralAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // USDC as placeholder
      }

      // Convert ETH to WETH address for contract
      if (collateralAddress === 'ETH') {
        collateralAddress = chain.wethAddress || '';
      }
      if (debtAddress === 'ETH') {
        debtAddress = chain.wethAddress || '';
      }

      const CALLBACK_FUNDING_AMOUNT = '0.0003';

      const tx = await protectionManagerContract.subscribeToProtection(
        parseInt(config.protectionType),
        thresholdWei,
        targetWei,
        collateralAddress,
        debtAddress,
        config.preferDebtRepayment || false,
        {
          value: ethers.parseEther(CALLBACK_FUNDING_AMOUNT)
        }
      );

      await tx.wait();
      
    } catch (error: any) {
      console.error('Error subscribing to protection:', error);
      throw new Error(`Subscription failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper function to get asset config
  const getAssetConfig = (address: string, chainId: string): AssetConfig | undefined => {
    const assets = AAVE_ASSETS[chainId as keyof typeof AAVE_ASSETS] || [];
    if (address === 'ETH') {
      return assets.find(asset => asset.symbol === 'ETH');
    }
    return assets.find(asset => asset.address.toLowerCase() === address.toLowerCase());
  };

  const getStepIcon = (step: AaveDeploymentStep) => {
    if (step === deploymentStep && deploymentStep !== 'complete' && deploymentStep !== 'idle') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    }
    if (deploymentStep === 'complete' || 
        (deploymentStep === 'subscribing' && (step === 'checking-position' || step === 'approving-collateral' || step === 'approving-debt' || step === 'switching-rsc' || step === 'funding-rsc' || step === 'switching-back')) ||
        (deploymentStep === 'switching-back' && (step === 'checking-position' || step === 'approving-collateral' || step === 'approving-debt' || step === 'switching-rsc' || step === 'funding-rsc')) ||
        (deploymentStep === 'funding-rsc' && (step === 'checking-position' || step === 'approving-collateral' || step === 'approving-debt' || step === 'switching-rsc')) ||
        (deploymentStep === 'switching-rsc' && (step === 'checking-position' || step === 'approving-collateral' || step === 'approving-debt')) ||
        (deploymentStep === 'approving-debt' && (step === 'checking-position' || step === 'approving-collateral')) ||
        (deploymentStep === 'approving-collateral' && step === 'checking-position')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    return <Clock className="h-4 w-4 text-zinc-400" />;
  };

  const getStepStatus = (step: AaveDeploymentStep): 'pending' | 'active' | 'complete' => {
    const stepOrder: AaveDeploymentStep[] = ['checking-position', 'approving-collateral', 'approving-debt', 'switching-rsc', 'funding-rsc', 'switching-back', 'subscribing', 'complete'];
    const currentIndex = stepOrder.indexOf(deploymentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex || deploymentStep === 'complete') return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getProtectionTypeLabel = (type: string): string => {
    const types: { [key: string]: string } = {
      '0': 'Collateral Deposit Only',
      '1': 'Debt Repayment Only',
      '2': 'Combined Protection'
    };
    return types[type] || 'Unknown';
  };

  const getAssetDisplay = (assetAddress: string, chainId: string): string => {
    const asset = getAssetConfig(assetAddress, chainId);
    return asset ? `${asset.symbol} (${asset.name})` : 'Unknown Asset';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Deploy Aave Protection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Configuration Summary */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
          <h3 className="text-zinc-100 font-medium mb-2">Protection Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-300">
            <div>
              <span className="font-medium text-zinc-200">Network:</span> {SUPPORTED_CHAINS.find(c => c.id === automationConfig.chainId)?.name}
            </div>
            <div>
              <span className="font-medium text-zinc-200">Strategy:</span> {getProtectionTypeLabel(automationConfig.protectionType)}
            </div>
            <div>
              <span className="font-medium text-zinc-200">Trigger Threshold:</span> {automationConfig.healthFactorThreshold}
            </div>
            <div>
              <span className="font-medium text-zinc-200">Target Health Factor:</span> {automationConfig.targetHealthFactor}
            </div>
            {automationConfig.collateralAsset && (
              <div>
                <span className="font-medium text-zinc-200">Collateral Asset:</span> {getAssetDisplay(automationConfig.collateralAsset, automationConfig.chainId)}
              </div>
            )}
            {automationConfig.debtAsset && (
              <div>
                <span className="font-medium text-zinc-200">Debt Asset:</span> {getAssetDisplay(automationConfig.debtAsset, automationConfig.chainId)}
              </div>
            )}
          </div>
          
          {/* Cost Breakdown */}
          <div className="mt-3 pt-3 border-t border-blue-500/20">
            <h4 className="text-sm font-medium text-zinc-200 mb-2">Setup Costs:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-zinc-400">
              <div className="flex items-center space-x-2">
                <Network className="h-3 w-3" />
                <span>RSC: 0.05 REACT</span>
              </div>
              <div className="flex items-center space-x-2">
                <Coins className="h-3 w-3" />
                <span>Callback: 0.0003 ETH</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Plus gas fees</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Deployment Steps */}
        {deploymentStep !== 'idle' && (
          <div className="space-y-3">
            <h3 className="text-zinc-100 font-medium">Deployment Progress</h3>
            
            {[
              { step: 'checking-position' as AaveDeploymentStep, label: 'Check Aave Position', description: 'Verifying active position and health factor' },
              { step: 'approving-collateral' as AaveDeploymentStep, label: 'Approve Collateral Token', description: 'Granting permission to manage collateral' },
              { step: 'approving-debt' as AaveDeploymentStep, label: 'Approve Debt Token', description: 'Granting permission to repay debt' },
              { step: 'switching-rsc' as AaveDeploymentStep, label: 'Switch to RSC Network', description: 'Connecting to Reactive Network' },
              { step: 'funding-rsc' as AaveDeploymentStep, label: 'Fund RSC Monitor', description: 'Funding 24/7 health factor monitoring' },
              { step: 'switching-back' as AaveDeploymentStep, label: 'Return to Original Network', description: 'Switching back to complete setup' },
              { step: 'subscribing' as AaveDeploymentStep, label: 'Subscribe to Protection', description: 'Activating liquidation protection service' }
            ].map(({ step, label, description }) => {
              // Skip steps based on protection type
              if (step === 'approving-collateral' && automationConfig.protectionType === '1') return null;
              if (step === 'approving-debt' && automationConfig.protectionType === '0') return null;
              
              return (
                <div key={step} className="flex items-start space-x-3 p-3 rounded-lg bg-zinc-800/30">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      getStepStatus(step) === 'complete' ? 'text-green-400' :
                      getStepStatus(step) === 'active' ? 'text-blue-400' : 'text-zinc-400'
                    }`}>
                      {label}
                    </span>
                    <p className={`text-xs mt-1 ${
                      getStepStatus(step) === 'complete' ? 'text-green-300' :
                      getStepStatus(step) === 'active' ? 'text-blue-300' : 'text-zinc-500'
                    }`}>
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error Display */}
        {deploymentError && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              <div className="space-y-1">
                <p className="font-medium">Deployment Failed</p>
                <p className="text-sm">{deploymentError}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Alert className="bg-green-900/20 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              <div className="space-y-1">
                <p className="font-medium">Protection Active! 🎉</p>
                <p className="text-sm">Your Aave position is now being monitored 24/7. Protection will trigger automatically when your health factor drops below {automationConfig.healthFactorThreshold}.</p>
              </div>
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
                <Shield className="h-4 w-4 mr-2" />
                Deploy Protection
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