'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Loader2, AlertTriangle, Shield } from 'lucide-react';

interface AaveDeploymentHandlerProps {
  automationConfig: any;
  onDeploymentComplete: (success: boolean, result?: any) => void;
  onCancel: () => void;
}

type AaveDeploymentStep = 'idle' | 'checking-position' | 'approving-collateral' | 'approving-debt' | 'subscribing' | 'complete' | 'error';

interface ChainConfig {
  id: string;
  name: string;
  lendingPoolAddress: string;
  protocolDataProviderAddress: string;
  addressesProviderAddress: string;
  protectionManagerAddress: string;
  rpcUrl?: string;
  nativeCurrency: string;
}

interface AssetConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

// Configuration constants for Aave protection
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    lendingPoolAddress: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    protocolDataProviderAddress: '0x3e9708d80f7B3e43118013075F7e95CE3AB31F31',
    addressesProviderAddress: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    protectionManagerAddress: '0x4833996c0de8a9f58893A9Db0B6074e29D1bD4a9',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH'
  },
  // Future networks
  {
    id: '1',
    name: 'Ethereum Mainnet (Coming Soon)',
    lendingPoolAddress: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    protocolDataProviderAddress: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
    addressesProviderAddress: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
    protectionManagerAddress: '',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH'
  }
];

const AAVE_ASSETS: Record<string, AssetConfig[]> = {
  '11155111': [
    { 
      address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5', 
      symbol: 'LINK', 
      name: 'Chainlink',
      decimals: 18
    },
    { 
      address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', 
      symbol: 'USDC', 
      name: 'USD Coin',
      decimals: 6
    },
    { 
      address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', 
      symbol: 'DAI', 
      name: 'Dai Stablecoin',
      decimals: 18
    },
    { 
      address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', 
      symbol: 'USDT', 
      name: 'Tether USD',
      decimals: 6
    },
    {
      address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    }
  ]
};

export const AaveDeploymentHandler: React.FC<AaveDeploymentHandlerProps> = ({
  automationConfig,
  onDeploymentComplete,
  onCancel
}) => {
  const [deploymentStep, setDeploymentStep] = useState<AaveDeploymentStep>('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [collateralApproved, setCollateralApproved] = useState<boolean>(false);
  const [debtApproved, setDebtApproved] = useState<boolean>(false);

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

      // Step 1: Check Aave Position
      setDeploymentStep('checking-position');
      toast.loading('Checking your Aave position...', { id: 'deployment' });
      
      const hasPosition = await checkAavePosition(selectedChain, signerAddress);
      if (!hasPosition) {
        throw new Error('No active Aave position found for this address');
      }

      // Step 2: Approve Collateral Token if needed
      if ((automationConfig.protectionType === '0' || automationConfig.protectionType === '2') && !collateralApproved) {
        setDeploymentStep('approving-collateral');
        const collateralAsset = getAssetConfig(automationConfig.collateralAsset, automationConfig.chainId);
        toast.loading(`Approving ${collateralAsset?.symbol || 'collateral token'}...`, { id: 'deployment' });
        
        await approveToken(
          automationConfig.collateralAsset,
          selectedChain.protectionManagerAddress,
          collateralAsset?.symbol || 'Collateral Token'
        );
        setCollateralApproved(true);
      }

      // Step 3: Approve Debt Token if needed
      if ((automationConfig.protectionType === '1' || automationConfig.protectionType === '2') && !debtApproved) {
        setDeploymentStep('approving-debt');
        const debtAsset = getAssetConfig(automationConfig.debtAsset, automationConfig.chainId);
        toast.loading(`Approving ${debtAsset?.symbol || 'debt token'}...`, { id: 'deployment' });
        
        await approveToken(
          automationConfig.debtAsset,
          selectedChain.protectionManagerAddress,
          debtAsset?.symbol || 'Debt Token'
        );
        setDebtApproved(true);
      }

      // Step 4: Subscribe to Protection
      setDeploymentStep('subscribing');
      toast.loading('Subscribing to liquidation protection...', { id: 'deployment' });
      
      await subscribeToProtection(selectedChain, automationConfig);

      // Deployment complete
      setDeploymentStep('complete');
      toast.success('Aave protection subscribed successfully!', { id: 'deployment' });

      const result = {
        protectionAddress: selectedChain.protectionManagerAddress,
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
      setDeploymentStep('error');
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

  // Helper function to approve token
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

  // Helper function to subscribe to protection
  const subscribeToProtection = async (chain: ChainConfig, config: any) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const protectionManagerInterface = new ethers.Interface([
        'function subscribeToProtection(uint8 _protectionType, uint256 _healthFactorThreshold, uint256 _targetHealthFactor, address _collateralAsset, address _debtAsset, bool _preferDebtRepayment) external'
      ]);

      const protectionManagerContract = new ethers.Contract(
        chain.protectionManagerAddress,
        protectionManagerInterface,
        signer
      );

      // Convert health factors to wei (18 decimals)
      const thresholdWei = ethers.parseEther(config.healthFactorThreshold);
      const targetWei = ethers.parseEther(config.targetHealthFactor);

      const tx = await protectionManagerContract.subscribeToProtection(
        parseInt(config.protectionType),
        thresholdWei,
        targetWei,
        config.collateralAsset,
        config.debtAsset,
        config.preferDebtRepayment
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
    return assets.find(asset => asset.address.toLowerCase() === address.toLowerCase());
  };

  const getStepIcon = (step: AaveDeploymentStep) => {
    if (step === deploymentStep && deploymentStep !== 'complete' && deploymentStep !== 'error') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    }
    if (deploymentStep === 'complete' || 
        (deploymentStep === 'subscribing' && (step === 'checking-position' || step === 'approving-collateral' || step === 'approving-debt')) ||
        (deploymentStep === 'approving-debt' && (step === 'checking-position' || step === 'approving-collateral')) ||
        (deploymentStep === 'approving-collateral' && step === 'checking-position')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    return <Clock className="h-4 w-4 text-zinc-400" />;
  };

  const getStepStatus = (step: AaveDeploymentStep): 'pending' | 'active' | 'complete' => {
    const stepOrder: AaveDeploymentStep[] = ['checking-position', 'approving-collateral', 'approving-debt', 'subscribing', 'complete'];
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

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Subscribe to Aave Protection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Summary */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
          <h3 className="text-zinc-100 font-medium mb-2">Protection Configuration</h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p><span className="font-medium">Network:</span> {SUPPORTED_CHAINS.find(c => c.id === automationConfig.chainId)?.name}</p>
            <p><span className="font-medium">Strategy:</span> {getProtectionTypeLabel(automationConfig.protectionType)}</p>
            <p><span className="font-medium">Trigger Threshold:</span> {automationConfig.healthFactorThreshold}</p>
            <p><span className="font-medium">Target Health Factor:</span> {automationConfig.targetHealthFactor}</p>
            {automationConfig.collateralAsset && (
              <p><span className="font-medium">Collateral Asset:</span> {getAssetConfig(automationConfig.collateralAsset, automationConfig.chainId)?.symbol}</p>
            )}
            {automationConfig.debtAsset && (
              <p><span className="font-medium">Debt Asset:</span> {getAssetConfig(automationConfig.debtAsset, automationConfig.chainId)?.symbol}</p>
            )}
          </div>
        </div>

        {/* Deployment Steps */}
        {deploymentStep !== 'idle' && (
          <div className="space-y-3">
            <h3 className="text-zinc-100 font-medium">Deployment Progress</h3>
            
            {[
              { step: 'checking-position' as AaveDeploymentStep, label: 'Check Aave Position' },
              { step: 'approving-collateral' as AaveDeploymentStep, label: 'Approve Collateral Token' },
              { step: 'approving-debt' as AaveDeploymentStep, label: 'Approve Debt Token' },
              { step: 'subscribing' as AaveDeploymentStep, label: 'Subscribe to Protection' }
            ].map(({ step, label }) => {
              // Skip steps based on protection type
              if (step === 'approving-collateral' && automationConfig.protectionType === '1') return null;
              if (step === 'approving-debt' && automationConfig.protectionType === '0') return null;
              
              return (
                <div key={step} className="flex items-center space-x-3">
                  {getStepIcon(step)}
                  <span className={`text-sm ${
                    getStepStatus(step) === 'complete' ? 'text-green-400' :
                    getStepStatus(step) === 'active' ? 'text-blue-400' : 'text-zinc-400'
                  }`}>
                    {label}
                  </span>
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
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Alert className="bg-green-900/20 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              Aave protection subscribed successfully! Your position is now being monitored 24/7.
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
                Subscribe to Protection
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
          
          {(deploymentStep === 'complete' || deploymentStep === 'error') && (
            <Button
              onClick={onCancel}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
            >
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};