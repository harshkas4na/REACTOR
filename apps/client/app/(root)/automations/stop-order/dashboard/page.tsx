'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Simplified types
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
  tokenSellSymbol: string;
  tokenBuySymbol: string;
  amount: string;
  currentPrice: string;
  triggerPrice: string;
  status: OrderStatus;
  createdAt: number;
  executedAt: number;
  network: string;
  dropPercentage: number;
}

// Simplified dummy data
const DUMMY_ORDERS: StopOrder[] = [
  {
    id: 1,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    tokenSellSymbol: 'ETH',
    tokenBuySymbol: 'USDC',
    amount: '1.5',
    currentPrice: '3,450.32',
    triggerPrice: '3,105.29',
    status: OrderStatus.Active,
    createdAt: Date.now() - 86400000,
    executedAt: 0,
    network: 'Ethereum',
    dropPercentage: 10
  },
  {
    id: 2,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    tokenSellSymbol: 'LINK',
    tokenBuySymbol: 'ETH',
    amount: '500',
    currentPrice: '14.23',
    triggerPrice: '12.10',
    status: OrderStatus.Executed,
    createdAt: Date.now() - 172800000,
    executedAt: Date.now() - 3600000,
    network: 'Ethereum',
    dropPercentage: 15
  },
  {
    id: 3,
    client: '0x742d35Cc6634C0532925a3b8D6Ac6C49BB24b9c8',
    tokenSellSymbol: 'WAVAX',
    tokenBuySymbol: 'USDC',
    amount: '25.0',
    currentPrice: '38.75',
    triggerPrice: '31.00',
    status: OrderStatus.Paused,
    createdAt: Date.now() - 259200000,
    executedAt: 0,
    network: 'Avalanche',
    dropPercentage: 20
  }
];

// Simplified status config
const STATUS_CONFIG = {
  [OrderStatus.Active]: {
    label: 'Active',
    color: 'bg-green-500',
    textColor: 'text-green-300',
    icon: Activity
  },
  [OrderStatus.Paused]: {
    label: 'Paused',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-300',
    icon: Pause
  },
  [OrderStatus.Executed]: {
    label: 'Executed',
    color: 'bg-blue-500',
    textColor: 'text-blue-300',
    icon: CheckCircle
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    color: 'bg-gray-500',
    textColor: 'text-gray-400',
    icon: X
  },
  [OrderStatus.Failed]: {
    label: 'Failed',
    color: 'bg-red-500',
    textColor: 'text-red-300',
    icon: AlertCircle
  }
};

export default function SimplifiedStopOrderDashboard() {
  const [orders, setOrders] = useState<StopOrder[]>(DUMMY_ORDERS);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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

  // Filter active vs completed orders
  const activeOrders = orders.filter(order => 
    order.status === OrderStatus.Active || order.status === OrderStatus.Paused
  );
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.Executed || order.status === OrderStatus.Cancelled || order.status === OrderStatus.Failed
  );

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Recently';
  };

  // Simplified action handlers
  const handleTogglePause = async (orderId: number, currentStatus: OrderStatus) => {
    setIsLoading(true);
    try {
      const newStatus = currentStatus === OrderStatus.Active ? OrderStatus.Paused : OrderStatus.Active;
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast.success(newStatus === OrderStatus.Paused ? 'Order paused' : 'Order resumed');
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (orderId: number) => {
    setIsLoading(true);
    try {
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: OrderStatus.Cancelled } : order
      ));
      toast.success('Order cancelled');
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified status badge
  const StatusBadge = ({ status }: { status: OrderStatus }) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center space-x-1 ${config.textColor}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  };

  // Simplified order card
  const OrderCard = ({ order }: { order: StopOrder }) => (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-sm font-bold text-white">
              #{order.id}
            </div>
            <div>
              <h3 className="font-medium text-zinc-100">
                {order.tokenSellSymbol} → {order.tokenBuySymbol}
              </h3>
              <p className="text-xs text-zinc-400">{order.network} • {formatTimeAgo(order.createdAt)}</p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
          <div>
            <p className="text-zinc-400 text-xs">Amount</p>
            <p className="text-zinc-200 font-medium">{order.amount} {order.tokenSellSymbol}</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Drop %</p>
            <p className="text-red-300 font-medium">{order.dropPercentage}%</p>
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Trigger at</p>
            <p className="text-amber-300 font-medium">${order.triggerPrice}</p>
          </div>
        </div>

        {/* Actions - only show for active/paused orders */}
        {(order.status === OrderStatus.Active || order.status === OrderStatus.Paused) && (
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleTogglePause(order.id, order.status)}
              disabled={isLoading}
              className="flex-1 bg-yellow-900/20 border-yellow-700 text-yellow-300 hover:bg-yellow-800/30"
            >
              {order.status === OrderStatus.Active ? (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </>
              )}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleCancel(order.id)}
              disabled={isLoading}
              className="flex-1 bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {/* Execution info for completed orders */}
        {order.status === OrderStatus.Executed && (
          <div className="mt-3 p-2 bg-green-900/20 rounded border border-green-500/20">
            <p className="text-xs text-green-300">
              ✅ Executed {formatTimeAgo(order.executedAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Simplified Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
                Your Stop Orders
              </h1>
              <p className="text-xl text-zinc-300">
                Monitor and manage your automated orders
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
              <Link href="/automations/stop-order">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              </Link>
            </div>
          </div>

          {/* Simple Stats */}
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

        {/* Connected Account */}
        {connectedAccount && (
          <Alert className="mb-6 bg-blue-900/20 border-blue-500/50">
            <Eye className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-zinc-200">
              Wallet: <span className="font-mono text-blue-300">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Simplified Tabs - Just Active and History */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">Your Orders</CardTitle>
            <CardDescription className="text-zinc-300">
              Manage your stop orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
                <TabsTrigger value="active" className="data-[state=active]:bg-green-600">
                  Active ({activeOrders.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">
                  History ({completedOrders.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-zinc-200 mb-2">No active orders</h3>
                    <p className="text-zinc-400 mb-4">
                      Create your first stop order to protect your trades
                    </p>
                    <Link href="/automations/stop-order">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Create Stop Order
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                {completedOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-zinc-200 mb-2">No completed orders</h3>
                    <p className="text-zinc-400">
                      Your executed and cancelled orders will appear here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {completedOrders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Simple Help Section */}
        <Card className="mt-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 flex items-center">
              <TrendingDown className="w-5 h-5 mr-2" />
              How Stop Orders Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-300 mb-4">
              Stop orders automatically sell your tokens when prices drop to protect you from losses. 
              They monitor prices 24/7 and execute trades instantly when your trigger price is reached.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="font-medium text-zinc-200 mb-1">Active</h3>
                <p className="text-sm text-zinc-400">Monitoring prices</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <Pause className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="font-medium text-zinc-200 mb-1">Paused</h3>
                <p className="text-sm text-zinc-400">Temporarily stopped</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="font-medium text-zinc-200 mb-1">Executed</h3>
                <p className="text-sm text-zinc-400">Successfully completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}