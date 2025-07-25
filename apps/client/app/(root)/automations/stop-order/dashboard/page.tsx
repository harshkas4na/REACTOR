'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  CheckCircle, 
  Clock, 
  X, 
  Pause, 
  Play, 
  ExternalLink, 
  RefreshCw, 
  TrendingDown, 
  AlertCircle,
  Target,
  Eye,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types matching the smart contract
enum OrderStatus {
  Active = 0,
  Paused = 1,
  Cancelled = 2,
  Executed = 3,
  Failed = 4
}

interface StopOrder {
  id: number;
  client: string;
  pair: string;
  tokenSell: string;
  tokenBuy: string;
  amount: string;
  sellToken0: boolean;
  coefficient: number;
  threshold: number;
  status: OrderStatus;
  createdAt: number;
  executedAt: number;
  retryCount: number;
  lastExecutionAttempt: number;
  // Additional computed fields for UI
  tokenSellSymbol: string;
  tokenBuySymbol: string;
  currentPrice: string;
  triggerPrice: string;
  network: string;
  executionHash?: string;
}

// Dummy data for demonstration
const DUMMY_ORDERS: StopOrder[] = [
  {
    id: 1,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    pair: '0x4C4d...8b64',
    tokenSell: '0xA0b8...63c0',
    tokenBuy: '0x291e...7f46',
    amount: '1.5',
    sellToken0: true,
    coefficient: 1000,
    threshold: 900,
    status: OrderStatus.Active,
    createdAt: Date.now() - 86400000, // 1 day ago
    executedAt: 0,
    retryCount: 0,
    lastExecutionAttempt: 0,
    tokenSellSymbol: 'ETH',
    tokenBuySymbol: 'USDC',
    currentPrice: '3,450.32',
    triggerPrice: '3,105.29',
    network: 'Ethereum',
  },
  {
    id: 2,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    pair: '0x7B73...2a1c',
    tokenSell: '0x514f...86CA',
    tokenBuy: '0xA0b8...63c0',
    amount: '500',
    sellToken0: false,
    coefficient: 1000,
    threshold: 850,
    status: OrderStatus.Executed,
    createdAt: Date.now() - 172800000, // 2 days ago
    executedAt: Date.now() - 3600000, // 1 hour ago
    retryCount: 0,
    lastExecutionAttempt: Date.now() - 3600000,
    tokenSellSymbol: 'LINK',
    tokenBuySymbol: 'ETH',
    currentPrice: '14.23',
    triggerPrice: '12.10',
    network: 'Ethereum',
    executionHash: '0xabcd...ef12'
  },
  {
    id: 3,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    pair: '0x9B71...4d2e',
    tokenSell: '0xB31f...66c7',
    tokenBuy: '0xB97E...8a6E',
    amount: '25.0',
    sellToken0: true,
    coefficient: 1000,
    threshold: 800,
    status: OrderStatus.Paused,
    createdAt: Date.now() - 259200000, // 3 days ago
    executedAt: 0,
    retryCount: 0,
    lastExecutionAttempt: 0,
    tokenSellSymbol: 'WAVAX',
    tokenBuySymbol: 'USDC',
    currentPrice: '38.75',
    triggerPrice: '31.00',
    network: 'Avalanche',
  },
  {
    id: 4,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    pair: '0x2C7a...8f3b',
    tokenSell: '0x2260...2C599',
    tokenBuy: '0xA0b8...63c0',
    amount: '0.05',
    sellToken0: true,
    coefficient: 1000,
    threshold: 950,
    status: OrderStatus.Failed,
    createdAt: Date.now() - 432000000, // 5 days ago
    executedAt: 0,
    retryCount: 3,
    lastExecutionAttempt: Date.now() - 86400000,
    tokenSellSymbol: 'WBTC',
    tokenBuySymbol: 'ETH',
    currentPrice: '43,250.00',
    triggerPrice: '41,087.50',
    network: 'Ethereum',
  }
];

const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: Activity,
    description: 'Monitoring price movements'
  },
  [OrderStatus.Paused]: {
    label: 'Paused',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: Pause,
    description: 'Temporarily suspended'
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    icon: X,
    description: 'Cancelled by user'
  },
  [OrderStatus.Executed]: {
    label: 'Executed',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: CheckCircle,
    description: 'Successfully completed'
  },
  [OrderStatus.Failed]: {
    label: 'Failed',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: AlertCircle,
    description: 'Execution failed'
  }
};

export default function StopOrderDashboard() {
  const [orders, setOrders] = useState<StopOrder[]>(DUMMY_ORDERS);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');

  // Get connected account
  useEffect(() => {
    const getConnectedAccount = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setConnectedAccount(accounts[0].address);
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }
    };
    getConnectedAccount();
  }, []);

  // Filter orders based on selected tab
  const filteredOrders = orders.filter(order => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return order.status === OrderStatus.Active;
    if (selectedTab === 'executed') return order.status === OrderStatus.Executed;
    if (selectedTab === 'paused') return order.status === OrderStatus.Paused;
    if (selectedTab === 'cancelled') return order.status === OrderStatus.Cancelled;
    if (selectedTab === 'failed') return order.status === OrderStatus.Failed;
    return true;
  });

  // Stats calculation
  const stats = {
    total: orders.length,
    active: orders.filter(o => o.status === OrderStatus.Active).length,
    executed: orders.filter(o => o.status === OrderStatus.Executed).length,
    paused: orders.filter(o => o.status === OrderStatus.Paused).length,
    failed: orders.filter(o => o.status === OrderStatus.Failed).length,
  };

  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  const handlePauseOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      // TODO: Call contract function to pause order
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: OrderStatus.Paused }
          : order
      ));
      toast.success('Order paused successfully');
    } catch (error) {
      toast.error('Failed to pause order');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      // TODO: Call contract function to resume order
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: OrderStatus.Active }
          : order
      ));
      toast.success('Order resumed successfully');
    } catch (error) {
      toast.error('Failed to resume order');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      // TODO: Call contract function to cancel order
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: OrderStatus.Cancelled }
          : order
      ));
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel order');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={`${config.textColor} ${config.bgColor} border-current flex items-center space-x-1`}
      >
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const OrderCard = ({ order }: { order: StopOrder }) => (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center font-bold text-white">
              #{order.id}
            </div>
            <div>
              <CardTitle className="text-lg text-zinc-100">
                {order.tokenSellSymbol} → {order.tokenBuySymbol}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {order.network} • {formatTimeAgo(order.createdAt)}
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-400">Amount</p>
            <p className="text-sm font-medium text-zinc-200">{order.amount} {order.tokenSellSymbol}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Current Price</p>
            <p className="text-sm font-medium text-zinc-200">${order.currentPrice}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Trigger Price</p>
            <p className="text-sm font-medium text-amber-300">${order.triggerPrice}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Drop %</p>
            <p className="text-sm font-medium text-red-300">
              {(((1 - order.threshold / order.coefficient) * 100)).toFixed(1)}%
            </p>
          </div>
        </div>

        {order.status === OrderStatus.Executed && order.executionHash && (
          <div className="p-3 bg-green-900/20 rounded border border-green-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-300">Executed on {formatTimestamp(order.executedAt)}</span>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-green-400 hover:text-green-300"
                onClick={() => window.open(`https://etherscan.io/tx/${order.executionHash}`, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Tx
              </Button>
            </div>
          </div>
        )}

        {order.status === OrderStatus.Failed && (
          <div className="p-3 bg-red-900/20 rounded border border-red-500/20">
            <p className="text-xs text-red-300">
              Failed after {order.retryCount} retries • Last attempt: {formatTimeAgo(order.lastExecutionAttempt)}
            </p>
          </div>
        )}

        <div className="flex space-x-2">
          {order.status === OrderStatus.Active && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handlePauseOrder(order.id)}
                disabled={isLoading}
                className="bg-yellow-900/20 border-yellow-700 text-yellow-300 hover:bg-yellow-800/30"
              >
                <Pause className="w-3 h-3 mr-1" />
                Pause
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleCancelOrder(order.id)}
                disabled={isLoading}
                className="bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </>
          )}
          
          {order.status === OrderStatus.Paused && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleResumeOrder(order.id)}
                disabled={isLoading}
                className="bg-green-900/20 border-green-700 text-green-300 hover:bg-green-800/30"
              >
                <Play className="w-3 h-3 mr-1" />
                Resume
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleCancelOrder(order.id)}
                disabled={isLoading}
                className="bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                Stop Orders Dashboard
              </h1>
              <p className="text-xl text-zinc-300">
                Monitor and manage all your automated stop orders
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => window.open('/automations/stop-order', '_blank')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Target className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-zinc-100">{stats.total}</h3>
                <p className="text-sm text-zinc-400">Total Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/40 to-blue-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-green-300">{stats.active}</h3>
                <p className="text-sm text-zinc-400">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-blue-300">{stats.executed}</h3>
                <p className="text-sm text-zinc-400">Executed</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-yellow-300">{stats.paused}</h3>
                <p className="text-sm text-zinc-400">Paused</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-900/40 to-pink-900/40 border-zinc-800">
              <CardContent className="p-4 text-center">
                <h3 className="text-2xl font-bold text-red-300">{stats.failed}</h3>
                <p className="text-sm text-zinc-400">Failed</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Connected Account */}
        {connectedAccount && (
          <Alert className="mb-6 bg-blue-900/20 border-blue-500/50">
            <Eye className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-zinc-200">
              Showing orders for: <span className="font-mono text-blue-300">{connectedAccount}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Orders */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Your Stop Orders</CardTitle>
            <CardDescription className="text-zinc-300">
              Manage your automated trading orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-6 bg-zinc-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-blue-600">All</TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-green-600">Active</TabsTrigger>
                <TabsTrigger value="executed" className="data-[state=active]:bg-blue-600">Executed</TabsTrigger>
                <TabsTrigger value="paused" className="data-[state=active]:bg-yellow-600">Paused</TabsTrigger>
                <TabsTrigger value="cancelled" className="data-[state=active]:bg-gray-600">Cancelled</TabsTrigger>
                <TabsTrigger value="failed" className="data-[state=active]:bg-red-600">Failed</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-6">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-zinc-200 mb-2">No orders found</h3>
                    <p className="text-zinc-400 mb-4">
                      {selectedTab === 'all' 
                        ? "You haven't created any stop orders yet."
                        : `No ${selectedTab} orders found.`
                      }
                    </p>
                    <Button
                      onClick={() => window.open('/automations/stop-order', '_blank')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Create Your First Stop Order
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="mt-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Understanding Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const Icon = config.icon;
                return (
                  <div key={status} className="flex items-start space-x-3 p-4 bg-zinc-800/50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-200">{config.label}</h3>
                      <p className="text-sm text-zinc-400">{config.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}