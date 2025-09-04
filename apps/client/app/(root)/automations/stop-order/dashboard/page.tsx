'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Settings
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ===== CONFIGURATION FROM MAIN STOP ORDER PAGE =====
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
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    factoryAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
    callbackAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.00001',
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net',
      callbackProxyAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
      systemContractAddress: '0x59F30360c984ee7A4a84F3Ba61930DD9e79784A4'
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

const getContractStorageKey = (userAddress: string, chainId: string): string => {
  return `stop-order-contracts-${userAddress.toLowerCase()}-${chainId}`;
};

const getStoredContracts = (userAddress: string, chainId: string): UserContractAddresses | null => {
  try {
    const key = getContractStorageKey(userAddress, chainId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading stored contracts:', error);
    return null;
  }
};

// ===== UPDATED ABIs FOR MULTI-ORDER SYSTEM =====
const REACTIVE_STOP_ORDER_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "orderId", "type": "uint256" }],
    "name": "cancelStopOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "orderId", "type": "uint256" }],
    "name": "getStopOrder",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "pair", "type": "address" },
          { "internalType": "address", "name": "client", "type": "address" },
          { "internalType": "bool", "name": "token0", "type": "bool" },
          { "internalType": "uint256", "name": "coefficient", "type": "uint256" },
          { "internalType": "uint256", "name": "threshold", "type": "uint256" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "bool", "name": "triggered", "type": "bool" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }
        ],
        "internalType": "struct StopOrder",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserActiveOrders",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserExecutedOrders",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserCancelledOrders",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getAllUserOrders",
    "outputs": [
      { "internalType": "uint256[]", "name": "active", "type": "uint256[]" },
      { "internalType": "uint256[]", "name": "executed", "type": "uint256[]" },
      { "internalType": "uint256[]", "name": "cancelled", "type": "uint256[]" },
      { "internalType": "uint256[]", "name": "failed", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextOrderId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeployer",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

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
  Cancelled = 1,
  Executed = 2,
  Failed = 3
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
  token0: boolean;
  coefficient: string;
  threshold: string;
  status: OrderStatus;
  triggered: boolean;
  createdAt: number;
  updatedAt: number;
  // Derived fields
  tokenSell?: Token;
  tokenBuy?: Token;
  amount?: string;
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

const getExplorerUrl = (address: string, chainId: string, type: 'address' | 'tx' = 'address'): string => {
  const explorers: Record<string, string> = {
    '1': 'https://etherscan.io',
    '11155111': 'https://sepolia.etherscan.io',
    '5318007': 'https://lasna.reactscan.net',
  };
  
  const baseUrl = explorers[chainId];
  if (!baseUrl) return '#';
  
  return `${baseUrl}/${type}/${address}`;
};

// ===== STATUS CONFIGURATION (PROFESSIONAL COLORS) =====
const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Activity
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

// ===== CONTRACT BALANCE MANAGEMENT COMPONENT =====
const ContractBalanceManager = ({ 
  userContracts, 
  connectedChain, 
  onBalanceUpdate 
}: {
  userContracts: UserContractAddresses;
  connectedChain: ChainConfig;
  onBalanceUpdate: (balances: ContractBalances) => void;
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

  // Define minimum safe balances
  const MIN_CALLBACK_BALANCE = 0.001; // 0.001 ETH
  const MIN_RSC_BALANCE = 0.01; // 0.01 REACT

  const fetchBalances = useCallback(async () => {
    try {
      setBalances(prev => ({ ...prev, isLoading: true }));

      // Fetch callback contract balance (Sepolia) - Use specific Sepolia RPC
      const sepoliaProvider = new ethers.JsonRpcProvider(connectedChain.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
      const callbackBalance = await sepoliaProvider.getBalance(userContracts.callbackContract);
      const callbackBalanceFormatted = ethers.formatEther(callbackBalance);

      // Fetch RSC contract balance (Lasna) - Use specific Lasna RPC
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
    // Refresh balances every 30 seconds
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
        // Chain not added, need to add it first
        const chainConfig = targetChainId === '5318007' ? {
          chainId: `0x${parseInt(targetChainId).toString(16)}`,
          chainName: 'Reactive Lasna',
          nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
          rpcUrls: ['https://lasna-rpc.rnk.dev/'],
          blockExplorerUrls: ['https://lasna.reactscan.net'],
        } : null;

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
      setIsFunding(prev => ({ ...prev, callback: true }));
      
      // Switch to Sepolia if not already
      await switchNetwork(connectedChain.id);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const fundingAmount = '0.01'; // 0.01 ETH
      const tx = await signer.sendTransaction({
        to: userContracts.callbackContract,
        value: ethers.parseEther(fundingAmount),
      });
      
      await tx.wait();
      toast.success('Callback contract funded successfully');
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
      setIsFunding(prev => ({ ...prev, rsc: true }));
      
      // Switch to RSC network
      await switchNetwork(connectedChain.rscNetwork.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const fundingAmount = '0.1'; // 0.1 REACT
      const tx = await signer.sendTransaction({
        to: userContracts.reactiveContract,
        value: ethers.parseEther(fundingAmount),
      });
      
      await tx.wait();
      toast.success('RSC contract funded successfully');
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

  const callbackBalanceNum = parseFloat(balances.callbackBalance);
  const rscBalanceNum = parseFloat(balances.rscBalance);
  const callbackLow = callbackBalanceNum < MIN_CALLBACK_BALANCE;
  const rscLow = rscBalanceNum < MIN_RSC_BALANCE;

  const [showFundingOptions, setShowFundingOptions] = useState(false);

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="border-b border-slate-700 pb-4">
        <CardTitle className="text-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-slate-400" />
            Contract Management
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
          Monitor and fund your smart contracts for optimal performance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Callback Contract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-300 font-medium">Callback Contract (Sepolia)</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.callbackContract.slice(0, 10)}...{userContracts.callbackContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.callbackContract, connectedChain.id)}
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
              <h4 className="text-slate-300 font-medium">Reactive Contract (Lasna)</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.reactiveContract.slice(0, 10)}...{userContracts.reactiveContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.reactiveContract, connectedChain.rscNetwork.chainId)}
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

        {/* Status Summary and Optional Funding */}
        <div className="pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Last updated:</span>
            <div className="flex items-center space-x-3">
              <span className="text-slate-300">
                {balances.lastUpdated ? formatTimeAgo(balances.lastUpdated / 1000) : 'Never'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFundingOptions(!showFundingOptions)}
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 h-6"
              >
                {showFundingOptions ? 'Hide' : 'Manage'} Funding
              </Button>
            </div>
          </div>
          
          {/* Optional Funding Controls */}
          {showFundingOptions && (
            <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-600/30">
              <p className="text-xs text-slate-400 mb-3">Add funds to your contracts for extended operation</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleFundCallback()}
                  disabled={isFunding.callback}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-600 hover:border-slate-500"
                >
                  {isFunding.callback ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Zap className="w-3 h-3 mr-1" />
                  )}
                  Add 0.01 ETH
                </Button>
                <Button
                  onClick={() => handleFundRSC()}
                  disabled={isFunding.rsc}
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-600 hover:border-slate-500"
                >
                  {isFunding.rsc ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Zap className="w-3 h-3 mr-1" />
                  )}
                  Add 0.1 REACT
                </Button>
              </div>
            </div>
          )}
          
          {(callbackLow || rscLow) && (
            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
              Low contract balances may prevent order execution. Fund contracts to ensure reliability.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ===== MAIN DASHBOARD COMPONENT =====
export default function UpdatedStopOrderDashboard() {
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

  const getCurrentPairPrice = async (pairAddress: string, sellToken0: boolean, provider: ethers.JsonRpcProvider): Promise<number> => {
    try {
      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [reserve0, reserve1] = await pairContract.getReserves();

      if (reserve0 === BigInt(0) || reserve1 === BigInt(0)) return 0;

      const price = sellToken0 
        ? Number(reserve1) / Number(reserve0)
        : Number(reserve0) / Number(reserve1);

      return price;
    } catch (error) {
      console.error('Error fetching pair price:', error);
      return 0;
    }
  };

  const calculateOrderMetrics = async (orderData: any, provider: ethers.JsonRpcProvider) => {
    try {
      const currentPrice = await getCurrentPairPrice(orderData.pair, orderData.token0, provider);
      const coefficient = Number(orderData.coefficient);
      const threshold = Number(orderData.threshold);
      const triggerPrice = threshold / coefficient;
      
      let dropPercentage = 0;
      if (currentPrice > 0 && triggerPrice > 0) {
        dropPercentage = ((currentPrice - triggerPrice) / currentPrice) * 100;
        dropPercentage = Math.max(0, Math.min(50, dropPercentage));
      }

      return {
        currentPrice: currentPrice.toFixed(6),
        triggerPrice: triggerPrice.toFixed(6),
        dropPercentage: Math.round(dropPercentage * 10) / 10
      };
    } catch (error) {
      console.error('Error calculating order metrics:', error);
      return {
        currentPrice: '0',
        triggerPrice: '0',
        dropPercentage: 0
      };
    }
  };

  // ===== CONTRACT VALIDATION =====
  const validateStoredContracts = async (
    contracts: UserContractAddresses,
    rscProvider: ethers.JsonRpcProvider,
    sepoliaProvider: ethers.JsonRpcProvider,
    userAddress: string
  ): Promise<boolean> => {
    try {
      console.log('Validating stored contracts:', contracts);
      
      const reactiveContract = new ethers.Contract(
        contracts.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        rscProvider
      );
      
      const deployer = await reactiveContract.getDeployer();
      
      if (deployer.toLowerCase() !== userAddress.toLowerCase()) {
        console.error('User is not the deployer of stored reactive contract');
        return false;
      }
      
      const callbackCode = await sepoliaProvider.getCode(contracts.callbackContract);
      if (callbackCode === '0x') {
        console.error('Callback contract not found at stored address');
        return false;
      }
      
      console.log('Contract validation successful');
      return true;
    } catch (error) {
      console.error('Contract validation failed:', error);
      return false;
    }
  };

  // ===== ORDER FETCHING WITH PROPER PROVIDERS =====
  const fetchUserOrders = async () => {
    if (!connectedAccount) return;

    console.log('Fetching orders for account:', connectedAccount);
    setIsLoading(true);
    
    try {
      // Always use the first supported chain (Sepolia) for contract storage
      const targetChain = SUPPORTED_CHAINS[0]; // This will be Sepolia
      
      // Create proper providers for each network regardless of user's current network
      const sepoliaProvider = new ethers.JsonRpcProvider(targetChain.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
      const rscProvider = new ethers.JsonRpcProvider(targetChain.rscNetwork.rpcUrl);
      
      // Check for user's deployed contracts
      const stored = getStoredContracts(connectedAccount, targetChain.id);
      console.log('Stored contracts found:', stored);
      
      if (!stored) {
        console.log('No contracts found for user');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      // Validate contracts using proper providers
      const valid = await validateStoredContracts(stored, rscProvider, sepoliaProvider, connectedAccount);
      
      if (!valid) {
        console.log('Stored contracts are invalid, clearing...');
        const key = getContractStorageKey(connectedAccount, targetChain.id);
        localStorage.removeItem(key);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      setUserContracts(stored);
      setContractsValid(true);
      setConnectedChain(targetChain); // Set the connected chain for the dashboard

      const reactiveContract = new ethers.Contract(
        stored.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        rscProvider
      );

      console.log('Using reactive contract address:', stored.reactiveContract);

      // Get all user's orders from RSC network
      const [activeOrders, executedOrders, cancelledOrders] = await reactiveContract.getAllUserOrders(connectedAccount);
      const allOrderIds = [...activeOrders, ...executedOrders, ...cancelledOrders];
      
      console.log('All order IDs:', allOrderIds);
      
      if (allOrderIds.length === 0) {
        console.log('No orders found for user');
        setOrders([]);
        return;
      }

      // Fetch all order details
      const orderPromises = allOrderIds.map(async (orderId: bigint) => {
        try {
          console.log('Fetching order:', Number(orderId));
          const orderData = await reactiveContract.getStopOrder(orderId);
          console.log('Raw order data:', orderData);
          
          // Get pair token information using Sepolia provider
          const pairContract = new ethers.Contract(orderData.pair, PAIR_ABI, sepoliaProvider);
          const [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1()
          ]);

          const [token0Info, token1Info] = await Promise.all([
            fetchTokenInfo(token0Address, sepoliaProvider),
            fetchTokenInfo(token1Address, sepoliaProvider)
          ]);

          // Determine sell and buy tokens based on order direction
          const tokenSell = orderData.token0 ? token0Info : token1Info;
          const tokenBuy = orderData.token0 ? token1Info : token0Info;

          // Calculate metrics using Sepolia provider
          const metrics = await calculateOrderMetrics(orderData, sepoliaProvider);

          const order: StopOrder = {
            id: Number(orderId),
            pair: orderData.pair,
            client: orderData.client,
            token0: orderData.token0,
            coefficient: orderData.coefficient.toString(),
            threshold: orderData.threshold.toString(),
            status: Number(orderData.status),
            triggered: orderData.triggered,
            createdAt: Number(orderData.createdAt),
            updatedAt: Number(orderData.updatedAt),
            tokenSell,
            tokenBuy,
            currentPrice: metrics.currentPrice,
            dropPercentage: metrics.dropPercentage,
            triggerPrice: metrics.triggerPrice,
            contractAddress: stored.reactiveContract
          };

          console.log('Processed order:', order);
          return order;
        } catch (error) {
          console.error('Error fetching order:', orderId, error);
          return null;
        }
      });

      const resolvedOrders = await Promise.all(orderPromises);
      const validOrders = resolvedOrders.filter(order => order !== null) as StopOrder[];
      
      // Sort by creation time (newest first)
      validOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('Final orders:', validOrders);
      setOrders(validOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
      setUserContracts(null);
      setContractsValid(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchUserOrders();
    setIsRefreshing(false);
    toast.success('Orders refreshed');
  };

  // ===== ACTION HANDLERS =====
  const handleCancelOrder = async (orderId: number) => {
    if (!connectedChain || !userContracts) return;
    
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: 'cancelling' }));
    try {
      // Need to switch to RSC network to cancel order
      const rscChainIdHex = `0x${parseInt(connectedChain.rscNetwork.chainId).toString(16)}`;
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: rscChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: rscChainIdHex,
              chainName: 'Reactive Lasna',
              nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
              rpcUrls: ['https://lasna-rpc.rnk.dev/'],
              blockExplorerUrls: ['https://lasna.reactscan.net'],
            }],
          });
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const reactiveContract = new ethers.Contract(
        userContracts.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        signer
      );

      const tx = await reactiveContract.cancelStopOrder(orderId);
      await tx.wait();

      toast.success('Order cancelled successfully');
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      
      if (error.message.includes('Only deployer can call')) {
        toast.error('Access denied: You can only cancel orders on contracts you deployed');
      } else if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(error.reason || 'Failed to cancel order');
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
          const accounts = await provider.listAccounts();

          if (accounts.length > 0) {
            setConnectedAccount(accounts[0].address);
          }
        } catch (error) {
          console.error('Error detecting connection:', error);
        }
      }
    };

    detectConnection();
  }, []);

  useEffect(() => {
    if (connectedAccount) {
      fetchUserOrders();
    }
  }, [connectedAccount]);

  // ===== RENDER FUNCTIONS =====
  const renderOrderCard = (order: StopOrder) => {
    const statusConfig = STATUS_CONFIG[order.status];
    const StatusIcon = statusConfig.icon;
    const loadingAction = actionLoading[order.id];
    const isActive = order.status === OrderStatus.Active;

    return (
      <Card 
        key={order.id} 
        className={`border-slate-700 bg-slate-900/50 ${statusConfig.borderColor}`}
      >
        <CardHeader className="border-b border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200">
                #{order.id}
              </div>
              <div>
                <CardTitle className="text-lg text-slate-200 flex items-center space-x-2">
                  <span>{order.tokenSell?.symbol} → {order.tokenBuy?.symbol}</span>
                  {isActive && <Activity className="w-4 h-4 text-emerald-400" />}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Created {formatTimeAgo(order.createdAt)}
                </CardDescription>
              </div>
            </div>
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
              <StatusIcon className="w-4 h-4" />
              <span>{statusConfig.label}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Current Price</p>
              <p className="text-base font-semibold text-slate-200">
                {order.currentPrice || '0.000000'}
              </p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Trigger Price</p>
              <p className="text-base font-semibold text-red-300">
                {order.triggerPrice || '0.000000'}
              </p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Drop Threshold</p>
              <p className="text-base font-semibold text-amber-300">
                -{order.dropPercentage || 0}%
              </p>
            </div>
          </div>

          {/* Token Information */}
          <div className="bg-slate-800/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-2">Selling</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                    {order.tokenSell?.symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    {order.tokenSell?.symbol}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Buying</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
                    {order.tokenBuy?.symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    {order.tokenBuy?.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="bg-slate-800/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Contract:</span>
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                  {order.contractAddress?.slice(0, 6)}...{order.contractAddress?.slice(-4)}
                </code>
                <Link 
                  href={getExplorerUrl(order.contractAddress || '', connectedChain?.rscNetwork.chainId || '5318007')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => handleCancelOrder(order.id)}
                disabled={!!loadingAction}
                variant="outline"
                className="bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30 flex-1"
              >
                {loadingAction === 'cancelling' ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Cancelling...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    Cancel Order
                  </div>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ===== MAIN RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading your stop orders...</p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(order => order.status === OrderStatus.Active);
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.Executed || 
    order.status === OrderStatus.Cancelled || 
    order.status === OrderStatus.Failed
  );

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
                Stop Orders Dashboard
              </h1>
              <p className="text-lg text-slate-400">
                Monitor and manage your automated stop loss orders
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
              <Eye className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    Wallet: <span className="font-mono text-slate-200">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
                    {connectedChain && (
                      <span className="ml-4">
                        Data from: <span className="text-slate-200">{connectedChain.name} + {connectedChain.rscNetwork.name}</span>
                      </span>
                    )}
                  </div>
                  {userContracts && contractsValid && (
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm">Multi-Order System Active</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-slate-700 bg-slate-900/50">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-emerald-300">{activeOrders.length}</h3>
                <p className="text-sm text-slate-400">Active Orders</p>
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

        {/* Contract Balance Management - Show only if user has contracts */}
        {userContracts && contractsValid && connectedChain && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <ContractBalanceManager 
              userContracts={userContracts}
              connectedChain={connectedChain}
              onBalanceUpdate={setContractBalances}
            />
          </motion.div>
        )}

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <div className="flex items-center mb-6">
              <Activity className="w-6 h-6 text-emerald-400 mr-2" />
              <h2 className="text-2xl font-bold text-slate-100">
                Active Orders ({activeOrders.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeOrders.map(renderOrderCard)}
            </div>
          </motion.div>
        )}

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center mb-6">
              <CheckCircle className="w-6 h-6 text-blue-400 mr-2" />
              <h2 className="text-2xl font-bold text-slate-100">
                Order History ({completedOrders.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {completedOrders.map(renderOrderCard)}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!userContracts && orders.length === 0 && !isLoading && (
          <Card className="border-slate-700 bg-slate-900/50">
            <CardContent className="py-16">
              <div className="text-center">
                <Target className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-slate-200 mb-4">No stop orders found</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  You haven't created any stop orders yet. Start protecting your investments with automated stop-loss orders.
                </p>
                <Link href="/automations/stop-order">
                  <Button className="bg-primary/50 hover:bg-primary/60 text-slate-100 text-lg px-8 py-3">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Stop Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Contracts Warning */}
        {!userContracts && connectedAccount && !isLoading && (
          <Alert className="bg-amber-900/20 border-amber-600/30 text-amber-200 mt-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Multi-Order System Ready</p>
                <p className="text-sm">
                  Your first stop order will deploy personal smart contracts. Additional orders will use the same contracts at much lower cost.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}