'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
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
  Info
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
  };
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0x7e0987e5b3a30e3f2828572bb659a548460a3003',
    callbackAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03',
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net'
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
  };
  
  const baseUrl = explorers[chainId];
  if (!baseUrl) return '#';
  
  return `${baseUrl}/${type}/${address}`;
};

// ===== STATUS CONFIGURATION =====
const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: Activity
  },
  [OrderStatus.Executed]: {
    label: 'Executed',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: CheckCircle
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: X
  },
  [OrderStatus.Failed]: {
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: AlertCircle
  }
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

  // ===== TOKEN AND PAIR DATA FETCHING =====
  const fetchTokenInfo = async (address: string, provider: ethers.BrowserProvider): Promise<Token> => {
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

  const getCurrentPairPrice = async (pairAddress: string, sellToken0: boolean, provider: ethers.BrowserProvider): Promise<number> => {
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

  const calculateOrderMetrics = async (orderData: any, provider: ethers.BrowserProvider) => {
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
    provider: ethers.BrowserProvider,
    userAddress: string
  ): Promise<boolean> => {
    try {
      console.log('Validating stored contracts:', contracts);
      
      const reactiveContract = new ethers.Contract(
        contracts.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        provider
      );
      
      const deployer = await reactiveContract.getDeployer();
      
      if (deployer.toLowerCase() !== userAddress.toLowerCase()) {
        console.error('User is not the deployer of stored reactive contract');
        return false;
      }
      
      const callbackCode = await provider.getCode(contracts.callbackContract);
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

  // ===== ORDER FETCHING =====
  const fetchUserOrders = async () => {
    if (!connectedAccount || !connectedChain) return;

    console.log('Fetching orders for account:', connectedAccount, 'on chain:', connectedChain.name);
    setIsLoading(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check for user's deployed contracts
      const stored = getStoredContracts(connectedAccount, connectedChain.id);
      console.log('Stored contracts found:', stored);
      
      if (!stored) {
        console.log('No contracts found for user');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      // Validate contracts
      const valid = await validateStoredContracts(stored, provider, connectedAccount);
      
      if (!valid) {
        console.log('Stored contracts are invalid, clearing...');
        const key = getContractStorageKey(connectedAccount, connectedChain.id);
        localStorage.removeItem(key);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      setUserContracts(stored);
      setContractsValid(true);

      const reactiveContract = new ethers.Contract(
        stored.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        provider
      );

      console.log('Using reactive contract address:', stored.reactiveContract);

      // Get all user's orders
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
          
          // Get pair token information
          const pairContract = new ethers.Contract(orderData.pair, PAIR_ABI, provider);
          const [token0Address, token1Address] = await Promise.all([
            pairContract.token0(),
            pairContract.token1()
          ]);

          const [token0Info, token1Info] = await Promise.all([
            fetchTokenInfo(token0Address, provider),
            fetchTokenInfo(token1Address, provider)
          ]);

          // Determine sell and buy tokens based on order direction
          const tokenSell = orderData.token0 ? token0Info : token1Info;
          const tokenBuy = orderData.token0 ? token1Info : token0Info;

          // Calculate metrics
          const metrics = await calculateOrderMetrics(orderData, provider);

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
          const [accounts, network] = await Promise.all([
            provider.listAccounts(),
            provider.getNetwork()
          ]);

          if (accounts.length > 0) {
            setConnectedAccount(accounts[0].address);
          }

          const chainId = network.chainId.toString();
          const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
          setConnectedChain(chain || null);
        } catch (error) {
          console.error('Error detecting connection:', error);
        }
      }
    };

    detectConnection();
  }, []);

  useEffect(() => {
    if (connectedAccount && connectedChain) {
      fetchUserOrders();
    }
  }, [connectedAccount, connectedChain]);

  // ===== RENDER FUNCTIONS =====
  const renderOrderCard = (order: StopOrder) => {
    const statusConfig = STATUS_CONFIG[order.status];
    const StatusIcon = statusConfig.icon;
    const loadingAction = actionLoading[order.id];
    const isActive = order.status === OrderStatus.Active;

    return (
      <Card 
        key={order.id} 
        className={`relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 ${statusConfig.borderColor}`}
      >
        <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-sm font-bold text-white">
                #{order.id}
              </div>
              <div>
                <CardTitle className="text-lg text-zinc-100 flex items-center space-x-2">
                  <span>{order.tokenSell?.symbol} → {order.tokenBuy?.symbol}</span>
                  {isActive && <Activity className="w-4 h-4 text-green-400" />}
                </CardTitle>
                <CardDescription className="text-zinc-300">
                  Created {formatTimeAgo(order.createdAt)}
                </CardDescription>
              </div>
            </div>
            <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
              <StatusIcon className="w-4 h-4" />
              <span>{statusConfig.label}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Current Price</p>
              <p className="text-lg font-semibold text-zinc-200">
                {order.currentPrice || '0.000000'}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-400 mb-1">Trigger Price</p>
              <p className="text-lg font-semibold text-red-300">
                {order.triggerPrice || '0.000000'}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-400 mb-1">Drop Threshold</p>
              <p className="text-lg font-semibold text-yellow-300">
                -{order.dropPercentage || 0}%
              </p>
            </div>
          </div>

          {/* Token Information */}
          <div className="bg-zinc-800/30 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Selling</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-xs font-bold">
                    {order.tokenSell?.symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-zinc-200">
                    {order.tokenSell?.symbol}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Buying</p>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center text-xs font-bold">
                    {order.tokenBuy?.symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-zinc-200">
                    {order.tokenBuy?.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="bg-zinc-800/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Contract:</span>
              </div>
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-300">
                  {order.contractAddress?.slice(0, 6)}...{order.contractAddress?.slice(-4)}
                </code>
                <Link 
                  href={getExplorerUrl(order.contractAddress || '', connectedChain?.id || '11155111')}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-200">Loading your stop orders...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black py-8 px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                Stop Orders Dashboard
              </h1>
              <p className="text-lg text-zinc-300">
                Monitor and manage your automated stop loss orders
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={refreshData}
                disabled={isRefreshing}
                variant="outline"
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/automations/stop-order">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Order
                </Button>
              </Link>
            </div>
          </div>

          {/* Connected Account & Contract Info */}
          <div className="space-y-4">
            {connectedAccount && (
              <Alert className="bg-blue-900/20 border-blue-500/50">
                <Eye className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-zinc-200">
                  <div className="flex items-center justify-between">
                    <div>
                      Wallet: <span className="font-mono text-blue-300">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
                      {connectedChain && (
                        <span className="ml-4">
                          Network: <span className="text-green-300">{connectedChain.name}</span>
                        </span>
                      )}
                    </div>
                    {userContracts && contractsValid && (
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 text-sm">Multi-Order Contracts Active</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Contract Details Card */}
            {userContracts && contractsValid && (
              <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-500/30">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg text-green-200 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Your Smart Contract System
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Reactive Contract</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-green-300 flex-1">
                          {userContracts.reactiveContract}
                        </code>
                        <Link 
                          href={getExplorerUrl(userContracts.reactiveContract, connectedChain?.id || '11155111')}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Callback Contract</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-green-300 flex-1">
                          {userContracts.callbackContract}
                        </code>
                        <Link 
                          href={getExplorerUrl(userContracts.callbackContract, connectedChain?.id || '11155111')}
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
                  <div className="mt-3 p-2 bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-300">
                      💰 Cost-efficient system active! Additional orders will only cost gas fees.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-br from-green-900/40 to-blue-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-green-300">{activeOrders.length}</h3>
                <p className="text-sm text-zinc-400">Active Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-blue-300">
                  {orders.filter(o => o.status === OrderStatus.Executed).length}
                </h3>
                <p className="text-sm text-zinc-400">Executed</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-900/40 to-slate-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-gray-300">
                  {orders.filter(o => o.status === OrderStatus.Cancelled).length}
                </h3>
                <p className="text-sm text-zinc-400">Cancelled</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-purple-300">{orders.length}</h3>
                <p className="text-sm text-zinc-400">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <div className="flex items-center mb-6">
              <Activity className="w-6 h-6 text-green-400 mr-2" />
              <h2 className="text-2xl font-bold text-zinc-100">
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
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center mb-6">
              <CheckCircle className="w-6 h-6 text-blue-400 mr-2" />
              <h2 className="text-2xl font-bold text-zinc-100">
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
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="py-16">
              <div className="text-center">
                <Target className="w-20 h-20 text-zinc-400 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-zinc-200 mb-4">No stop orders found</h3>
                <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                  You haven't created any stop orders yet. Start protecting your investments with automated stop-loss orders.
                </p>
                <Link href="/automations/stop-order">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Stop Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Contracts But User Has Wallet */}
        {!userContracts && connectedAccount && !isLoading && (
          <Alert className="bg-amber-900/20 border-amber-500/30 text-amber-200 mt-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Multi-Order System Ready</p>
                <p className="text-sm">
                  Your first stop order will deploy personal smart contracts. Additional orders will use the same contracts at much lower cost!
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Network Warning */}
        {connectedChain?.isComingSoon && (
          <Alert className="bg-yellow-900/20 border-yellow-500/30 text-yellow-200 mt-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{connectedChain.name} support coming soon.</span> Please switch to Ethereum Sepolia to create and manage stop orders.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}