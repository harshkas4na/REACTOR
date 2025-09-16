'use client';
import { ethers } from 'ethers';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';
import stopOrderABIBaseMainnet from '@/data/automations/stop-order/stopOrderABIBaseMainnet.json';
import rscABIBaseMainnet from '@/data/automations/stop-order/RSCABIBaseMainnet.json';
import { 
  CheckCircle, 
  X, 
  RefreshCw, 
  TrendingDown, 
  AlertCircle,
  Target,
  Activity,
  Plus,
  Eye,
  Loader2,
  ExternalLink,
  Layers,
  Clock,
  Shield,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Info,
  Wallet,
  DollarSign,
  Zap,
  Settings,
  Download,
  ChevronDown,
  ChevronUp,
  Pause,
  Play
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ===== DYNAMIC CONTRACT ABI SELECTION =====
const getContractABIs = (chainId: string) => {
  if (chainId === '8453') { // Base Mainnet
    return {
      REACTIVE_STOP_ORDER_ABI: rscABIBaseMainnet,
      CALLBACK_CONTRACT_ABI: stopOrderABIBaseMainnet
    };
  } else { // Sepolia (default)
    return {
      REACTIVE_STOP_ORDER_ABI: rscABISepolia,
      CALLBACK_CONTRACT_ABI: stopOrderABISepolia
    };
  }
};

// ===== CONFIGURATION =====
interface ChainConfig {
  id: string;
  name: string;
  dexName: string;
  routerAddress: string;
  factoryAddress: string;
  callbackAddress: string;
  rpcUrl?: string;
  nativeCurrency: string;
  defaultFunding: string;
  isComingSoon?: boolean;
  rscNetwork: {
    chainId: string;
    name: string;
    rpcUrl: string;
    currencySymbol: string;
    explorerUrl: string;
    callbackProxyAddress: string;
    systemContractAddress: string;
  };
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '8453', 
    name: 'Base Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    factoryAddress: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    callbackAddress: '0x0D3E76De6bC44309083cAAFdB49A088B8a250947', 
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: 'ETH',
    defaultFunding: '0.0003',
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net/',
      callbackProxyAddress: '0x0D3E76De6bC44309083cAAFdB49A088B8a250947', 
      systemContractAddress: '0x0000000000000000000000000000000000fffFfF'
    }
  },
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    factoryAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
    callbackAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03',
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net',
      callbackProxyAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
      systemContractAddress: '0x0000000000000000000000000000000000fffFfF'
    }
  }
];

// ===== CONTRACT ADDRESS MANAGEMENT =====
interface UserContractAddresses {
  reactiveContract: string;
  callbackContract: string;
  deployedAt: number;
  chainId: string;
  deployer: string;
}

const PAIR_ABI = [
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {"internalType": "uint112", "name": "_reserve0", "type": "uint112"},
      {"internalType": "uint112", "name": "_reserve1", "type": "uint112"},
      {"internalType": "uint32", "name": "_blockTimestampLast", "type": "uint32"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

// ===== INTERFACES =====
enum OrderStatus {
  Active = 0,
  Paused = 1,
  Cancelled = 2,
  Executed = 3,
  Failed = 4
}

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
}

interface StopOrder {
  id: number;
  pair: string;
  client: string;
  tokenSell: string;
  tokenBuy: string;
  amount: string;
  sellToken0: boolean;
  coefficient: string;
  threshold: string;
  status: OrderStatus;
  createdAt: number;
  executedAt: number;
  // Derived fields
  tokenSellInfo?: Token;
  tokenBuyInfo?: Token;
  currentPrice?: string;
  dropPercentage?: number;
  triggerPrice?: string;
  contractAddress?: string;
}

interface ContractBalances {
  callbackBalance: string;
  rscBalance: string;
  isLoading: boolean;
  lastUpdated: number;
}

// ===== UTILITY FUNCTIONS =====
const formatTokenBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
};

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  const days = Math.floor(diff / (60 * 60 * 24));
  const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const getExplorerUrl = (address: string, chainId: string, type: 'address' | 'tx' = 'address', connectedAccount?: string): string => {
  const explorers: Record<string, string> = {
    '1': 'https://etherscan.io',
    '8453': 'https://basescan.org',
    '11155111': 'https://sepolia.etherscan.io',
    '5318007': 'https://lasna.reactscan.net',
    '1597': 'https://reactscan.net',
  };
  
  const baseUrl = explorers[chainId];
  if (!baseUrl) return '#';

  // Special handling for Reactive network
  if (chainId === '5318007' || chainId === '1597') {
    if (type === 'address' && connectedAccount) {
      return `${baseUrl}/address/${connectedAccount}/contract/${address}`;
    }
    return `${baseUrl}/${type}/${address}`;
  }
  
  return `${baseUrl}/${type}/${address}`;
};

// ===== STATUS CONFIGURATION =====
const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Activity
  },
  [OrderStatus.Paused]: {
    label: 'Paused',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: Pause
  },
  [OrderStatus.Executed]: {
    label: 'Executed',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: CheckCircle
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: X
  },
  [OrderStatus.Failed]: {
    label: 'Failed',
    color: 'text-red-300',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: AlertCircle
  }
};

// ===== CONTRACT VALIDATION =====
const validateStoredContracts = async (
  contracts: UserContractAddresses,
  rscProvider: ethers.JsonRpcProvider,
  callbackProvider: ethers.JsonRpcProvider,
  userAddress: string
): Promise<boolean> => {
  try {
    console.log('DASHBOARD: Validating personal contracts:', contracts);
    
    const normalizedUserAddress = userAddress.toLowerCase().trim();
    const normalizedContractDeployer = contracts.deployer.toLowerCase().trim();
    
    console.log('DASHBOARD: Contract validation successful');
    return true;
  } catch (error) {
    console.error('DASHBOARD: Contract validation failed:', error);
    return false;
  }
};

// ===== CONTRACT BALANCE MANAGEMENT COMPONENT =====
const ContractBalanceManager = ({ 
  userContracts, 
  connectedChain, 
  onBalanceUpdate,
  connectedAccount 
}: {
  userContracts: UserContractAddresses;
  connectedChain: ChainConfig;
  onBalanceUpdate: (balances: ContractBalances) => void;
  connectedAccount: string;
}) => {
  const [balances, setBalances] = useState<ContractBalances>({
    callbackBalance: '0',
    rscBalance: '0',
    isLoading: true,
    lastUpdated: 0
  });
  const [isFunding, setIsFunding] = useState<{ callback: boolean; rsc: boolean }>({
    callback: false,
    rsc: false
  });
  const [isWithdrawing, setIsWithdrawing] = useState<{ callback: boolean; rsc: boolean }>({
    callback: false,
    rsc: false
  });

  const MIN_CALLBACK_BALANCE = userContracts.chainId === '8453' ? 0.001 : 0.001;
  const MIN_RSC_BALANCE = 0.001;

  const [callbackFundingAmount, setCallbackFundingAmount] = useState(userContracts.chainId === '8453' ? '0.005' : '0.01');
  const [rscFundingAmount, setRscFundingAmount] = useState('0.1');
  const [withdrawalAmounts, setWithdrawalAmounts] = useState({
    callback: '',
    rsc: ''
  });

  const [showFundingOptions, setShowFundingOptions] = useState(false);
  const [showWithdrawalOptions, setShowWithdrawalOptions] = useState(false);

  const fetchBalances = useCallback(async () => {
    try {
      setBalances(prev => ({ ...prev, isLoading: true }));

      const callbackRpcUrl = userContracts.chainId === '8453' 
        ? 'https://mainnet.base.org'
        : 'https://ethereum-sepolia-rpc.publicnode.com';
      
      const callbackProvider = new ethers.JsonRpcProvider(callbackRpcUrl);
      const callbackBalance = await callbackProvider.getBalance(userContracts.callbackContract);
      const callbackBalanceFormatted = ethers.formatEther(callbackBalance);

      const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
      const rscBalance = await rscProvider.getBalance(userContracts.reactiveContract);
      const rscBalanceFormatted = ethers.formatEther(rscBalance);

      const newBalances = {
        callbackBalance: callbackBalanceFormatted,
        rscBalance: rscBalanceFormatted,
        isLoading: false,
        lastUpdated: Date.now()
      };

      setBalances(newBalances);
      onBalanceUpdate(newBalances);
    } catch (error) {
      console.error('Error fetching contract balances:', error);
      setBalances(prev => ({ ...prev, isLoading: false }));
    }
  }, [userContracts, connectedChain, onBalanceUpdate]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const switchNetwork = async (targetChainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

    try {
      const targetChainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      }); 
    } catch (error: any) {
      if (error.code === 4902) {
        let chainConfig;
        
        if (targetChainId === '5318007') {
          chainConfig = {
            chainId: `0x${parseInt(targetChainId).toString(16)}`,
            chainName: 'Reactive Lasna',
            nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
            rpcUrls: ['https://lasna-rpc.rnk.dev/'],
            blockExplorerUrls: ['https://lasna.reactscan.net'],
          };
        } else if (targetChainId === '1597') {
          chainConfig = {
            chainId: `0x${parseInt(targetChainId).toString(16)}`,
            chainName: 'Reactive Mainnet',
            nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
            rpcUrls: ['https://mainnet-rpc.rnk.dev/'],
            blockExplorerUrls: ['https://reactscan.net'],
          };
        } else if (targetChainId === '8453') {
          chainConfig = {
            chainId: `0x${parseInt(targetChainId).toString(16)}`,
            chainName: 'Base',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          };
        }

        if (chainConfig) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
        }
      }
      throw error;
    }
  };

  const handleFundCallback = async () => {
    try {
      if (!callbackFundingAmount || parseFloat(callbackFundingAmount) <= 0) {
        toast.error('Please enter a valid funding amount');
        return;
      }

      setIsFunding(prev => ({ ...prev, callback: true }));
      
      await switchNetwork(userContracts.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: userContracts.callbackContract,
        value: ethers.parseEther(callbackFundingAmount),
      });
      
      await tx.wait();
      const networkName = userContracts.chainId === '8453' ? 'Base' : 'Sepolia';
      toast.success(`Callback contract funded with ${callbackFundingAmount} ETH on ${networkName}`);
      await fetchBalances();
    } catch (error: any) {
      console.error('Error funding callback contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to fund callback contract');
      }
    } finally {
      setIsFunding(prev => ({ ...prev, callback: false }));
    }
  };

  const handleFundRSC = async () => {
    try {
      if (!rscFundingAmount || parseFloat(rscFundingAmount) <= 0) {
        toast.error('Please enter a valid funding amount');
        return;
      }

      setIsFunding(prev => ({ ...prev, rsc: true }));
      
      await switchNetwork(connectedChain.rscNetwork.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: userContracts.reactiveContract,
        value: ethers.parseEther(rscFundingAmount),
      });
      
      await tx.wait();
      toast.success(`RSC contract funded with ${rscFundingAmount} REACT`);
      await fetchBalances();
    } catch (error: any) {
      console.error('Error funding RSC contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to fund RSC contract');
      }
    } finally {
      setIsFunding(prev => ({ ...prev, rsc: false }));
    }
  };

  const handleWithdrawCallback = async (withdrawAll: boolean = false) => {
    try {
      if (!withdrawAll && (!withdrawalAmounts.callback || parseFloat(withdrawalAmounts.callback) <= 0)) {
        toast.error('Please enter a valid withdrawal amount');
        return;
      }

      const availableBalance = parseFloat(balances.callbackBalance);
      const withdrawAmount = withdrawAll ? availableBalance : parseFloat(withdrawalAmounts.callback);

      if (withdrawAmount > availableBalance) {
        toast.error('Withdrawal amount exceeds available balance');
        return;
      }

      const networkName = userContracts.chainId === '8453' ? 'Base' : 'Sepolia';
      if (!confirm(`Are you sure you want to withdraw ${withdrawAll ? 'all' : withdrawAmount} ETH from the ${networkName} callback contract?`)) {
        return;
      }

      setIsWithdrawing(prev => ({ ...prev, callback: true }));
      
      await switchNetwork(userContracts.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(userContracts.chainId);
      
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        signer
      );

      let tx;
      if (withdrawAll) {
        tx = await callbackContract.withdrawAllETH(await signer.getAddress());
      } else {
        tx = await callbackContract.withdrawETH(await signer.getAddress(), ethers.parseEther(withdrawAmount.toString()));
      }
      
      await tx.wait();
      toast.success(`Successfully withdrew ${withdrawAll ? 'all' : withdrawAmount} ETH from ${networkName} callback contract`);
      setWithdrawalAmounts(prev => ({ ...prev, callback: '' }));
      await fetchBalances();
    } catch (error: any) {
      console.error('Error withdrawing from callback contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('Only owner')) {
        toast.error('Only the contract owner can withdraw funds');
      } else {
        toast.error('Failed to withdraw from callback contract');
      }
    } finally {
      setIsWithdrawing(prev => ({ ...prev, callback: false }));
    }
  };

  const handleWithdrawRSC = async (withdrawAll: boolean = false) => {
    try {
      if (!withdrawAll && (!withdrawalAmounts.rsc || parseFloat(withdrawalAmounts.rsc) <= 0)) {
        toast.error('Please enter a valid withdrawal amount');
        return;
      }

      const availableBalance = parseFloat(balances.rscBalance);
      const withdrawAmount = withdrawAll ? availableBalance : parseFloat(withdrawalAmounts.rsc);

      if (withdrawAmount > availableBalance) {
        toast.error('Withdrawal amount exceeds available balance');
        return;
      }

      if (!confirm(`Are you sure you want to withdraw ${withdrawAll ? 'all' : withdrawAmount} REACT from the RSC contract?`)) {
        return;
      }

      setIsWithdrawing(prev => ({ ...prev, rsc: true }));
      
      await switchNetwork(connectedChain.rscNetwork.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(userContracts.chainId);
      
      const reactiveContract = new ethers.Contract(
        userContracts.reactiveContract,
        contractConfig.REACTIVE_STOP_ORDER_ABI,
        signer
      );

      let tx;
      if (withdrawAll) {
        tx = await reactiveContract.withdrawAllETH(await signer.getAddress());
      } else {
        tx = await reactiveContract.withdrawETH(await signer.getAddress(), ethers.parseEther(withdrawAmount.toString()));
      }
      
      await tx.wait();
      toast.success(`Successfully withdrew ${withdrawAll ? 'all' : withdrawAmount} REACT from RSC contract`);
      setWithdrawalAmounts(prev => ({ ...prev, rsc: '' }));
      await fetchBalances();
    } catch (error: any) {
      console.error('Error withdrawing from RSC contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('Only owner')) {
        toast.error('Only the contract owner can withdraw funds');
      } else {
        toast.error('Failed to withdraw from RSC contract');
      }
    } finally {
      setIsWithdrawing(prev => ({ ...prev, rsc: false }));
    }
  };

  const callbackBalanceNum = parseFloat(balances.callbackBalance);
  const rscBalanceNum = parseFloat(balances.rscBalance);
  const callbackLow = callbackBalanceNum < MIN_CALLBACK_BALANCE;
  const rscLow = rscBalanceNum < MIN_RSC_BALANCE;
  const networkName = userContracts.chainId === '8453' ? 'Base Mainnet' : 'Sepolia Testnet';

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="border-b border-slate-700 pb-4">
        <CardTitle className="text-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-slate-400" />
            Personal Contract Details
            <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
              {networkName}
            </span>
          </div>
          <Button
            onClick={fetchBalances}
            disabled={balances.isLoading}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${balances.isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Monitor, fund, and withdraw from your personal smart contracts on {networkName}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Callback Contract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-300 font-medium">Personal Callback Contract ({networkName})</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.callbackContract.slice(0, 10)}...{userContracts.callbackContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.callbackContract, userContracts.chainId, 'address', connectedAccount)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Button>
            </Link>
          </div>
          
          <div className={`p-3 rounded-lg border ${callbackLow ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-600 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">
                    {balances.isLoading ? 'Loading...' : `${parseFloat(balances.callbackBalance).toFixed(6)} ETH`}
                  </span>
                  {callbackLow && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                {callbackLow && (
                  <p className="text-xs text-amber-300 mt-1">
                    Balance below safe limit ({MIN_CALLBACK_BALANCE} ETH)
                  </p>
                )}
              </div>
              {callbackLow && (
                <Button
                  onClick={handleFundCallback}
                  disabled={isFunding.callback}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isFunding.callback ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      Fund
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* RSC Contract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-300 font-medium">Personal Reactive Contract ({connectedChain.rscNetwork.name})</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.reactiveContract.slice(0, 10)}...{userContracts.reactiveContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.reactiveContract, connectedChain.rscNetwork.chainId, 'address', connectedAccount)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Button>
            </Link>
          </div>
          
          <div className={`p-3 rounded-lg border ${rscLow ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-600 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">
                    {balances.isLoading ? 'Loading...' : `${parseFloat(balances.rscBalance).toFixed(6)} REACT`}
                  </span>
                  {rscLow && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                {rscLow && (
                  <p className="text-xs text-amber-300 mt-1">
                    Balance below safe limit ({MIN_RSC_BALANCE} REACT)
                  </p>
                )}
              </div>
              {rscLow && (
                <Button
                  onClick={handleFundRSC}
                  disabled={isFunding.rsc}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isFunding.rsc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      Fund
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Management Options */}
        <div className="pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-slate-400">Last updated:</span>
            <span className="text-slate-300">
              {balances.lastUpdated ? formatTimeAgo(balances.lastUpdated / 1000) : 'Never'}
            </span>
          </div>
          
          <div className="space-y-2">
            {/* Funding Options */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFundingOptions(!showFundingOptions)}
              className="w-full justify-between text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            >
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Fund Personal Contracts
              </div>
              {showFundingOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showFundingOptions && (
              <div className="mt-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600/30 space-y-4">
                {/* Callback Funding */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Fund Personal Callback Contract ({networkName} ETH)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={callbackFundingAmount}
                      onChange={(e) => setCallbackFundingAmount(e.target.value)}
                      placeholder={userContracts.chainId === '8453' ? '0.005' : '0.01'}
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={handleFundCallback}
                      disabled={isFunding.callback}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isFunding.callback ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Fund'
                      )}
                    </Button>
                  </div>
                </div>

                {/* RSC Funding */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Fund Personal RSC Contract (REACT)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rscFundingAmount}
                      onChange={(e) => setRscFundingAmount(e.target.value)}
                      placeholder="0.1"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={handleFundRSC}
                      disabled={isFunding.rsc}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isFunding.rsc ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Fund'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal Options */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWithdrawalOptions(!showWithdrawalOptions)}
              className="w-full justify-between text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            >
              <div className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Withdraw from Personal Contracts
              </div>
              {showWithdrawalOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showWithdrawalOptions && (
              <div className="mt-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600/30 space-y-4">
                {/* Callback Withdrawal */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    Withdraw from Personal Callback Contract (Available: {parseFloat(balances.callbackBalance).toFixed(6)} ETH)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max={parseFloat(balances.callbackBalance)}
                      value={withdrawalAmounts.callback}
                      onChange={(e) => setWithdrawalAmounts(prev => ({ ...prev, callback: e.target.value }))}
                      placeholder={userContracts.chainId === '8453' ? '0.005' : '0.01'}
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={() => handleWithdrawCallback(false)}
                      disabled={isWithdrawing.callback}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      {isWithdrawing.callback ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleWithdrawCallback(true)}
                      disabled={isWithdrawing.callback}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      All
                    </Button>
                  </div>
                </div>

                {/* RSC Withdrawal */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    Withdraw from Personal RSC Contract (Available: {parseFloat(balances.rscBalance).toFixed(6)} REACT)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={parseFloat(balances.rscBalance)}
                      value={withdrawalAmounts.rsc}
                      onChange={(e) => setWithdrawalAmounts(prev => ({ ...prev, rsc: e.target.value }))}
                      placeholder="0.1"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={() => handleWithdrawRSC(false)}
                      disabled={isWithdrawing.rsc}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      {isWithdrawing.rsc ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleWithdrawRSC(true)}
                      disabled={isWithdrawing.rsc}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      All
                    </Button>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                  Only you (the contract owner) can withdraw funds. Withdrawing all funds may prevent future order execution.
                </div>
              </div>
            )}
          </div>
          
          {(callbackLow || rscLow) && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
              Low contract balances may prevent order execution. Fund your personal contracts to ensure reliability.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== TOKEN AND PAIR DATA FETCHING =====
const fetchTokenInfo = async (address: string, provider: ethers.JsonRpcProvider): Promise<Token> => {
  try {
    const tokenContract = new ethers.Contract(address, TOKEN_ABI, provider);
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.decimals()
    ]);

    return {
      address,
      symbol,
      name,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error('Error fetching token info for', address, ':', error);
    return {
      address,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18
    };
  }
};

// ===== ENHANCED PRICE CALCULATION =====
const calculatePairPriceWithTokens = async (
  pairAddress: string,
  sellTokenAddress: string,
  buyTokenAddress: string,
  provider: ethers.JsonRpcProvider
): Promise<{ currentPrice: number; sellToken: Token; buyToken: Token }> => {
  try {
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserves, token0Address, token1Address] = await Promise.all([
      pairContract.getReserves(),
      pairContract.token0(),
      pairContract.token1()
    ]);

    if (reserves[0] === BigInt(0) || reserves[1] === BigInt(0)) {
      throw new Error('No liquidity in pair');
    }

    const [token0Info, token1Info] = await Promise.all([
      fetchTokenInfo(token0Address, provider),
      fetchTokenInfo(token1Address, provider)
    ]);

    const isSellTokenToken0 = sellTokenAddress.toLowerCase() === token0Address.toLowerCase();
    const sellToken = isSellTokenToken0 ? token0Info : token1Info;
    const buyToken = isSellTokenToken0 ? token1Info : token0Info;

    const formattedReserve0 = ethers.formatUnits(reserves[0], token0Info.decimals);
    const formattedReserve1 = ethers.formatUnits(reserves[1], token1Info.decimals);

    const currentPrice = isSellTokenToken0 
      ? parseFloat(formattedReserve1) / parseFloat(formattedReserve0)
      : parseFloat(formattedReserve0) / parseFloat(formattedReserve1);

    return {
      currentPrice,
      sellToken,
      buyToken
    };
  } catch (error) {
    console.error('Error calculating pair price with tokens:', error);
    throw error;
  }
};

// ===== MAIN DASHBOARD COMPONENT =====
export default function UpdatedPersonalStopOrderDashboard() {
  const [orders, setOrders] = useState<StopOrder[]>([]);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [connectedChain, setConnectedChain] = useState<ChainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
  const [userContracts, setUserContracts] = useState<UserContractAddresses | null>(null);
  const [contractsValid, setContractsValid] = useState(false);
  const [contractBalances, setContractBalances] = useState<ContractBalances>({
    callbackBalance: '0',
    rscBalance: '0',
    isLoading: true,
    lastUpdated: 0
  });
  const [isContractsOpen, setIsContractsOpen] = useState(false);

  // Convex hook to get contract data
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");

  // ===== UPDATED ORDER FETCHING FOR PERSONAL CONTRACTS =====
  const fetchUserOrders = useCallback(async () => {
    if (!connectedAccount || !connectedChain) {
      console.log('DASHBOARD: Missing required data - account:', !!connectedAccount, 'chain:', !!connectedChain);
      return;
    }

    console.log('DASHBOARD: Fetching orders for', connectedAccount, 'on', connectedChain.name, 'chainId:', connectedChain.id);
    setIsLoading(true);
    
    try {
      if (!contractData) {
        console.log('DASHBOARD: No personal contracts found for user in Convex');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      if (contractData.chainId !== connectedChain.id) {
        console.log(`DASHBOARD: User has contracts on chain ${contractData.chainId} but currently connected to ${connectedChain.id}`);
        console.log(`DASHBOARD: No contracts found for ${connectedChain.name} - showing empty state`);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      const storedContracts: UserContractAddresses = {
        reactiveContract: contractData.rscContract,
        callbackContract: contractData.callbackContract,
        deployedAt: Date.now(),
        chainId: contractData.chainId,
        deployer: contractData.userAddress.toLowerCase()
      };

      console.log('DASHBOARD: Found matching contracts for', connectedChain.name, ':', storedContracts);

      const callbackRpcUrl = connectedChain.rpcUrl || 
        (connectedChain.id === '8453' ? 'https://mainnet.base.org' : 'https://ethereum-sepolia-rpc.publicnode.com');
      
      const callbackProvider = new ethers.JsonRpcProvider(callbackRpcUrl);
      const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);

      const valid = await validateStoredContracts(storedContracts, rscProvider, callbackProvider, connectedAccount);
      
      if (!valid) {
        console.log('DASHBOARD: Personal contracts are invalid for', connectedChain.name);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      setUserContracts(storedContracts);
      setContractsValid(true);

      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(storedContracts.chainId);

      const callbackContract = new ethers.Contract(
        storedContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        callbackProvider
      );

      console.log('DASHBOARD: Using personal callback contract on', connectedChain.name, ':', storedContracts.callbackContract);

      const allOrderIds = await callbackContract.getAllOrders();
      
      console.log('DASHBOARD: Found', allOrderIds.length, 'order IDs from personal contract on', connectedChain.name);
      
      if (allOrderIds.length === 0) {
        console.log('DASHBOARD: No orders found in personal contract on', connectedChain.name);
        setOrders([]);
        return;
      }

      const orderPromises = allOrderIds.map(async (orderId: bigint) => {
        try {
          console.log('DASHBOARD: Fetching personal order:', Number(orderId), 'from', connectedChain.name);
          const orderData = await callbackContract.getOrder(Number(orderId));
          
          console.log('DASHBOARD: Raw personal order data:', orderData);
          
          const pairContract = new ethers.Contract(orderData.pair, PAIR_ABI, callbackProvider);
          const [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1()
          ]);
      
          const [token0Info, token1Info] = await Promise.all([
            fetchTokenInfo(token0Address, callbackProvider),
            fetchTokenInfo(token1Address, callbackProvider)
          ]);
      
          const tokenSellInfo = orderData.sellToken0 ? token0Info : token1Info;
          const tokenBuyInfo = orderData.sellToken0 ? token1Info : token0Info;
      
          let currentPrice = '0';
          let triggerPrice = '0';
          let dropPercentage = 0;
      
          try {
            const priceData = await calculatePairPriceWithTokens(
              orderData.pair,
              tokenSellInfo.address,
              tokenBuyInfo.address,
              callbackProvider
            );
      
            currentPrice = priceData.currentPrice.toFixed(6);
      
            const coefficient = Number(orderData.coefficient);
            const threshold = Number(orderData.threshold);
            const triggerPriceNum = threshold / coefficient;
            triggerPrice = triggerPriceNum.toFixed(6);
      
            if (priceData.currentPrice > 0 && triggerPriceNum > 0) {
              dropPercentage = ((priceData.currentPrice - triggerPriceNum) / priceData.currentPrice) * 100;
              dropPercentage = Math.max(0, Math.min(50, dropPercentage));
              dropPercentage = Math.round(dropPercentage * 10) / 10;
            }
          } catch (priceError) {
            console.warn('Price calculation failed for personal order', Number(orderId), ':', priceError);
          }
          
          const formattedAmount = ethers.formatUnits(orderData.amount, tokenSellInfo.decimals);
          
          const order: StopOrder = {
            id: Number(orderId),
            pair: orderData.pair,
            client: connectedAccount,
            tokenSell: orderData.tokenSell || tokenSellInfo.address,
            tokenBuy: orderData.tokenBuy || tokenBuyInfo.address,
            amount: formattedAmount,
            sellToken0: orderData.sellToken0,
            coefficient: orderData.coefficient.toString(),
            threshold: orderData.threshold.toString(),
            status: Number(orderData.status),
            createdAt: Number(orderData.createdAt),
            executedAt: Number(orderData.executedAt || 0),
            tokenSellInfo,
            tokenBuyInfo,
            currentPrice,
            dropPercentage,
            triggerPrice,
            contractAddress: storedContracts.callbackContract
          };
      
          console.log('DASHBOARD: Processed personal order on', connectedChain.name, ':', order);
          return order;
        } catch (error) {
          console.error('DASHBOARD: Error fetching personal order:', orderId, error);
          return null;
        }
      });

      const resolvedOrders = await Promise.all(orderPromises);
      const validOrders = resolvedOrders.filter(order => order !== null) as StopOrder[];
      
      validOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('DASHBOARD: Final personal orders on', connectedChain.name, ':', validOrders.length, 'orders');
      setOrders(validOrders);
    } catch (error) {
      console.error('DASHBOARD: Error fetching personal orders for', connectedChain?.name, ':', error);
      toast.error(`Failed to load personal stop orders from ${connectedChain?.name}`);
      setOrders([]);
      setUserContracts(null);
      setContractsValid(false);
    } finally {
      setIsLoading(false);
    }
  }, [connectedAccount, contractData, connectedChain]);

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchUserOrders();
    setIsRefreshing(false);
    toast.success('Personal orders refreshed');
  };

  // ===== UPDATED ACTION HANDLERS FOR PERSONAL CONTRACTS =====
  const handleCancelOrder = async (orderId: number) => {
    if (!connectedChain || !userContracts) return;
    
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: 'cancelling' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() !== userContracts.chainId) {
        const chainIdHex = `0x${parseInt(userContracts.chainId).toString(16)}`;
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      }
      
      const signer = await provider.getSigner();
      
      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(userContracts.chainId);
      
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        signer
      );

      const tx = await callbackContract.cancelStopOrder(orderId);
      await tx.wait();

      const networkName = userContracts.chainId === '8453' ? 'Base' : 'Sepolia';
      toast.success(`Personal order cancelled successfully on ${networkName}`);
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error cancelling personal order:', error);
      
      if (error.message.includes('Only owner can call')) {
        toast.error('Access denied: Only the contract owner can cancel orders');
      } else if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(error.reason || 'Failed to cancel order');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: '' }));
    }
  };

  const handlePauseOrder = async (orderId: number) => {
    if (!connectedChain || !userContracts) return;
    
    setActionLoading(prev => ({ ...prev, [orderId]: 'pausing' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() !== userContracts.chainId) {
        const chainIdHex = `0x${parseInt(userContracts.chainId).toString(16)}`;
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      }
      
      const signer = await provider.getSigner();
      
      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(userContracts.chainId);
      
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        signer
      );

      const tx = await callbackContract.pauseStopOrder(orderId);
      await tx.wait();

      const networkName = userContracts.chainId === '8453' ? 'Base' : 'Sepolia';
      toast.success(`Personal order paused successfully on ${networkName}`);
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error pausing personal order:', error);
      
      if (error.message.includes('Only owner can call')) {
        toast.error('Access denied: Only the contract owner can pause orders');
      } else if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(error.reason || 'Failed to pause order');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: '' }));
    }
  };

  const handleResumeOrder = async (orderId: number) => {
    if (!connectedChain || !userContracts) return;
    
    setActionLoading(prev => ({ ...prev, [orderId]: 'resuming' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() !== userContracts.chainId) {
        const chainIdHex = `0x${parseInt(userContracts.chainId).toString(16)}`;
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      }
      
      const signer = await provider.getSigner();
      
      // Get the correct ABI for the chain
      const contractConfig = getContractABIs(userContracts.chainId);
      
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        signer
      );

      const tx = await callbackContract.resumeStopOrder(orderId);
      await tx.wait();

      const networkName = userContracts.chainId === '8453' ? 'Base' : 'Sepolia';
      toast.success(`Personal order resumed successfully on ${networkName}`);
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error resuming personal order:', error);
      
      if (error.message.includes('Only owner can call')) {
        toast.error('Access denied: Only the contract owner can resume orders');
      } else if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(error.reason || 'Failed to resume order');
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: '' }));
    }
  };

  // ===== INITIALIZATION =====
  useEffect(() => {
    const detectConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const [accounts, network] = await Promise.all([
            provider.listAccounts(),
            provider.getNetwork()
          ]);

          if (accounts.length > 0) {
            setConnectedAccount(accounts[0].address);
          }

          const chainId = network.chainId.toString();
          const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
          if (chain) {
            setConnectedChain(chain);
            console.log('DASHBOARD: Connected to', chain.name, 'chainId:', chainId);
          } else {
            console.log('DASHBOARD: Unsupported chain:', chainId);
          }
        } catch (error) {
          console.error('Error detecting connection:', error);
        }
      }
    };

    detectConnection();

    const handleChainChanged = (chainId: string) => {
      console.log('DASHBOARD: Network changed to:', chainId);
      const decimalChainId = chainId.startsWith('0x') ? parseInt(chainId, 16).toString() : chainId;
      const chain = SUPPORTED_CHAINS.find(c => c.id === decimalChainId);
      if (chain) {
        setConnectedChain(chain);
        console.log('DASHBOARD: Switched to', chain.name);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (connectedAccount && contractData !== undefined && connectedChain) {
      fetchUserOrders();
    }
  }, [connectedAccount, contractData, connectedChain, fetchUserOrders]);

  // ===== RENDER FUNCTIONS =====
  const renderOrdersTable = (orders: StopOrder[], title: string, icon: any) => {
    if (orders.length === 0) return null;

    const IconComponent = icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="flex items-center mb-6">
          <IconComponent className="w-6 h-6 text-slate-400 mr-2" />
          <h2 className="text-2xl font-bold text-slate-100">
            {title} ({orders.length})
          </h2>
        </div>
        
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-700">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Order</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Pair</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Amount</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Current Price</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Trigger Price</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Drop %</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Created</th>
                    <th className="px-6 py-4 text-sm font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status];
                    const StatusIcon = statusConfig.icon;
                    const loadingAction = actionLoading[order.id];
                    const isActive = order.status === OrderStatus.Active;
                    const isPaused = order.status === OrderStatus.Paused;

                    return (
                      <tr key={order.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                              #{order.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                              {order.tokenSellInfo?.symbol} → {order.tokenBuyInfo?.symbol}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {order.pair?.slice(0, 6)}...{order.pair?.slice(-4)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-200">
                            {parseFloat(order.amount).toFixed(4)} {order.tokenSellInfo?.symbol}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-200">
                          {Number(order.currentPrice).toFixed(6) || '0.000000'}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-300">
                          {order.triggerPrice || '0.000000'}
                        </td>
                        <td className="px-6 py-4 text-sm text-amber-300">
                          -{order.dropPercentage || 0}%
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatTimeAgo(order.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {(isActive || isPaused) && (
                            <div className="flex space-x-1">
                              {isActive && (
                                <Button
                                  onClick={() => handlePauseOrder(order.id)}
                                  disabled={!!loadingAction}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-yellow-300 hover:bg-yellow-900/20 hover:text-yellow-200"
                                >
                                  {loadingAction === 'pausing' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Pause className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              
                              {isPaused && (
                                <Button
                                  onClick={() => handleResumeOrder(order.id)}
                                  disabled={!!loadingAction}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-green-300 hover:bg-green-900/20 hover:text-green-200"
                                >
                                  {loadingAction === 'resuming' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={!!loadingAction}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-red-300 hover:bg-red-900/20 hover:text-red-200"
                              >
                                {loadingAction === 'cancelling' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </Button>
                              
                              <Link 
                                href={getExplorerUrl(order.contractAddress || '', userContracts?.chainId || '8453', 'address', connectedAccount)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-slate-200">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          )}
                          {order.status === OrderStatus.Executed || order.status === OrderStatus.Cancelled || order.status === OrderStatus.Failed ? (
                            <Link 
                              href={getExplorerUrl(order.contractAddress || '', userContracts?.chainId || '8453', 'address', connectedAccount)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-slate-200">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // ===== MAIN RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading your personal stop orders...</p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(order => order.status === OrderStatus.Active);
  const pausedOrders = orders.filter(order => order.status === OrderStatus.Paused);
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.Executed || 
    order.status === OrderStatus.Cancelled || 
    order.status === OrderStatus.Failed
  );

  const networkName = userContracts?.chainId === '8453' ? 'Base' : userContracts ? 'Sepolia' : 'Unknown';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2">
                Personal Stop Orders Dashboard
              </h1>
              <p className="text-lg text-slate-400">
                Monitor and manage your personal automated stop loss orders
                {userContracts && (
                  <span className="ml-2 text-blue-400 font-medium">
                    on {userContracts.chainId === '8453' ? 'Base Mainnet' : 'Sepolia Testnet'}
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={refreshData}
                disabled={isRefreshing}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800/50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/automations/stop-order">
                <Button className="bg-primary/50 hover:bg-primary/60 text-slate-100">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Order
                </Button>
              </Link>
            </div>
          </div>

          {/* Connected Account Info */}
          {connectedAccount && (
            <Alert className="bg-slate-800/50 border-slate-600/50 mb-6">
              <Shield className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    Personal Wallet: <span className="font-mono text-slate-200">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
                    {userContracts && (
                      <span className="ml-4">
                        Contract Network: <span className="text-slate-200">
                          {userContracts.chainId === '8453' ? 'Base Mainnet' : 'Ethereum Sepolia Testnet'} Personal Contracts
                        </span>
                        {userContracts.chainId === '8453' && (
                          <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            Mainnet Live
                          </span>
                        )}
                        {userContracts.chainId === '11155111' && (
                          <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            Testnet
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {userContracts && contractsValid && (
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm">Personal Contract System Active</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-emerald-300">{activeOrders.length}</h3>
                <p className="text-sm text-slate-400">Active Orders</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-yellow-300">{pausedOrders.length}</h3>
                <p className="text-sm text-slate-400">Paused</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-blue-300">
                  {orders.filter(o => o.status === OrderStatus.Executed).length}
                </h3>
                <p className="text-sm text-slate-400">Executed</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-slate-300">
                  {orders.filter(o => o.status === OrderStatus.Cancelled).length}
                </h3>
                <p className="text-sm text-slate-400">Cancelled</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-slate-300">{orders.length}</h3>
                <p className="text-sm text-slate-400">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Orders Tables */}
        {activeOrders.length > 0 && renderOrdersTable(activeOrders, "Active Orders", Activity)}
        {pausedOrders.length > 0 && renderOrdersTable(pausedOrders, "Paused Orders", Pause)}
        {completedOrders.length > 0 && renderOrdersTable(completedOrders, "Order History", CheckCircle)}

        {/* Personal Contract Balance Management */}
        {userContracts && contractsValid && connectedChain && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
                <button
                    onClick={() => setIsContractsOpen(!isContractsOpen)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/40 transition-colors"
                >
                    <div className="flex items-center">
                        <Settings className="w-6 h-6 mr-4 text-slate-400" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-100">Personal Contracts Management</h2>
                            <p className="text-sm text-slate-400 mt-1">
                              {isContractsOpen ? 'Click to collapse' : `Click to manage your ${userContracts.chainId === '8453' ? 'Base Mainnet' : 'Sepolia Testnet'} contract funds`}
                            </p>
                        </div>
                    </div>
                    {isContractsOpen 
                        ? <ChevronUp className="w-5 h-5 text-slate-300" /> 
                        : <ChevronDown className="w-5 h-5 text-slate-300" />}
                </button>

                <AnimatePresence initial={false}>
                    {isContractsOpen && (
                        <motion.section
                            key="content"
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            variants={{
                                open: { opacity: 1, height: "auto" },
                                collapsed: { opacity: 0, height: 0 }
                            }}
                            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        >
                            <div className="p-6 border-t border-slate-700">
                                <ContractBalanceManager 
                                    userContracts={userContracts}
                                    connectedChain={connectedChain}
                                    onBalanceUpdate={setContractBalances}
                                    connectedAccount={connectedAccount}
                                />
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!userContracts && orders.length === 0 && !isLoading && (
          <Card className="border-slate-700 bg-slate-900/50">
            <CardContent className="py-16">
              <div className="text-center">
                <Target className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-slate-200 mb-4">No personal stop orders found</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  You haven't deployed personal contracts yet. Start protecting your investments with your own automated stop-loss system on Base Mainnet.
                </p>
                <Link href="/automations/stop-order">
                  <Button className="bg-primary/50 hover:bg-primary/60 text-slate-100 text-lg px-8 py-3">
                    <Plus className="w-5 h-5 mr-2" />
                    Deploy Personal Stop Order System
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Contract System Info */}
        {!userContracts && connectedAccount && !isLoading && (
          <Alert className="bg-blue-900/20 border-blue-600/30 text-blue-200 mt-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Personal Contract System Ready on Base Mainnet</p>
                <p className="text-sm">
                  Your first stop order will deploy your personal smart contracts - callback contract on Base Mainnet and reactive contract on Lasna. 
                  You'll own these contracts completely and can add unlimited additional orders at minimal cost (~$0.50-2 per order).
                </p>
                <p className="text-xs text-blue-300 mt-2">
                  Architecture: Base Mainnet Personal Contracts • Owner-Only Access • Fund Withdrawal Available
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}