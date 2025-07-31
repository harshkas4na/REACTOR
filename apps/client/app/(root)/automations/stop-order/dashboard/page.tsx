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
  Pause, 
  Play, 
  X, 
  RefreshCw, 
  TrendingDown, 
  AlertCircle,
  Target,
  Activity,
  Plus,
  Eye,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ===== CONFIGURATION FROM STOP ORDER PAGE =====
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
}

const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
    callbackAddress: '0x9148309eFB90b8803187413DFEE904327DFD8835',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03'
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    callbackAddress: '0xe6a25e1641A17A8BCE5DD591a490d94AADB4919f',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03',
    isComingSoon: true
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain',
    dexName: 'Pangolin',
    routerAddress: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
    callbackAddress: '0xe6a25e1641A17A8BCE5DD591a490d94AADB4919f',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    defaultFunding: '0.03',
    isComingSoon: true
  }
];

// Contract addresses
const CONTRACT_ADDRESSES = {
  CALLBACK: '0x9148309eFB90b8803187413DFEE904327DFD8835',
  RSC: '0x820bEaada84dD6D507edcE56D211038bd9444049'
};

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
  client: string;
  pair: string;
  tokenSell: Token;
  tokenBuy: Token;
  amount: string;
  sellToken0: boolean;
  coefficient: string;
  threshold: string;
  status: OrderStatus;
  createdAt: number;
  executedAt: number;
  retryCount: number;
  lastExecutionAttempt: number;
  currentPrice?: string;
  dropPercentage?: number;
  triggerPrice?: string;
}

// ===== SIMPLIFIED ABI =====
const STOP_ORDER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserOrders",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "name": "getOrder",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "client", "type": "address"},
          {"internalType": "address", "name": "pair", "type": "address"},
          {"internalType": "address", "name": "tokenSell", "type": "address"},
          {"internalType": "address", "name": "tokenBuy", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "bool", "name": "sellToken0", "type": "bool"},
          {"internalType": "uint256", "name": "coefficient", "type": "uint256"},
          {"internalType": "uint256", "name": "threshold", "type": "uint256"},
          {"internalType": "uint8", "name": "status", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "executedAt", "type": "uint256"},
          {"internalType": "uint8", "name": "retryCount", "type": "uint8"},
          {"internalType": "uint256", "name": "lastExecutionAttempt", "type": "uint256"}
        ],
        "internalType": "struct StopOrderCallback.StopOrder",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "name": "pauseStopOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "name": "resumeStopOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
    "name": "cancelStopOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "pair", "type": "address"},
      {"internalType": "bool", "name": "sellToken0", "type": "bool"}
    ],
    "name": "getCurrentPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Recently';
};

// ===== STATUS CONFIGURATION =====
const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    icon: Activity
  },
  [OrderStatus.Paused]: {
    label: 'Paused',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    icon: Pause
  },
  [OrderStatus.Executed]: {
    label: 'Executed',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    icon: CheckCircle
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    icon: X
  },
  [OrderStatus.Failed]: {
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: AlertCircle
  }
};

// ===== MAIN COMPONENT =====
export default function SimpleStopOrderDashboard() {
  const [orders, setOrders] = useState<StopOrder[]>([]);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [connectedChain, setConnectedChain] = useState<ChainConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});

  // ===== BLOCKCHAIN FUNCTIONS =====
  const fetchTokenInfo = async (address: string, provider: ethers.BrowserProvider): Promise<Token> => {
    try {
      const tokenContract = new ethers.Contract(address, TOKEN_ABI, provider);
      const [symbol, name, decimals, balanceWei] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
        tokenContract.balanceOf(connectedAccount)
      ]);

      console.log('Token info raw:', { symbol, name, decimals, balanceWei });
      const balance = ethers.formatUnits(balanceWei, Number(decimals));

      const tokenInfo = {
        address,
        symbol,
        name,
        decimals: Number(decimals), // Convert BigInt to number
        balance: parseFloat(balance).toFixed(6)
      };

      console.log('Processed token info:', tokenInfo);
      return tokenInfo;
    } catch (error) {
      console.error('Error fetching token info for', address, ':', error);
      return {
        address,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
        balance: '0'
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

  // FIXED: Correct calculation for threshold-based orders
  const calculateOrderMetrics = async (orderData: any, provider: ethers.BrowserProvider) => {
    try {
      // Get current pair price
      const currentPrice = await getCurrentPairPrice(orderData.pair, orderData.sellToken0, provider);
      
      // Calculate the trigger price from threshold
      const coefficient = Number(orderData.coefficient);
      const threshold = Number(orderData.threshold);
      const triggerPrice = threshold / coefficient;
      
      // Try to estimate the drop percentage
      // Since we don't know the original price exactly, we'll use current price as approximation
      // This won't be 100% accurate but much better than the old calculation
      let dropPercentage = 0;
      if (currentPrice > 0 && triggerPrice > 0) {
        dropPercentage = ((currentPrice - triggerPrice) / currentPrice) * 100;
        // Ensure it's positive and reasonable (clamp between 0-50%)
        dropPercentage = Math.max(0, Math.min(50, dropPercentage));
      }

      console.log('Order metrics calculation:', {
        coefficient,
        threshold,
        currentPrice,
        triggerPrice,
        calculatedDropPercentage: dropPercentage
      });

      return {
        currentPrice: currentPrice.toFixed(6),
        triggerPrice: triggerPrice.toFixed(6),
        dropPercentage: Math.round(dropPercentage * 10) / 10 // Round to 1 decimal place
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

  const fetchUserOrders = async () => {
    if (!connectedAccount || !connectedChain) return;

    console.log('Fetching orders for account:', connectedAccount, 'on chain:', connectedChain.name);
    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // Use chain-specific callback address
      const callbackAddress = connectedChain.callbackAddress;
      const contract = new ethers.Contract(callbackAddress, STOP_ORDER_ABI, provider);

      console.log('Using contract address:', callbackAddress);
      console.log('Connected to network:', await provider.getNetwork());

      // Get user's order IDs
      const orderIds = await contract.getUserOrders(connectedAccount);
      console.log('Order IDs returned:', orderIds);
      
      if (orderIds.length === 0) {
        console.log('No orders found for user');
        setOrders([]);
        return;
      }

      // Fetch all order details
      const orderPromises = orderIds.map(async (orderId: bigint) => {
        try {
          console.log('Fetching order:', Number(orderId));
          const orderData = await contract.getOrder(orderId);
          console.log('Raw order data:', orderData);
          
          // Fetch token information
          const [tokenSell, tokenBuy] = await Promise.all([
            fetchTokenInfo(orderData.tokenSell, provider),
            fetchTokenInfo(orderData.tokenBuy, provider)
          ]);

          // FIXED: Use new calculation method
          const metrics = await calculateOrderMetrics(orderData, provider);

          const order: StopOrder = {
            id: Number(orderData.id),
            client: orderData.client,
            pair: orderData.pair,
            tokenSell,
            tokenBuy,
            amount: ethers.formatUnits(orderData.amount, Number(tokenSell.decimals)),
            sellToken0: orderData.sellToken0,
            coefficient: orderData.coefficient.toString(),
            threshold: orderData.threshold.toString(),
            status: Number(orderData.status), // Convert BigInt to number
            createdAt: Number(orderData.createdAt),
            executedAt: Number(orderData.executedAt),
            retryCount: Number(orderData.retryCount),
            lastExecutionAttempt: Number(orderData.lastExecutionAttempt),
            currentPrice: metrics.currentPrice,
            dropPercentage: metrics.dropPercentage,
            triggerPrice: metrics.triggerPrice
          };

          console.log('Processed order with fixed metrics:', order);
          return order;
        } catch (error) {
          console.error('Error fetching order:', orderId, error);
          return null;
        }
      });

      const resolvedOrders = await Promise.all(orderPromises);
      const validOrders = resolvedOrders.filter(order => order !== null) as StopOrder[];
      
      console.log('Valid orders before sorting:', validOrders);
      console.log('Order statuses:', validOrders.map(o => ({ id: o.id, status: o.status, statusType: typeof o.status })));
      
      // Sort by creation time (newest first)
      validOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('Final orders with corrected calculations:', validOrders);
      setOrders(validOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
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
  const handlePauseOrder = async (orderId: number) => {
    if (!connectedChain) return;
    
    setActionLoading(prev => ({ ...prev, [orderId]: 'pausing' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(connectedChain.callbackAddress, STOP_ORDER_ABI, signer);

      const tx = await contract.pauseStopOrder(orderId);
      await tx.wait();

      toast.success('Order paused successfully');
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error pausing order:', error);
      toast.error(error.reason || 'Failed to pause order');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: '' }));
    }
  };

  const handleResumeOrder = async (orderId: number) => {
    if (!connectedChain) return;
    
    setActionLoading(prev => ({ ...prev, [orderId]: 'resuming' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(connectedChain.callbackAddress, STOP_ORDER_ABI, signer);

      const tx = await contract.resumeStopOrder(orderId);
      await tx.wait();

      toast.success('Order resumed successfully');
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error resuming order:', error);
      toast.error(error.reason || 'Failed to resume order');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: '' }));
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!connectedChain) return;
    
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: 'cancelling' }));
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(connectedChain.callbackAddress, STOP_ORDER_ABI, signer);

      const tx = await contract.cancelStopOrder(orderId);
      await tx.wait();

      toast.success('Order cancelled successfully');
      await fetchUserOrders();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.reason || 'Failed to cancel order');
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

  // ===== RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-200">Loading your stop orders...</p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(order => 
    order.status === OrderStatus.Active || order.status === OrderStatus.Paused
  );
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.Executed || order.status === OrderStatus.Cancelled || order.status === OrderStatus.Failed
  );

  console.log('OrderStatus enum values:', { Active: OrderStatus.Active, Paused: OrderStatus.Paused, Executed: OrderStatus.Executed });
  console.log('All orders:', orders);
  console.log('Active orders:', activeOrders);
  console.log('Completed orders:', completedOrders);

  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8">
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

          {/* Connected Account */}
          {connectedAccount && (
            <Alert className="mb-6 bg-blue-900/20 border-blue-500/50">
              <Eye className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-zinc-200">
                Wallet: <span className="font-mono text-blue-300">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
                {connectedChain && (
                  <span className="ml-4">
                    Network: <span className="text-green-300">{connectedChain.name}</span>
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-900/40 to-blue-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-green-300">{activeOrders.length}</h3>
                <p className="text-sm text-zinc-400">Active Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-yellow-300">
                  {orders.filter(o => o.status === OrderStatus.Paused).length}
                </h3>
                <p className="text-sm text-zinc-400">Paused</p>
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
            <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-purple-300">{orders.length}</h3>
                <p className="text-sm text-zinc-400">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Active Orders Table */}
        {isLoading ? (
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-8">
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-zinc-200">Loading orders...</p>
              </div>
            </CardContent>
          </Card>
        ) : activeOrders.length > 0 ? (
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-8">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-400" />
                Active Orders ({activeOrders.length})
              </CardTitle>
              <CardDescription className="text-zinc-300">
                Your currently monitored stop loss orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Order</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Amount & Trigger</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Current Price</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Status</th>
                      <th className="text-center py-3 px-2 text-zinc-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map((order) => {
                      const statusConfig = STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig.icon;
                      const loadingAction = actionLoading[order.id];

                      return (
                        <tr key={order.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                          <td className="py-4 px-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-sm font-bold text-white">
                                #{order.id}
                              </div>
                              <div>
                                <div className="font-medium text-zinc-100">
                                  {order.tokenSell.symbol} → {order.tokenBuy.symbol}
                                </div>
                                <div className="text-xs text-zinc-400 space-y-1">
                                  <div>
                                    {order.tokenSell.symbol}: {formatTokenBalance(order.tokenSell.balance || '0')}
                                  </div>
                                  <div>
                                    {order.tokenBuy.symbol}: {formatTokenBalance(order.tokenBuy.balance || '0')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="space-y-1">
                              <div className="font-medium text-zinc-200">
                                {parseFloat(order.amount).toFixed(4)} {order.tokenSell.symbol}
                              </div>
                              <div className="text-sm text-red-300">
                                -{order.dropPercentage}% drop
                              </div>
                              <div className="text-xs text-zinc-400">
                                Trigger: {order.triggerPrice}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="space-y-1">
                              <div className="font-medium text-zinc-200">
                                {order.currentPrice}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatTimeAgo(order.createdAt)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusConfig.label}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center justify-center space-x-2">
                              {order.status === OrderStatus.Active ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePauseOrder(order.id)}
                                  disabled={!!loadingAction}
                                  className="bg-yellow-900/20 border-yellow-700 text-yellow-300 hover:bg-yellow-800/30 px-2 py-1 h-auto text-xs"
                                >
                                  {loadingAction === 'pausing' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3 mr-1" />
                                      Pause
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResumeOrder(order.id)}
                                  disabled={!!loadingAction}
                                  className="bg-green-900/20 border-green-700 text-green-300 hover:bg-green-800/30 px-2 py-1 h-auto text-xs"
                                >
                                  {loadingAction === 'resuming' ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3 mr-1" />
                                      Resume
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={!!loadingAction}
                                className="bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30 px-2 py-1 h-auto text-xs"
                              >
                                {loadingAction === 'cancelling' ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Completed Orders Table */}
        {!isLoading && completedOrders.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-blue-400" />
                Order History ({completedOrders.length})
              </CardTitle>
              <CardDescription className="text-zinc-300">
                Your completed, cancelled, and failed orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Order</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Amount & Trigger</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Status</th>
                      <th className="text-left py-3 px-2 text-zinc-400 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((order) => {
                      const statusConfig = STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig.icon;

                      return (
                        <tr key={order.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                          <td className="py-4 px-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-sm font-bold text-white">
                                #{order.id}
                              </div>
                              <div>
                                <div className="font-medium text-zinc-100">
                                  {order.tokenSell.symbol} → {order.tokenBuy.symbol}
                                </div>
                                <div className="text-xs text-zinc-400">
                                  {formatTimeAgo(order.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="space-y-1">
                              <div className="font-medium text-zinc-200">
                                {parseFloat(order.amount).toFixed(4)} {order.tokenSell.symbol}
                              </div>
                              <div className="text-sm text-zinc-400">
                                -{order.dropPercentage}% trigger
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusConfig.label}</span>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="text-sm text-zinc-400">
                              {order.executedAt > 0 
                                ? formatTimeAgo(order.executedAt)
                                : 'N/A'
                              }
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && orders.length === 0 && (
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="py-12">
              <div className="text-center">
                <Target className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-zinc-200 mb-2">No stop orders found</h3>
                <p className="text-zinc-400 mb-6">
                  Create your first stop order to automatically protect your investments
                </p>
                <Link href="/automations/stop-order">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Stop Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}