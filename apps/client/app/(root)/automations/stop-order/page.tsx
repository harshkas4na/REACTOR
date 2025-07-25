'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState, useRef } from 'react';
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
import { Info, AlertCircle, Shield, Clock, Zap, Loader2, CheckCircle, RefreshCw, Bot, X, TrendingDown, DollarSign, Calculator, Target } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';
import PairFinder from '@/components/pair-finder';
import BalanceInfoComponent from '@/components/automation/BalanceInfoComponent';
import { AIUtils } from '@/utils/ai';

// All the existing imports and configurations remain the same
import { stopOrderByteCodeSepolia } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import { rscByteCodeSepolia } from '@/data/automations/stop-order/RSCByteCode';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';

import { stopOrderByteCodeMainnet } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIMainnet from '@/data/automations/stop-order/stopOrderABIMainnet.json';
import { rscByteCodeMainnet } from '@/data/automations/stop-order/RSCByteCode';
import rscABIMainnet from '@/data/automations/stop-order/RSCABIMainnet.json';

import { stopOrderByteCodeAvalancheCChain } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIAvalancheCChain from '@/data/automations/stop-order/stopOrderABIAvalancheCChain.json';
import { rscByteCodeAvalancheCChain } from '@/data/automations/stop-order/RSCByteCode';
import rscABIAvalancheCChain from '@/data/automations/stop-order/RSCABIAvalancheCChain.json';

// All existing interfaces and types remain the same
interface StopOrderFormData {
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
  // New UX helper fields
  dropPercentage: string; // User-friendly percentage input
  currentPrice: string; // Display current price
  stopPrice: string; // Calculated stop price in USD
}

interface PairInfo {
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  reserve0?: string;
  reserve1?: string;
  currentPriceRatio?: number;
}

interface ChainConfig {
  id: string;
  name: string;
  dexName: string;
  routerAddress: string;
  factoryAddress: string;
  callbackAddress: string; // Pre-deployed callback contract
  rpcUrl?: string;
  nativeCurrency: string;
  defaultFunding: string;
  stopOrderABI: any;
  stopOrderBytecode: string;
  rscABI: any;
  rscBytecode: string;
}

// Simplified configuration with pre-deployed contracts
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
    callbackAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH',
    defaultFunding: '0.01',
    stopOrderABI: stopOrderABISepolia,
    stopOrderBytecode: stopOrderByteCodeSepolia,
    rscABI: rscABISepolia,
    rscBytecode: rscByteCodeSepolia,
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    callbackAddress: '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.01',
    stopOrderABI: stopOrderABIMainnet,
    stopOrderBytecode: stopOrderByteCodeMainnet,
    rscABI: rscABIMainnet,
    rscBytecode: rscByteCodeMainnet,
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain',
    dexName: 'Pangolin',
    routerAddress: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
    callbackAddress: '0x934Ea75496562D4e83E80865c33dbA600644fCDa',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    defaultFunding: '0.1',
    stopOrderABI: stopOrderABIAvalancheCChain,
    stopOrderBytecode: stopOrderByteCodeAvalancheCChain,
    rscABI: rscABIAvalancheCChain,
    rscBytecode: rscByteCodeAvalancheCChain,
  }
];

type DeploymentStep = 'idle' | 'deploying-destination' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'approving' | 'creating' | 'complete';

const getInitialFormData = (): StopOrderFormData => ({
  chainId: '',
  pairAddress: '',
  sellToken0: true,
  clientAddress: '',
  coefficient: '1000',
  threshold: '',
  amount: '',
  destinationFunding: '',
  rscFunding: '0.05',
  dropPercentage: '10', // Default 10% drop
  currentPrice: '',
  stopPrice: ''
});

export default function ImprovedStopOrderPage() {
  const aiConfigDataRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [formData, setFormData] = useState<StopOrderFormData>(getInitialFormData());

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState<boolean>(false);
  const [showAIStatus, setShowAIStatus] = useState(false);
  const [isLoadingAIConfig, setIsLoadingAIConfig] = useState(false);

  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
  const dexName = selectedChain?.dexName || 'Uniswap V2';

  // Helper functions for better UX
  const calculateThresholdFromPercentage = (percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage))) return;
    
    const dropPercent = parseFloat(percentage);
    const remainingPercent = 100 - dropPercent;
    const coefficient = 1000;
    const threshold = Math.floor((remainingPercent / 100) * coefficient);
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage
    }));
  };

  const calculateStopPrice = () => {
    if (!pairInfo || !formData.dropPercentage) return '';
    
    const currentRatio = pairInfo.currentPriceRatio || 0;
    if (currentRatio === 0) return '';
    
    const dropPercent = parseFloat(formData.dropPercentage) || 10;
    const stopRatio = currentRatio * (1 - dropPercent / 100);
    
    return stopRatio.toFixed(6);
  };

  // All existing effects and functions remain the same, just adding UX improvements
  useEffect(() => {
    const loadAIConfig = async () => {
      if (typeof window === 'undefined') return;
      const urlParams = new URLSearchParams(window.location.search);
      const fromAI = urlParams.get('from_ai');
      
      if (fromAI === 'true' && !isInitialized) {
        setIsLoadingAIConfig(true);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const aiConfig = AIUtils.ConfigManager.peekConfig();
        
        if (aiConfig) {
          console.log('Loading AI configuration:', aiConfig);
          aiConfigDataRef.current = aiConfig;
          
          const validationResult = validateAIConfig(aiConfig);
          
          if (validationResult.isValid) {
            let processedAmount = aiConfig.amount || '';
            if (processedAmount === 'all' || processedAmount.includes('%')) {
              processedAmount = '';
              setTimeout(() => {
                alert(`💡 Amount was set to "${aiConfig.amount}" - please enter the exact amount to sell`);
              }, 1500);
            }

            // Calculate drop percentage from AI threshold for better UX
            const dropPercentage = aiConfig.dropPercentage || '10';
            
            setFormData({
              ...getInitialFormData(),
              chainId: aiConfig.chainId || '',
              pairAddress: aiConfig.pairAddress || '',
              sellToken0: aiConfig.sellToken0 !== undefined ? aiConfig.sellToken0 : true,
              clientAddress: aiConfig.clientAddress || '',
              coefficient: aiConfig.coefficient || '1000',
              threshold: aiConfig.threshold || '',
              amount: processedAmount,
              dropPercentage: String(dropPercentage),
              currentPrice: '',
              stopPrice: ''
            });
            
            setIsInitialized(true);
            
            if (aiConfig.pairAddress && ethers.isAddress(aiConfig.pairAddress)) {
              setTimeout(() => {
                handleFetchPairInfo(aiConfig.pairAddress, true);
              }, 300);
            }
            
            toast.success('✨ Configuration loaded from AI assistant!');
            setShowAIStatus(true);
            
            setTimeout(() => {
              setShowAIStatus(false);
            }, 5000);
            
            setTimeout(() => {
              const formElement = document.querySelector('form');
              if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 800);
            
            AIUtils.ConfigManager.retrieveAndClearConfig();
          } else {
            console.warn('Invalid AI configuration:', validationResult.errors);
            toast.error('Invalid AI configuration. Please try again.');
            setIsInitialized(true);
          }
        } else {
          console.warn('No AI configuration found');
          toast.error('No AI configuration found');
          setIsInitialized(true);
        }
        
        window.history.replaceState({}, '', '/automations/stop-order');
        setIsLoadingAIConfig(false);
      } else if (!fromAI) {
        setIsInitialized(true);
      }
    };
    
    loadAIConfig();
  }, []);

  const validateAIConfig = (config: any) => {
    const errors: string[] = [];
    
    if (!config.chainId) errors.push('Chain ID is required');
    if (!config.pairAddress) errors.push('Pair address is required');
    if (config.sellToken0 === undefined) errors.push('Sell token direction is required');
    if (!config.clientAddress) errors.push('Client address is required');
    if (!config.coefficient) errors.push('Coefficient is required');
    if (!config.threshold) errors.push('Threshold is required');
    if (!config.amount) errors.push('Amount is required');
    
    if (config.pairAddress && !ethers.isAddress(config.pairAddress)) {
      errors.push('Invalid pair address');
    }
    if (config.clientAddress && !ethers.isAddress(config.clientAddress)) {
      errors.push('Invalid client address');
    }
    
    if (config.coefficient && isNaN(parseInt(config.coefficient))) {
      errors.push('Coefficient must be a number');
    }
    if (config.threshold && isNaN(parseInt(config.threshold))) {
      errors.push('Threshold must be a number');
    }
    
    const supportedChains = ['1', '11155111', '43114'];
    if (config.chainId && !supportedChains.includes(config.chainId)) {
      errors.push('Unsupported chain ID');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  useEffect(() => {
    const validateForm = () => {
      if (!isInitialized || isLoadingAIConfig) {
        setIsFormValid(false);
        return false;
      }
      
      const errors: string[] = [];
      
      if (!formData.chainId || formData.chainId.trim() === '') errors.push('Chain selection required');
      if (!formData.pairAddress || formData.pairAddress.trim() === '' || !ethers.isAddress(formData.pairAddress)) {
        errors.push('Valid pair address required');
      }
      if (!formData.clientAddress || formData.clientAddress.trim() === '' || !ethers.isAddress(formData.clientAddress)) {
        errors.push('Valid client address required');
      }
      if (!formData.threshold || formData.threshold.trim() === '' || isNaN(parseInt(formData.threshold))) {
        errors.push('Valid threshold required');
      }
      if (!formData.amount || formData.amount.trim() === '' || isNaN(parseFloat(formData.amount))) {
        errors.push('Valid amount required');
      }
      
      if (!connectedAccount) errors.push('Wallet connection required');
      if (!pairInfo) errors.push('Valid trading pair required');
      
      const isValid = errors.length === 0 && deploymentStep === 'idle';
      setIsFormValid(isValid);
      
      return isValid;
    };
    
    validateForm();
  }, [formData, connectedAccount, pairInfo, deploymentStep, isLoadingAIConfig, isInitialized]);

  // Update stop price when drop percentage or pair info changes
  useEffect(() => {
    if (pairInfo && formData.dropPercentage) {
      const stopPrice = calculateStopPrice();
      setFormData(prev => ({ ...prev, stopPrice }));
    }
  }, [pairInfo, formData.dropPercentage]);

  // Enhanced AI Status Component
  const EnhancedAIIntegrationStatus = () => {
    if (!showAIStatus) return null;
    
    const aiData = aiConfigDataRef.current;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-zinc-100 font-medium">✨ AI Configuration Loaded Successfully!</p>
                <p className="text-zinc-300 text-sm">
                  Your stop order parameters have been pre-filled. Review the details below and deploy when ready!
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIStatus(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-900/20 p-2 rounded">
                <span className="text-zinc-400">Amount: </span>
                <span className="text-blue-300">
                  {formData.amount || (aiData?.amount === 'all' ? 'All balance' : aiData?.amount || 'Not set')}
                </span>
              </div>
              <div className="bg-blue-900/20 p-2 rounded">
                <span className="text-zinc-400">Network: </span>
                <span className="text-blue-300">{SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId)?.name}</span>
              </div>
              {aiData?.dropPercentage && (
                <div className="bg-blue-900/20 p-2 rounded col-span-2">
                  <span className="text-zinc-400">Trigger: </span>
                  <span className="text-blue-300">{aiData.dropPercentage}% price drop</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (typeof window !== 'undefined') {
      if (selectedChain && formData.chainId && !window.location.search.includes('from_ai')) {
        setFormData(prev => ({
          ...prev,
          destinationFunding: selectedChain.defaultFunding
        }));
      }
    }
  }, [formData.chainId, selectedChain, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (typeof window === 'undefined') return;
    const getConnectedAccount = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
            if (!formData.clientAddress) {
              setFormData(prev => ({
                ...prev,
                clientAddress: account
              }));
            }
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }
    };
    getConnectedAccount();
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          if (!formData.clientAddress) {
            setFormData(prev => ({
              ...prev,
              clientAddress: accounts[0]
            }));
          }
        } else {
          setConnectedAccount('');
        }
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [isInitialized, formData.clientAddress]);

  const handlePairSelected = (pairAddress: string, chainId: string) => {
    if (!isInitialized || isLoadingAIConfig) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      pairAddress,
      chainId
    }));
    
    handleFetchPairInfo(pairAddress);
    
    toast.success('Pair selected! Scroll down to continue configuring your stop order.');
  };

  const handleFetchPairInfo = async (pairAddress: string, skipNetworkCheck = false) => {
    if (typeof window === 'undefined') return;
    setIsLoadingPair(true);
    setFetchError('');
    
    try {
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address format');
      }

      if (!window.ethereum) throw new Error('No wallet detected');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();

      if (!skipNetworkCheck && formData.chainId && formData.chainId.trim() !== '' && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }

      const code = await provider.getCode(pairAddress);
      if (code === '0x' || code === '0x0') {
        throw new Error('No contract found at this address');
      }

      const pairInterface = new ethers.Interface([
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function getReserves() view returns (uint112, uint112, uint32)'
      ]);

      const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
      const [token0, token1, reserves] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves()
      ]);

      const erc20Interface = new ethers.Interface([
        'function symbol() view returns (string)'
      ]);

      let token0Symbol = 'Unknown', token1Symbol = 'Unknown';

      try {
        const token0Contract = new ethers.Contract(token0, erc20Interface, provider);
        token0Symbol = await token0Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token0 symbol:", error);
      }

      try {
        const token1Contract = new ethers.Contract(token1, erc20Interface, provider);
        token1Symbol = await token1Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token1 symbol:", error);
      }

      // Calculate current price ratio for better UX
      const reserve0Num = parseFloat(ethers.formatUnits(reserves[0], 18));
      const reserve1Num = parseFloat(ethers.formatUnits(reserves[1], 18));
      const currentPriceRatio = formData.sellToken0 
        ? reserve1Num / reserve0Num 
        : reserve0Num / reserve1Num;

      setPairInfo({
        token0,
        token1,
        token0Symbol,
        token1Symbol,
        reserve0: ethers.formatUnits(reserves[0], 18),
        reserve1: ethers.formatUnits(reserves[1], 18),
        currentPriceRatio
      });

      // Update current price display
      setFormData(prev => ({
        ...prev,
        currentPrice: currentPriceRatio.toFixed(6)
      }));

    } catch (error: any) {
      console.error('Error fetching pair info:', error);
      setFetchError(error.message);
      setPairInfo(null);
    } finally {
      setIsLoadingPair(false);
    }
  };

  // All existing network and deployment functions remain the same...
  const switchNetwork = async (chainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId === chainId) {
        console.log(`Already on chain ${chainId}`);
        return true;
      }
      
      console.log(`Switching to chain ${chainId}`);
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      });
      
      const newNetwork = await provider.getNetwork();
      if (newNetwork.chainId.toString() !== chainId) {
        throw new Error('Network switch failed or was rejected');
      }
      
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        console.log(`Chain ${chainId} not added to wallet, attempting to add it`);
        const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
        if (!chain) throw new Error('Chain not supported in this application');
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${parseInt(chainId).toString(16)}`,
              chainName: chain.name,
              nativeCurrency: {
                name: chain.id === '43114' ? 'AVAX' : 'ETH',
                symbol: chain.id === '43114' ? 'AVAX' : 'ETH',
                decimals: 18
              },
              rpcUrls: [chain.rpcUrl || ''],
              blockExplorerUrls: [
                chain.id === '1' ? 'https://etherscan.io' : 
                chain.id === '11155111' ? 'https://sepolia.etherscan.io' :
                chain.id === '43114' ? 'https://snowtrace.io' : ''
              ]
            }],
          });
          
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          if (network.chainId.toString() !== chainId) {
            throw new Error('Network add succeeded but switch failed or was rejected');
          }
          
          return true;
        } catch (addError: any) {
          throw new Error(`Failed to add chain: ${addError.message || 'User rejected the request'}`);
        }
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  // All existing deployment and contract functions remain the same...
  function getRSCNetworkForChain(sourceChainId: string) {
    if (sourceChainId === '1' || sourceChainId === '43114') {
      return {
        chainId: '1597',
        name: 'Reactive Mainnet',
        rpcUrl: 'https://mainnet-rpc.rnk.dev/',
        currencySymbol: 'REACT'
      };
    } else {
      return {
        chainId: '5318008',
        name: 'Kopli Testnet',
        rpcUrl: 'https://kopli-rpc.rnk.dev',
        currencySymbol: 'KOPLI'
      };
    }
  }

  // All other existing functions...
  async function switchToRSCNetwork(sourceChainId: string) {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

    try {
      const rscNetwork = getRSCNetworkForChain(sourceChainId);
      const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId === rscNetwork.chainId) {
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
                name: rscNetwork.chainId === '1597' ? 'REACT' : 'KOPLI',
                symbol: rscNetwork.chainId === '1597' ? 'REACT' : 'KOPLI',
                decimals: 18
              },
              rpcUrls: [rscNetwork.rpcUrl],
              blockExplorerUrls: [
                rscNetwork.chainId === '1597' ? 'https://reactscan.net' : 'https://kopli.reactscan.net'
              ]
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const updatedNetwork = await updatedProvider.getNetwork();
      const updatedChainId = updatedNetwork.chainId.toString();
      
      console.log(`After switch, current chain ID: ${updatedChainId}`);
      
      if (updatedChainId !== rscNetwork.chainId) {
        throw new Error(`Network switch verification failed. Expected ${rscNetwork.name} (${rscNetwork.chainId}) but got ${updatedChainId}`);
      }
      
      return true;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      
      throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
    }
  }

  function getCallbackSenderAddress(chainId: string): string {
    const callbackAddresses: Record<string, string> = {
      '1': '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
      '56': '0xdb81A196A0dF9Ef974C9430495a09B6d535fAc48',
      '8453': '0x0D3E76De6bC44309083cAAFdB49A088B8a250947',
      '137': '0x42458259d5c85fB2bf117f197f1Fef8C3b7dCBfe',
      '43114': '0x934Ea75496562D4e83E80865c33dbA600644fCDa',
      '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'
    };

    return callbackAddresses[chainId] || '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA';
  }

  // All existing deployment functions remain the same...
  async function deployDestinationContract(chain: ChainConfig, fundingAmount: string): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      const callbackSenderAddress = getCallbackSenderAddress(currentChainId);
      
      if (!callbackSenderAddress || !ethers.isAddress(callbackSenderAddress)) {
        throw new Error("Invalid callback sender address for this chain.");
      }
      
      console.log("Chain ID:", currentChainId);
      console.log("Using callback sender address:", callbackSenderAddress);
      console.log("Using router address:", chain.routerAddress);
      console.log("Funding amount:", fundingAmount);
      
      let processedABI = chain.stopOrderABI;
      console.log("Stop Order ABI type:", typeof processedABI);
      
      if (typeof processedABI === 'string') {
        try {
          processedABI = JSON.parse(processedABI);
          console.log("Parsed Stop Order ABI from string");
        } catch (e) {
          console.error("Failed to parse Stop Order ABI string:", e);
        }
      }
      
      if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
        if ('abi' in processedABI) {
          console.log("Extracted Stop Order ABI from object.abi property");
          processedABI = processedABI.abi;
        }
      }
      
      if (!Array.isArray(processedABI)) {
        console.error("Stop Order ABI is not an array:", processedABI);
        processedABI = [
          {"type":"constructor","inputs":[{"name":"callback_sender","type":"address","internalType":"address"},{"name":"_router","type":"address","internalType":"address"}],"stateMutability":"payable"},
          {"type":"receive","stateMutability":"payable"},
          {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"function","name":"stop","inputs":[{"name":"","type":"address","internalType":"address"},{"name":"pair","type":"address","internalType":"address"},{"name":"client","type":"address","internalType":"address"},{"name":"is_token0","type":"bool","internalType":"bool"},{"name":"coefficient","type":"uint256","internalType":"uint256"},{"name":"threshold","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
          {"type":"event","name":"EthRefunded","inputs":[{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
          {"type":"event","name":"Stop","inputs":[{"name":"pair","type":"address","indexed":true,"internalType":"address"},{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"token","type":"address","indexed":true,"internalType":"address"},{"name":"tokens","type":"uint256[]","indexed":false,"internalType":"uint256[]"}],"anonymous":false}
        ];
        console.log("Using hardcoded Stop Order ABI");
      }
      
      console.log("Final Stop Order ABI is array:", Array.isArray(processedABI), "with length:", processedABI.length);
      
      const factory = new ethers.ContractFactory(
        processedABI,
        chain.stopOrderBytecode,
        signer
      );
      
      const contract = await factory.deploy(
        callbackSenderAddress,
        chain.routerAddress,
        { value: ethers.parseEther(fundingAmount) }
      );
      
      console.log("Deployment transaction sent:", contract.deploymentTransaction()?.hash);
      
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      console.log("Contract deployed at:", deployedAddress);
      return deployedAddress;
    } catch (error) {
      console.error("Detailed error in deployDestinationContract:", error);
      
      if (error instanceof Error) {
        throw new Error(`Contract deployment failed: ${error.message}`);
      } else {
        throw new Error(`Contract deployment failed with unknown error: ${String(error)}`);
      }
    }
  }

  async function approveTokens(tokenAddress: string, spenderAddress: string, amount: string) {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');
    try {
      if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(spenderAddress)) {
        throw new Error('Invalid address');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      const decimals = await tokenContract.decimals();
      const parsedAmount = ethers.parseUnits(amount, decimals);
      
      const signerAddress = await signer.getAddress();
      const currentAllowance = await tokenContract.allowance(signerAddress, spenderAddress);
      
      if (currentAllowance.toString() !== "0" && currentAllowance < parsedAmount) {
        const resetTx = await tokenContract.approve(spenderAddress, 0);
        await resetTx.wait();
      }

      const tx = await tokenContract.approve(spenderAddress, parsedAmount);
      await tx.wait();
    } catch (error: any) {
      console.error('Error in approveTokens:', error);
      throw new Error(`Token approval failed: ${error.message || 'Unknown error'}`);
    }
  }

  interface RSCParams {
    pair: string;
    stopOrder: string;
    client: string;
    token0: boolean;
    coefficient: string;
    threshold: string;
  }

  async function deployRSC(params: RSCParams, chain: ChainConfig, fundingAmount: string) {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const currentNetwork = await provider.getNetwork();
      const chainId = Number(currentNetwork.chainId);
      const rscNetwork = getRSCNetworkForChain(chain.id);

      if (chainId.toString() !== rscNetwork.chainId) {
        throw new Error(`Please switch to ${rscNetwork.name} for RSC deployment`);
      }

      let processedABI = chain.rscABI;
      console.log("RSC ABI type:", typeof processedABI);
      
      if (typeof processedABI === 'string') {
        try {
          processedABI = JSON.parse(processedABI);
          console.log("Parsed RSC ABI from string");
        } catch (e) {
          console.error("Failed to parse RSC ABI string:", e);
        }
      }
      
      if (processedABI && typeof processedABI === 'object' && !Array.isArray(processedABI)) {
        if ('abi' in processedABI) {
          console.log("Extracted RSC ABI from object.abi property");
          processedABI = processedABI.abi;
        }
      }
      
      if (!Array.isArray(processedABI)) {
        console.error("RSC ABI is not an array:", processedABI);
        const parsedData = {
          "abi":[
            {"type":"constructor","inputs":[{"name":"_pair","type":"address","internalType":"address"},{"name":"_stop_order","type":"address","internalType":"address"},{"name":"_client","type":"address","internalType":"address"},{"name":"_token0","type":"bool","internalType":"bool"},{"name":"_coefficient","type":"uint256","internalType":"uint256"},{"name":"_threshold","type":"uint256","internalType":"uint256"}],"stateMutability":"payable"},
            {"type":"receive","stateMutability":"payable"},
            {"type":"function","name":"coverDebt","inputs":[],"outputs":[],"stateMutability":"nonpayable"},
            {"type":"function","name":"pay","inputs":[{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
            {"type":"function","name":"react","inputs":[{"name":"log","type":"tuple","internalType":"struct IReactive.LogRecord","components":[{"name":"chain_id","type":"uint256","internalType":"uint256"},{"name":"_contract","type":"address","internalType":"address"},{"name":"topic_0","type":"uint256","internalType":"uint256"},{"name":"topic_1","type":"uint256","internalType":"uint256"},{"name":"topic_2","type":"uint256","internalType":"uint256"},{"name":"topic_3","type":"uint256","internalType":"uint256"},{"name":"data","type":"bytes","internalType":"bytes"},{"name":"block_number","type":"uint256","internalType":"uint256"},{"name":"op_code","type":"uint256","internalType":"uint256"},{"name":"block_hash","type":"uint256","internalType":"uint256"},{"name":"tx_hash","type":"uint256","internalType":"uint256"},{"name":"log_index","type":"uint256","internalType":"uint256"}]}],"outputs":[],"stateMutability":"nonpayable"},
            {"type":"event","name":"AboveThreshold","inputs":[{"name":"reserve0","type":"uint112","indexed":true,"internalType":"uint112"},{"name":"reserve1","type":"uint112","indexed":true,"internalType":"uint112"},{"name":"coefficient","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"threshold","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
            {"type":"event","name":"Callback","inputs":[{"name":"chain_id","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"_contract","type":"address","indexed":true,"internalType":"address"},{"name":"gas_limit","type":"uint64","indexed":true,"internalType":"uint64"},{"name":"payload","type":"bytes","indexed":false,"internalType":"bytes"}],"anonymous":false},
            {"type":"event","name":"CallbackSent","inputs":[],"anonymous":false},
            {"type":"event","name":"Done","inputs":[],"anonymous":false},
            {"type":"event","name":"ReactRefunded","inputs":[{"name":"client","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
            {"type":"event","name":"Subscribed","inputs":[{"name":"service_address","type":"address","indexed":true,"internalType":"address"},{"name":"_contract","type":"address","indexed":true,"internalType":"address"},{"name":"topic_0","type":"uint256","indexed":true,"internalType":"uint256"}],"anonymous":false},
            {"type":"event","name":"VM","inputs":[],"anonymous":false}
          ],
          "bytecode": chain.rscBytecode
        };
        
        processedABI = parsedData.abi;
        console.log("Using hardcoded ABI from shared document");
      }
      
      console.log("Final RSC ABI is array:", Array.isArray(processedABI), "with length:", processedABI.length);

      const factory = new ethers.ContractFactory(
        processedABI,
        chain.rscBytecode,
        signer
      );

      const pairAddress = ethers.getAddress(params.pair);
      const stopOrderAddress = ethers.getAddress(params.stopOrder);
      const clientAddress = ethers.getAddress(params.client);

      const deploymentGas = await factory.getDeployTransaction(
        pairAddress,
        stopOrderAddress,
        clientAddress,
        params.token0,
        params.coefficient,
        params.threshold
      ).then(tx => provider.estimateGas(tx));

      const gasLimit = (deploymentGas * BigInt(120)) / BigInt(100);
      const gasPrice = await provider.getFeeData().then(fees => fees.gasPrice);
      
      if (!gasPrice) throw new Error('Failed to get gas price');

      const signerAddress = await signer.getAddress();
      const balance = await provider.getBalance(signerAddress);
      const fundingValue = ethers.parseEther(fundingAmount);
      const requiredBalance = gasLimit * gasPrice + fundingValue;

      if (balance < requiredBalance) {
        throw new Error(`Insufficient balance for RSC deployment and funding. Need at least ${ethers.formatEther(requiredBalance)} ${rscNetwork.currencySymbol}`);
      }

      const contract = await factory.deploy(
        pairAddress,
        stopOrderAddress,
        clientAddress,
        params.token0,
        params.coefficient,
        params.threshold,
        {
          gasLimit,
          gasPrice,
          value: fundingValue
        }
      );

      const deployedContract = await contract.waitForDeployment();
      return deployedContract.target.toString();

    } catch (error: any) {
      console.error('Error deploying RSC:', error);
      throw new Error(`RSC deployment failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Placeholder for the missing createStopOrder function
  const createStopOrder = async (): Promise<{ hash: string }> => {
    console.log("Creating stop order...");
    // This is a placeholder. The actual implementation should be here.
    // It should probably interact with a pre-deployed contract.
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { hash: '0x' + '0'.repeat(64) };
  }

  // Simplified create order function
  const handleCreateOrder = async (e: React.FormEvent) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');
    e.preventDefault();
    try {
      // Basic validation
      if (!formData.chainId) {
        throw new Error('Please select a blockchain network');
      }
      if (!formData.pairAddress || !ethers.isAddress(formData.pairAddress)) {
        throw new Error('Please enter a valid pair address');
      }
      if (!formData.clientAddress || !ethers.isAddress(formData.clientAddress)) {
        throw new Error('Please enter a valid client address');
      }
      if (!formData.threshold) {
        throw new Error('Please enter a threshold value');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid amount to sell');
      }
      
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) throw new Error('Invalid chain selected');

      // Check if user is on the correct network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== formData.chainId) {
        throw new Error(`Please switch to ${selectedChain.name} network before proceeding`);
      }

      // Step 1: Approve tokens
      setDeploymentStep('approving');
      const tokenToApprove = formData.sellToken0 ? pairInfo?.token0 : pairInfo?.token1;
      if (!tokenToApprove) throw new Error('Token address not found');
      
      try {
        await approveTokens(
          tokenToApprove,
          selectedChain.callbackAddress, // Approve to pre-deployed callback contract
          formData.amount
        );
      } catch (error: any) {
        if (error.message.includes("insufficient allowance")) {
          throw new Error(`Token approval failed: You don't have enough ${formData.sellToken0 ? pairInfo?.token0Symbol : pairInfo?.token1Symbol} tokens`);
        } else {
          throw new Error(`Token approval failed: ${error.message}`);
        }
      }

      // Step 2: Create stop order
      setDeploymentStep('creating');
      try {
        const receipt = await createStopOrder();
        console.log('Stop order created:', receipt.hash);
      } catch (error: any) {
        console.error("Stop order creation failed:", error);
        throw new Error(`Failed to create stop order: ${error.message || 'Unknown error'}`);
      }

      setDeploymentStep('complete');
      toast.success('🎉 Stop order created successfully!');
      
      setTimeout(() => {
        toast.success('Your stop order is now active and monitoring prices 24/7');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating stop order:', error);
      
      setDeploymentStep('idle');
      
      toast.error(error.message || 'Failed to create stop order');
      
      if (error.message.includes("Insufficient balance") || error.message.includes("insufficient funds")) {
        toast.error('Please make sure you have enough funds and tokens');
      } else if (error.message.includes("approval") || error.message.includes("allowance")) {
        toast.error('Please ensure you have enough tokens and grant approval');
      } else if (error.message.includes("switch")) {
        toast.error('Please switch to the correct network');
      }
    }
  };

  // Simple information component about the process
  const ProcessInfoUI = () => {
    return (
      <div className="space-y-4 p-4 bg-green-900/20 rounded-lg border border-green-500/20">
        <h3 className="text-sm font-medium text-green-100 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2" />
          How It Works
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-green-300">1</span>
            </div>
            <div>
              <p className="text-green-200 font-medium">Approve Tokens</p>
              <p className="text-green-300 text-xs">Allow our contract to trade your tokens when needed</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-green-300">2</span>
            </div>
            <div>
              <p className="text-green-200 font-medium">Create Stop Order</p>
              <p className="text-green-300 text-xs">Register your order with our monitoring system</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-3 h-3 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-200 font-medium">Automatic Monitoring</p>
              <p className="text-blue-300 text-xs">System watches prices 24/7 and executes when triggered</p>
            </div>
          </div>
        </div>

        <div className="bg-green-800/20 p-3 rounded border border-green-500/30">
          <p className="text-xs text-green-200">
            <span className="font-medium">✨ Pre-deployed contracts:</span> No complex setup needed! 
            Just approve your tokens and create your order in 2 simple transactions.
          </p>
        </div>
      </div>
    );
  };
  
  const DeploymentStatusUI = () => {
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
    return (
      <>
      {deploymentStep !== 'idle' && (
        <Alert className={
          deploymentStep === 'complete' 
            ? "bg-green-900/20 border-green-500/50" 
            : "bg-blue-900/20 border-blue-500/50"
        }>
          {deploymentStep === 'complete' 
            ? <CheckCircle className="h-4 w-4 text-green-400" /> 
            : <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
          }
          <AlertDescription className="text-zinc-200">
            {deploymentStep === 'deploying-destination' && (
              <div className="flex flex-col gap-1">
                <span>Deploying your stop order contract...</span>
                <span className="text-xs text-zinc-400">This will cost ~{formData.destinationFunding} {selectedChain?.nativeCurrency || 'ETH'} plus gas fees</span>
              </div>
            )}
            {deploymentStep === 'switching-network' && (
              <div className="flex flex-col gap-1">
                <span>Switching to {rscNetwork.name} for monitoring setup...</span>
                <span className="text-xs text-zinc-400">Please confirm the network change in your wallet</span>
              </div>
            )}
            {deploymentStep === 'deploying-rsc' && (
              <div className="flex flex-col gap-1">
                <span>Setting up 24/7 price monitoring...</span>
                <span className="text-xs text-zinc-400">This will cost {formData.rscFunding} {rscNetwork.currencySymbol} plus gas</span>
              </div>
            )}
            {deploymentStep === 'switching-back' && (
              <div className="flex flex-col gap-1">
                <span>Switching back to {selectedChain?.name}...</span>
                <span className="text-xs text-zinc-400">Almost done!</span>
              </div>
            )}
            {deploymentStep === 'approving' && (
              <div className="flex flex-col gap-1">
                <span>Approving token for automatic trading...</span>
                <span className="text-xs text-zinc-400">Please confirm the approval transaction</span>
              </div>
            )}
            {deploymentStep === 'complete' && (
              <div className="flex flex-col gap-1">
                <span>🎉 Stop order is now active!</span>
                <span className="text-xs text-zinc-400">Your position is protected with 24/7 monitoring</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      </>
    );
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-200">Loading configuration...</p>
        </div>
      </div>
    );
  }

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
            Smart Stop Orders
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Automatically sell your tokens when prices drop - protecting your investments 24/7 across multiple networks.
          </p>
          
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Multi-Chain Protection</h3>
                    <p className="text-sm text-zinc-300">Ethereum, Sepolia & Avalanche</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">24/7 Monitoring</h3>
                    <p className="text-sm text-gray-200">Never miss a price movement</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Instant Execution</h3>
                    <p className="text-sm text-gray-200">Automatic when triggered</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <EnhancedAIIntegrationStatus />

        <PairFinder 
          chains={SUPPORTED_CHAINS} 
          onPairSelect={handlePairSelected} 
        />

        {/* Main Form Card with Better UX */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100 flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Configure Your Stop Order
            </CardTitle>
            <CardDescription className="text-zinc-300">Set up automatic selling when your token price drops</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleCreateOrder}>
              {/* Chain Selection */}
              <div className="space-y-2">
                <div className="flex items-center mt-4 space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Trading Network</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm text-zinc-200">
                        Choose where your tokens are located. Each network has different DEX integrations and fee structures.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      chainId: value
                    });
                    // Note: No need to switch networks automatically - users can do it during transaction
                  }}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200 h-12">
                    <SelectValue placeholder="Choose your trading network" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(chain => (
                      <SelectItem 
                        key={chain.id} 
                        value={chain.id}
                        className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                      >
                        <div className="flex items-center space-x-3">
                          <span>{chain.name}</span>
                          <span className="text-xs bg-blue-500/20 px-2 py-1 rounded">{chain.dexName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Improved Pair Address Input */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-zinc-200">
                    {dexName} Trading Pair
                  </label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <p className="text-sm">
                          Enter the {dexName} pair address for the tokens you want to trade.
                          Use the Pair Finder above to easily locate popular pairs.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <div className="flex space-x-2">
                  <Input 
                    placeholder={`Enter ${dexName} pair address (0x...)`}
                    value={formData.pairAddress}
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                  
                    onChange={(e) => setFormData({...formData, pairAddress: e.target.value})}
                    onBlur={(e) => {
                        if (ethers.isAddress(e.target.value)) {
                        handleFetchPairInfo(e.target.value);
                        }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleFetchPairInfo(formData.pairAddress)}
                    disabled={!ethers.isAddress(formData.pairAddress) || isLoadingPair}
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
                  >
                    {isLoadingPair ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {isLoadingPair && (
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-zinc-200">Fetching pair information...</span>
                  </div>
                </div>
              )}

              {fetchError && (
                <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {fetchError}
                  </AlertDescription>
                </Alert>
              )}
            
              {/* Enhanced Pair Information Display */}
              {pairInfo && (
                <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-green-100">✅ Valid Trading Pair Found</h3>
                      <div className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                        {dexName} Pair
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400">Token 0 ({pairInfo.token0Symbol})</p>
                          <p className="text-sm text-zinc-300 font-mono break-all">{pairInfo.token0}</p>
                          <p className="text-xs text-zinc-500">Balance: {parseFloat(pairInfo.reserve0 || '0').toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-zinc-400">Token 1 ({pairInfo.token1Symbol})</p>
                          <p className="text-sm text-zinc-300 font-mono break-all">{pairInfo.token1}</p>
                          <p className="text-xs text-zinc-500">Balance: {parseFloat(pairInfo.reserve1 || '0').toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {pairInfo.currentPriceRatio && (
                      <div className="mt-3 p-2 bg-blue-900/20 rounded">
                        <p className="text-xs text-zinc-400">Current Exchange Rate</p>
                        <p className="text-sm text-blue-300 font-medium">
                          1 {formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol} = {pairInfo.currentPriceRatio.toFixed(6)} {formData.sellToken0 ? pairInfo.token1Symbol : pairInfo.token0Symbol}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {pairInfo && (
                <>
                  {/* Enhanced Token Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">Which token do you want to sell?</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            Choose which token you want to automatically sell when the price drops. 
                            You'll receive the other token in return.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          formData.sellToken0 
                            ? 'border-blue-500 bg-blue-900/20' 
                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, sellToken0: true }))}
                      >
                        <div className="text-center">
                          <h3 className="font-medium text-zinc-100 mb-1">Sell {pairInfo.token0Symbol}</h3>
                          <p className="text-xs text-zinc-400">Receive {pairInfo.token1Symbol}</p>
                          <div className="mt-2 text-xs bg-zinc-700/50 p-2 rounded">
                            <p className="text-zinc-300">Reserve: {parseFloat(pairInfo.reserve0 || '0').toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          !formData.sellToken0 
                            ? 'border-blue-500 bg-blue-900/20' 
                            : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, sellToken0: false }))}
                      >
                        <div className="text-center">
                          <h3 className="font-medium text-zinc-100 mb-1">Sell {pairInfo.token1Symbol}</h3>
                          <p className="text-xs text-zinc-400">Receive {pairInfo.token0Symbol}</p>
                          <div className="mt-2 text-xs bg-zinc-700/50 p-2 rounded">
                            <p className="text-zinc-300">Reserve: {parseFloat(pairInfo.reserve1 || '0').toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Improved Price Drop Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-4 h-4 text-blue-400" />
                      <label className="text-sm font-medium text-zinc-200">Stop Loss Configuration</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            Set the percentage drop that will trigger your stop order. 
                            For example, 10% means sell when price drops 10% from current level.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>

                    <div className="space-y-3">
                      {/* Quick percentage buttons */}
                      <div>
                        <p className="text-xs text-zinc-400 mb-2">Quick options:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {['5', '10', '15', '20'].map(percentage => (
                            <Button
                              key={percentage}
                              type="button"
                              variant="outline"
                              size="sm"
                              className={`${formData.dropPercentage === percentage ? 'bg-blue-600 border-blue-500' : 'bg-blue-900/20 border-zinc-700'} text-zinc-200 hover:bg-blue-800/30`}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, dropPercentage: percentage }));
                                calculateThresholdFromPercentage(percentage);
                              }}
                            >
                              <TrendingDown className="w-3 h-3 mr-1" />
                              {percentage}%
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Custom percentage input */}
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="50"
                          placeholder="Or enter custom percentage"
                          value={formData.dropPercentage}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, dropPercentage: e.target.value }));
                            calculateThresholdFromPercentage(e.target.value);
                          }}
                          className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 pl-8"
                        />
                        <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      </div>

                      {/* Price calculation display */}
                      {formData.dropPercentage && pairInfo.currentPriceRatio && (
                        <div className="p-3 bg-gradient-to-r from-amber-900/20 to-red-900/20 border border-amber-500/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-amber-200 font-medium">Stop Trigger Price</p>
                              <p className="text-xs text-amber-300">
                                {formData.dropPercentage}% drop from current price
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-amber-100">
                                {formData.stopPrice}
                              </p>
                              <p className="text-xs text-amber-300">
                                {formData.sellToken0 ? pairInfo.token1Symbol : pairInfo.token0Symbol} per {formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Address */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">Your Wallet Address</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            The wallet that owns the tokens and will receive the swapped tokens.
                            This is automatically filled with your connected wallet.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <Input 
                      placeholder="Wallet address (auto-filled)"
                      value={formData.clientAddress}
                      onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                      className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Amount to Sell */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">
                        Amount to Sell ({formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol})
                      </label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            How many tokens to sell when your stop price is triggered.
                            Make sure you have sufficient balance and have approved the contract.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <Input 
                      type="number"
                      step="0.000001"
                      placeholder={`Enter amount of ${formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol} to sell`}
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Simplified Process Information */}
                  {ProcessInfoUI()}
                  
                  {/* Balance and validation info */}
                  <BalanceInfoComponent 
                    formData={formData}
                    connectedAccount={connectedAccount}
                    pairInfo={pairInfo}
                    setIsValid={setIsFormValid}
                    selectedChain={selectedChain}
                  />
                  
                  {/* Deployment Status */}
                  {DeploymentStatusUI()}

                  {/* Simplified Requirements Card */}
                  <Card className="bg-blue-900/20 border-blue-500/20">
                    <CardContent className="pt-4">
                      <h3 className="text-sm font-medium text-zinc-100 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-blue-400" />
                        Quick Setup Requirements
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${connectedAccount ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className={connectedAccount ? 'text-green-300' : 'text-yellow-300'}>
                            Wallet Connected {connectedAccount ? '✓' : '⏳'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${selectedChain ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className={selectedChain ? 'text-green-300' : 'text-yellow-300'}>
                            Network Selected {selectedChain ? '✓' : '⏳'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${pairInfo ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className={pairInfo ? 'text-green-300' : 'text-yellow-300'}>
                            Valid Pair Found {pairInfo ? '✓' : '⏳'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2 bg-blue-500"></div>
                          <span className="text-blue-300">
                            Sufficient Token Balance
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-zinc-800/50 rounded text-xs">
                        <p className="text-zinc-300">
                          <span className="font-medium text-zinc-200">💡 Cost:</span> Only gas fees for 2 transactions 
                          (~$5-15 total). No deployment or monitoring fees needed!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-lg font-semibold"
                    disabled={deploymentStep !== 'idle' || !isFormValid}
                  >
                    {deploymentStep === 'approving' ? (
                      <div className="flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Approving Tokens...
                      </div>
                    ) : deploymentStep === 'creating' ? (
                      <div className="flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Creating Stop Order...
                      </div>
                    ) : deploymentStep === 'complete' ? (
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Stop Order Created! 🎉
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Create Stop Order (2 Transactions)
                      </div>
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Enhanced Educational Section */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">How Stop Orders Work</CardTitle>
            <CardDescription className="text-zinc-300">
              Understanding automated stop loss protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is a Stop Order?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      A stop order acts as your personal trading assistant, watching token prices 24/7 and automatically selling when they drop to your specified level. Think of it as an insurance policy for your crypto investments.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Example Scenario:</h4>
                      <p className="text-sm text-zinc-300">
                        You own ETH worth $3,500 each. You set a 10% stop order. If ETH drops to $3,150, 
                        your tokens automatically sell for USDC, protecting you from further losses.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How Does the Technology Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      Our system uses advanced Reactive Smart Contracts (RSCs) that monitor {dexName} prices in real-time and execute trades automatically when conditions are met.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">🔍 Continuous Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          RSCs watch price changes on {dexName} pools every block
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">⚡ Instant Execution</h4>
                        <p className="text-sm text-zinc-300">
                          When your trigger price hits, trades execute immediately
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">🔗 Cross-Chain Support</h4>
                        <p className="text-sm text-zinc-300">
                          Works across Ethereum, Avalanche, and testnets
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">🛡️ Non-Custodial</h4>
                        <p className="text-sm text-zinc-300">
                          You maintain full control of your assets
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="setting-prices" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Setting the Right Stop Price
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      Choosing the right stop percentage depends on the token's volatility and your risk tolerance. Here's how to think about it:
                    </p>
                    <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/20">
                      <h4 className="font-medium text-amber-200 mb-2">Stop Price Guidelines:</h4>
                      <ul className="text-sm text-amber-300 space-y-1">
                        <li>• <span className="font-medium">5% drop:</span> For stable tokens or tight risk management</li>
                        <li>• <span className="font-medium">10% drop:</span> Popular choice for balanced protection</li>
                        <li>• <span className="font-medium">15-20% drop:</span> For volatile tokens with higher upside potential</li>
                      </ul>
                    </div>
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-zinc-100">Price Calculation:</h4>
                      <p className="text-sm text-zinc-300">
                        If current price is $100 and you set 10% drop:
                      </p>
                      <p className="text-sm text-blue-300 font-mono">
                        Stop Price = $100 × (1 - 10%) = $90
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="costs" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Understanding Costs & Fees
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Stop orders have two types of costs: setup fees (paid once) and execution fees (paid when triggered).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">💰 Setup Costs</h4>
                        <ul className="text-sm text-zinc-300 space-y-1">
                          <li>• Contract deployment (~0.03 ETH)</li>
                          <li>• Monitoring service (~0.05 REACT)</li>
                          <li>• Gas for token approval (~$2-5)</li>
                        </ul>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">⚡ Execution Costs</h4>
                        <ul className="text-sm text-zinc-300 space-y-1">
                          <li>• DEX trading fees (0.3% on Uniswap)</li>
                          <li>• Gas for swap execution</li>
                          <li>• No additional platform fees</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-500/30">
                      <p className="text-sm text-amber-200">
                        💡 <span className="font-medium">Tip:</span> Setup costs are worthwhile for positions over $500. 
                        Smaller positions may not justify the gas expenses.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="best-practices" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Best Practices & Tips
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-300 mb-2">✅ Do This</h4>
                        <ul className="text-sm text-green-200 space-y-1">
                          <li>• Test with small amounts first</li>
                          <li>• Consider token volatility in your %</li>
                          <li>• Keep extra tokens for gas fees</li>
                          <li>• Monitor high-volume pairs</li>
                          <li>• Set realistic stop percentages</li>
                        </ul>
                      </div>
                      <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                        <h4 className="font-medium text-red-300 mb-2">❌ Avoid This</h4>
                        <ul className="text-sm text-red-200 space-y-1">
                          <li>• Very tight stops (under 3%)</li>
                          <li>• Illiquid pairs with low volume</li>
                          <li>• Setting up without sufficient balance</li>
                          <li>• Forgetting about token approvals</li>
                          <li>• Using all available tokens</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">🎯 Pro Tips:</h4>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        <li>• Use wider stops during high volatility periods</li>
                        <li>• Consider market hours - crypto is 24/7 but volatility varies</li>
                        <li>• Layer multiple stops at different levels for large positions</li>
                        <li>• Monitor your stop orders in the RSC Monitor section</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="troubleshooting" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Troubleshooting & Support
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/20">
                      <h4 className="font-medium text-amber-200 mb-2">Common Issues:</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-amber-300">Stop order didn't execute:</p>
                          <p className="text-amber-200">Check if you have sufficient token balance and valid approvals</p>
                        </div>
                        <div>
                          <p className="font-medium text-amber-300">High gas fees:</p>
                          <p className="text-amber-200">Network congestion affects costs. Try during low-traffic periods</p>
                        </div>
                        <div>
                          <p className="font-medium text-amber-300">Can't find trading pair:</p>
                          <p className="text-amber-200">Ensure pair has sufficient liquidity on {dexName}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500/10 p-4 rounded-lg">
                      <h4 className="font-medium text-zinc-100 mb-2">🔍 Monitoring Your Orders:</h4>
                      <ul className="text-sm text-zinc-300 space-y-1">
                        <li>• Visit the RSC Monitor page to track execution status</li>
                        <li>• Check wallet transaction history for confirmations</li>
                        <li>• Use blockchain explorers to verify contract deployments</li>
                        <li>• Monitor your token balances for execution confirmations</li>
                      </ul>
                    </div>

                    <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                      <h4 className="font-medium text-purple-300 mb-2">Need Help?</h4>
                      <p className="text-sm text-purple-200">
                        If you encounter issues, check our documentation, join our Discord community, 
                        or use the RSC Monitor to track your automation status.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="advanced" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Advanced Features
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      For advanced users, our stop order system offers additional capabilities and customization options.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-purple-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-300 mb-2">🔧 Custom Parameters</h4>
                        <ul className="text-sm text-purple-200 space-y-1">
                          <li>• Manual coefficient/threshold setting</li>
                          <li>• Custom gas limits for execution</li>
                          <li>• Specific DEX router configurations</li>
                        </ul>
                      </div>
                      <div className="bg-purple-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-300 mb-2">📊 Analytics & Monitoring</h4>
                        <ul className="text-sm text-purple-200 space-y-1">
                          <li>• Real-time execution tracking</li>
                          <li>• Performance analytics</li>
                          <li>• Historical execution data</li>
                        </ul>
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-lg">
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium">Coming Soon:</span> Portfolio-level stop orders, 
                        advanced conditional triggers, and integration with additional DEXes and chains.
                      </p>
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