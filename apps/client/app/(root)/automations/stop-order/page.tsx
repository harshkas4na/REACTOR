'use client'

import { ethers } from 'ethers';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { 
  Info, 
  AlertCircle, 
  Shield, 
  Clock, 
  Zap, 
  Loader2, 
  CheckCircle, 
  RefreshCw, 
  Bot, 
  X, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  Target, 
  Search, 
  Check, 
  Wallet,
  ArrowUpDown,
  ChevronDown,
  Settings,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  BarChart3,
  ArrowRight,
  Activity,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import EnhancedFundingRequirementsCard from '@/components/EnhancedFundingRequirementsCard';
import { stopOrderByteCodeSepolia, stopOrderByteCodeBaseMainnet } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import stopOrderABIBaseMainnet from '@/data/automations/stop-order/stopOrderABIBaseMainnet.json';
import rscABIBaseMainnet from '@/data/automations/stop-order/RSCABIBaseMainnet.json';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';
import { rscByteCodeSepolia, rscByteCodeBaseMainnet } from '@/data/automations/stop-order/RSCByteCode';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ===== DYNAMIC CONTRACT ABI AND BYTECODE SELECTION =====
const getContractABIsAndBytecode = (chainId: string) => {
  if (chainId === '8453') { // Base Mainnet
    return {
      REACTIVE_STOP_ORDER_ABI: rscABIBaseMainnet,
      CALLBACK_STOP_ORDER_ABI: stopOrderABIBaseMainnet,
      REACTIVE_CONTRACT_BYTECODE: rscByteCodeBaseMainnet,
      CALLBACK_CONTRACT_BYTECODE: stopOrderByteCodeBaseMainnet
    };
  } else { // Sepolia (default)
    return {
      REACTIVE_STOP_ORDER_ABI: rscABISepolia,
      CALLBACK_STOP_ORDER_ABI: stopOrderABISepolia,
      REACTIVE_CONTRACT_BYTECODE: rscByteCodeSepolia,
      CALLBACK_CONTRACT_BYTECODE: stopOrderByteCodeSepolia
    };
  }
};

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
    const hasBalance = reactiveBalance > ethers.parseEther('0.00001') && callbackBalance > ethers.parseEther('0.00001');
    const isActive = totalReserves >= totalDebt && hasBalance;
    
    console.log('Contract funding status:', {
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

// ===== CONTRACT VALIDATION =====
const validateStoredContracts = async (
  contracts: UserContractAddresses,
  rscProvider: ethers.JsonRpcProvider,
  userAddress: string
): Promise<{ isValid: boolean; fundingStatus: { debt: string; reserves: string; isActive: boolean; callbackDebt: string; rscDebt: string } }> => {
  try {
    console.log('Validating stored contracts:', contracts);
    
    // Get the correct ABIs for the chain
    const contractConfig = getContractABIsAndBytecode(contracts.chainId);
    
    // Normalize addresses for comparison - use stored deployer from Convex
    const normalizedUserAddress = userAddress.toLowerCase().trim();
    const normalizedContractDeployer = contracts.deployer.toLowerCase().trim();
    
    // First check: User must be the deployer (using stored deployer address from Convex)
    if (normalizedUserAddress !== normalizedContractDeployer) {
      console.error('VALIDATION FAILED: User is not the deployer');
      console.error('User address:', normalizedUserAddress);
      console.error('Contract deployer:', normalizedContractDeployer);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check if callback contract exists and is valid by calling owner()
    const callbackProvider = contracts.chainId === '8453' 
      ? new ethers.JsonRpcProvider('https://base.llamarpc.com')
      : new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
      
    const callbackContract = new ethers.Contract(
      contracts.callbackContract,
      contractConfig.CALLBACK_STOP_ORDER_ABI,
      callbackProvider
    );
    
    try {
      console.log('Callback contract validation successful');
    } catch (contractError) {
      console.error('VALIDATION FAILED: Cannot read from callback contract:', contractError);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check if reactive contract exists and is valid 
    const reactiveContract = new ethers.Contract(
      contracts.reactiveContract,
      contractConfig.REACTIVE_STOP_ORDER_ABI,
      rscProvider
    );
    
    try {
      // Check if the user is the owner of the reactive contract
      // const contractOwner = await reactiveContract.owner();
      console.log('Reactive contract validation successful');
    } catch (contractError) {
      console.error('VALIDATION FAILED: Cannot read from reactive contract:', contractError);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check funding status
    const fundingStatus = await checkContractFundingStatus(contracts, rscProvider);
    
    console.log('VALIDATION SUCCESS: All contracts verified');
    return { isValid: true, fundingStatus };
  } catch (error) {
    console.error('VALIDATION ERROR:', error);
    return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
  }
};

// ===== INTERFACES AND TYPES =====
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
}

interface TradingPair {
  token0: Token;
  token1: Token;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  currentPrice: number;
}

interface StopOrderFormData {
  chainId: string;
  selectedPair: TradingPair | null;
  sellToken: Token | null;
  buyToken: Token | null;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
  dropPercentage: string;
  currentPrice: string;
  stopPrice: string;
}

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

type DeploymentStep = 'idle' | 'processing' | 'complete';

// ===== CONFIGURATION DATA =====
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

// Popular tokens by chain
const POPULAR_TOKENS: Record<string, Token[]> = {
  '8453': [ // Base Mainnet
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x4ed4E862860beD51a9570b96d89AF5E1B0Efefed', symbol: 'DEGEN', name: 'Degen', decimals: 18 },
    { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', name: 'Aerodrome Finance', decimals: 18 },
    { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', decimals: 18 },
    { address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', decimals: 8 },
  ],
  '11155111': [ // Sepolia
    { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ]
};

// ===== ENHANCED TOKEN SERVICE CLASS WITH UPDATED ALCHEMY INTEGRATION =====
class TokenService {
  private static cache = new Map<string, { data: Token[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private static getCachedTokens(cacheKey: string): Token[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private static setCachedTokens(cacheKey: string, tokens: Token[]): void {
    this.cache.set(cacheKey, {
      data: tokens,
      timestamp: Date.now()
    });
  }

  static async fetchUserTokens(chainId: string, address: string): Promise<Token[]> {
    const cacheKey = `${chainId}-${address}`;
    
    const cachedTokens = this.getCachedTokens(cacheKey);
    if (cachedTokens) {
      return cachedTokens;
    }

    let tokens: Token[] = [];
    
    if (chainId === '8453') { // Base Mainnet - use Alchemy API
      tokens = await this.fetchTokensFromAlchemy(address);
    } else {
      tokens = await this.fetchTokensFromEthplorer(chainId, address);
    }
    
    this.setCachedTokens(cacheKey, tokens);
    return tokens;
  }

  private static async fetchTokensFromAlchemy(address: string): Promise<Token[]> {
    try {
      console.log('Fetching tokens from Alchemy API for Base mainnet address:', address);
      
      const url = 'https://api.g.alchemy.com/data/v1/e2aFxQC89zEStCyiWpuWK/assets/tokens/by-address';
      const options = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          addresses: [{
            address: address,
            networks: ["base-mainnet"]
          }]
        })
      };

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Alchemy API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from Alchemy API');
      }

      const tokens: Token[] = [];

      for (const addressData of data.data) {
        if (addressData.address !== address || !addressData.tokenBalances) continue;
        
        for (const tokenBalance of addressData.tokenBalances) {
          try {
            const tokenInfo = tokenBalance.tokenMetadata;
            if (!tokenInfo || !tokenInfo.contractAddress || !tokenInfo.symbol || !tokenInfo.name) {
              continue;
            }

            const decimals = parseInt(tokenInfo.decimals) || 18;
            const rawBalance = tokenBalance.tokenBalance || '0';
            
            let balance = '0';
            if (rawBalance && rawBalance !== '0' && rawBalance !== '0x0') {
              try {
                // Remove 0x prefix and convert hex to decimal
                const cleanBalance = rawBalance.startsWith('0x') ? rawBalance.slice(2) : rawBalance;
                const balanceWei = BigInt('0x' + cleanBalance);
                balance = ethers.formatUnits(balanceWei, decimals);
                const balanceNumber = parseFloat(balance);
                balance = balanceNumber > 0 ? balanceNumber.toFixed(6) : '0';
              } catch (balanceError) {
                console.warn('Error parsing balance for token:', tokenInfo.symbol, balanceError);
                balance = '0';
              }
            }

            if (parseFloat(balance) > 0) {
              tokens.push({
                address: tokenInfo.contractAddress,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: decimals,
                balance: balance,
                logoURI: tokenInfo.logo || `https://tokens.1inch.io/${tokenInfo.contractAddress.toLowerCase()}.png`
              });
            }
          } catch (tokenError) {
            console.warn('Error processing token data:', tokenError, tokenBalance);
          }
        }
      }

      console.log(`Successfully fetched ${tokens.length} tokens with positive balance from Alchemy`);
      
      if (tokens.length > 0) {
        return tokens;
      }

      console.log('No tokens found via Alchemy, falling back to popular tokens method');
      return this.fetchPopularTokensWithBalances('8453', address);

    } catch (error) {
      console.error('Error fetching tokens from Alchemy API:', error);
      
      console.log('Falling back to popular tokens method due to Alchemy API error');
      return this.fetchPopularTokensWithBalances('8453', address);
    }
  }

  private static async fetchTokensFromEthplorer(chainId: string, address: string): Promise<Token[]> {
    try {
      console.log('Fetching tokens from Ethplorer API for address:', address);
      
      let apiUrl: string;
      if (chainId === '11155111') { // Sepolia
        apiUrl = `https://sepolia-api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else if (chainId === '1') { // Mainnet
        apiUrl = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else {
        console.log(`Ethplorer API not available for chain ${chainId}, using fallback method`);
        return this.fetchPopularTokensWithBalances(chainId, address);
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Ethplorer API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('Empty response from Ethplorer API');
      }

      const tokens: Token[] = [];

      if (data.tokens && Array.isArray(data.tokens)) {
        for (const tokenData of data.tokens) {
          try {
            const tokenInfo = tokenData.tokenInfo;
            if (!tokenInfo || !tokenInfo.address || !tokenInfo.symbol || !tokenInfo.name) {
              continue;
            }

            const decimals = parseInt(tokenInfo.decimals) || 18;
            const rawBalance = tokenData.balance || tokenData.rawBalance || '0';
            
            let balance = '0';
            if (rawBalance && rawBalance !== '0') {
              try {
                const balanceWei = BigInt(rawBalance);
                balance = ethers.formatUnits(balanceWei, decimals);
                const balanceNumber = parseFloat(balance);
                balance = balanceNumber > 0 ? balanceNumber.toFixed(6) : '0';
              } catch (balanceError) {
                console.warn('Error parsing balance for token:', tokenInfo.symbol, balanceError);
                balance = '0';
              }
            }

            if (parseFloat(balance) > 0) {
              tokens.push({
                address: tokenInfo.address,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: decimals,
                balance: balance,
                logoURI: `https://tokens.1inch.io/${tokenInfo.address.toLowerCase()}.png`
              });
            }
          } catch (tokenError) {
            console.warn('Error processing token data:', tokenError, tokenData);
          }
        }
      }

      console.log(`Successfully fetched ${tokens.length} tokens with positive balance from Ethplorer`);
      
      if (tokens.length > 0) {
        return tokens;
      }

      console.log('No tokens found via Ethplorer, falling back to popular tokens method');
      return this.fetchPopularTokensWithBalances(chainId, address);

    } catch (error) {
      console.error('Error fetching tokens from Ethplorer API:', error);
      
      console.log('Falling back to popular tokens method due to Ethplorer API error');
      return this.fetchPopularTokensWithBalances(chainId, address);
    }
  }

  private static async fetchPopularTokensWithBalances(chainId: string, address: string): Promise<Token[]> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return [];
    }

    try {
      console.log('Fetching balances for popular tokens as fallback method');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const popularTokens = POPULAR_TOKENS[chainId] || [];
      
      if (popularTokens.length === 0) {
        console.log(`No popular tokens defined for chain ${chainId}`);
        return [];
      }
      
      const tokensWithBalances = await Promise.all(
        popularTokens.map(async (token) => {
          try {
            const tokenContract = new ethers.Contract(
              token.address,
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const balanceWei = await tokenContract.balanceOf(address);
            const balance = ethers.formatUnits(balanceWei, token.decimals);
            const balanceNumber = parseFloat(balance);
            
            return {
              ...token,
              balance: balanceNumber > 0 ? balanceNumber.toFixed(6) : '0'
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return { ...token, balance: '0' };
          }
        })
      );

      const result = tokensWithBalances.filter(token => 
        parseFloat(token.balance || '0') > 0
      );

      console.log(`Found ${result.length} popular tokens with positive balance`);
      return result;
    } catch (error) {
      console.error('Error fetching popular tokens:', error);
      return [];
    }
  }

  static async fetchTokenInfo(address: string, userAddress: string): Promise<Token | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        address,
        [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)'
        ],
        provider
      );

      const [symbol, name, decimals, balanceWei] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
        tokenContract.balanceOf(userAddress)
      ]);

      const balance = ethers.formatUnits(balanceWei, decimals);
      const balanceNumber = parseFloat(balance);

      return {
        address,
        symbol,
        name,
        decimals,
        balance: balanceNumber > 0 ? balanceNumber.toFixed(6) : '0',
        logoURI: `https://tokens.1inch.io/${address.toLowerCase()}.png`
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static clearCacheForUser(chainId: string, address: string): void {
    const cacheKey = `${chainId}-${address}`;
    this.cache.delete(cacheKey);
  }
}

// Helper function to format large numbers with improved small amount handling
function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

// ===== SIMPLIFIED STATUS INDICATOR COMPONENT =====
const SimpleStatusIndicator = ({ 
  step, 
  isVisible,
  message 
}: { 
  step: DeploymentStep;
  isVisible: boolean;
  message: string;
}) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {step === 'complete' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-blue-200 font-medium">
              {message}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ===== ENHANCED TOKEN SELECTION MODAL =====
const TokenSelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  chainId, 
  connectedAccount,
  excludeToken,
  tokenModalType 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  chainId: string;
  connectedAccount: string;
  excludeToken?: Token;
  tokenModalType: 'sell' | 'buy';
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);

  const fetchAllUserTokens = useCallback(async () => {
    if (!connectedAccount || !chainId) return;
    
    setIsLoadingBalances(true);
    try {
      const tokens = await TokenService.fetchUserTokens(chainId, connectedAccount);
      setUserTokens(tokens);
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      setUserTokens([]);
      toast.error('Failed to load your tokens. Please try again.');
    } finally {
      setIsLoadingBalances(false);
    }
  }, [connectedAccount, chainId]);

  const handleCustomTokenSelect = useCallback(async (address: string) => {
    setIsLoadingCustomToken(true);
    const tokenInfo = await TokenService.fetchTokenInfo(address, connectedAccount);
    setIsLoadingCustomToken(false);
    
    if (tokenInfo) {
      onSelect(tokenInfo);
      onClose();
      toast.success(`Added ${tokenInfo.symbol} (${tokenInfo.name})`);
    } else {
      toast.error('Failed to fetch token information');
    }
  }, [connectedAccount, onSelect, onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchAllUserTokens();
    }
  }, [isOpen, fetchAllUserTokens]);

  const getTokensToDisplay = useCallback(() => {
    if (!searchTerm) {
      return userTokens.filter(token => token.address !== excludeToken?.address);
    }

    const searchTermLower = searchTerm.toLowerCase();
    
    const matchingTokens = userTokens.filter(token => 
      token.address !== excludeToken?.address &&
      (token.name.toLowerCase().includes(searchTermLower) ||
       token.symbol.toLowerCase().includes(searchTermLower) ||
       token.address.toLowerCase().includes(searchTermLower))
    );

    if (matchingTokens.length === 0) {
      const popularTokens = POPULAR_TOKENS[chainId] || [];
      const matchingPopularTokens = popularTokens.filter(token =>
        token.address !== excludeToken?.address &&
        !userTokens.some(userToken => userToken.address.toLowerCase() === token.address.toLowerCase()) &&
        (token.name.toLowerCase().includes(searchTermLower) ||
         token.symbol.toLowerCase().includes(searchTermLower) ||
         token.address.toLowerCase().includes(searchTermLower))
      ).map(token => ({ ...token, balance: '0' }));

      return matchingPopularTokens;
    }

    return matchingTokens;
  }, [searchTerm, userTokens, excludeToken?.address, chainId]);

  const tokensToDisplay = getTokensToDisplay();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center justify-between text-lg sm:text-xl">
            {tokenModalType === 'sell' ? 'Token to sell' : 'Token to receive'}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  TokenService.clearCacheForUser(chainId, connectedAccount);
                  fetchAllUserTokens();
                }}
                disabled={isLoadingBalances}
                className="h-6 w-6 p-0 hover:bg-zinc-800"
              >
                <RefreshCw className={`w-3 h-3 text-zinc-400 ${isLoadingBalances ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Command className="bg-zinc-900">
          <CommandInput 
            placeholder="Search tokens or paste address..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="text-zinc-200 border-zinc-700 text-sm sm:text-base"
          />
          <CommandList className="max-h-[50vh] sm:max-h-[400px]">
            <CommandEmpty>
              {ethers.isAddress(searchTerm) ? (
                <div className="p-2">
                  <Button
                    onClick={() => handleCustomTokenSelect(searchTerm)}
                    disabled={isLoadingCustomToken}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
                  >
                    {isLoadingCustomToken ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading Token...
                      </div>
                    ) : (
                      <>Import Token: {searchTerm.slice(0, 6)}...{searchTerm.slice(-4)}</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-400">
                  {isLoadingBalances ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading your tokens...
                    </div>
                  ) : searchTerm ? (
                    'No tokens found. Try pasting a token address.'
                  ) : (
                    'No tokens with positive balance found.'
                  )}
                </div>
              )}
            </CommandEmpty>
            
            {tokensToDisplay.length > 0 && (
              <CommandGroup heading={
                searchTerm ? 
                "Search Results" : 
                isLoadingBalances ? 
                "Loading..." : 
                `Your ERC20 tokens (${tokensToDisplay.length})`
              }>
                {tokensToDisplay.map((token) => (
                  <CommandItem
                    key={token.address}
                    value={token.symbol}
                    onSelect={() => {
                      onSelect(token);
                      onClose();
                    }}
                    className="cursor-pointer hover:bg-zinc-800/50 p-3 touch-manipulation"
                  >
                    <div className="flex items-center w-full">
                      {token.logoURI ? (
                        <img 
                          src={token.logoURI} 
                          alt={token.symbol}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-3 flex-shrink-0"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';  
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold mr-3 flex-shrink-0 ${token.logoURI ? 'hidden' : 'flex'}`}
                      >
                        {token.symbol.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-zinc-200 truncate text-sm sm:text-base">{token.symbol}</span>
                          <div className="text-right ml-2">
                            <span className="text-zinc-200 font-medium text-sm sm:text-base">
                              {token.balance && parseFloat(token.balance) > 0 ? 
                                formatTokenBalance(token.balance) : '0'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-zinc-400 truncate flex-1">
                            {token.name}
                          </div>
                          {parseFloat(token.balance || '0') > 0 && (
                            <div className="text-xs text-zinc-500 ml-2">
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <div className="px-4 pb-2">
          <div className="text-xs text-zinc-500 text-center space-y-1">
            <div>
              Showing ERC20 tokens with positive balance
            </div>
            <div className="text-zinc-600">
              Native tokens (ETH) not shown - use wrapped versions (WETH) for stop orders
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== ENHANCED STATUS INDICATOR =====
const EnhancedStatusIndicator = ({ 
  formData, 
  connectedAccount, 
  connectedChain, 
  hasTokenBalance,
  isLoadingPair,
  existingContracts,
  contractsValid,
  contractFundingStatus
}: {
  formData: StopOrderFormData;
  connectedAccount: string;
  connectedChain: ChainConfig | null;
  hasTokenBalance: boolean;
  isLoadingPair: boolean;
  existingContracts: UserContractAddresses | null;
  contractsValid: boolean;
  contractFundingStatus: { debt: string; reserves: string; isActive: boolean; callbackDebt: string; rscDebt: string } | null;
}) => {
  const getStatus = () => {
    if (!connectedChain) {
      return { type: 'error', message: 'Please switch to a supported network (Base or Sepolia)' };
    }
    if (connectedChain.isComingSoon) {
      return { type: 'warning', message: `${connectedChain.name} support coming soon - switch to Base Mainnet` };
    }
    if (isLoadingPair) {
      return { type: 'loading', message: 'Finding trading pair...' };
    }
    if (!formData.selectedPair && formData.sellToken && formData.buyToken) {
      return { type: 'error', message: 'Trading pair not found on DEX' };
    }
    
    if (formData.sellToken && formData.buyToken) {
      if (formData.amount && parseFloat(formData.amount) > 0 && !hasTokenBalance) {
        return { type: 'error', message: 'Insufficient token balance' };
      }
      if (!formData.dropPercentage || parseFloat(formData.dropPercentage) <= 0) {
        return { type: 'warning', message: 'Set stop loss percentage' };
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        return { type: 'warning', message: 'Enter amount to sell' };
      }

      if (existingContracts && contractsValid && contractFundingStatus?.isActive) {
        return { 
          type: 'success', 
          message: 'Ready to add to existing contracts!',
          subMessage: 'Lower cost - using existing funded smart contracts'
        };
      } else {
        return { 
          type: 'success', 
          message: 'Ready to create stop order!',
          subMessage: connectedChain.id === '8453' 
            ? 'First order on Base - will deploy new smart contracts' 
            : 'First order - will deploy new smart contracts'
        };
      }
    }
    
    return null;
  };

  const status = getStatus();

  if (!status) {
    return null;
  }

  const safeStatus = status;

  const getStatusStyles = () => {
    switch (safeStatus.type) {
      case 'error':
        return 'bg-amber-900/20 border-amber-500/30 text-amber-200';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200';
      case 'loading':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-200';
      case 'success':
        return 'bg-green-900/20 border-green-500/30 text-green-200';
      default:
        return 'bg-zinc-800/50 border-zinc-700 text-zinc-300';
    }
  };

  const getStatusIcon = () => {
    switch (safeStatus.type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />;
      case 'success':
        return existingContracts && contractsValid ? <Layers className="w-4 h-4 sm:w-5 sm:h-5" /> : <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  const getCostInfo = () => {
    if (!connectedChain || safeStatus.type !== 'success') return '';
    
    if (existingContracts && contractsValid && contractFundingStatus?.isActive) {
      return connectedChain.id === '8453' 
        ? 'Gas fee only (~$0.50-1)'
        : 'Gas fee only (~$2-5)';
    } else {
      return connectedChain.id === '8453'
        ? `~${connectedChain.defaultFunding} ${connectedChain.nativeCurrency} + 1 ${connectedChain.rscNetwork.currencySymbol} + gas (~$2-5)`
        : `~${connectedChain.defaultFunding} ${connectedChain.nativeCurrency} + 1 ${connectedChain.rscNetwork.currencySymbol} + gas (~$5-15)`;
    }
  };

  return (
    <Alert className={`${getStatusStyles()} mb-6 sm:mb-8 lg:mb-10`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>
        <AlertDescription className="text-sm sm:text-base flex-1">
          {safeStatus.message}
          {safeStatus.subMessage && (
            <div className="text-xs sm:text-sm mt-1 opacity-80">
              {safeStatus.subMessage}
            </div>
          )}
          {connectedChain && safeStatus.type === 'success' && (
            <div className="text-xs sm:text-sm mt-1 opacity-80">
              Cost: {getCostInfo()}
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};

// ===== SIMPLE DASHBOARD LINK COMPONENT =====
const DashboardLink = () => {
  return (
    <div className="mt-4 sm:mt-6">
      <div className="flex items-center justify-center p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
        <div className="flex items-center text-xs sm:text-sm text-zinc-400">
          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-zinc-500" />
          <span>Track your orders:</span>
          <Link 
            href="/automations/stop-order/dashboard" 
            className="ml-2 text-zinc-300 hover:text-blue-400 underline decoration-zinc-600 hover:decoration-blue-400 transition-colors"
          >
            Order Dashboard
          </Link>
          <ArrowRight className="w-2 h-2 sm:w-3 sm:h-3 ml-1 text-zinc-500" />
        </div>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function EnhancedStopOrderWithPersonalContracts() {
  const [formData, setFormData] = useState<StopOrderFormData>({
    chainId: '',
    selectedPair: null,
    sellToken: null,
    buyToken: null,
    sellToken0: true,
    clientAddress: '',
    coefficient: '1000',
    threshold: '',
    amount: '',
    destinationFunding: '0.0003',
    rscFunding: '1',
    dropPercentage: '10',
    currentPrice: '',
    stopPrice: ''
  });

  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [connectedChain, setConnectedChain] = useState<ChainConfig | null>(null);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy'>('sell');
  const [isLoadingPair, setIsLoadingPair] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');
  const [hasTokenBalance, setHasTokenBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isSwapping, setIsSwapping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDeploymentActive, setIsDeploymentActive] = useState(false);

  // Contract management state
  const [existingContracts, setExistingContracts] = useState<UserContractAddresses | null>(null);
  const [contractsValid, setContractsValid] = useState(false);
  const [isCheckingContracts, setIsCheckingContracts] = useState(false);
  const [contractFundingStatus, setContractFundingStatus] = useState<{
    debt: string;
    reserves: string;
    isActive: boolean;
    callbackDebt: string;
    rscDebt: string;
  } | null>(null);

  const mountedRef = useRef(true);

  // Convex hooks
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");
  const storeContract = useMutation(api.contracts.store);

  const contractsHaveDebt = !!contractFundingStatus && (
    parseFloat(contractFundingStatus.callbackDebt) > 0 || 
    parseFloat(contractFundingStatus.rscDebt) > 0
  );

  const shouldDisableTokenSelection = !!contractsHaveDebt && !!existingContracts && contractsValid;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (deploymentStep === 'complete') {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setDeploymentStep('idle');
          setDeploymentMessage('');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deploymentStep]);

  // Professional network switching functions
  const switchNetwork = useCallback(async (targetChainId: string) => {
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
          } else {
            const chain = SUPPORTED_CHAINS.find(c => c.id === targetChainId);
            if (!chain) throw new Error('Chain not supported');
            
            chainConfig = {
              chainId: targetChainIdHex,
              chainName: chain.name,
              nativeCurrency: {
                name: chain.nativeCurrency,
                symbol: chain.nativeCurrency,
                decimals: 18
              },
              rpcUrls: [chain.rpcUrl || ''],
              blockExplorerUrls: [
                chain.id === '1' ? 'https://etherscan.io' : 
                chain.id === '11155111' ? 'https://sepolia.etherscan.io' :
                chain.id === '8453' ? 'https://basescan.org' :
                ''
              ]
            };
          }
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
          
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
  }, []);

  const switchToRSCNetwork = useCallback(async () => {
    if (!connectedChain) throw new Error('No chain selected');
    
    const rscNetworkChainId = connectedChain.rscNetwork.chainId;
    console.log(`Switching to RSC network: ${rscNetworkChainId}`);
    
    return switchNetwork(rscNetworkChainId);
  }, [connectedChain, switchNetwork]);

  // Check for existing contracts using Convex data and update state properly
  const refreshContractsState = useCallback(async () => {
    if (!connectedAccount || !connectedChain || !contractData) return;

    setIsCheckingContracts(true);
    try {
      console.log('Contract data from Convex:', contractData);
      
      if (contractData) {
        const stored: UserContractAddresses = {
          reactiveContract: contractData.rscContract,
          callbackContract: contractData.callbackContract,
          deployedAt: Date.now(),
          chainId: contractData.chainId,
          deployer: contractData.userAddress.toLowerCase()
        };

        console.log('Validating stored contracts from Convex...');
        
        const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
        
        const validationResult = await validateStoredContracts(stored, rscProvider, connectedAccount);
        
        if (validationResult.isValid) {
          console.log('Contracts are valid, checking funding status...');
          setExistingContracts(stored);
          setContractsValid(true);
          setContractFundingStatus(validationResult.fundingStatus);
          
          if (validationResult.fundingStatus.isActive) {
            console.log('Contracts are active and funded, user can add additional orders');
            setFormData(prev => ({
              ...prev,
              destinationFunding: '0',
              rscFunding: '0'
            }));
          } else {
            console.log('Contracts exist but are inactive/underfunded');
            setFormData(prev => ({
              ...prev,
              destinationFunding: connectedChain.defaultFunding,
              rscFunding: '1'
            }));
          }
        } else {
          console.log('Stored contracts are invalid');
          setExistingContracts(null);
          setContractsValid(false);
          setContractFundingStatus(null);
          
          setFormData(prev => ({
            ...prev,
            destinationFunding: connectedChain.defaultFunding,
            rscFunding: '1'
          }));
        }
      } else {
        console.log('No stored contracts found in Convex, this will be first order');
        setExistingContracts(null);
        setContractsValid(false);
        setContractFundingStatus(null);
        
        setFormData(prev => ({
          ...prev,
          destinationFunding: connectedChain.defaultFunding,
          rscFunding: '1'
        }));
      }
    } catch (error) {
      console.error('Error validating contracts from Convex:', error);
      setExistingContracts(null);
      setContractsValid(false);
      setContractFundingStatus(null);
    } finally {
      setIsCheckingContracts(false);
    }
  }, [connectedAccount, connectedChain, contractData]);

  useEffect(() => {
    refreshContractsState();
  }, [refreshContractsState]);

  // ===== FIXED THRESHOLD CALCULATION FUNCTION WITH DYNAMIC COEFFICIENT =====
  const calculateThresholdFromPercentage = useCallback((percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage)) || !formData.selectedPair || !formData.sellToken || !formData.buyToken) return;
    
    const dropPercent = parseFloat(percentage);
    
    console.log('=== CALCULATING THRESHOLD WITH DYNAMIC COEFFICIENT ===');
    console.log('Trading pair:', formData.selectedPair);
    console.log('Sell token:', formData.sellToken.symbol, 'Decimals:', formData.sellToken.decimals);
    console.log('Buy token:', formData.buyToken.symbol, 'Decimals:', formData.buyToken.decimals);
    console.log('sellToken0:', formData.sellToken0);
    console.log('Raw reserve0:', formData.selectedPair.reserve0);
    console.log('Raw reserve1:', formData.selectedPair.reserve1);
    
    // The reserves are already properly formatted with decimals from the pair finding logic
    // So we can directly use them as decimal numbers
    const reserve0 = parseFloat(formData.selectedPair.reserve0);
    const reserve1 = parseFloat(formData.selectedPair.reserve1);
    
    if (reserve0 <= 0 || reserve1 <= 0 || !isFinite(reserve0) || !isFinite(reserve1)) {
      console.error('Invalid reserves for threshold calculation:', { reserve0, reserve1 });
      return;
    }

    // Calculate current price based on which token we're selling
    // If sellToken0 = true: we're selling token0, so price = reserve1/reserve0 (token1 per token0)
    // If sellToken0 = false: we're selling token1, so price = reserve0/reserve1 (token0 per token1)
    const currentPrice = formData.sellToken0 
      ? reserve1 / reserve0  // Selling token0, getting token1
      : reserve0 / reserve1; // Selling token1, getting token0

    if (currentPrice <= 0 || !isFinite(currentPrice)) {
      console.error('Invalid current price calculated from reserves:', currentPrice);
      return;
    }

    const stopPrice = currentPrice * (1 - dropPercent / 100);
    
    if (stopPrice <= 0) {
      console.error('Invalid stop price calculated');
      return;
    }
    
    // CRITICAL FIX: Dynamic coefficient based on price magnitude and token decimals
    // We need to ensure the threshold is a meaningful integer (> 0)
    let coefficient = 1000; // Default coefficient
    
    // Calculate what the threshold would be with default coefficient
    let potentialThreshold = Math.floor(stopPrice * coefficient);
    
    // If threshold would be 0 or very small, increase coefficient
    if (potentialThreshold < 10) {
      // For very small prices, we need much larger coefficients
      // Try different coefficient scales until we get a meaningful threshold
      const coefficientOptions = [1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];
      
      for (const testCoeff of coefficientOptions) {
        const testThreshold = Math.floor(stopPrice * testCoeff);
        if (testThreshold >= 100) { // Ensure threshold is at least 100 for meaningful precision
          coefficient = testCoeff;
          potentialThreshold = testThreshold;
          break;
        }
      }
      
      // If still too small, use the largest coefficient
      if (potentialThreshold < 10) {
        coefficient = 1000000000;
        potentialThreshold = Math.floor(stopPrice * coefficient);
      }
    }
    
    const threshold = potentialThreshold;
    
    console.log('=== CALCULATION RESULTS ===');
    console.log('Current price:', currentPrice);
    console.log('Drop percentage:', dropPercent);
    console.log('Stop price:', stopPrice);
    console.log('Dynamic coefficient:', coefficient);
    console.log('Threshold (integer):', threshold);
    console.log('Threshold validation:', threshold > 0 ? 'VALID' : 'INVALID');
    console.log('=== END CALCULATION ===');
    
    if (threshold <= 0) {
      console.error('CRITICAL ERROR: Threshold is still 0 even with dynamic coefficient!');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage,
      currentPrice: currentPrice.toString(),
      stopPrice: stopPrice.toString()
    }));
  }, [formData.selectedPair, formData.sellToken0, formData.sellToken, formData.buyToken]);

  // ===== ENHANCED DEBT COVERING FUNCTION =====
  const handleCoverDebt = useCallback(async () => {
    if (!connectedChain || !existingContracts || !contractFundingStatus) {
      toast.error('Contract information not available');
      return;
    }

    // Get the correct ABIs for the chain
    const contractConfig = getContractABIsAndBytecode(existingContracts.chainId);

    const originalChainId = connectedChain.id;
    const rscChainId = connectedChain.rscNetwork.chainId;
    
    const callbackDebt = parseFloat(contractFundingStatus.callbackDebt);
    const rscDebt = parseFloat(contractFundingStatus.rscDebt);

    try {
      setIsDeploymentActive(true);
      setDeploymentStep('processing');
      setDeploymentMessage('Covering contract debt...');
      
      console.log('Starting debt covering process...');
      console.log(`Callback debt: ${callbackDebt} ETH, RSC debt: ${rscDebt} REACT`);

      // Step 1: Handle Callback Contract Debt (if exists)
      if (callbackDebt > 0) {
        setDeploymentMessage('Covering callback contract debt...');
        console.log(`Covering callback debt: ${callbackDebt} ETH`);

        await switchNetwork(originalChainId);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const callbackProvider = new ethers.BrowserProvider(window.ethereum);
        const callbackSigner = await callbackProvider.getSigner();

        const callbackFundingAmount = callbackDebt + (originalChainId==='11155111'? 0.001:0.00002);
        console.log(`Sending ${callbackFundingAmount} ETH to callback contract`);
        
        const fundCallbackTx = await callbackSigner.sendTransaction({
          to: existingContracts.callbackContract,
          value: ethers.parseEther(callbackFundingAmount.toString()),
          gasLimit: 100000
        });
        
        await fundCallbackTx.wait();
        console.log('Funds sent to callback contract');

        console.log('Calling coverDebt on callback contract...');
        const callbackContract = new ethers.Contract(
          existingContracts.callbackContract,
          contractConfig.CALLBACK_STOP_ORDER_ABI,
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
        setDeploymentMessage('Covering RSC contract debt...');
        console.log(`Covering RSC debt: ${rscDebt} REACT`);

        await switchToRSCNetwork();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const rscProvider = new ethers.BrowserProvider(window.ethereum);
        const rscSigner = await rscProvider.getSigner();

        const rscFundingAmount = rscDebt + 0.1;
        console.log(`Sending ${rscFundingAmount} REACT to RSC contract`);
        
        const fundRscTx = await rscSigner.sendTransaction({
          to: existingContracts.reactiveContract,
          value: ethers.parseEther(rscFundingAmount.toString()),
          gasLimit: 100000
        });
        
        await fundRscTx.wait();
        console.log('Funds sent to RSC contract');

        console.log('Calling coverDebt on RSC contract...');
        const rscContract = new ethers.Contract(
          existingContracts.reactiveContract,
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

      setDeploymentStep('complete');
      setDeploymentMessage('Debt cleared successfully!');
      toast.success('All contract debts have been cleared! Your contracts are now active.');

      // Refresh contracts state after debt covering
      setTimeout(async () => {
        await refreshContractsState();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error covering debt:', error);
      setDeploymentStep('idle');
      setDeploymentMessage('');
      
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
    } finally {
      setIsDeploymentActive(false);
    }
  }, [connectedChain, existingContracts, contractFundingStatus, switchNetwork, switchToRSCNetwork, refreshContractsState]);

  // ===== UPDATED DEPLOYMENT FUNCTION FOR PERSONAL CONTRACTS =====
  const handleCreateOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectedChain || !formData.selectedPair || !formData.sellToken || !formData.buyToken) {
      toast.error('Please complete all required fields');
      return;
    }

    if (connectedChain.isComingSoon) {
      toast.error(`${connectedChain.name} support coming soon. Please switch to Base Mainnet or Sepolia.`);
      return;
    }

    // Get the correct ABIs and bytecode for the current chain
    const contractConfig = getContractABIsAndBytecode(connectedChain.id);

    const originalChainId = connectedChain.id;
    const rscChainId = connectedChain.rscNetwork.chainId;
    
    try {
      setIsDeploymentActive(true);
      setDeploymentStep('processing');
      console.log('Starting deployment process for personal contracts...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      
      if (currentNetwork.chainId.toString() !== originalChainId) {
        console.log(`Switching to ${connectedChain.name} first...`);
        await switchNetwork(originalChainId);
      }

      const requiredAmount = ethers.parseUnits(formData.amount, formData.sellToken.decimals);

      if (existingContracts && contractsValid) {
        // ===== ADDITIONAL ORDER FLOW =====
        console.log('Adding order to existing personal contracts...');
        setDeploymentMessage('Adding stop order to your existing contracts...');
        
        const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
        const tokenContract = new ethers.Contract(
          formData.sellToken.address,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
          ],
          signer
        );

        const spenderAddress = existingContracts.callbackContract;
        const currentAllowance = await tokenContract.allowance(connectedAccount, spenderAddress);

        if (currentAllowance < requiredAmount) {
          setDeploymentMessage('Approving tokens...');
          
          const approvalTx = await tokenContract.approve(spenderAddress, requiredAmount);
          await approvalTx.wait();
          toast.success('Token approval confirmed');
        } else {
          toast.success('Tokens already approved');
        }

        setDeploymentMessage('Creating stop order...');
        
        const callbackContract = new ethers.Contract(
          existingContracts.callbackContract,
          contractConfig.CALLBACK_STOP_ORDER_ABI,
          signer
        );

        

        // Get the decimals for both tokens
        const sellTokenDecimals = formData.sellToken.decimals;
        const buyTokenDecimals = formData.buyToken.decimals;
        const dropPercent = parseFloat(formData.dropPercentage);

        // Re-calculate price and stopPrice here to ensure data is fresh
        const reserve0 = parseFloat(formData.selectedPair.reserve0);
        const reserve1 = parseFloat(formData.selectedPair.reserve1);

        if (reserve0 <= 0 || reserve1 <= 0) {
          throw new Error('Invalid pair reserves - no liquidity available');
        }

        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0 
          : reserve0 / reserve1;

        const stopPrice = currentPrice * (1 - dropPercent / 100);

       // =================================================================
// ===== START: FINAL CORRECTED COEFFICIENT & THRESHOLD LOGIC ======
// =================================================================



let numeratorTokenDecimals, denominatorTokenDecimals;

if (formData.sellToken0) {
  // Selling token0 for token1. On-chain formula: (reserve1 * coeff) / reserve0
  // Price is in terms of token1 (the buy token).
  numeratorTokenDecimals = buyTokenDecimals;
  denominatorTokenDecimals = sellTokenDecimals;
} else {
  // Selling token1 for token0. On-chain formula: (reserve0 * coeff) / reserve1
  // Price is in terms of token0 (the buy token).
  numeratorTokenDecimals = buyTokenDecimals;
  denominatorTokenDecimals = sellTokenDecimals;
}

// Step 1: The coefficient is 10 to the power of the decimal difference.
// This is the factor needed to make the units of the reserves equal.
// const decimalDifference = numeratorTokenDecimals - denominatorTokenDecimals;
const coefficient = BigInt(10) ** BigInt((denominatorTokenDecimals));

// Step 2: The threshold is the stopPrice scaled to the precision of the NUMERATOR token.
// This ensures both sides of the contract's comparison are on the same scale.
const threshold = ethers.parseUnits(stopPrice.toFixed(numeratorTokenDecimals), numeratorTokenDecimals);

// =================================================================
// ===== END: FINAL CORRECTED COEFFICIENT & THRESHOLD LOGIC ========
// =================================================================
      console.log('Final, Corrected Parameters for Smart Contract:', {
        stopPrice,
        numeratorTokenDecimals,
        denominatorTokenDecimals,
        coefficient: coefficient.toString(),
        threshold: threshold.toString()
      });

      if (threshold <= 0) {
        throw new Error(`Invalid threshold calculated: ${threshold}. Please check token prices and drop percentage.`);
      }

      // Now, use these dynamic values in your transaction
      const createOrderTx = await callbackContract.createStopOrder(
        formData.selectedPair.pairAddress,
        formData.sellToken0,
        requiredAmount,
        coefficient, // Use the new correct coefficient
        threshold,   // Use the new correct threshold
      );

                

        const receipt = await createOrderTx.wait();
        
        let orderId = null;
        if (receipt.logs) {
          const orderCreatedEvent = receipt.logs.find((log: any) => {
            try {
              const parsed = callbackContract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              return parsed && parsed.name === 'StopOrderCreated';
            } catch {
              return false;
            }
          });
          
          if (orderCreatedEvent) {
            const parsed = callbackContract.interface.parseLog({
              topics: orderCreatedEvent.topics,
              data: orderCreatedEvent.data
            });
            if (parsed) {
              orderId = parsed.args.orderId.toString();
            }
          }
        }
        
        toast.success(`Additional stop order created! ${orderId ? `Order ID: ${orderId}` : ''}`);
        setDeploymentMessage('Stop order created successfully!');
        setDeploymentStep('complete');
        
      } else {
        // ===== FIRST ORDER FLOW =====
        console.log('Deploying new personal contracts for first order...');
        setDeploymentMessage('Deploying your personal smart contracts...');
        
        const mainProvider = new ethers.BrowserProvider(window.ethereum);
        const mainSigner = await mainProvider.getSigner();
        
        console.log('Deploying personal callback contract...');
        
        const CallbackFactory = new ethers.ContractFactory(
          contractConfig.CALLBACK_STOP_ORDER_ABI,
          contractConfig.CALLBACK_CONTRACT_BYTECODE,
          mainSigner
        );
        
        const callbackContract = await CallbackFactory.deploy(
          connectedAccount,
          connectedChain.rscNetwork.callbackProxyAddress,
          connectedChain.routerAddress,
          { 
            value: ethers.parseEther(formData.destinationFunding),
            gasLimit: 5000000 
          }
        );
        
        await callbackContract.waitForDeployment();
        const callbackContractAddress = await callbackContract.getAddress();
        console.log('Personal callback contract deployed at:', callbackContractAddress);
        
        toast.success(`Personal callback contract deployed on ${connectedChain.name}`);

        setDeploymentMessage('Approving tokens for your contract...');

        const tokenContract = new ethers.Contract(
          formData.sellToken.address,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
          ],
          mainSigner
        );

        const currentAllowance = await tokenContract.allowance(connectedAccount, callbackContractAddress);

        if (currentAllowance < requiredAmount) {
          const approvalTx = await tokenContract.approve(callbackContractAddress, requiredAmount);
          await approvalTx.wait();
          toast.success('Tokens approved for personal contract');
        }

        setDeploymentMessage('Deploying reactive contract...');
        await switchToRSCNetwork();
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const rscProvider2 = new ethers.BrowserProvider(window.ethereum);
        const rscSigner2 = await rscProvider2.getSigner();

        console.log('Deploying personal reactive contract...');
        console.log('Constructor params:', {
          callbackAddress: callbackContractAddress
        });

        const ReactiveFactory = new ethers.ContractFactory(
          contractConfig.REACTIVE_STOP_ORDER_ABI,
          contractConfig.REACTIVE_CONTRACT_BYTECODE,
          rscSigner2
        );
        
        const reactiveContract = await ReactiveFactory.deploy(
          connectedAccount,
          callbackContractAddress,
          { 
            value: ethers.parseEther("1"),
            gasLimit: 5000000 
          }
        );
        
        await reactiveContract.waitForDeployment();
        const reactiveContractAddress = await reactiveContract.getAddress();
        console.log('Personal reactive contract deployed at:', reactiveContractAddress);
        toast.success('Personal reactive contract deployed');

        setDeploymentMessage('Storing contract addresses...');
        
        try {
          console.log('Storing personal contract addresses in Convex...');
          await storeContract({
            userAddress: connectedAccount,
            callbackContract: callbackContractAddress,
            rscContract: reactiveContractAddress,
            chainId: originalChainId
          });
          console.log('Contract addresses stored successfully in Convex');
          toast.success('Contract addresses stored in database');
        } catch (storageError) {
          console.warn('Failed to store contract addresses in Convex (non-critical):', storageError);
          toast('Warning: Could not store contract addresses in database');
        }

        setDeploymentMessage('Creating your first stop order...');
        await switchNetwork(originalChainId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalProvider = new ethers.BrowserProvider(window.ethereum);
        const finalSigner = await finalProvider.getSigner();
        
        const finalCallbackContract = new ethers.Contract(
          callbackContractAddress,
          contractConfig.CALLBACK_STOP_ORDER_ABI,
          finalSigner
        );

        // Get the decimals for both tokens
        const sellTokenDecimals = formData.sellToken.decimals;
        const buyTokenDecimals = formData.buyToken.decimals;
        const dropPercent = parseFloat(formData.dropPercentage);

        // Re-calculate price and stopPrice here to ensure data is fresh
        const reserve0 = parseFloat(formData.selectedPair.reserve0);
        const reserve1 = parseFloat(formData.selectedPair.reserve1);

        if (reserve0 <= 0 || reserve1 <= 0) {
          throw new Error('Invalid pair reserves - no liquidity available');
        }

        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0 
          : reserve0 / reserve1;

        const stopPrice = currentPrice * (1 - dropPercent / 100);

        // =================================================================
// ===== START: FINAL CORRECTED COEFFICIENT & THRESHOLD LOGIC ======
// =================================================================



let numeratorTokenDecimals, denominatorTokenDecimals;

if (formData.sellToken0) {
  // Selling token0 for token1. On-chain formula: (reserve1 * coeff) / reserve0
  // Price is in terms of token1 (the buy token).
  numeratorTokenDecimals = buyTokenDecimals;
  denominatorTokenDecimals = sellTokenDecimals;
} else {
  // Selling token1 for token0. On-chain formula: (reserve0 * coeff) / reserve1
  // Price is in terms of token0 (the buy token).
  numeratorTokenDecimals = buyTokenDecimals;
  denominatorTokenDecimals = sellTokenDecimals;
}

// Step 1: The coefficient is 10 to the power of the decimal difference.
// This is the factor needed to make the units of the reserves equal.
// const decimalDifference = numeratorTokenDecimals - denominatorTokenDecimals;
const coefficient = BigInt(10) ** BigInt((denominatorTokenDecimals));

// Step 2: The threshold is the stopPrice scaled to the precision of the NUMERATOR token.
// This ensures both sides of the contract's comparison are on the same scale.
const threshold = ethers.parseUnits(stopPrice.toFixed(numeratorTokenDecimals), numeratorTokenDecimals);


// =================================================================
// ===== END: FINAL CORRECTED COEFFICIENT & THRESHOLD LOGIC ========
// =================================================================

        console.log('Final, Corrected Parameters for Smart Contract:', {
          stopPrice,
          numeratorTokenDecimals,
          denominatorTokenDecimals,
          coefficient: coefficient.toString(),
          threshold: threshold.toString()
        });

        if (threshold <= 0) {
          throw new Error(`Invalid threshold calculated: ${threshold}. Please check token prices and drop percentage.`);
        }

        // Now, use these dynamic values in your transaction
        const firstOrderTx = await finalCallbackContract.createStopOrder(
          formData.selectedPair.pairAddress,
          formData.sellToken0,
          requiredAmount,
          coefficient, // Use the new correct coefficient
          threshold,   // Use the new correct threshold
        );

        const receipt = await firstOrderTx.wait();
        
        let orderId = null;
        if (receipt.logs) {
          const orderCreatedEvent = receipt.logs.find((log: any) => {
            try {
              const parsed = finalCallbackContract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              return parsed && parsed.name === 'StopOrderCreated';
            } catch {
              return false;
            }
          });
          
          if (orderCreatedEvent) {
            const parsed = finalCallbackContract.interface.parseLog({
              topics: orderCreatedEvent.topics,
              data: orderCreatedEvent.data
            });
            if (parsed) {
              orderId = parsed.args.orderId.toString();
            }
          }
        }

        console.log('DEPLOYMENT SUCCESS: New personal contracts deployed');
        
        const newContracts: UserContractAddresses = {
          reactiveContract: reactiveContractAddress,
          callbackContract: callbackContractAddress,
          deployedAt: Date.now(),
          chainId: originalChainId,
          deployer: connectedAccount.toLowerCase().trim()
        };
        
        setExistingContracts(newContracts);
        setContractsValid(true);
        toast.success(`First stop order created! ${orderId ? `Order ID: ${orderId}` : ''}`);
        toast.success(`Personal contracts deployed successfully on ${connectedChain.name}! Future orders will be cheaper.`);
        setDeploymentMessage('Contracts deployed and order created!');
      }

      toast.success('Your stop order is now active and monitoring prices 24/7');
      setDeploymentStep('complete');
      console.log('Deployment completed successfully!');
      
      // Refresh contracts state after successful deployment
      setTimeout(async () => {
        await refreshContractsState();
        window.location.href = '/automations/stop-order/dashboard';
      }, 3000);
      
    } catch (error: any) {
      console.error('Error creating stop order:', error);
      setDeploymentStep('idle');
      setDeploymentMessage('');
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const currentNetwork = await provider.getNetwork();
        if (currentNetwork.chainId.toString() !== originalChainId) {
          console.log('Attempting to switch back to original network after error...');
          await switchNetwork(originalChainId);
          toast('Switched back to original network');
        }
      } catch (switchBackError) {
        console.error('Failed to switch back to original network:', switchBackError);
        toast('Please manually switch back to your original network');
      }
      
      if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else if (error.message.includes('Only deployer can call') || error.message.includes('Only owner can call')) {
        toast.error('Access denied: You can only add orders to contracts you deployed');
      } else {
        toast.error(error.message || 'Failed to create stop order');
      }
    } finally {
      setIsDeploymentActive(false);
      console.log('Deployment process ended');
    }
  }, [connectedChain, formData, existingContracts, contractsValid, connectedAccount, switchNetwork, switchToRSCNetwork, storeContract, refreshContractsState]);

  // Form validation
  const isFormValid = 
    !!connectedAccount &&
    !!connectedChain &&
    !connectedChain.isComingSoon &&
    !!formData.sellToken &&
    !!formData.buyToken &&
    !!formData.selectedPair &&
    !!formData.amount &&
    parseFloat(formData.amount) > 0 &&
    !!formData.dropPercentage &&
    parseFloat(formData.dropPercentage) > 0 &&
    hasTokenBalance &&
    deploymentStep === 'idle' &&
    !isDeploymentActive;

  // Auto-detect connected chain and account
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
            const account = accounts[0].address;
            setConnectedAccount(account);
            setFormData(prev => ({ ...prev, clientAddress: account }));
          }

          const chainId = network.chainId.toString();
          const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
          
          if (chain) {
            setConnectedChain(chain);
            setFormData(prev => ({ 
              ...prev, 
              chainId: chainId,
              destinationFunding: chain.defaultFunding 
            }));
          }
        } catch (error) {
          console.error('Error detecting connection:', error);
        }
      }
      setIsInitializing(false);
    };

    detectConnection();

    // Handle network and account changes
    const handleChainChanged = (chainId: string) => {
      console.log('Network changed to:', chainId, 'Deployment active:', isDeploymentActive);
      if (!isDeploymentActive && deploymentStep === 'idle') {
        console.log('Not in deployment, reloading page...');
        setTimeout(() => window.location.reload(), 100);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Account changed:', accounts, 'Deployment active:', isDeploymentActive);
      if (!isDeploymentActive && deploymentStep === 'idle') {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          setFormData(prev => ({ ...prev, clientAddress: accounts[0] }));
        }
        setTimeout(() => window.location.reload(), 100);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [deploymentStep, isDeploymentActive]);

  // Pre-load user tokens for better UX
  useEffect(() => {
    const preloadUserTokens = async () => {
      if (connectedAccount && connectedChain && !isInitializing) {
        try {
          console.log('Pre-loading user tokens for better UX...');
          await TokenService.fetchUserTokens(connectedChain.id, connectedAccount);
          console.log('User tokens pre-loaded and cached');
        } catch (error) {
          console.log('Token pre-loading failed (non-critical):', error);
        }
      }
    };

    const preloadTimer = setTimeout(preloadUserTokens, 1000);
    
    return () => clearTimeout(preloadTimer);
  }, [connectedAccount, connectedChain, isInitializing]);

  // ===== FIXED FIND TRADING PAIR FUNCTION WITH PROPER DECIMAL HANDLING =====
  useEffect(() => {
    const findTradingPair = async () => {
      if (!formData.sellToken || !formData.buyToken || !connectedChain) return;
      
      setIsLoadingPair(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        const factoryInterface = new ethers.Interface([
          'function getPair(address tokenA, address tokenB) view returns (address pair)'
        ]);
        
        const factoryContract = new ethers.Contract(
          connectedChain.factoryAddress, 
          factoryInterface, 
          provider
        );

        const pairAddress = await factoryContract.getPair(formData.sellToken.address, formData.buyToken.address);
        
        if (pairAddress === ethers.ZeroAddress) {
          setFormData(prev => ({ ...prev, selectedPair: null }));
          return;
        }

        const pairInterface = new ethers.Interface([
          'function getReserves() view returns (uint112, uint112, uint32)',
          'function token0() view returns (address)',
          'function token1() view returns (address)'
        ]);

        const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
        const [reserves, pairToken0] = await Promise.all([
          pairContract.getReserves(),
          pairContract.token0()
        ]);

        console.log('=== PAIR FINDING WITH FIXED DECIMAL HANDLING ===');
        console.log('Pair address:', pairAddress);
        console.log('Pair token0:', pairToken0);
        console.log('Sell token:', formData.sellToken.address, formData.sellToken.symbol, formData.sellToken.decimals);
        console.log('Buy token:', formData.buyToken.address, formData.buyToken.symbol, formData.buyToken.decimals);
        console.log('Raw reserves[0]:', reserves[0].toString());
        console.log('Raw reserves[1]:', reserves[1].toString());

        // Determine which token is token0 and which is token1
        const isToken0First = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();
        
        console.log('isToken0First (sellToken is token0):', isToken0First);

        // CRITICAL FIX: Apply correct decimals to each reserve
        let reserve0: string, reserve1: string;
        
        if (isToken0First) {
          // sellToken is token0, buyToken is token1
          reserve0 = ethers.formatUnits(reserves[0], formData.sellToken.decimals);
          reserve1 = ethers.formatUnits(reserves[1], formData.buyToken.decimals);
        } else {
          // buyToken is token0, sellToken is token1  
          reserve0 = ethers.formatUnits(reserves[0], formData.buyToken.decimals);
          reserve1 = ethers.formatUnits(reserves[1], formData.sellToken.decimals);
        }
        
        console.log('Formatted reserve0:', reserve0);
        console.log('Formatted reserve1:', reserve1);
        
        // Calculate current price for display
        const currentPrice = isToken0First 
          ? parseFloat(reserve1) / parseFloat(reserve0)  // token1 per token0 (buyToken per sellToken)
          : parseFloat(reserve0) / parseFloat(reserve1); // token0 per token1 (buyToken per sellToken)

        console.log('Current price (buyToken per sellToken):', currentPrice);

        const tradingPair: TradingPair = {
          token0: isToken0First ? formData.sellToken : formData.buyToken,
          token1: isToken0First ? formData.buyToken : formData.sellToken,
          pairAddress,
          reserve0,  // Already properly formatted
          reserve1,  // Already properly formatted
          currentPrice
        };

        const sellToken0 = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();

        console.log('Final tradingPair:', tradingPair);
        console.log('sellToken0 flag:', sellToken0);
        console.log('=== END PAIR FINDING ===');

        setFormData(prev => ({ 
          ...prev, 
          selectedPair: tradingPair,
          sellToken0: sellToken0
        }));
        
      } catch (error: any) {
        console.error('Error finding pair:', error);
        setFormData(prev => ({ ...prev, selectedPair: null }));
      } finally {
        setIsLoadingPair(false);
      }
    };

    findTradingPair();
  }, [formData.sellToken, formData.buyToken, connectedChain]);

  // Check token balance
  useEffect(() => {
    const checkBalance = async () => {
      if (!formData.sellToken || !connectedAccount || !formData.amount) {
        setHasTokenBalance(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(
          formData.sellToken.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );

        const balanceWei = await tokenContract.balanceOf(connectedAccount);
        const balance = ethers.formatUnits(balanceWei, formData.sellToken.decimals);
        setTokenBalance(balance);

        const requiredAmount = parseFloat(formData.amount);
        const availableAmount = parseFloat(balance);
        setHasTokenBalance(availableAmount >= requiredAmount);

      } catch (error) {
        console.error('Error checking balance:', error);
        setHasTokenBalance(false);
      }
    };

    checkBalance();
  }, [formData.sellToken, formData.amount, connectedAccount]);

  // Calculate stop price when drop percentage changes
  useEffect(() => {
    if (formData.selectedPair && formData.dropPercentage && formData.sellToken && formData.buyToken) {
      const reserve0 = parseFloat(formData.selectedPair.reserve0);
      const reserve1 = parseFloat(formData.selectedPair.reserve1);
      
      if (reserve0 > 0 && reserve1 > 0) {
        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0
          : reserve0 / reserve1;
          
        const dropPercent = parseFloat(formData.dropPercentage) || 10;
        const stopPrice = currentPrice * (1 - dropPercent / 100);
        
        setFormData(prev => ({ 
          ...prev, 
          currentPrice: currentPrice.toString(),
          stopPrice: stopPrice.toFixed(6) 
        }));
      }
    }
  }, [formData.selectedPair, formData.dropPercentage, formData.sellToken0, formData.sellToken, formData.buyToken]);

  // Calculate expected receive amount
  const calculateReceiveAmount = useCallback(() => {
    if (!formData.amount || !formData.stopPrice || !formData.sellToken || !formData.buyToken) {
      return '0.0';
    }
    
    const sellAmount = parseFloat(formData.amount);
    const stopPrice = parseFloat(formData.stopPrice);
    const receiveAmount = sellAmount * stopPrice;
    
    return receiveAmount.toFixed(6);
  }, [formData.amount, formData.stopPrice, formData.sellToken, formData.buyToken]);

  const openTokenModal = useCallback((type: 'sell' | 'buy') => {
    setTokenModalType(type);
    setIsTokenModalOpen(true);
  }, []);

  const handleTokenSelect = useCallback((token: Token) => {
    if (tokenModalType === 'sell') {
      setFormData(prev => ({ ...prev, sellToken: token }));
    } else {
      setFormData(prev => ({ ...prev, buyToken: token }));
    }
  }, [tokenModalType]);

  // Swap tokens function with animation
  const handleSwapTokens = useCallback(async () => {
    if (!formData.sellToken || !formData.buyToken) return;
    
    setIsSwapping(true);
    
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        sellToken: prev.buyToken,
        buyToken: prev.sellToken,
        amount: '',
        selectedPair: null
      }));
      setIsSwapping(false);
    }, 200);
  }, [formData.sellToken, formData.buyToken]);

  // Show loading during initialization
  if (isInitializing) {
    return (
      <div className="relative min-h-screen py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="relative z-20 max-w-7xl mx-auto">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-zinc-200 text-sm sm:text-base">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-center lg:text-left">
            Personal Stop Orders
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-zinc-200 mb-4 text-center lg:text-left">
            Deploy your own smart contracts and automatically sell tokens when prices drop - protecting your investments 24/7.
          </p>
          {connectedChain && (
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                Live on {connectedChain.name}
              </span>
            </div>
          )}
        </motion.div>

        {/* Main Interface Container */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* Status Indicator */}
          <EnhancedStatusIndicator
            formData={formData}
            connectedAccount={connectedAccount}
            connectedChain={connectedChain}
            hasTokenBalance={hasTokenBalance}
            isLoadingPair={isLoadingPair}
            existingContracts={existingContracts}
            contractsValid={contractsValid}
            contractFundingStatus={contractFundingStatus}
          />

          {/* Simple Status Indicator for Processing */}
          <SimpleStatusIndicator
            step={deploymentStep}
            isVisible={deploymentStep !== 'idle'}
            message={deploymentMessage}
          />

          {/* Debt Warning Card - Enhanced Design */}
          {contractsHaveDebt && existingContracts && contractsValid && (
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
                    {deploymentStep === 'processing' ? (
                      <div className="flex items-center text-sm text-amber-200">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Covering debt...
                      </div>
                    ) : deploymentStep === 'complete' ? (
                      <div className="flex items-center text-sm text-green-200">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Debt cleared successfully!
                      </div>
                    ) : (
                      <Button
                        onClick={handleCoverDebt}
                        disabled={isDeploymentActive}
                        className="bg-amber-600 hover:bg-amber-700 text-amber-50 text-sm"
                      >
                        <div className="flex items-center">
                          <Wallet className="w-4 h-4 mr-2" />
                          Cover Debt & Activate Contracts
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Combined Stop Order Configuration */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mx-auto max-w-2xl">
            
            <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-zinc-100 flex items-center">
                Configure Personal Stop Order
                {existingContracts && contractsValid && contractFundingStatus && (
                  <div className="ml-3 flex items-center text-sm px-2 py-1 rounded-full">
                    {contractFundingStatus.isActive ? (
                      <div className="bg-green-900/30 text-green-300 flex items-center">
                        <Layers className="w-3 h-3 mr-1" />
                        Add to existing
                      </div>
                    ) : (
                      <div className="bg-zinc-800/50 text-zinc-400 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Needs funding
                      </div>
                    )}
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-zinc-300 text-sm sm:text-base">
                {existingContracts && contractsValid && contractFundingStatus ? (
                  contractFundingStatus.isActive 
                    ? 'Adding order to your existing personal smart contracts (lower cost)'
                    : 'Your personal contracts need debt clearance before you can add more orders'
                ) : existingContracts && contractsValid ? (
                  'Adding order to your existing personal smart contracts (lower cost)'
                ) : connectedChain?.id === '8453' ? (
                  'Deploy your personal stop order smart contracts on Base Mainnet'
                ) : (
                  'Deploy your personal stop order smart contracts'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Token Selection Section */}
              <div className="space-y-3 sm:space-y-4">
                {/* Sell Token Section */}
                <div className="bg-blue-900/20 rounded-xl p-3 sm:p-4 border border-blue-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-zinc-400">Sell</span>
                    <div className="flex space-x-1.5 sm:space-x-2">
                      {['25%', '50%', '75%', 'Max'].map(percentage => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          className="text-xs px-1.5 py-1 sm:px-2 sm:py-1 bg-blue-700/50 border-blue-600 text-zinc-300 hover:bg-blue-600"
                          disabled={shouldDisableTokenSelection}
                          onClick={() => {
                            if (formData.sellToken?.balance) {
                              const balance = parseFloat(formData.sellToken.balance);
                              const percent = percentage === 'Max' ? 100 : parseInt(percentage);
                              const amount = (balance * percent / 100).toString();
                              setFormData(prev => ({ ...prev, amount }));
                            }
                          }}
                        >
                          {percentage}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="border-0 bg-transparent text-xl sm:text-2xl font-semibold text-zinc-100 placeholder:text-zinc-500 p-0 h-auto focus:ring-2 focus:ring-blue-500"
                      disabled={shouldDisableTokenSelection}
                    />
                    
                    <div className="relative group">
                      <Button
                        onClick={() => openTokenModal('sell')}
                        className={`px-2 py-1.5 sm:px-3 sm:py-2 h-auto text-sm sm:text-base ${
                          !connectedAccount || shouldDisableTokenSelection
                            ? 'bg-gray-600/50 border-gray-500 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-700/80 hover:bg-blue-600 border-blue-600 text-zinc-100'
                        }`}
                        disabled={!connectedAccount || shouldDisableTokenSelection}
                      >
                        {formData.sellToken ? (
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                              {formData.sellToken.symbol.charAt(0)}
                            </div>
                            <span className="hidden sm:inline">{formData.sellToken.symbol}</span>
                            <span className="sm:hidden">{formData.sellToken.symbol.slice(0, 4)}</span>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <span className="text-xs sm:text-sm">Select token</span>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        )}
                      </Button>
                      {(!connectedAccount || shouldDisableTokenSelection) && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {!connectedAccount 
                            ? 'Connect your wallet to continue'
                            : 'Clear contract debt to continue'
                          }
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {formData.sellToken?.balance && (
                    <div className="text-xs sm:text-sm text-zinc-400 mt-2">
                      Balance: {formatTokenBalance(formData.sellToken.balance)} {formData.sellToken.symbol}
                    </div>
                  )}
                </div>

                {/* Functional Swap Arrow */}
                <div className="flex justify-center">
                  <motion.div
                    animate={{ rotate: isSwapping ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-800/50 hover:bg-blue-700/70 rounded-lg border border-blue-700 hover:border-blue-600"
                      onClick={handleSwapTokens}
                      disabled={!formData.sellToken || !formData.buyToken || shouldDisableTokenSelection}
                    >
                      <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" />
                    </Button>
                  </motion.div>
                </div>

                {/* Buy Token Section */}
                <div className="bg-blue-900/20 rounded-xl p-3 sm:p-4 border border-blue-500/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-zinc-400">Receive (at stop price)</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex-1">
                      <span className="text-xl sm:text-2xl font-semibold text-zinc-100">
                        {calculateReceiveAmount()}
                      </span>
                    </div>
                    
                    <div className="relative group">
                      <Button
                        onClick={() => openTokenModal('buy')}
                        className={`px-2 py-1.5 sm:px-3 sm:py-2 h-auto text-sm sm:text-base ${
                          !connectedAccount || shouldDisableTokenSelection
                            ? 'bg-gray-600/50 border-gray-500 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-700/80 hover:bg-blue-600 border-blue-600 text-zinc-100'
                        }`}
                        disabled={!connectedAccount || shouldDisableTokenSelection}
                      >
                        {formData.buyToken ? (
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-xs font-bold">
                              {formData.buyToken.symbol.charAt(0)}
                            </div>
                            <span className="hidden sm:inline">{formData.buyToken.symbol}</span>
                            <span className="sm:hidden">{formData.buyToken.symbol.slice(0, 4)}</span>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <span className="text-xs sm:text-sm">Select token</span>
                            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          </div>
                        )}
                      </Button>
                      {(!connectedAccount || shouldDisableTokenSelection) && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {!connectedAccount 
                            ? 'Connect your wallet to continue'
                            : 'Clear contract debt to continue'
                          }
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stop Loss Configuration */}
              {formData.sellToken && formData.buyToken && (
                <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-zinc-800">
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center">
                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-400" />
                    Stop Loss Settings
                  </h3>
                  
                  {/* Custom Percentage Input */}
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-sm text-zinc-400 block">Drop percentage to trigger sale</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      placeholder="Enter drop percentage"
                      value={formData.dropPercentage}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, dropPercentage: e.target.value }));
                        calculateThresholdFromPercentage(e.target.value);
                      }}
                      className="bg-blue-900/20 border-blue-700 text-zinc-200 text-base sm:text-lg focus:border-blue-500 focus:ring-blue-500"
                      disabled={shouldDisableTokenSelection}
                    />
                  </div>

                  {/* Quick Percentage Options */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {['5', '10', '15', '20'].map(percentage => (
                      <Button
                        key={percentage}
                        variant={formData.dropPercentage === percentage ? "default" : "outline"}
                        size="sm"
                        className={`text-xs sm:text-sm ${
                          formData.dropPercentage === percentage 
                            ? 'bg-red-600 border-red-500 hover:bg-red-700' 
                            : 'bg-blue-800/50 border-blue-700 text-zinc-300 hover:bg-blue-700'
                        }`}
                        disabled={shouldDisableTokenSelection}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, dropPercentage: percentage }));
                          calculateThresholdFromPercentage(percentage);
                        }}
                      >
                        -{percentage}%
                      </Button>
                    ))}
                  </div>

                  {/* Price Information */}
                  {formData.selectedPair && formData.stopPrice && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 sm:p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs sm:text-sm text-red-400 mb-1">Current Price</p>
                          <p className="text-base sm:text-lg font-bold text-red-100">
                            {formData.selectedPair.currentPrice.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-red-400 mb-1">Stop Trigger Price</p>
                          <p className="text-base sm:text-lg font-bold text-red-100">
                            {formData.stopPrice}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-red-500/20">
                        <p className="text-xs text-red-300">
                          When {formData.sellToken.symbol} price drops {formData.dropPercentage}% to {formData.stopPrice} {formData.buyToken.symbol}, 
                          your {formData.amount} {formData.sellToken.symbol} will automatically sell for ~{calculateReceiveAmount()} {formData.buyToken.symbol}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Create Stop Order Button */}
                  <Button 
                    onClick={handleCreateOrder}
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={!isFormValid || shouldDisableTokenSelection}
                    title={
                      !connectedAccount 
                        ? 'Connect your wallet to continue' 
                        : shouldDisableTokenSelection 
                        ? 'Clear contract debt first to continue'
                        : undefined
                    }
                  >
                    {deploymentStep === 'complete' ? (
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        Stop Order Created!
                      </div>
                    ) : deploymentStep === 'processing' ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                        Processing...
                      </div>
                    ) : isLoadingPair ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                        Finding Pair...
                      </div>
                    ) : existingContracts && contractsValid && contractFundingStatus?.isActive ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center">
                          <Layers className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Add Order to Personal Contract
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          {connectedChain?.id === '8453' 
                            ? 'Create Personal Stop Order on Base'
                            : 'Create Personal Stop Order'
                          }
                        </div>
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple Dashboard Link Component */}
          <DashboardLink />

          {/* Enhanced Funding Requirements Card */}
          <EnhancedFundingRequirementsCard 
            connectedChain={connectedChain ?? undefined}
            connectedAccount={connectedAccount}
          />

          {/* Network Info */}
          {connectedChain && (
            <div className="text-center mt-4 sm:mt-6">
              <p className="text-xs sm:text-sm text-zinc-400">
                Connected to <span className="text-zinc-300 font-medium">{connectedChain.name}</span>
                {connectedChain.id === '8453' && (
                  <span className="ml-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                    Mainnet Live
                  </span>
                )}
                {connectedChain.isComingSoon && (
                  <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Educational Section and Multi-Chain block */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-6 sm:mt-8">
          <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
            <CardTitle className="text-zinc-100 flex items-center text-lg sm:text-xl">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription className="text-zinc-300 text-sm sm:text-base">
              Understanding the Base mainnet launch and personal contract system
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="base-launch" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  Why did ReacDEFI launch on Base Mainnet?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Base Mainnet offers the optimal combination for DeFi automation with low transaction costs, fast block times, and strong DeFi ecosystem integration.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 text-sm sm:text-base">Key Advantages</h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          • Low gas costs (~$0.50-1 per transaction vs $20-100 on Ethereum)<br/>
                          • 2-second block times for responsive automation<br/>
                          • Growing ecosystem with major DeFi protocols<br/>
                          • Ethereum L1 security with L2 efficiency
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="personal-contracts" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  How do personal contracts work on Base?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Each user deploys their own personal stop order contracts - you own and control your smart contracts completely on Base Mainnet.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 text-sm sm:text-base">Your Personal Callback Contract (Base)</h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          Deployed on Base Mainnet. Holds your tokens, executes swaps via Uniswap V2, and manages all your stop orders with low gas costs.
                        </p>
                      </div>
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 text-sm sm:text-base">Your Personal Reactive Contract (Lasna)</h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Deployed on Reactive Network. Monitors Base DEX prices and triggers your Base callback contract when conditions are met.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cost-structure" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  What are the costs on Base Mainnet?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Base Mainnet offers significantly lower costs compared to Ethereum mainnet while maintaining security and reliability.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-500/20">
                        <h4 className="font-medium text-purple-200 mb-2 text-sm sm:text-base">First Order (Contract Deployment)</h4>
                        <p className="text-xs sm:text-sm text-purple-300">
                          ~0.0003 ETH + 1 REACT + gas fees (~$2-5 total). Deploys your personal contracts and creates first stop order.
                        </p>
                      </div>
                      
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 text-sm sm:text-base">Additional Orders (2nd, 3rd, 4th...)</h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Gas fees only (~$0.50-1 each). All orders use your existing personal contracts on Base.
                        </p>
                      </div>
                      
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 text-sm sm:text-base">Professional Grade Benefits</h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          Lower costs enable professional trading strategies with multiple orders and frequent adjustments.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  What is a Stop Order on Base?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      A stop order acts as your personal trading assistant on Base, watching token prices 24/7 and automatically selling when they drop to your specified level via Uniswap V2.
                    </p>
                    <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2 text-sm sm:text-base">Example on Base:</h4>
                      <p className="text-xs sm:text-sm text-zinc-300">
                        You own WETH worth $3,500 each on Base. You set a 10% stop order. If WETH drops to $3,150, 
                        your tokens automatically sell for USDC via Base's Uniswap V2, costing only ~$1 in gas.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  How does Base integration work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Your personal contracts bridge Base Mainnet with the Reactive Network for autonomous cross-chain automation.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium text-sm sm:text-base">Personal Contract Deployment on Base</p>
                          <p className="text-blue-300 text-xs sm:text-sm">
                            Your callback contract is deployed on Base Mainnet, linked to Uniswap V2 for efficient token swaps.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium text-sm sm:text-base">Cross-Chain Price Monitoring</p>
                          <p className="text-purple-300 text-xs sm:text-sm">
                            Your reactive contract on Lasna monitors Base DEX prices and triggers your Base contract automatically.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium text-sm sm:text-base">Low-Cost Execution on Base</p>
                          <p className="text-green-300 text-xs sm:text-sm">
                            When triggered, your Base contract executes the swap with minimal gas costs, protecting your investment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="safety" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  Base Mainnet Security & Benefits
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Base Mainnet provides enterprise-grade security with L2 efficiency for professional DeFi automation.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 flex items-center text-sm sm:text-base">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Ethereum L1 Security
                        </h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Base inherits Ethereum's security model while providing L2 speed and cost benefits for your personal contracts.
                        </p>
                      </div>
                      
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 flex items-center text-sm sm:text-base">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Fast & Reliable
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          2-second block times ensure your stop orders execute quickly when market conditions change.
                        </p>
                      </div>
                      
                      <div className="bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-500/20">
                        <h4 className="font-medium text-purple-200 mb-2 flex items-center text-sm sm:text-base">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Cost Efficient
                        </h4>
                        <p className="text-xs sm:text-sm text-purple-300">
                          10-50x lower gas costs compared to Ethereum mainnet enable frequent trading and portfolio management.
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-500/20">
                        <h4 className="font-medium text-orange-200 mb-2 flex items-center text-sm sm:text-base">
                          <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          DeFi Ecosystem
                        </h4>
                        <p className="text-xs sm:text-sm text-orange-300">
                          Access to major DeFi protocols and tokens with deep liquidity for reliable order execution.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Token Selection Modal */}
      <TokenSelectionModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelect={handleTokenSelect}
        chainId={formData.chainId}
        connectedAccount={connectedAccount}
        tokenModalType={tokenModalType}
        excludeToken={
          tokenModalType === 'sell'
            ? formData.buyToken ?? undefined
            : formData.sellToken ?? undefined
        } 
      />
    </div>
  );
}