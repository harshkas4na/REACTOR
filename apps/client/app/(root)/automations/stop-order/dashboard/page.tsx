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
    rpcUrl: 'https://base.llamarpc.com',
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

// ===== CONTRACT FUNDING STATUS CHECKS =====
const checkContractFundingStatus = async (
  contracts: UserContractAddresses,
  rscProvider: ethers.JsonRpcProvider
): Promise<{ debt: string; reserves: string; isActive: boolean; callbackDebt: string; rscDebt: string }> => {
  try {
    const systemContractAddress = '0x0000000000000000000000000000000000fffFfF';
    let callbackProxyAddress = '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'; // Default Sepolia proxy
    
    // Set callback proxy based on the contracts' chain
    if (contracts.chainId === '8453') { // Base mainnet
      callbackProxyAddress = '0x0D3E76De6bC44309083cAAFdB49A088B8a250947'; 
    }
    
    const systemContract = new ethers.Contract(
      systemContractAddress,
      [
        'function debts(address) view returns (uint256)',
        'function reserves(address) view returns (uint256)'
      ],
      rscProvider
    );

    // Check debt and reserves for RSC contract using system contract
    const [reactiveDebt, reactiveReserves] = await Promise.all([
      systemContract.debts(contracts.reactiveContract),
      systemContract.reserves(contracts.reactiveContract)
    ]);

    // Check callback contract debt using appropriate proxy
    let callbackDebt = BigInt(0);
    try {
      const callbackProvider = contracts.chainId === '8453' 
        ? new ethers.JsonRpcProvider('https://base.llamarpc.com')
        : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        
      if (callbackProxyAddress !== '0x0000000000000000000000000000000000000000') {
        const callbackProxyContract = new ethers.Contract(
          callbackProxyAddress,
          ['function debts(address) view returns (uint256)'],
          callbackProvider
        );
        callbackDebt = await callbackProxyContract.debts(contracts.callbackContract);
      }
    } catch (callbackError) {
      console.warn('Could not check callback contract debt:', callbackError);
    }

    // Check actual balances
    const [reactiveBalance, callbackBalance] = await Promise.all([
      rscProvider.getBalance(contracts.reactiveContract),
      (contracts.chainId === '8453' 
        ? new ethers.JsonRpcProvider('https://base.llamarpc.com')
        : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
      ).getBalance(contracts.callbackContract)
    ]);

    // Convert to readable format
    const totalDebt = reactiveDebt + callbackDebt;
    const totalReserves = reactiveReserves;
    
    // Contract is active if it has sufficient balance and reserves > debt
    const hasBalance = reactiveBalance > ethers.parseEther('0.0001') && callbackBalance > ethers.parseEther('0.00001');
    
    const isActive = totalReserves >= totalDebt && hasBalance;
    
    console.log('DASHBOARD: Contract funding status:', {
      reactiveContract: contracts.reactiveContract,
      callbackContract: contracts.callbackContract,
      chainId: contracts.chainId,
      reactiveDebt: ethers.formatEther(reactiveDebt),
      reactiveReserves: ethers.formatEther(reactiveReserves),
      callbackDebt: ethers.formatEther(callbackDebt),
      reactiveBalance: ethers.formatEther(reactiveBalance),
      callbackBalance: ethers.formatEther(callbackBalance),
      totalDebt: ethers.formatEther(totalDebt),
      totalReserves: ethers.formatEther(totalReserves),
      hasBalance,
      isActive
    });

    return {
      debt: ethers.formatEther(totalDebt),
      reserves: ethers.formatEther(totalReserves),
      isActive,
      callbackDebt: ethers.formatEther(callbackDebt),
      rscDebt: ethers.formatEther(reactiveDebt)
    };
  } catch (error) {
    console.error('Error checking funding status:', error);
    return { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' };
  }
};

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

// ===== ENHANCED DROP PERCENTAGE FORMATTING =====
const formatDropPercentage = (percentage: number): string => {
  if (percentage === 0) return '0%';
  
  // Use appropriate precision based on magnitude
  if (percentage < 0.01) {
    return `${percentage.toFixed(4)}%`; // 4 decimal places for very small values
  } else if (percentage < 0.1) {
    return `${percentage.toFixed(3)}%`; // 3 decimal places for small values
  } else if (percentage < 1) {
    return `${percentage.toFixed(2)}%`; // 2 decimal places for moderate values
  } else {
    return `${percentage.toFixed(1)}%`; // 1 decimal place for larger values
  }
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
  userAddress: string
): Promise<{ isValid: boolean; fundingStatus: { debt: string; reserves: string; isActive: boolean; callbackDebt: string; rscDebt: string } }> => {
  try {
    console.log('DASHBOARD: Validating personal contracts:', contracts);
    
    const normalizedUserAddress = userAddress.toLowerCase().trim();
    const normalizedContractDeployer = contracts.deployer.toLowerCase().trim();
    
    // First check: User must be the deployer (using stored deployer address from Convex)
    if (normalizedUserAddress !== normalizedContractDeployer) {
      console.error('DASHBOARD VALIDATION FAILED: User is not the deployer');
      console.error('User address:', normalizedUserAddress);
      console.error('Contract deployer:', normalizedContractDeployer);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check funding status
    const fundingStatus = await checkContractFundingStatus(contracts, rscProvider);
    
    console.log('DASHBOARD VALIDATION SUCCESS: All contracts verified');
    return { isValid: true, fundingStatus };
  } catch (error) {
    console.error('DASHBOARD VALIDATION ERROR:', error);
    return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
  }
};

// ===== BASE MAINNET TOKEN DATABASE =====
const BASE_TOKEN_DATABASE: Record<string, Token> = {
  // USDC on Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  // DAI on Base  
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18
  },
  // WETH on Base
  '0x4200000000000000000000000000000000000006': {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18
  },
  // cbETH on Base
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': {
    address: '0x2Ae3F1Ec7F1F5012CFEAb0185bfc7aa3cf0DEc22',
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    decimals: 18
  }
};

// ===== MULTIPLE BASE RPC ENDPOINTS =====
const BASE_RPC_ENDPOINTS = [
  'https://base.llamarpc.com'
];

// ===== ENHANCED ADDRESS VALIDATION =====
const isValidAddress = (address: string): boolean => {
  if (!address) return false;
  if (!ethers.isAddress(address)) return false;
  // Check for zero address
  if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') return false;
  return true;
};

// ===== ENHANCED CONTRACT EXISTENCE CHECK =====
const checkContractExists = async (address: string, provider: ethers.JsonRpcProvider): Promise<boolean> => {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    console.warn(`Failed to check contract existence for ${address}:`, error);
    return false;
  }
};

// ===== ENHANCED TOKEN FETCHING WITH BASE SUPPORT =====
const fetchTokenInfoSafe = async (
  address: string, 
  provider: ethers.JsonRpcProvider, 
  chainId?: string,
  retryCount = 2
): Promise<Token> => {
  const addressLower = address.toLowerCase();
  
  // Validate address first
  if (!isValidAddress(address)) {
    throw new Error(`Invalid token address: ${address}`);
  }
  
  // Check Base token database first for known tokens
  if (chainId === '8453' && BASE_TOKEN_DATABASE[addressLower]) {
    console.log(`Using Base token database for ${address}: ${BASE_TOKEN_DATABASE[addressLower].symbol}`);
    return BASE_TOKEN_DATABASE[addressLower];
  }

  // For Base Mainnet, try multiple RPC providers
  if (chainId === '8453') {
    for (const rpcUrl of BASE_RPC_ENDPOINTS) {
      try {
        console.log(`Trying Base RPC: ${rpcUrl} for token ${address}`);
        const alternateProvider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Check if contract exists
        const exists = await checkContractExists(address, alternateProvider);
        if (!exists) {
          console.warn(`Contract does not exist at ${address} on ${rpcUrl}`);
          continue;
        }
        
        const result = await fetchTokenInfoWithProvider(address, alternateProvider, retryCount);
        console.log(`Successfully fetched from ${rpcUrl}:`, result);
        return result;
      } catch (error) {
        console.warn(`Failed with RPC ${rpcUrl}:`, error);
        continue;
      }
    }
  }

  // Fallback to original provider
  return await fetchTokenInfoWithProvider(address, provider, retryCount);
};

// ===== PROVIDER-SPECIFIC TOKEN FETCHER =====
const fetchTokenInfoWithProvider = async (
  address: string,
  provider: ethers.JsonRpcProvider,
  retryCount = 2
): Promise<Token> => {
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Fetching token info for ${address}, attempt ${i + 1}`);
      
      const tokenContract = new ethers.Contract(address, TOKEN_ABI, provider);
      
      let symbol = 'UNKNOWN';
      let name = 'Unknown Token';
      let decimals = 18;

      // Try different approaches with shorter timeouts for Base
      const timeout = 10000; // 10 seconds timeout
      
      try {
        symbol = await Promise.race([
          tokenContract.symbol({ gasLimit: 100000 }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      } catch (error) {
        console.warn(`Symbol fetch failed for ${address}:`, error);
        symbol = `${address.slice(2, 6).toUpperCase()}`;
      }

      try {
        name = await Promise.race([
          tokenContract.name({ gasLimit: 100000 }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
      } catch (error) {
        console.warn(`Name fetch failed for ${address}:`, error);
        name = `Token ${address.slice(0, 6)}...${address.slice(-4)}`;
      }

      try {
        const decimalsResult = await Promise.race([
          tokenContract.decimals({ gasLimit: 100000 }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);
        decimals = Number(decimalsResult);
      } catch (error) {
        console.warn(`Decimals fetch failed for ${address}:`, error);
        decimals = 18;
      }

      return {
        address: address.toLowerCase(),
        symbol,
        name,
        decimals
      };
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retryCount - 1) {
        // Return fallback
        return {
          address: address.toLowerCase(),
          symbol: `${address.slice(2, 6).toUpperCase()}`,
          name: `Token ${address.slice(0, 6)}...${address.slice(-4)}`,
          decimals: 18
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error('Unexpected error');
};

// ===== ENHANCED PRICE CALCULATION WITH BASE SUPPORT =====
const calculatePairPriceWithTokensSafe = async (
  pairAddress: string,
  sellTokenAddress: string,
  buyTokenAddress: string,
  provider: ethers.JsonRpcProvider,
  chainId?: string,
  retryCount = 2
): Promise<{ currentPrice: number; sellToken: Token; buyToken: Token }> => {
  
  // Validate pair address first
  if (!isValidAddress(pairAddress)) {
    throw new Error(`Invalid pair address: ${pairAddress}`);
  }
  
  // For Base Mainnet, try multiple RPC providers
  if (chainId === '8453') {
    for (const rpcUrl of BASE_RPC_ENDPOINTS) {
      try {
        console.log(`Trying pair calculation with Base RPC: ${rpcUrl}`);
        const alternateProvider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Test provider connectivity
        await alternateProvider.getNetwork();
        
        // Check if pair contract exists
        const exists = await checkContractExists(pairAddress, alternateProvider);
        if (!exists) {
          console.warn(`Pair contract does not exist at ${pairAddress} on ${rpcUrl}`);
          continue;
        }
        
        const result = await calculatePairPriceWithSpecificProvider(
          pairAddress,
          sellTokenAddress,
          buyTokenAddress,
          alternateProvider,
          chainId,
          retryCount
        );
        
        console.log(`Successfully calculated price with ${rpcUrl}`);
        return result;
      } catch (error) {
        console.warn(`Pair calculation failed with RPC ${rpcUrl}:`, error);
        continue;
      }
    }
    
    // All Base RPCs failed, return fallback
    console.error(`All Base RPC endpoints failed for pair ${pairAddress}`);
    const fallbackSellToken = await fetchTokenInfoSafe(sellTokenAddress, provider, chainId);
    const fallbackBuyToken = await fetchTokenInfoSafe(buyTokenAddress, provider, chainId);
    
    return {
      currentPrice: 0,
      sellToken: fallbackSellToken,
      buyToken: fallbackBuyToken
    };
  }
  
  // For non-Base chains, use the original provider
  return await calculatePairPriceWithSpecificProvider(
    pairAddress,
    sellTokenAddress,
    buyTokenAddress,
    provider,
    chainId,
    retryCount
  );
};

// ===== PROVIDER-SPECIFIC PAIR CALCULATOR =====
// ===== PROVIDER-SPECIFIC PAIR CALCULATOR (CORRECTED) =====
const calculatePairPriceWithSpecificProvider = async (
  pairAddress: string,
  sellTokenAddress: string,
  buyTokenAddress: string,
  provider: ethers.JsonRpcProvider,
  chainId?: string,
  retryCount = 2
): Promise<{ currentPrice: number; sellToken: Token; buyToken: Token }> => {
  
  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`Calculating price for pair ${pairAddress}, attempt ${i + 1}`);
      
      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      
      // Get pair info with timeout
      const timeout = 15000; // 15 seconds timeout
      
      const [reserves, token0Address, token1Address] = await Promise.race([
        Promise.all([
          pairContract.getReserves({ gasLimit: 200000 }),
          pairContract.token0({ gasLimit: 100000 }),
          pairContract.token1({ gasLimit: 100000 })
        ]),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Pair contract calls timeout')), timeout)
        )
      ]);
      
      console.log(`Successfully got pair data`);
      console.log(`Reserves: ${reserves[0].toString()}, ${reserves[1].toString()}`);
      console.log(`Tokens: ${token0Address}, ${token1Address}`);

      // Validate reserves
      if (!reserves || reserves.length < 2 || reserves[0] === BigInt(0) || reserves[1] === BigInt(0)) {
        throw new Error('No liquidity or invalid reserves data');
      }

      // Validate token addresses
      if (!isValidAddress(token0Address) || !isValidAddress(token1Address)) {
        throw new Error('Invalid token addresses from pair');
      }

      // Fetch token info with Base support
      const [token0Info, token1Info] = await Promise.all([
        fetchTokenInfoSafe(token0Address, provider, chainId),
        fetchTokenInfoSafe(token1Address, provider, chainId)
      ]);

      const sellTokenLower = sellTokenAddress.toLowerCase();
      const token0Lower = token0Address.toLowerCase();
      
      const isSellTokenToken0 = sellTokenLower === token0Lower;
      const sellToken = isSellTokenToken0 ? token0Info : token1Info;
      const buyToken = isSellTokenToken0 ? token1Info : token0Info;

      // =================================================================
      // ===== START: CORRECTED PRICE CALCULATION LOGIC ==================
      // =================================================================

      const reserve0 = reserves[0]; // Raw BigInt for token0
      const reserve1 = reserves[1]; // Raw BigInt for token1

      // **Step 1: Normalize both reserves to a common precision (18 decimals) using BigInt math.**
      // This prevents floating-point errors and handles different token decimals correctly.
      const adjustedReserve0 = reserve0 * (BigInt(10) ** BigInt(18 - token0Info.decimals));
      const adjustedReserve1 = reserve1 * (BigInt(10) ** BigInt(18 - token1Info.decimals));

      // **Step 2: Calculate the price, maintaining precision by scaling the numerator before division.**
      // We scale by 10**18 so the result is also a BigInt with 18 decimals of precision.
      let priceBigInt;
      if (isSellTokenToken0) {
        // Price of token0 in terms of token1
        priceBigInt = (adjustedReserve1 * (BigInt(10) ** BigInt(18))) / adjustedReserve0;
      } else {
        // Price of token1 in terms of token0
        priceBigInt = (adjustedReserve0 * (BigInt(10) ** BigInt(18))) / adjustedReserve1;
      }
      
      // **Step 3: Convert the final scaled BigInt price into a human-readable number.**
      const currentPrice = parseFloat(ethers.formatUnits(priceBigInt, 18));
      
      // =================================================================
      // ===== END: CORRECTED PRICE CALCULATION LOGIC ====================
      // =================================================================
      
      if (!isFinite(currentPrice) || currentPrice <= 0) {
        throw new Error('Invalid price calculation result');
      }

      console.log(`Successfully calculated price: ${currentPrice} for ${sellToken.symbol}/${buyToken.symbol}`);

      return {
        currentPrice,
        sellToken,
        buyToken
      };
    } catch (error) {
      console.error(`Price calculation attempt ${i + 1} failed:`, error);
      
      if (i === retryCount - 1) {
        console.error(`All price calculation attempts failed for pair ${pairAddress}`);
        
        // Return fallback data
        const fallbackSellToken = await fetchTokenInfoSafe(sellTokenAddress, provider, chainId);
        const fallbackBuyToken = await fetchTokenInfoSafe(buyTokenAddress, provider, chainId);
        
        return {
          currentPrice: 0,
          sellToken: fallbackSellToken,
          buyToken: fallbackBuyToken
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }

  throw new Error('Unexpected error in calculatePairPriceWithSpecificProvider');
};

// ===== DEBT CLEARING FUNCTIONALITY =====
const handleCoverDebt = async (
  userContracts: UserContractAddresses,
  connectedChain: ChainConfig,
  contractFundingStatus: { callbackDebt: string; rscDebt: string },
  onSuccess: () => void
) => {
  if (!connectedChain || !userContracts || !contractFundingStatus) {
    toast.error('Contract information not available');
    return;
  }

  // Get the correct ABIs for the chain
  const contractConfig = getContractABIs(userContracts.chainId);

  const originalChainId = userContracts.chainId;
  const rscChainId = connectedChain.rscNetwork.chainId;
  
  const callbackDebt = parseFloat(contractFundingStatus.callbackDebt);
  const rscDebt = parseFloat(contractFundingStatus.rscDebt);

  const switchNetwork = async (targetChainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

    try {
      const targetChainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === targetChainId) {
        console.log(`Already on chain ${targetChainId}`);
        return true;
      }

      console.log(`Switching from ${currentNetwork.chainId} to chain ${targetChainId}`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log(`Chain ${targetChainId} not added to wallet, attempting to add it`);
          
          let chainConfig;
          
          if (targetChainId === '5318007') {
            chainConfig = {
              chainId: targetChainIdHex,
              chainName: 'Reactive Lasna',
              nativeCurrency: {
                name: 'REACT',
                symbol: 'REACT',
                decimals: 18
              },
              rpcUrls: ['https://lasna-rpc.rnk.dev/'],
              blockExplorerUrls: ['https://lasna.reactscan.net']
            };
          } else if (targetChainId === '1597') {
            chainConfig = {
              chainId: targetChainIdHex,
              chainName: 'Reactive Mainnet',
              nativeCurrency: {
                name: 'REACT',
                symbol: 'REACT',
                decimals: 18
              },
              rpcUrls: ['https://mainnet-rpc.rnk.dev/'],
              blockExplorerUrls: ['https://reactscan.net']
            };
          } else if (targetChainId === '8453') {
            chainConfig = {
              chainId: targetChainIdHex,
              chainName: 'Base',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://base.llamarpc.com'],
              blockExplorerUrls: ['https://basescan.org']
            };
          }
          
          if (chainConfig) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig],
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          throw switchError;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newNetwork = await newProvider.getNetwork();
      
      if (newNetwork.chainId.toString() !== targetChainId) {
        throw new Error(`Network switch failed. Expected ${targetChainId}, got ${newNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to chain ${targetChainId}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  try {
    console.log('Starting debt covering process...');
    console.log(`Callback debt: ${callbackDebt} ETH, RSC debt: ${rscDebt} REACT`);

    // Step 1: Handle Callback Contract Debt (if exists)
    if (callbackDebt > 0) {
      console.log(`Covering callback debt: ${callbackDebt} ETH`);

      await switchNetwork(originalChainId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const callbackProvider = new ethers.BrowserProvider(window.ethereum);
      const callbackSigner = await callbackProvider.getSigner();

      const callbackFundingAmount = callbackDebt + 0.01;
      console.log(`Sending ${callbackFundingAmount} ETH to callback contract`);
      
      const fundCallbackTx = await callbackSigner.sendTransaction({
        to: userContracts.callbackContract,
        value: ethers.parseEther(callbackFundingAmount.toString()),
        gasLimit: 100000
      });
      
      await fundCallbackTx.wait();
      console.log('Funds sent to callback contract');

      console.log('Calling coverDebt on callback contract...');
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        callbackSigner
      );

      try {
        const coverDebtTx = await callbackContract.coverDebt({
          gasLimit: 200000
        });
        await coverDebtTx.wait();
        console.log('Callback debt covered successfully');
      } catch (coverError) {
        console.warn('Could not call coverDebt on callback contract (might not exist):', coverError);
      }

      toast.success('Callback contract debt covered!');
    }

    // Step 2: Handle RSC Contract Debt (if exists)
    if (rscDebt > 0) {
      console.log(`Covering RSC debt: ${rscDebt} REACT`);

      await switchNetwork(rscChainId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscSigner = await rscProvider.getSigner();

      const rscFundingAmount = rscDebt + 0.1;
      console.log(`Sending ${rscFundingAmount} REACT to RSC contract`);
      
      const fundRscTx = await rscSigner.sendTransaction({
        to: userContracts.reactiveContract,
        value: ethers.parseEther(rscFundingAmount.toString()),
        gasLimit: 100000
      });
      
      await fundRscTx.wait();
      console.log('Funds sent to RSC contract');

      console.log('Calling coverDebt on RSC contract...');
      const rscContract = new ethers.Contract(
        userContracts.reactiveContract,
        contractConfig.REACTIVE_STOP_ORDER_ABI,
        rscSigner
      );

      try {
        const coverDebtTx = await rscContract.coverDebt({
          gasLimit: 200000
        });
        await coverDebtTx.wait();
        console.log('RSC debt covered successfully');
      } catch (coverError) {
        console.warn('Could not call coverDebt on RSC contract (might not exist):', coverError);
      }

      toast.success('RSC contract debt covered!');
    }

    await switchNetwork(originalChainId);
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('All contract debts have been cleared! Your contracts are now active.');
    onSuccess();
    
  } catch (error: any) {
    console.error('Error covering debt:', error);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() !== originalChainId) {
        await switchNetwork(originalChainId);
      }
    } catch (switchError) {
      console.error('Failed to switch back to original network:', switchError);
    }
    
    if (error.message.includes('User denied') || error.code === 4001) {
      toast.error('Transaction cancelled by user');
    } else if (error.message.includes('insufficient funds')) {
      toast.error('Insufficient funds to cover debt');
    } else {
      toast.error(error.message || 'Failed to cover debt');
    }
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

  const MIN_CALLBACK_BALANCE = userContracts.chainId === '8453' ? 0.00001 : 0.001;
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
        ? 'https://base.llamarpc.com'
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
            rpcUrls: ['https://base.llamarpc.com'],
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
  
  // ===== NEW DEBT MANAGEMENT STATE =====
  const [contractFundingStatus, setContractFundingStatus] = useState<{
    debt: string;
    reserves: string;
    isActive: boolean;
    callbackDebt: string;
    rscDebt: string;
  } | null>(null);
  const [isCoveringDebt, setIsCoveringDebt] = useState(false);

  console.log("contractFundingStatus:::::::::::::::::",contractFundingStatus)
  // Convex hook to get contract data
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");

  // ===== DEBT CHECKING LOGIC =====
  const contractsHaveDebt = !!contractFundingStatus && (
    parseFloat(contractFundingStatus.callbackDebt) > 0 || 
    parseFloat(contractFundingStatus.rscDebt) > 0
  );

  const shouldDisableOrderActions = contractsHaveDebt && userContracts && contractsValid;

  // ===== ENHANCED ORDER FETCHING WITH DEBT CHECKING =====
  const fetchUserOrders = useCallback(async () => {
    if (!connectedAccount || !connectedChain) {
      console.log('DASHBOARD: Missing required data - account:', !!connectedAccount, 'chain:', !!connectedChain);
      return;
    }

    console.log(`DASHBOARD: Starting enhanced fetch for ${connectedAccount} on ${connectedChain.name}`);
    setIsLoading(true);
    
    try {
      if (!contractData) {
        console.log('DASHBOARD: No contract data from Convex');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        setContractFundingStatus(null);
        return;
      }

      if (contractData.chainId !== connectedChain.id) {
        console.log(`DASHBOARD: Chain mismatch - contracts on ${contractData.chainId}, connected to ${connectedChain.id}`);
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        setContractFundingStatus(null);
        return;
      }

      const storedContracts: UserContractAddresses = {
        reactiveContract: contractData.rscContract,
        callbackContract: contractData.callbackContract,
        deployedAt: Date.now(),
        chainId: contractData.chainId,
        deployer: contractData.userAddress.toLowerCase()
      };

      console.log('DASHBOARD: Using contracts:', storedContracts);

      // Setup providers with enhanced error handling
      let workingProvider: ethers.JsonRpcProvider | undefined;
      
      if (connectedChain.id === '8453') {
        // For Base, try multiple RPC endpoints
        console.log('DASHBOARD: Setting up Base Mainnet providers...');
        let providerFound = false;
        
        for (const rpcUrl of BASE_RPC_ENDPOINTS) {
          try {
            console.log(`Testing Base provider: ${rpcUrl}`);
            const testProvider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Test with timeout
            await Promise.race([
              testProvider.getNetwork(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Provider timeout')), 10000)
              )
            ]);
            
            workingProvider = testProvider;
            console.log(`Found working Base provider: ${rpcUrl}`);
            providerFound = true;
            break;
          } catch (error) {
            console.warn(`Base provider ${rpcUrl} failed:`, error);
            continue;
          }
        }
        
        if (!providerFound) {
          throw new Error('No working Base RPC provider found');
        }
      } else {
        // For other chains, use standard provider
        const callbackRpcUrl = connectedChain.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com';
        workingProvider = new ethers.JsonRpcProvider(callbackRpcUrl);
        await workingProvider.getNetwork();
        console.log('DASHBOARD: Standard provider connected successfully');
      }

      if (!workingProvider) {
        throw new Error('Working provider was not initialized');
      }

      const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);

      // ===== ENHANCED VALIDATION WITH DEBT CHECKING =====
      const validationResult = await validateStoredContracts(storedContracts, rscProvider, connectedAccount);
      
      if (!validationResult.isValid) {
        console.log('DASHBOARD: Contract validation failed');
        setOrders([]);
        setUserContracts(null);
        setContractsValid(false);
        setContractFundingStatus(null);
        return;
      }

      setUserContracts(storedContracts);
      setContractsValid(true);
      console.log("validationResult.fundingStatus:::::::::::::::::::",validationResult.fundingStatus)
      setContractFundingStatus(validationResult.fundingStatus);

      // Get contract ABI
      const contractConfig = getContractABIs(storedContracts.chainId);
      const callbackContract = new ethers.Contract(
        storedContracts.callbackContract,
        contractConfig.CALLBACK_CONTRACT_ABI,
        workingProvider
      );

      console.log('DASHBOARD: Fetching order IDs from contract...');

      // Get all order IDs with enhanced error handling and timeout
      let allOrderIds;
      const timeout = 20000; // 20 seconds timeout
      
      try {
        allOrderIds = await Promise.race([
          callbackContract.getAllOrders({ gasLimit: 500000 }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getAllOrders timeout')), timeout)
          )
        ]);
        
        console.log(`Successfully got ${allOrderIds.length} order IDs`);
      } catch (error:any) {
        console.error('Failed to fetch order IDs:', error);
        throw new Error(`Failed to fetch order IDs: ${error.message}`);
      }
      
      if (!allOrderIds || allOrderIds.length === 0) {
        console.log('DASHBOARD: No orders found in contract');
        setOrders([]);
        return;
      }

      console.log(`DASHBOARD: Processing ${allOrderIds.length} orders...`);

      // Process orders with enhanced error handling and retry mechanism
      const validOrders: StopOrder[] = [];
      const failedOrders: number[] = [];

      for (const orderId of allOrderIds) {
        const orderIdNum = Number(orderId);
        console.log(`DASHBOARD: Processing order ${orderIdNum}...`);
        
        try {
          // Fetch order data with enhanced retry mechanism
          let orderData;
          let orderFetchSuccess = false;
          
          // Try multiple approaches for getting order data
          const orderFetchAttempts = [
            () => callbackContract.getOrder(orderIdNum, { gasLimit: 400000 }),
            () => callbackContract.getOrder(orderIdNum, { gasLimit: 600000 }),
            () => callbackContract.getOrder(orderIdNum), // No gas limit
          ];
          
          for (let attempt = 0; attempt < orderFetchAttempts.length && !orderFetchSuccess; attempt++) {
            try {
              console.log(`Order ${orderIdNum} fetch attempt ${attempt + 1}`);
              orderData = await Promise.race([
                orderFetchAttempts[attempt](),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('getOrder timeout')), 15000)
                )
              ]);
              orderFetchSuccess = true;
              console.log(`Order ${orderIdNum} fetch successful on attempt ${attempt + 1}`);
            } catch (error) {
              console.warn(`Order ${orderIdNum} fetch attempt ${attempt + 1} failed:`, error);
              if (attempt < orderFetchAttempts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
              }
            }
          }
          
          if (!orderFetchSuccess || !orderData) {
            throw new Error(`Failed to fetch order ${orderIdNum} after all attempts`);
          }
          
          console.log(`Order ${orderIdNum} data:`, {
            pair: orderData.pair,
            amount: orderData.amount?.toString(),
            status: Number(orderData.status),
            sellToken0: orderData.sellToken0,
            createdAt: orderData.createdAt?.toString(),
            executedAt: orderData.executedAt?.toString()
          });

          // Enhanced validation
          if (!orderData.pair || !isValidAddress(orderData.pair)) {
            console.warn(`Order ${orderIdNum} has invalid pair address: ${orderData.pair}`);
            throw new Error(`Invalid pair address: ${orderData.pair}`);
          }

          // Validate amount exists
          if (!orderData.amount || orderData.amount.toString() === '0') {
            console.warn(`Order ${orderIdNum} has invalid amount: ${orderData.amount}`);
            throw new Error(`Order ${orderIdNum} has invalid amount`);
          }

          // Check if pair contract exists before proceeding
          const pairExists = await checkContractExists(orderData.pair, workingProvider);
          if (!pairExists) {
            console.warn(`Pair contract does not exist at ${orderData.pair} for order ${orderIdNum}`);
            throw new Error(`Pair contract ${orderData.pair} does not exist`);
          }

          // Get pair token addresses with enhanced error handling and retry
          let token0Address, token1Address;
          let pairTokenSuccess = false;
          
          // Try multiple approaches for getting pair tokens
          for (let attempt = 0; attempt < 3 && !pairTokenSuccess; attempt++) {
            try {
              console.log(`Order ${orderIdNum} pair token fetch attempt ${attempt + 1}`);
              const pairContract = new ethers.Contract(orderData.pair, PAIR_ABI, workingProvider);
              
              const gasLimits = [100000, 150000, 200000];
              const gasLimit = gasLimits[attempt] || 100000;
              
              [token0Address, token1Address] = await Promise.race([
                Promise.all([
                  pairContract.token0({ gasLimit }),
                  pairContract.token1({ gasLimit })
                ]),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Pair token fetch timeout')), 12000)
                )
              ]);
              
              pairTokenSuccess = true;
              console.log(`Order ${orderIdNum} pair tokens successful - Token0: ${token0Address}, Token1: ${token1Address}`);
            } catch (error) {
              console.warn(`Order ${orderIdNum} pair token attempt ${attempt + 1} failed:`, error);
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between attempts
              }
            }
          }
          
          if (!pairTokenSuccess || !token0Address || !token1Address) {
            throw new Error(`Failed to get pair tokens for order ${orderIdNum} after all attempts`);
          }

          // Validate token addresses
          if (!isValidAddress(token0Address) || !isValidAddress(token1Address)) {
            throw new Error(`Invalid token addresses: ${token0Address}, ${token1Address}`);
          }

          // Determine actual token addresses based on sellToken0
          const tokenSellAddress = orderData.sellToken0 ? token0Address : token1Address;
          const tokenBuyAddress = orderData.sellToken0 ? token1Address : token0Address;

          console.log(`Order ${orderIdNum} determined tokens - Sell: ${tokenSellAddress}, Buy: ${tokenBuyAddress}`);

          // Fetch token info with enhanced error handling and retry
          let tokenSellInfo, tokenBuyInfo;
          let tokenInfoSuccess = false;
          
          for (let attempt = 0; attempt < 2 && !tokenInfoSuccess; attempt++) {
            try {
              console.log(`Order ${orderIdNum} token info fetch attempt ${attempt + 1}`);
              [tokenSellInfo, tokenBuyInfo] = await Promise.all([
                fetchTokenInfoSafe(tokenSellAddress, workingProvider, connectedChain.id),
                fetchTokenInfoSafe(tokenBuyAddress, workingProvider, connectedChain.id)
              ]);
              
              tokenInfoSuccess = true;
              console.log(`Order ${orderIdNum} token info - Sell: ${tokenSellInfo.symbol}, Buy: ${tokenBuyInfo.symbol}`);
            } catch (error) {
              console.warn(`Order ${orderIdNum} token info attempt ${attempt + 1} failed:`, error);
              if (attempt < 1) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s between attempts
              }
            }
          }
          
          if (!tokenInfoSuccess || !tokenSellInfo || !tokenBuyInfo) {
            throw new Error(`Failed to fetch token info for order ${orderIdNum} after all attempts`);
          }

          // ===== ENHANCED DROP PERCENTAGE CALCULATION =====
          let currentPrice = '0';
          let triggerPrice = '0';  
          let dropPercentage = 0;
          let priceDataAvailable = false;

          // Multiple price calculation attempts with different strategies
          for (let priceAttempt = 0; priceAttempt < 3 && !priceDataAvailable; priceAttempt++) {
            try {
              console.log(`Order ${orderIdNum} price calculation attempt ${priceAttempt + 1}...`);
              
              // Strategy 1: Normal calculation
              if (priceAttempt === 0) {
                const priceData = await calculatePairPriceWithTokensSafe(
                  orderData.pair,
                  tokenSellAddress,
                  tokenBuyAddress,
                  workingProvider,
                  connectedChain.id
                );
                
                if (priceData.currentPrice > 0) {
                  currentPrice = priceData.currentPrice.toFixed(6);
                  priceDataAvailable = true;
                }
              }
              // Strategy 2: Try with different RPC if Base Mainnet
              else if (priceAttempt === 1 && connectedChain.id === '8453') {
                const alternativeRpc = BASE_RPC_ENDPOINTS[1]; // Use second RPC
                const altProvider = new ethers.JsonRpcProvider(alternativeRpc);
                
                const priceData = await calculatePairPriceWithSpecificProvider(
                  orderData.pair,
                  tokenSellAddress,
                  tokenBuyAddress,
                  altProvider,
                  connectedChain.id,
                  1 // Single retry
                );
                
                if (priceData.currentPrice > 0) {
                  currentPrice = priceData.currentPrice.toFixed(6);
                  priceDataAvailable = true;
                }
              }
              // Strategy 3: Manual reserves calculation as last resort
              else if (priceAttempt === 2) {
                console.log(`Order ${orderIdNum} trying manual price calculation...`);
                const pairContract = new ethers.Contract(orderData.pair, PAIR_ABI, workingProvider);
                
                const reserves = await Promise.race([
                  pairContract.getReserves({ gasLimit: 300000 }),
                  new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Manual reserves timeout')), 8000)
                  )
                ]);
                
                if (reserves && reserves[0] > 0 && reserves[1] > 0) {
                  const reserve0Num = parseFloat(ethers.formatUnits(reserves[0], tokenSellInfo.decimals === tokenBuyInfo.decimals ? 18 : (orderData.sellToken0 ? tokenSellInfo.decimals : tokenBuyInfo.decimals)));
                  const reserve1Num = parseFloat(ethers.formatUnits(reserves[1], tokenSellInfo.decimals === tokenBuyInfo.decimals ? 18 : (orderData.sellToken0 ? tokenBuyInfo.decimals : tokenSellInfo.decimals)));
                  
                  if (reserve0Num > 0 && reserve1Num > 0) {
                    const calculatedPrice = orderData.sellToken0 
                      ? reserve1Num / reserve0Num
                      : reserve0Num / reserve1Num;
                    
                    if (isFinite(calculatedPrice) && calculatedPrice > 0) {
                      currentPrice = calculatedPrice.toFixed(6);
                      priceDataAvailable = true;
                      console.log(`Order ${orderIdNum} manual price calculation successful: ${currentPrice}`);
                    }
                  }
                }
              }
              
              // Calculate trigger price and drop percentage if we have current price
              if (priceDataAvailable) {
                const coefficient = Number(orderData.coefficient);
                const threshold = Number(orderData.threshold);
                
                if (coefficient > 0 && threshold > 0) {
                  const triggerPriceNum = threshold / coefficient;
                  triggerPrice = triggerPriceNum.toFixed(6);

                  // ===== ENHANCED DROP PERCENTAGE CALCULATION =====
                  const currentPriceNum = parseFloat(currentPrice);
                  if (currentPriceNum > 0 && triggerPriceNum > 0) {
                    dropPercentage = ((currentPriceNum - triggerPriceNum) / currentPriceNum) * 100;
                    dropPercentage = Math.max(0, Math.min(100, dropPercentage));
                    
                    // Enhanced precision for very small percentages
                    if (dropPercentage < 0.001) {
                      dropPercentage = Number(dropPercentage.toFixed(6));
                    } else if (dropPercentage < 0.01) {
                      dropPercentage = Number(dropPercentage.toFixed(4));
                    } else if (dropPercentage < 0.1) {
                      dropPercentage = Number(dropPercentage.toFixed(3));
                    } else if (dropPercentage < 1) {
                      dropPercentage = Number(dropPercentage.toFixed(2));
                    } else {
                      dropPercentage = Number(dropPercentage.toFixed(1));
                    }
                  }
                }
                
                console.log(`Order ${orderIdNum} price calculation successful (attempt ${priceAttempt + 1}) - Current: ${currentPrice}, Trigger: ${triggerPrice}, Drop: ${dropPercentage}%`);
                break;
              }
              
            } catch (priceError) {
              console.warn(`Order ${orderIdNum} price calculation attempt ${priceAttempt + 1} failed:`, priceError);
              if (priceAttempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
              }
            }
          }
          
          // Log final result
          if (!priceDataAvailable) {
            console.warn(`Order ${orderIdNum} all price calculation attempts failed - using fallback values`);
            // For executed orders, this is expected since they may not have active liquidity monitoring
            if (orderData.status === 3) { // Executed
              console.log(`Order ${orderIdNum} is executed - price calculation failure is expected`);
            }
          }

          // Format amount
          let formattedAmount = '0';
          try {
            if (orderData.amount && tokenSellInfo.decimals) {
              formattedAmount = ethers.formatUnits(orderData.amount, tokenSellInfo.decimals);
            }
          } catch (error) {
            console.warn(`Failed to format amount for order ${orderIdNum}:`, error);
            formattedAmount = orderData.amount?.toString() || '0';
          }

          const order: StopOrder = {
            id: orderIdNum,
            pair: orderData.pair,
            client: connectedAccount,
            tokenSell: tokenSellAddress,
            tokenBuy: tokenBuyAddress,
            amount: formattedAmount,
            sellToken0: orderData.sellToken0,
            coefficient: orderData.coefficient?.toString() || '0',
            threshold: orderData.threshold?.toString() || '0',
            status: Number(orderData.status || 0),
            createdAt: Number(orderData.createdAt || 0),
            executedAt: Number(orderData.executedAt || 0),
            tokenSellInfo,
            tokenBuyInfo,
            currentPrice: priceDataAvailable ? currentPrice : 'N/A',
            dropPercentage,
            triggerPrice: priceDataAvailable ? triggerPrice : 'N/A',
            contractAddress: storedContracts.callbackContract
          };

          validOrders.push(order);
          console.log(`Successfully processed order ${orderIdNum} - Status: ${order.status}, Pair: ${tokenSellInfo.symbol}/${tokenBuyInfo.symbol}`);

        } catch (error: any) {
          console.error(`Failed to process order ${orderIdNum}:`, error);
          console.error(`Error details:`, error.message);
          failedOrders.push(orderIdNum);
        }
        
        // Add small delay between order processing to avoid rate limiting
        if (orderIdNum < allOrderIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Sort by creation time
      validOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log(`DASHBOARD: Successfully processed ${validOrders.length} out of ${allOrderIds.length} orders`);
      
      if (failedOrders.length > 0) {
        console.warn(`Failed orders: ${failedOrders.join(', ')}`);
        toast.error(`${failedOrders.length} order(s) failed to load due to network issues`, {
          duration: 5000
        });
      } else if (validOrders.length > 0) {
        toast.success(`Successfully loaded ${validOrders.length} orders`);
      }
      
      setOrders(validOrders);
    } catch (error: any) {
      console.error('DASHBOARD: Critical error in fetchUserOrders:', error);
      toast.error(`Failed to load orders: ${error.message}`, {
        duration: 8000
      });
      setOrders([]);
      setUserContracts(null);
      setContractsValid(false);
      setContractFundingStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [connectedAccount, contractData, connectedChain]);

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchUserOrders();
    setIsRefreshing(false);
  };

  // ===== ENHANCED DEBT COVERING HANDLER =====
  const handleCoverContractDebt = async () => {
    if (!userContracts || !connectedChain || !contractFundingStatus) return;
    
    setIsCoveringDebt(true);
    try {
      await handleCoverDebt(
        userContracts,
        connectedChain,
        contractFundingStatus,
        () => {
          // Refresh data after successful debt clearing
          setTimeout(async () => {
            await fetchUserOrders();
          }, 3000);
        }
      );
    } finally {
      setIsCoveringDebt(false);
    }
  };

  // ===== ORDER ACTION HANDLERS =====
  const handleCancelOrder = async (orderId: number) => {
    if (!connectedChain || !userContracts) return;
    
    if (shouldDisableOrderActions) {
      toast.error('Clear contract debt before managing orders');
      return;
    }
    
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
    
    if (shouldDisableOrderActions) {
      toast.error('Clear contract debt before managing orders');
      return;
    }
    
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
    
    if (shouldDisableOrderActions) {
      toast.error('Clear contract debt before managing orders');
      return;
    }
    
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
            console.log('DASHBOARD: Connected account:', accounts[0].address);
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
        setContractFundingStatus(null);
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
      console.log('DASHBOARD: Triggering order fetch due to dependency change');
      fetchUserOrders();
    }
  }, [connectedAccount, contractData, connectedChain, fetchUserOrders]);

  // ===== RENDER FUNCTIONS =====
  const renderOrdersTable = (orders: StopOrder[], title: string, icon: any) => {
    if (orders.length === 0) return null;

    const IconComponent = icon;
    const isCompletedOrders = title === "Order History";
    
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
                    {!isCompletedOrders && (
                      <th className="px-6 py-4 text-sm font-medium text-slate-300">Drop %</th>
                    )}
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
                            {formatTokenBalance(order.amount)} {order.tokenSellInfo?.symbol}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-200">
                          {order.currentPrice === 'N/A' ? (
                            <span className="text-slate-400 italic">Price unavailable</span>
                          ) : (
                            Number(order.currentPrice).toFixed(6)
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {order.triggerPrice === 'N/A' ? (
                            <span className="text-slate-400 italic">N/A</span>
                          ) : (
                            <span className="text-red-300">{order.triggerPrice}</span>
                          )}
                        </td>
                        {!isCompletedOrders && (
                          <td className="px-6 py-4 text-sm text-amber-300">
                            -{formatDropPercentage(order.dropPercentage || 0)}
                          </td>
                        )}
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {formatTimeAgo(order.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {(isActive || isPaused) && (
                            <div className="flex space-x-1">
                              {isActive && (
                                <Button
                                  onClick={() => handlePauseOrder(order.id)}
                                  disabled={!!loadingAction || !!shouldDisableOrderActions}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 ${shouldDisableOrderActions 
                                    ? 'text-slate-500 cursor-not-allowed' 
                                    : 'text-yellow-300 hover:bg-yellow-900/20 hover:text-yellow-200'
                                  }`}
                                  title={shouldDisableOrderActions ? 'Clear contract debt to manage orders' : 'Pause order'}
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
                                  disabled={!!loadingAction || !!shouldDisableOrderActions}
                                  variant="ghost"
                                  size="sm"
                                  className={`h-7 px-2 ${shouldDisableOrderActions 
                                    ? 'text-slate-500 cursor-not-allowed' 
                                    : 'text-green-300 hover:bg-green-900/20 hover:text-green-200'
                                  }`}
                                  title={shouldDisableOrderActions ? 'Clear contract debt to manage orders' : 'Resume order'}
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
                                disabled={!!loadingAction || !!shouldDisableOrderActions}
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 ${shouldDisableOrderActions 
                                  ? 'text-slate-500 cursor-not-allowed' 
                                  : 'text-red-300 hover:bg-red-900/20 hover:text-red-200'
                                }`}
                                title={shouldDisableOrderActions ? 'Clear contract debt to manage orders' : 'Cancel order'}
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
          <p className="text-slate-500 text-sm mt-2">Connecting to blockchain and fetching contract data...</p>
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
                <Button 
                  className={`${shouldDisableOrderActions 
                    ? 'bg-slate-600 cursor-not-allowed' 
                    : 'bg-primary/50 hover:bg-primary/60'
                  } text-slate-100`}
                  disabled={shouldDisableOrderActions ?? undefined}
                  title={shouldDisableOrderActions ? 'Clear contract debt to create new orders' : ''}
                >
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
                  {userContracts && contractsValid && contractFundingStatus && (
                    <div className="flex items-center space-x-2">
                      {contractFundingStatus.isActive ? (
                        <>
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300 text-sm">Personal Contract System Active</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300 text-sm">Contracts Need Funding</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Debt Warning Card - Show when contracts exist but have debt */}
          {contractsHaveDebt && userContracts && contractsValid && (
            <Alert className="bg-amber-900/20 border-amber-500/30 text-amber-200 mb-6">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:h-5" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-amber-200">Contract Debt Outstanding</span>
                    <div className="text-xs sm:text-sm mt-1 opacity-80">
                      Your personal contracts have accumulated debt and need funding before you can manage orders.
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {parseFloat(contractFundingStatus?.callbackDebt || '0') > 0 && (
                      <div className="bg-amber-800/20 p-2 rounded border border-amber-600/30">
                        <p className="text-amber-300 mb-1">Callback Contract Debt:</p>
                        <p className="text-amber-100 font-medium">{parseFloat(contractFundingStatus?.callbackDebt || '0').toFixed(4)} ETH</p>
                      </div>
                    )}
                    
                    {parseFloat(contractFundingStatus?.rscDebt || '0') > 0 && (
                      <div className="bg-amber-800/20 p-2 rounded border border-amber-600/30">
                        <p className="text-amber-300 mb-1">RSC Contract Debt:</p>
                        <p className="text-amber-100 font-medium">{parseFloat(contractFundingStatus?.rscDebt || '0').toFixed(4)} REACT</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-500/20">
                    <Button
                      onClick={handleCoverContractDebt}
                      disabled={isCoveringDebt}
                      className="bg-amber-600 hover:bg-amber-700 text-amber-50 text-sm"
                    >
                      {isCoveringDebt ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Covering Debt...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Wallet className="w-4 h-4 mr-2" />
                          Cover Debt & Activate Contracts
                        </div>
                      )}
                    </Button>
                  </div>
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

        {/* Error State for Failed Orders */}
        {orders.length === 0 && userContracts && contractsValid && !isLoading && (
          <Alert className="bg-orange-900/20 border-orange-600/30 text-orange-200 mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">No orders found in your personal contracts</p>
                <p className="text-sm">
                  Your personal contracts are deployed and active, but no stop orders were found. This could be due to:
                </p>
                <ul className="text-xs list-disc list-inside space-y-1 ml-4">
                  <li>No orders have been created yet</li>
                  <li>All orders have been cancelled or executed</li>
                  <li>Network connectivity issues with Base Mainnet</li>
                  <li>Contract synchronization delays</li>
                </ul>
                <p className="text-xs text-orange-300 mt-2">
                  Try creating a new order or refreshing the page if you expect to see orders.
                </p>
              </div>
            </AlertDescription>
          </Alert>
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
                  Your first stop order will deploy your personal smart contracts - callback contract on Base Mainnet and reactive contract on Reactive Network. 
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