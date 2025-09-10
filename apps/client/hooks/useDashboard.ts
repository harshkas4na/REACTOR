import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { 
  StopOrder, 
  UserContractAddresses, 
  ContractBalances,
  ChainConfig,
  OrderStatus 
} from '../types/dashboard';
import { SUPPORTED_CHAINS, REACTIVE_STOP_ORDER_ABI, PAIR_ABI } from '../config/dashboard';
import { 
  validateStoredContracts, 
  fetchTokenInfo, 
  calculateOrderMetrics 
} from '../utils/dashboardUtils';

export const useDashboard = () => {
  // ===== STATE =====
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

  // Convex hook to get contract data
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");

  // ===== ORDER FETCHING =====
  const fetchUserOrders = useCallback(async () => {
    if (!connectedAccount) return;

    console.log('🔍 DASHBOARD: Fetching orders for account:', connectedAccount);
    setIsLoading(true);
    
    try {
      // Check for user's deployed contracts using Convex data
      if (!contractData) {
        console.log('ℹ️ DASHBOARD: No contracts found for user in Convex');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      // Convert Convex data to UserContractAddresses format
      const storedContracts: UserContractAddresses = {
        reactiveContract: contractData.rscContract,
        callbackContract: contractData.callbackContract,
        deployedAt: Date.now(),
        chainId: contractData.chainId,
        deployer: contractData.userAddress.toLowerCase()
      };

      console.log('🔍 DASHBOARD: Convex data converted to contracts:', storedContracts);

      // Always use the first supported chain (Sepolia) for contract operations
      const targetChain = SUPPORTED_CHAINS[0];
      
      // Create proper providers for each network
      const sepoliaProvider = new ethers.JsonRpcProvider(targetChain.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
      const rscProvider = new ethers.JsonRpcProvider(targetChain.rscNetwork.rpcUrl);

      // Validate contracts using proper providers
      const valid = await validateStoredContracts(storedContracts, rscProvider, sepoliaProvider, connectedAccount);
      
      if (!valid) {
        console.log('❌ DASHBOARD: Stored contracts are invalid');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        return;
      }

      setUserContracts(storedContracts);
      setContractsValid(true);
      setConnectedChain(targetChain);

      const reactiveContract = new ethers.Contract(
        storedContracts.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        rscProvider
      );

      console.log('📋 DASHBOARD: Using reactive contract address:', storedContracts.reactiveContract);

      // Get all user's orders from RSC network
      const [activeOrders, executedOrders, cancelledOrders] = await reactiveContract.getAllUserOrders(connectedAccount);
      const allOrderIds = [...activeOrders, ...executedOrders, ...cancelledOrders];
      
      console.log('📋 DASHBOARD: All order IDs:', allOrderIds);
      
      if (allOrderIds.length === 0) {
        console.log('ℹ️ DASHBOARD: No orders found for user');
        setOrders([]);
        return;
      }

      // Fetch all order details
      const orderPromises = allOrderIds.map(async (orderId: bigint) => {
        try {
          console.log('📋 DASHBOARD: Fetching order:', Number(orderId));
          const orderData = await reactiveContract.getStopOrder(orderId);
          console.log('📋 DASHBOARD: Raw order data:', orderData);
          
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
            contractAddress: storedContracts.reactiveContract
          };

          console.log('✅ DASHBOARD: Processed order:', order);
          return order;
        } catch (error) {
          console.error('❌ DASHBOARD: Error fetching order:', orderId, error);
          return null;
        }
      });

      const resolvedOrders = await Promise.all(orderPromises);
      const validOrders = resolvedOrders.filter(order => order !== null) as StopOrder[];
      
      // Sort by creation time (newest first)
      validOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('✅ DASHBOARD: Final orders:', validOrders);
      setOrders(validOrders);
    } catch (error) {
      console.error('❌ DASHBOARD: Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
      setUserContracts(null);
      setContractsValid(false);
    } finally {
      setIsLoading(false);
    }
  }, [connectedAccount, contractData]);

  // ===== REFRESH DATA =====
  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchUserOrders();
    setIsRefreshing(false);
    toast.success('Orders refreshed');
  };

  // ===== CANCEL ORDER =====
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

  // Effect to fetch orders when we have both account and contract data
  useEffect(() => {
    if (connectedAccount && contractData !== undefined) {
      fetchUserOrders();
    }
  }, [connectedAccount, contractData, fetchUserOrders]);

  // ===== COMPUTED VALUES =====
  const activeOrders = orders.filter(order => order.status === OrderStatus.Active);
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.Executed || 
    order.status === OrderStatus.Cancelled || 
    order.status === OrderStatus.Failed
  );

  const orderStats = {
    total: orders.length,
    active: activeOrders.length,
    executed: orders.filter(o => o.status === OrderStatus.Executed).length,
    cancelled: orders.filter(o => o.status === OrderStatus.Cancelled).length,
    failed: orders.filter(o => o.status === OrderStatus.Failed).length
  };

  return {
    // State
    orders,
    activeOrders,
    completedOrders,
    connectedAccount,
    connectedChain,
    isLoading,
    isRefreshing,
    actionLoading,
    userContracts,
    contractsValid,
    contractBalances,
    orderStats,

    // Actions
    setConnectedAccount,
    setContractBalances,
    refreshData,
    handleCancelOrder,
    fetchUserOrders
  };
};