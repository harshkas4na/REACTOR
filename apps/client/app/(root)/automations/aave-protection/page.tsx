'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, AlertCircle, Shield, Clock, Zap, Loader2, CheckCircle, RefreshCw, TrendingDown, Activity, DollarSign, ExternalLink } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';

// Define types for form data and position info
interface AaveProtectionFormData {
  chainId: string;
  userAddress: string;
  protectionType: string; // "0", "1", or "2"
  healthFactorThreshold: string;
  targetHealthFactor: string;
  collateralAsset: string;
  debtAsset: string;
  preferDebtRepayment: boolean;
}

interface AssetPosition {
  address: string;
  symbol: string;
  name: string;
  collateralBalance: number;
  debtBalance: number;
  collateralUSD: number;
  debtUSD: number;
  priceUSD: number;
  decimals: number;
}

interface AavePositionInfo {
  totalCollateralETH: string;
  totalDebtETH: string;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  availableBorrowsETH: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  userAssets: AssetPosition[];
}

interface UserSubscription {
  isActive: boolean;
  protectionType: number;
  healthFactorThreshold: string;
  targetHealthFactor: string;
  collateralAsset: string;
  debtAsset: string;
  preferDebtRepayment: boolean;
}

interface ChainConfig {
  id: string;
  name: string;
  lendingPoolAddress: string;
  protocolDataProviderAddress: string;
  addressesProviderAddress: string;
  protectionManagerAddress: string;
  rpcUrl?: string;
  nativeCurrency: string;
  wethAddress?: string; // Add WETH address for ETH handling
}

interface AssetConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  canBorrow?: boolean;
}

// NEW: Form validation errors interface
interface FormValidationErrors {
  healthFactorThreshold?: string;
  targetHealthFactor?: string;
  collateralAsset?: string;
  debtAsset?: string;
  userAddress?: string;
  general?: string;
}

// Configuration constants - updated for new contract architecture
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
    wethAddress: '0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c' // Sepolia WETH
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
    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // Mainnet WETH
  }
];

// Updated asset configuration - include WETH/ETH
const AAVE_ASSETS: Record<string, AssetConfig[]> = {
  '11155111': [
    { 
      address: 'ETH', // Special identifier for native ETH
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
  ]
};

type SetupStep = 'idle' | 'checking-position' | 'approving-collateral' | 'approving-debt' | 'switching-rsc' | 'funding-rsc' | 'switching-back' | 'subscribing' | 'complete' | 'refreshing-after-subscribe';

export default function AaveLiquidationProtectionPage() {
  const [formData, setFormData] = useState<AaveProtectionFormData>({
    chainId: '11155111',
    userAddress: '',
    protectionType: '0',
    healthFactorThreshold: '1.2',
    targetHealthFactor: '1.5',
    collateralAsset: '',
    debtAsset: '',
    preferDebtRepayment: false
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [positionInfo, setPositionInfo] = useState<AavePositionInfo | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState<boolean>(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState<boolean>(false);
  const [collateralApproved, setCollateralApproved] = useState<boolean>(false);
  const [debtApproved, setDebtApproved] = useState<boolean>(false);

  // NEW: Form validation errors state
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});

  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId) || SUPPORTED_CHAINS[0];
  const availableAssets = AAVE_ASSETS[formData.chainId as keyof typeof AAVE_ASSETS] || [];
  
  const collateralAssets = availableAssets;
  const debtAssets = availableAssets.filter(asset => asset.canBorrow !== false);

  const findAssetByAddress = (address: string): AssetConfig | undefined => {
    if (address === 'ETH') return availableAssets.find(asset => asset.symbol === 'ETH');
    return availableAssets.find(asset => asset.address.toLowerCase() === address.toLowerCase());
  };

  const protectionTypes = [
    { value: '0', label: 'Collateral Deposit Only', description: 'Automatically supply additional collateral when health factor drops' },
    { value: '1', label: 'Debt Repayment Only', description: 'Automatically repay debt when health factor drops' },
    { value: '2', label: 'Combined Protection', description: 'Use both strategies with preference order' }
  ];

  // NEW: Form validation function
  const validateForm = (): FormValidationErrors => {
    const errors: FormValidationErrors = {};

    // Validate user address
    if (!formData.userAddress) {
      errors.userAddress = 'Please enter a user address';
    } else if (!ethers.isAddress(formData.userAddress)) {
      errors.userAddress = 'Please enter a valid Ethereum address';
    }

    // Validate health factor thresholds
    const threshold = parseFloat(formData.healthFactorThreshold);
    const target = parseFloat(formData.targetHealthFactor);

    if (isNaN(threshold) || threshold <= 1) {
      errors.healthFactorThreshold = 'Health factor threshold must be greater than 1.0';
    }

    if (isNaN(target)) {
      errors.targetHealthFactor = 'Please enter a valid target health factor';
    } else if (target <= threshold) {
      errors.targetHealthFactor = 'Target health factor must be higher than threshold';
    }

    // Validate asset selection based on protection type
    if (formData.protectionType === '0' && !formData.collateralAsset) {
      errors.collateralAsset = 'Please select a collateral asset for collateral deposit strategy';
    }
    if (formData.protectionType === '1' && !formData.debtAsset) {
      errors.debtAsset = 'Please select a debt asset for debt repayment strategy';
    }
    if (formData.protectionType === '2') {
      if (!formData.collateralAsset) {
        errors.collateralAsset = 'Please select a collateral asset for combined strategy';
      }
      if (!formData.debtAsset) {
        errors.debtAsset = 'Please select a debt asset for combined strategy';
      }
    }

    // Check if position exists
    if (!positionInfo || !positionInfo.hasPosition) {
      errors.general = 'No active Aave position found for this address';
    }

    return errors;
  };

  // NEW: Clear validation errors when form data changes
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors({});
    }
  }, [formData]);

  useEffect(() => {
    const getConnectedAccount = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
            setFormData(prev => ({ ...prev, userAddress: account }));
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }
    };

    getConnectedAccount();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          setFormData(prev => ({ ...prev, userAddress: accounts[0] }));
        } else {
          setConnectedAccount('');
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const getAssetPriceUSD = async (assetConfig: AssetConfig, provider: ethers.BrowserProvider) => {
    try {
      const protectionManagerInterface = new ethers.Interface([
        'function getAssetPrice(address asset) view returns (uint256)'
      ]);

      const protectionManagerContract = new ethers.Contract(
        selectedChain.protectionManagerAddress,
        protectionManagerInterface,
        provider
      );

      try {
        // For ETH, use WETH address for price oracle
        const assetAddress = assetConfig.address === 'ETH' ? selectedChain.wethAddress : assetConfig.address;
        const priceWei = await protectionManagerContract.getAssetPrice(assetAddress);
        const priceUSD = Number(priceWei) / 1e8;
        
        if (priceUSD > 0) {
          console.log(`Aave Oracle price for ${assetConfig.symbol}: ${priceUSD}`);
          return priceUSD;
        }
      } catch (oracleError) {
        console.log(`Failed to get price for ${assetConfig.symbol} from protection manager`);
      }

      const fallbackPrices: Record<string, number> = {
        'ETH': 3500.0,
        'LINK': 30.0,
        'USDC': 1.0,
        'DAI': 1.0,
        'USDT': 1.0,
        'AAVE': 180.0,
        'EURS': 1.1
      };

      const fallbackPrice = fallbackPrices[assetConfig.symbol] || 0;
      console.log(`Using fallback price for ${assetConfig.symbol}: ${fallbackPrice}`);
      return fallbackPrice;

    } catch (error) {
      console.error(`Error fetching price for ${assetConfig.symbol}:`, error);
      return 0;
    }
  };

  const handleFetchAavePosition = async (userAddress: string) => {
    setIsLoadingPosition(true);
    setFetchError('');
    
    try {
      if (!userAddress || !ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address format');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();

      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }

      const lendingPoolInterface = new ethers.Interface([
        'function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)'
      ]);

      const lendingPoolContract = new ethers.Contract(
        selectedChain.lendingPoolAddress,
        lendingPoolInterface,
        provider
      );

      console.log("Fetching Aave position for:", userAddress);
      
      const userData = await lendingPoolContract.getUserAccountData(userAddress);
      console.log("Raw collateral wei:", userData.totalCollateralETH.toString());
      console.log("Raw debt wei:", userData.totalDebtETH.toString());

      const dataProviderInterface = new ethers.Interface([
        'function getUserReserveData(address asset, address user) view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)'
      ]);

      const dataProvider = new ethers.Contract(
        selectedChain.protocolDataProviderAddress,
        dataProviderInterface,
        provider
      );

      const userAssets: AssetPosition[] = [];
      let totalCollateralUSD = 0;
      let totalDebtUSD = 0;

      for (const assetConfig of availableAssets) {
        try {
          // For ETH, use WETH address to get reserve data
          const reserveAddress = assetConfig.address === 'ETH' ? selectedChain.wethAddress : assetConfig.address;
          if (!reserveAddress) continue;
          
          const reserveData = await dataProvider.getUserReserveData(reserveAddress, userAddress);
          
          const collateralBalance = parseFloat(ethers.formatUnits(reserveData.currentATokenBalance, assetConfig.decimals));
          const debtBalance = parseFloat(ethers.formatUnits(reserveData.currentVariableDebt, assetConfig.decimals));
          
          if (collateralBalance > 0 || debtBalance > 0) {
            const priceUSD = await getAssetPriceUSD(assetConfig, provider);
            
            const collateralUSD = collateralBalance * priceUSD;
            const debtUSD = debtBalance * priceUSD;
            
            userAssets.push({
              address: assetConfig.address,
              symbol: assetConfig.symbol,
              name: assetConfig.name,
              collateralBalance,
              debtBalance,
              collateralUSD,
              debtUSD,
              priceUSD,
              decimals: assetConfig.decimals
            });
            
            totalCollateralUSD += collateralUSD;
            totalDebtUSD += debtUSD;
          }
        } catch (error) {
          console.log(`No position in ${assetConfig.symbol}:`, error);
        }
      }

      const hasPosition = userAssets.length > 0;
      
      if (!hasPosition) {
        setPositionInfo({
          totalCollateralETH: '0',
          totalDebtETH: '0',
          totalCollateralUSD: 0,
          totalDebtUSD: 0,
          availableBorrowsETH: '0',
          currentLiquidationThreshold: '0',
          ltv: '0',
          healthFactor: '0',
          hasPosition: false,
          userAssets: []
        });
        return;
      }

      setPositionInfo({
        totalCollateralETH: ethers.formatEther(userData.totalCollateralETH),
        totalDebtETH: ethers.formatEther(userData.totalDebtETH),
        totalCollateralUSD,
        totalDebtUSD,
        availableBorrowsETH: ethers.formatEther(userData.availableBorrowsETH),
        currentLiquidationThreshold: (Number(userData.currentLiquidationThreshold) / 100).toString(),
        ltv: (Number(userData.ltv) / 100).toString(),
        healthFactor: ethers.formatEther(userData.healthFactor),
        hasPosition: true,
        userAssets
      });

      await checkUserSubscription(userAddress);

    } catch (error: any) {
      console.error('Error fetching Aave position:', error);
      setFetchError(error.message || 'Failed to fetch Aave position information');
      setPositionInfo(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  const checkUserSubscription = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const protectionManagerInterface = new ethers.Interface([
        'function getUserProtection(address user) view returns (bool isActive, uint8 protectionType, uint256 healthFactorThreshold, uint256 targetHealthFactor, address collateralAsset, address debtAsset, bool preferDebtRepayment)'
      ]);

      const protectionManagerContract = new ethers.Contract(
        selectedChain.protectionManagerAddress,
        protectionManagerInterface,
        provider
      );

      const subscription = await protectionManagerContract.getUserProtection(userAddress);
      console.log("subscription:", subscription);
      
      if (subscription.isActive) {
        setUserSubscription({
          isActive: subscription.isActive,
          protectionType: Number(subscription.protectionType),
          healthFactorThreshold: ethers.formatEther(subscription.healthFactorThreshold),
          targetHealthFactor: ethers.formatEther(subscription.targetHealthFactor),
          collateralAsset: subscription.collateralAsset,
          debtAsset: subscription.debtAsset,
          preferDebtRepayment: subscription.preferDebtRepayment
        });
      } else {
        setUserSubscription(null);
      }

    } catch (error) {
      console.error('Error checking user subscription:', error);
      setUserSubscription(null);
    }
  };

  // Fixed approval checking logic
  const checkApprovals = async () => {
    if (!connectedAccount) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const erc20Interface = new ethers.Interface([
        'function allowance(address owner, address spender) view returns (uint256)'
      ]);

      // Check collateral approval only if needed and asset is selected
      if ((formData.protectionType === '0' || formData.protectionType === '2') && formData.collateralAsset) {
        if (formData.collateralAsset === 'ETH') {
          setCollateralApproved(true); // ETH doesn't need approval
        } else {
          const collateralContract = new ethers.Contract(formData.collateralAsset, erc20Interface, provider);
          const collateralAllowance = await collateralContract.allowance(connectedAccount, selectedChain.protectionManagerAddress);
          setCollateralApproved(collateralAllowance > 0);
        }
      } else {
        setCollateralApproved(true); // Not needed for debt repayment only
      }

      // Check debt token approval only if needed and asset is selected
      if ((formData.protectionType === '1' || formData.protectionType === '2') && formData.debtAsset) {
        if (formData.debtAsset === 'ETH') {
          setDebtApproved(true); // ETH doesn't need approval
        } else {
          const debtContract = new ethers.Contract(formData.debtAsset, erc20Interface, provider);
          const debtAllowance = await debtContract.allowance(connectedAccount, selectedChain.protectionManagerAddress);
          setDebtApproved(debtAllowance > 0);
        }
      } else {
        setDebtApproved(true); // Not needed for collateral deposit only
      }

    } catch (error) {
      console.error('Error checking approvals:', error);
    }
  };

  useEffect(() => {
    if (connectedAccount) {
      checkApprovals();
    }
  }, [formData.collateralAsset, formData.debtAsset, formData.protectionType, connectedAccount]);

  const approveToken = async (tokenAddress: string, tokenName: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function symbol() view returns (string)'
        ],
        signer
      );

      const tx = await tokenContract.approve(selectedChain.protectionManagerAddress, ethers.MaxUint256);
      await tx.wait();
      
      toast.success(`${tokenName} approval successful!`);
      
      await checkApprovals();
      
    } catch (error: any) {
      console.error(`Error approving ${tokenName}:`, error);
      throw new Error(`${tokenName} approval failed: ${error.message || 'Unknown error'}`);
    }
  };

  const subscribeToProtection = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const protectionManagerInterface = new ethers.Interface([
        'function subscribeToProtection(uint8 _protectionType, uint256 _healthFactorThreshold, uint256 _targetHealthFactor, address _collateralAsset, address _debtAsset, bool _preferDebtRepayment) external payable'
      ]);

      const protectionManagerContract = new ethers.Contract(
        selectedChain.protectionManagerAddress,
        protectionManagerInterface,
        signer
      );

      const thresholdWei = ethers.parseEther(formData.healthFactorThreshold);
      const targetWei = ethers.parseEther(formData.targetHealthFactor);

      const CALLBACK_FUNDING_AMOUNT = '0.03';

      // Handle asset addresses properly - use default USDC for unused strategies
      let collateralAddress = formData.collateralAsset;
      let debtAddress = formData.debtAsset;
      
      // For collateral-only strategy, use placeholder for debt
      if (formData.protectionType === '0') {
        debtAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // USDC as placeholder
      }
      
      // For debt-only strategy, use placeholder for collateral  
      if (formData.protectionType === '1') {
        collateralAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // USDC as placeholder
      }

      // Convert ETH to WETH address for contract
      if (collateralAddress === 'ETH') {
        collateralAddress = selectedChain.wethAddress || '';
      }
      if (debtAddress === 'ETH') {
        debtAddress = selectedChain.wethAddress || '';
      }

      const tx = await protectionManagerContract.subscribeToProtection(
        parseInt(formData.protectionType),
        thresholdWei,
        targetWei,
        collateralAddress,
        debtAddress,
        formData.preferDebtRepayment,
        {
          value: ethers.parseEther(CALLBACK_FUNDING_AMOUNT)
        }
      );

      await tx.wait();
      
      toast.success(`Successfully subscribed to liquidation protection! (Funded with ${CALLBACK_FUNDING_AMOUNT} ETH)`);
      
      setSetupStep('refreshing-after-subscribe');
      await handleFetchAavePosition(formData.userAddress);
      
    } catch (error: any) {
      console.error('Error subscribing to protection:', error);
      throw new Error(`Subscription failed: ${error.message || 'Unknown error'}`);
    }
  };

  const unsubscribeFromProtection = async () => {
    setIsUnsubscribing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const protectionManagerInterface = new ethers.Interface([
        'function unsubscribeFromProtection() external'
      ]);

      const protectionManagerContract = new ethers.Contract(
        selectedChain.protectionManagerAddress,
        protectionManagerInterface,
        signer
      );

      const tx = await protectionManagerContract.unsubscribeFromProtection();
      await tx.wait();
      
      toast.success('Successfully unsubscribed from protection!');
      setUserSubscription(null);
      
      await handleFetchAavePosition(formData.userAddress);
      
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast.error(`Unsubscribe failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const switchNetwork = async (chainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

    try {
      const targetChainIdHex = `0x${parseInt(chainId).toString(16)}`;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === chainId) {
        console.log(`Already on chain ${chainId}`);
        return true;
      }

      console.log(`Switching from ${currentNetwork.chainId} to chain ${chainId}`);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newNetwork = await newProvider.getNetwork();
      
      if (newNetwork.chainId.toString() !== chainId) {
        throw new Error(`Network switch failed. Expected ${chainId}, got ${newNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to chain ${chainId}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4902) {
        console.log(`Chain ${chainId} not added to wallet, attempting to add it`);
        
        let chainConfig;
        if (chainId === '11155111') {
          chainConfig = {
            chainId: '0xaa36a7',
            chainName: 'Ethereum Sepolia',
            nativeCurrency: { name: 'SEP', symbol: 'SEP', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          };
        } else if (chainId === '1') {
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
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          
          if (network.chainId.toString() !== chainId) {
            throw new Error('Network add succeeded but switch failed');
          }
          
          return true;
        } catch (addError: any) {
          throw new Error(`Failed to add chain: ${addError.message || 'User rejected the request'}`);
        }
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  const switchToRSCNetwork = async () => {
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
    
    const rscNetwork = rscNetworks[formData.chainId as keyof typeof rscNetworks];
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
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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

  const handleSetupProtection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NEW: Validate form before proceeding
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const originalChainId = formData.chainId;
    
    try {
      if (userSubscription && userSubscription.isActive) {
        setValidationErrors({ general: 'Already subscribed to protection. Unsubscribe first to change settings.' });
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== formData.chainId) {
        await switchNetwork(formData.chainId);
      }

      // Step 1: Approve collateral token if needed
      if ((formData.protectionType === '0' || formData.protectionType === '2') && 
          formData.collateralAsset && formData.collateralAsset !== 'ETH' && !collateralApproved) {
        setSetupStep('approving-collateral');
        const collateralAsset = availableAssets.find(asset => asset.address === formData.collateralAsset);
        await approveToken(formData.collateralAsset, collateralAsset?.symbol || 'Collateral Token');
      }

      // Step 2: Approve debt token if needed
      if ((formData.protectionType === '1' || formData.protectionType === '2') && 
          formData.debtAsset && formData.debtAsset !== 'ETH' && !debtApproved) {
        setSetupStep('approving-debt');
        const debtAsset = availableAssets.find(asset => asset.address === formData.debtAsset);
        await approveToken(formData.debtAsset, debtAsset?.symbol || 'Debt Token');
      }

      setSetupStep('switching-rsc');
      await switchToRSCNetwork();
      toast.success('Switched to RSC network');

      setSetupStep('funding-rsc');
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscSigner = await rscProvider.getSigner();
      
      const RSC_CONTRACT_ADDRESS = '0xC789a1c6ef9764626bd95D376984FE35Ac0A579B';
      const RSC_FUNDING_AMOUNT = '0.05';
      
      const rscFundingTx = await rscSigner.sendTransaction({
        to: RSC_CONTRACT_ADDRESS,
        value: ethers.parseEther(RSC_FUNDING_AMOUNT)
      });
      await rscFundingTx.wait();
      toast.success(`Funded RSC with ${RSC_FUNDING_AMOUNT} REACT`);

      setSetupStep('switching-back');
      console.log(`Switching back to original chain: ${originalChainId}`);
      await switchNetwork(originalChainId);
      
      const finalProvider = new ethers.BrowserProvider(window.ethereum);
      const finalNetwork = await finalProvider.getNetwork();
      
      if (finalNetwork.chainId.toString() !== originalChainId) {
        throw new Error(`Failed to switch back to original network. Current: ${finalNetwork.chainId}, Expected: ${originalChainId}`);
      }
      
      toast.success(`Switched back to ${selectedChain.name}`);

      setSetupStep('subscribing');
      await subscribeToProtection();

      setSetupStep('complete');
      toast.success('Liquidation protection setup completed successfully!');
      
    } catch (error: any) {
      console.error('Error setting up protection:', error);
      setSetupStep('idle');
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const currentNetwork = await provider.getNetwork();
        if (currentNetwork.chainId.toString() !== originalChainId) {
          console.log('Attempting to switch back to original network after error...');
          await switchNetwork(originalChainId);
        }
      } catch (switchBackError) {
        console.error('Failed to switch back to original network:', switchBackError);
      }
      
      if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else if (error.message.includes('network') || error.message.includes('switch')) {
        toast.error('Network switching failed. Please switch networks manually and try again.');
      } else {
        toast.error(error.message || 'Failed to setup protection');
      }
    }
  };

  // FIXED: Subscription display logic - only show "None" based on protection type
  const getSubscriptionAssetDisplay = (assetAddress: string, protectionType: number, isCollateral: boolean) => {
    // Only show "None" based on protection type logic, not specific addresses
    const shouldShowNone = (
      (protectionType === 1 && isCollateral) || // Debt only, showing collateral
      (protectionType === 0 && !isCollateral)   // Collateral only, showing debt
    );

    if (shouldShowNone) {
      return <span className="text-zinc-400 italic">None</span>;
    }

    // Handle WETH to ETH conversion for display
    let displayAddress = assetAddress;
    if (assetAddress.toLowerCase() === selectedChain.wethAddress?.toLowerCase()) {
      displayAddress = 'ETH';
    }

    const asset = findAssetByAddress(displayAddress);
    if (!asset) {
      return <span className="text-zinc-400 italic">Unknown</span>;
    }

    return (
      <>
        {asset.symbol}
        <span className="text-xs text-green-300 ml-1">
          ({asset.name})
        </span>
      </>
    );
  };

  const SetupStatusUI = () => {
    return (
      <>
        {(setupStep !== 'idle' || isUnsubscribing) && (
          <Alert className={
            setupStep === 'complete' 
              ? "bg-green-900/20 border-green-500/50" 
              : "bg-blue-900/20 border-blue-500/50"
          }>
            {setupStep === 'complete' 
              ? <CheckCircle className="h-4 w-4 text-green-400" /> 
              : <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
            }
            <AlertDescription className="text-zinc-200">
              {isUnsubscribing && (
                <div className="flex flex-col gap-1">
                  <span>Unsubscribing from protection...</span>
                  <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
                </div>
              )}
              {setupStep === 'checking-position' && (
                <div className="flex flex-col gap-1">
                  <span>Checking Aave position...</span>
                  <span className="text-xs text-zinc-400">Fetching your current health factor and balances</span>
                </div>
              )}
              {setupStep === 'approving-collateral' && (
                <div className="flex flex-col gap-1">
                  <span>Approving collateral token...</span>
                  <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
                </div>
              )}
              {setupStep === 'approving-debt' && (
                <div className="flex flex-col gap-1">
                  <span>Approving debt token...</span>
                  <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
                </div>
              )}
              {setupStep === 'switching-rsc' && (
                <div className="flex flex-col gap-1">
                  <span>Switching to RSC network...</span>
                  <span className="text-xs text-zinc-400">Please approve the network switch in your wallet</span>
                </div>
              )}
              {setupStep === 'funding-rsc' && (
                <div className="flex flex-col gap-1">
                  <span>Funding RSC monitoring contract...</span>
                  <span className="text-xs text-zinc-400">Please confirm the funding transaction (0.05 REACT)</span>
                </div>
              )}
              {setupStep === 'switching-back' && (
                <div className="flex flex-col gap-1">
                  <span>Switching back to original network...</span>
                  <span className="text-xs text-zinc-400">Please approve the network switch back</span>
                </div>
              )}
              {setupStep === 'subscribing' && (
                <div className="flex flex-col gap-1">
                  <span>Subscribing to protection service...</span>
                  <span className="text-xs text-zinc-400">Please confirm the subscription transaction</span>
                </div>
              )}
              {setupStep === 'refreshing-after-subscribe' && (
                <div className="flex flex-col gap-1">
                  <span>Updating your protection status...</span>
                  <span className="text-xs text-zinc-400">Refreshing position and subscription information</span>
                </div>
              )}
              {setupStep === 'complete' && (
                <div className="flex flex-col gap-1">
                  <span>Protection setup completed successfully!</span>
                  <span className="text-xs text-zinc-400">Your position is now being monitored 24/7</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </>
    );
  };

  // NEW: Validation Error Display Component
  const ValidationErrorsUI = () => {
    if (Object.keys(validationErrors).length === 0) return null;

    return (
      <div className="space-y-2">
        {Object.entries(validationErrors).map(([field, error]) => (
          <Alert key={field} variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Aave Liquidation Protection
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Automatically protect your Aave positions from liquidation with smart collateral management and debt repayment strategies.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Smart Protection</h3>
                    <p className="text-sm text-zinc-300">Collateral & debt strategies</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Health Factor Monitoring</h3>
                    <p className="text-sm text-gray-200">Continuous position tracking</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Non-Custodial</h3>
                    <p className="text-sm text-gray-200">You maintain control</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Funding Requirements Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-4 sm:mt-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-amber-100 mb-2 text-sm sm:text-base">Protection Setup Costs</h3>
                  <p className="text-xs sm:text-sm text-amber-200 mb-3">
                    RSC Monitoring: 0.05 REACT • Callback Execution: 0.03 ETH • Plus gas fees
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
                {/* <div className="text-right">
                  <p className="text-xs text-amber-300">
                    Covers 24/7 monitoring & automatic execution
                  </p>
                </div> */}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Subscription Status - Fixed display logic */}
        {userSubscription && userSubscription.isActive && (
          <Card className="relative bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-500/50 mb-8">
            <CardHeader className="border-b border-green-500/20">
              <CardTitle className="text-green-100 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Active Protection
              </CardTitle>
              <CardDescription className="text-green-200">
                Your Aave position is currently protected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-200">Protection Type:</p>
                  <p className="text-green-100 font-medium">
                    {protectionTypes.find(pt => pt.value === userSubscription.protectionType.toString())?.label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-200">Health Factor Threshold:</p>
                  <p className="text-green-100 font-medium">{userSubscription.healthFactorThreshold}</p>
                </div>
                <div>
                  <p className="text-sm text-green-200">Target Health Factor:</p>
                  <p className="text-green-100 font-medium">{userSubscription.targetHealthFactor}</p>
                </div>
                <div>
                  <p className="text-sm text-green-200">Strategy Preference:</p>
                  <p className="text-green-100 font-medium">
                    {userSubscription.preferDebtRepayment ? 'Prefer Debt Repayment' : 'Prefer Collateral Deposit'}
                  </p>
                </div>
              </div>

              {/* Fixed asset display */}
              <div className="mt-4 pt-4 border-t border-green-500/20">
                <h4 className="text-sm font-medium text-green-100 mb-3">Assets Used:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-200">Collateral Asset:</p>
                    <p className="text-green-100 font-medium">
                      {getSubscriptionAssetDisplay(userSubscription.collateralAsset, userSubscription.protectionType, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-200">Debt Asset:</p>
                    <p className="text-green-100 font-medium">
                      {getSubscriptionAssetDisplay(userSubscription.debtAsset, userSubscription.protectionType, false)}
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={unsubscribeFromProtection}
                variant="destructive"
                className="mt-4"
                disabled={isUnsubscribing}
              >
                {isUnsubscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unsubscribing...
                  </>
                ) : (
                  'Unsubscribe from Protection'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Form Card */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Setup Liquidation Protection</CardTitle>
            <CardDescription className="text-zinc-300">Configure automated protection for your Aave position</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSetupProtection}>
              {/* NEW: Show validation errors */}
              <ValidationErrorsUI />

              {/* Chain Selection */}
              <div className="space-y-2">
                <div className="flex items-center mt-4 space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm text-zinc-200">
                        Choose the blockchain network where your Aave position is located.
                        Currently only Sepolia testnet is supported. Ethereum Mainnet support coming soon.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => setFormData({ ...formData, chainId: value })}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(chain => (
                      <SelectItem 
                        key={chain.id} 
                        value={chain.id}
                        className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                        disabled={chain.id !== '11155111'}
                      >
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Address */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-zinc-200">User Address</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 text-zinc-200">
                      <p className="text-sm">
                        Enter the address that has an active Aave position. This will be automatically filled
                        with your connected wallet address.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Enter user address"
                    value={formData.userAddress}
                    onChange={(e) => setFormData({...formData, userAddress: e.target.value})}
                    className={`bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 ${
                      validationErrors.userAddress ? 'border-red-500' : ''
                    }`}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
                    onClick={() => handleFetchAavePosition(formData.userAddress)}
                    disabled={!formData.userAddress || isLoadingPosition}
                  >
                    {isLoadingPosition ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingPosition ? 'Loading...' : 'Check Position'}
                  </Button>
                </div>
              </div>

              {/* Show loading state */}
              {isLoadingPosition && (
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-zinc-200">Fetching Aave position information...</span>
                  </div>
                </div>
              )}

              {/* Show error message if any */}
              {fetchError && (
                <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {fetchError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Position Information Card */}
              {positionInfo && (
                <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <h3 className="text-sm font-medium text-zinc-100">Aave Position Information</h3>
                  
                  {!positionInfo.hasPosition ? (
                    <Alert className="bg-amber-900/20 border-amber-500/50">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <AlertDescription className="text-amber-200">
                        No active Aave position found for this address. You need to have an active position to use liquidation protection.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Main Position Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-zinc-400">Total Collateral</p>
                          <p className="text-zinc-200 font-medium text-lg">
                            ${positionInfo.totalCollateralUSD.toFixed(2)} USD
                          </p>
                          
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Total Debt</p>
                          <p className="text-zinc-200 font-medium text-lg">
                            ${positionInfo.totalDebtUSD.toFixed(2)} USD
                          </p>
                          
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Health Factor</p>
                          <p className={`font-medium text-lg ${
                            parseFloat(positionInfo.healthFactor) > 1.5 ? 'text-green-400' :
                            parseFloat(positionInfo.healthFactor) > 1.2 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {parseFloat(positionInfo.healthFactor).toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-400">Liquidation Threshold</p>
                          <p className="text-zinc-200 font-medium">{positionInfo.currentLiquidationThreshold}%</p>
                        </div>
                      </div>

                      {/* Detailed Asset Breakdown */}
                      {positionInfo.userAssets && positionInfo.userAssets.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-zinc-200">Position Breakdown:</h4>
                            <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                              🔮 Prices from Aave Oracle
                            </div>
                          </div>
                          <div className="grid gap-2">
                            {positionInfo.userAssets.map(asset => (
                              <div key={asset.symbol} className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-400">
                                      {asset.symbol.slice(0, 2)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-zinc-200">{asset.symbol}</p>
                                    <p className="text-xs text-zinc-400">${asset.priceUSD.toFixed(2)} USD</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {asset.collateralBalance > 0 && (
                                    <div className="text-green-400 text-sm">
                                      <span className="font-medium">+{asset.collateralBalance.toFixed(4)}</span>
                                      <span className="text-xs ml-1">(${asset.collateralUSD.toFixed(2)})</span>
                                    </div>
                                  )}
                                  {asset.debtBalance > 0 && (
                                    <div className="text-red-400 text-sm">
                                      <span className="font-medium">-{asset.debtBalance.toFixed(4)}</span>
                                      <span className="text-xs ml-1">(${asset.debtUSD.toFixed(2)})</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Protection Configuration */}
              {positionInfo && positionInfo.hasPosition && !userSubscription?.isActive && (
                <>
                  {/* Protection Type */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">Protection Strategy</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Protection Strategies:</p>
                            <p className="text-xs">• Collateral Deposit: Adds more collateral to improve health factor</p>
                            <p className="text-xs">• Debt Repayment: Repays debt to reduce risk</p>
                            <p className="text-xs">• Combined: Uses both strategies with preference order</p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <Select
                      value={formData.protectionType}
                      onValueChange={(value) => setFormData({...formData, protectionType: value})}
                    >
                      <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                        <SelectValue placeholder="Select protection strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {protectionTypes.map(type => (
                          <SelectItem 
                            key={type.value} 
                            value={type.value}
                            className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                          >
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-zinc-400">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Health Factor Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-zinc-200">Trigger Threshold</label>
                        <HoverCard>
                          <HoverCardTrigger>
                            <Info className="h-4 w-4 text-zinc-400" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 text-zinc-200">
                            <p className="text-sm">
                              Health factor level at which protection triggers. Must be above 1.0.
                              Recommended: 1.2 for safe margin above liquidation.
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Input 
                        type="number"
                        step="0.1"
                        placeholder="e.g., 1.2"
                        value={formData.healthFactorThreshold}
                        onChange={(e) => setFormData({...formData, healthFactorThreshold: e.target.value})}
                        className={`bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 ${
                          validationErrors.healthFactorThreshold ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-zinc-200">Target Health Factor</label>
                        <HoverCard>
                          <HoverCardTrigger>
                            <Info className="h-4 w-4 text-zinc-400" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 text-zinc-200">
                            <p className="text-sm">
                              Desired health factor after protection executes. Must be higher than trigger threshold.
                              Recommended: 1.5 for comfortable safety margin.
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Input 
                        type="number"
                        step="0.1"
                        placeholder="e.g., 1.5"
                        value={formData.targetHealthFactor}
                        onChange={(e) => setFormData({...formData, targetHealthFactor: e.target.value})}
                        className={`bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 ${
                          validationErrors.targetHealthFactor ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Asset Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-zinc-200">Collateral Asset</label>
                        <HoverCard>
                          <HoverCardTrigger>
                            <Info className="h-4 w-4 text-zinc-400" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 text-zinc-200">
                            <p className="text-sm">
                              Token used for collateral deposits. You must have sufficient balance
                              and approve this contract to spend your tokens.
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Select
                        value={formData.collateralAsset}
                        onValueChange={(value) => setFormData({...formData, collateralAsset: value})}
                        disabled={formData.protectionType === '1'}
                      >
                        <SelectTrigger className={`bg-blue-900/20 border-zinc-700 text-zinc-200 ${
                          validationErrors.collateralAsset ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select collateral asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {collateralAssets.filter(asset => asset.address !== 'ETH').map(asset => (
                            <SelectItem 
                              key={asset.address} 
                              value={asset.address}
                              className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                            >
                              {asset.symbol} - {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-zinc-200">Debt Asset</label>
                        <HoverCard>
                          <HoverCardTrigger>
                            <Info className="h-4 w-4 text-zinc-400" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 text-zinc-200">
                            <p className="text-sm">
                              Token used for debt repayment. You must have sufficient balance
                              and approve this contract to spend your tokens.
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Select
                        value={formData.debtAsset}
                        onValueChange={(value) => setFormData({...formData, debtAsset: value})}
                        disabled={formData.protectionType === '0'}
                      >
                        <SelectTrigger className={`bg-blue-900/20 border-zinc-700 text-zinc-200 ${
                          validationErrors.debtAsset ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select debt asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {debtAssets.filter(asset => asset.address !== 'ETH').map(asset => (
                            <SelectItem 
                              key={asset.address} 
                              value={asset.address}
                              className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                            >
                              {asset.symbol} - {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Strategy Preference for Combined Protection */}
                  {formData.protectionType === '2' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-zinc-200">Strategy Preference</label>
                        <HoverCard>
                          <HoverCardTrigger>
                            <Info className="h-4 w-4 text-zinc-400" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80 text-zinc-200">
                            <p className="text-sm">
                              For combined protection, choose which strategy to try first.
                              If the primary strategy fails, the system will attempt the backup strategy.
                            </p>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                      <Select
                        value={formData.preferDebtRepayment ? "debt" : "collateral"}
                        onValueChange={(value) => setFormData({...formData, preferDebtRepayment: value === "debt"})}
                      >
                        <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                          <SelectValue placeholder="Select preferred strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem 
                            value="collateral"
                            className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                          >
                            Prefer Collateral Deposit
                          </SelectItem>
                          <SelectItem 
                            value="debt"
                            className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                          >
                            Prefer Debt Repayment
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Fixed Approval Status */}
                  {((formData.protectionType === '0' && formData.collateralAsset) ||
                    (formData.protectionType === '1' && formData.debtAsset) ||
                    (formData.protectionType === '2' && formData.collateralAsset && formData.debtAsset)) && (
                    <Card className="bg-blue-900/20 border-blue-500/20">
                      <CardContent className="pt-4">
                        <h3 className="text-sm font-medium text-zinc-100 mb-2">Token Approval Status</h3>
                        <div className="space-y-2">
                          {(formData.protectionType === '0' || formData.protectionType === '2') && formData.collateralAsset && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-300">
                                {availableAssets.find(a => a.address === formData.collateralAsset)?.symbol} (Collateral)
                              </span>
                              <div className="flex items-center space-x-2">
                                {collateralApproved ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-400" />
                                )}
                                <span className="text-xs">
                                  {collateralApproved ? 'Approved' : 'Needs Approval'}
                                </span>
                              </div>
                            </div>
                          )}
                          {(formData.protectionType === '1' || formData.protectionType === '2') && formData.debtAsset && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-300">
                                {availableAssets.find(a => a.address === formData.debtAsset)?.symbol} (Debt)
                              </span>
                              <div className="flex items-center space-x-2">
                                {debtApproved ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-400" />
                                )}
                                <span className="text-xs">
                                  {debtApproved ? 'Approved' : 'Needs Approval'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Setup Status */}
                  {SetupStatusUI()}

                  {/* Submit Button */}
                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    disabled={
                      setupStep !== 'idle' || 
                      !positionInfo?.hasPosition ||
                      selectedChain.id !== '11155111'
                    }
                  >
                    Subscribe to Liquidation Protection
                  </Button>

                  {selectedChain.id !== '11155111' && (
                    <p className="text-center text-amber-400 text-sm">
                      This network is coming soon. Currently only Sepolia testnet is supported.
                    </p>
                  )}
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Educational Section */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Understanding Aave Liquidation Protection</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn how automated liquidation protection works and keeps your positions safe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is Liquidation Protection?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Liquidation protection automatically manages your Aave position to prevent liquidation. When your health factor drops below your threshold, the system automatically executes protection strategies to restore your position to a safe level.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Protection Strategies:</h4>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        <li>• <span className="font-medium">Collateral Deposit:</span> Adds more collateral to improve health factor</li>
                        <li>• <span className="font-medium">Debt Repayment:</span> Repays debt to reduce leverage</li>
                        <li>• <span className="font-medium">Combined:</span> Uses both strategies with your preferred order</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="health-factor" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Understanding Health Factor
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Health Factor = (Total Collateral × Liquidation Threshold) / Total Debt
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-green-400 mb-2">Healthy (&gt; 1.5)</h4>
                        <p className="text-sm text-zinc-300">
                          Position is safe with good margin for price volatility
                        </p>
                      </div>
                      <div className="bg-amber-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-amber-400 mb-2">At Risk (1.0-1.5)</h4>
                        <p className="text-sm text-zinc-300">
                          Position needs attention, protection should trigger
                        </p>
                      </div>
                      <div className="bg-red-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-red-400 mb-2">Liquidation (&lt; 1.0)</h4>
                        <p className="text-sm text-zinc-300">
                          Position will be liquidated with penalties
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="setup-process" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Setup & Funding Process
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Setting up Aave liquidation protection requires several steps to ensure your position is properly monitored and protected across networks.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium">Token Approvals (if needed)</p>
                          <p className="text-blue-300 text-xs">
                            Approve collateral and/or debt tokens for the protection contract to manage during emergencies.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium">RSC Network Funding</p>
                          <p className="text-purple-300 text-xs">
                            Switch to Reactive Network and fund the monitoring contract with 0.05 REACT tokens for 24/7 health factor tracking.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium">Protection Subscription</p>
                          <p className="text-green-300 text-xs">
                            Subscribe to the protection service and fund the callback contract with 0.03 ETH for automatic execution.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-500/30">
                      <p className="text-sm text-amber-200">
                        💰 <span className="font-medium">Total Cost:</span> 
                        ~0.03 ETH + 0.05 REACT + gas fees. The system automatically handles network switching between your main chain and Reactive Network.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How Protection Works
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Our system uses periodic monitoring to check all subscribed users' health factors and execute protection when needed.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">1. Continuous Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          System checks health factors via CRON events on the Reactive Network
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">2. Smart Execution</h4>
                        <p className="text-sm text-zinc-300">
                          When threshold is reached, executes your chosen protection strategy
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">3. Aave Oracle Integration</h4>
                        <p className="text-sm text-zinc-300">
                          Uses Aave's native price oracle for accurate and reliable price data
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">4. Failsafe Mechanisms</h4>
                        <p className="text-sm text-zinc-300">
                          Multiple validation checks and fallback strategies for reliability
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="best-practices" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Best Practices
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Conservative Thresholds</h4>
                        <p className="text-sm text-zinc-300">
                          Set trigger threshold at 1.2-1.3 and target at 1.5+ for safety margin
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Maintain Token Balances</h4>
                        <p className="text-sm text-zinc-300">
                          Keep sufficient collateral/debt tokens in your wallet for protection
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Monitor Approvals</h4>
                        <p className="text-sm text-zinc-300">
                          Ensure protection contract has approval to spend your tokens
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Regular Reviews</h4>
                        <p className="text-sm text-zinc-300">
                          Periodically check your protection settings and adjust as needed
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="important-notes" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Important Considerations
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">Key Points:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
                        <li>Protection requires sufficient token balances and approvals</li>
                        <li>System runs on periodic checks, not real-time price monitoring</li>
                        <li>Multiple users can subscribe to the same protection contract</li>
                        <li>You maintain full control of your assets through approval mechanisms</li>
                        <li>Protection may not execute if you lack sufficient assets or approvals</li>
                        <li>Consider gas costs when setting thresholds for small positions</li>
                        <li><span className="font-medium text-purple-300">FUNDING:</span> Requires 0.03 ETH + 0.05 REACT tokens for monitoring and execution</li>
                        <li><span className="font-medium text-blue-300">NETWORKS:</span> Automatically switches between your main chain and Reactive Network during setup</li>
                        <li><span className="font-medium text-purple-300">NEW:</span> Now uses Aave's native oracle for enhanced price accuracy</li>                        
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}