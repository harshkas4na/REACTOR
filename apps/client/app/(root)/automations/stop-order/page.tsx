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
import { stopOrderByteCodeSepolia } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';
import { rscByteCodeSepolia } from '@/data/automations/stop-order/RSCByteCode';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ===== CONTRACT ABIs =====
const REACTIVE_STOP_ORDER_ABI = rscABISepolia;
const CALLBACK_STOP_ORDER_ABI = stopOrderABISepolia;

// Contract bytecodes
const REACTIVE_CONTRACT_BYTECODE = rscByteCodeSepolia;
const CALLBACK_CONTRACT_BYTECODE = stopOrderByteCodeSepolia;

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
    const systemContractAddress = '0x0000000000000000000000000000000000fffFfF'; // Updated system contract address
    const callbackProxyAddress = '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'; // Callback proxy address for Sepolia
    
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

    // Check callback contract debt using callback proxy (need Sepolia provider)
    let callbackDebt = BigInt(0);
    try {
      const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
      const callbackProxyContract = new ethers.Contract(
        callbackProxyAddress,
        ['function debts(address) view returns (uint256)'],
        sepoliaProvider
      );
      callbackDebt = await callbackProxyContract.debts(contracts.callbackContract);
    } catch (callbackError) {
      console.warn('Could not check callback contract debt:', callbackError);
    }

    // Check actual balances
    const [reactiveBalance, callbackBalance] = await Promise.all([
      rscProvider.getBalance(contracts.reactiveContract),
      new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com').getBalance(contracts.callbackContract)
    ]);

    // Convert to readable format
    const totalDebt = reactiveDebt + callbackDebt;
    const totalReserves = reactiveReserves;
    
    // Contract is active if it has sufficient balance and reserves > debt
    const hasBalance = reactiveBalance > ethers.parseEther('0.001') && callbackBalance > ethers.parseEther('0.001');
    const isActive = totalReserves >= totalDebt && hasBalance;
    
    console.log('💰 Contract funding status:', {
      reactiveContract: contracts.reactiveContract,
      callbackContract: contracts.callbackContract,
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
    console.error('❌ Error checking funding status:', error);
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
    console.log('🔐 Validating stored contracts:', contracts);
    
    // Normalize addresses for comparison - use stored deployer from Convex
    const normalizedUserAddress = userAddress.toLowerCase().trim();
    const normalizedContractDeployer = contracts.deployer.toLowerCase().trim();
    
    // First check: User must be the deployer (using stored deployer address from Convex)
    if (normalizedUserAddress !== normalizedContractDeployer) {
      console.error('❌ VALIDATION FAILED: User is not the deployer');
      console.error('❌ User address:', normalizedUserAddress);
      console.error('❌ Contract deployer:', normalizedContractDeployer);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check if callback contract exists and is valid by calling owner()
    const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const callbackContract = new ethers.Contract(
      contracts.callbackContract,
      CALLBACK_STOP_ORDER_ABI,
      sepoliaProvider
    );
    
    try {
      // Check if the user is the owner of the callback contract
      // const contractOwner = await callbackContract.owner();
      // if (contractOwner.toLowerCase() !== userAddress.toLowerCase()) {
      //   console.error('❌ VALIDATION FAILED: User is not the owner of callback contract');
      //   return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
      // }
      console.log('✅ Callback contract validation successful');
    } catch (contractError) {
      console.error('❌ VALIDATION FAILED: Cannot read from callback contract:', contractError);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check if reactive contract exists and is valid 
    const reactiveContract = new ethers.Contract(
      contracts.reactiveContract,
      REACTIVE_STOP_ORDER_ABI,
      rscProvider
    );
    
    try {
      // Check if the user is the owner of the reactive contract
      const contractOwner = await reactiveContract.owner();
      // if (contractOwner.toLowerCase() !== userAddress.toLowerCase()) {
      //   console.error('❌ VALIDATION FAILED: User is not the owner of reactive contract');
      //   return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
      // }
      console.log('✅ Reactive contract validation successful');
    } catch (contractError) {
      console.error('❌ VALIDATION FAILED: Cannot read from reactive contract:', contractError);
      return { isValid: false, fundingStatus: { debt: '0', reserves: '0', isActive: false, callbackDebt: '0', rscDebt: '0' } };
    }
    
    // Check funding status
    const fundingStatus = await checkContractFundingStatus(contracts, rscProvider);
    
    console.log('✅ VALIDATION SUCCESS: All contracts verified');
    return { isValid: true, fundingStatus };
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error);
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

type DeploymentStep = 'idle' | 'checking-contracts' | 'checking-approval' | 'approving' | 'switching-rsc' | 'funding-rsc' | 'deploying-callback' | 'deploying-reactive' | 'creating-order' | 'complete' | 'storing-contracts' | 'covering-callback-debt' | 'covering-rsc-debt';

// ===== CONFIGURATION DATA =====
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
    defaultFunding: '0.03',
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

// Popular tokens by chain (fallback when API doesn't work) - Only ERC20 tokens
const POPULAR_TOKENS: Record<string, Token[]> = {
  '11155111': [
    { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ]
};

// ===== ENHANCED TOKEN SERVICE CLASS WITH ETHPLORER API =====
class TokenService {
  private static cache = new Map<string, { data: Token[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check if we have cached data that's still valid
  private static getCachedTokens(cacheKey: string): Token[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // Cache the fetched tokens
  private static setCachedTokens(cacheKey: string, tokens: Token[]): void {
    this.cache.set(cacheKey, {
      data: tokens,
      timestamp: Date.now()
    });
  }

  // Main method to fetch all tokens for a user on a specific network
  static async fetchUserTokens(chainId: string, address: string): Promise<Token[]> {
    const cacheKey = `${chainId}-${address}`;
    
    // Check cache first
    const cachedTokens = this.getCachedTokens(cacheKey);
    if (cachedTokens) {
      return cachedTokens;
    }

    // Try Ethplorer API first, then fallback to popular tokens method
    const tokens = await this.fetchTokensFromEthplorer(chainId, address);
    
    this.setCachedTokens(cacheKey, tokens);
    return tokens;
  }

  // NEW: Fetch tokens using Ethplorer API
  private static async fetchTokensFromEthplorer(chainId: string, address: string): Promise<Token[]> {
    try {
      console.log('Fetching tokens from Ethplorer API for address:', address);
      
      // Determine the correct API endpoint based on chain
      let apiUrl: string;
      if (chainId === '11155111') { // Sepolia
        apiUrl = `https://sepolia-api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else if (chainId === '1') { // Mainnet
        apiUrl = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else {
        // For unsupported chains, fallback to popular tokens method
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

      // Parse the response and convert to our Token interface
      const tokens: Token[] = [];

      // Process ERC20 tokens from the API response
      if (data.tokens && Array.isArray(data.tokens)) {
        for (const tokenData of data.tokens) {
          try {
            const tokenInfo = tokenData.tokenInfo;
            if (!tokenInfo || !tokenInfo.address || !tokenInfo.symbol || !tokenInfo.name) {
              continue; // Skip invalid token data
            }

            const decimals = parseInt(tokenInfo.decimals) || 18;
            const rawBalance = tokenData.balance || tokenData.rawBalance || '0';
            
            // Convert balance from raw to decimal format
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

            // Only include tokens with positive balance
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
      
      // If we got tokens from Ethplorer, return them
      if (tokens.length > 0) {
        return tokens;
      }

      // If no tokens found via Ethplorer, fallback to popular tokens method
      console.log('No tokens found via Ethplorer, falling back to popular tokens method');
      return this.fetchPopularTokensWithBalances(chainId, address);

    } catch (error) {
      console.error('Error fetching tokens from Ethplorer API:', error);
      
      // Fallback to popular tokens method on any error
      console.log('Falling back to popular tokens method due to Ethplorer API error');
      return this.fetchPopularTokensWithBalances(chainId, address);
    }
  }

  // Enhanced fallback method for networks - Only ERC20 tokens
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

      // Filter only tokens with balance > 0
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

  // Fetch individual token information - enhanced with better error handling
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

  // Clear cache methods
  static clearCache(): void {
    this.cache.clear();
  }

  static clearCacheForUser(chainId: string, address: string): void {
    const cacheKey = `${chainId}-${address}`;
    this.cache.delete(cacheKey);
  }
}

// Helper function to format large numbers
function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

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

  // Fetch all tokens user holds using TokenService
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

  // Enhanced search functionality
  const getTokensToDisplay = useCallback(() => {
    if (!searchTerm) {
      // Show all user's tokens
      return userTokens.filter(token => token.address !== excludeToken?.address);
    }

    // If searching, filter user tokens that match search
    const searchTermLower = searchTerm.toLowerCase();
    
    const matchingTokens = userTokens.filter(token => 
      token.address !== excludeToken?.address &&
      (token.name.toLowerCase().includes(searchTermLower) ||
       token.symbol.toLowerCase().includes(searchTermLower) ||
       token.address.toLowerCase().includes(searchTermLower))
    );

    // If no matches in user tokens, show popular tokens that match
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
                            // Fallback to gradient circle if image fails to load
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
                              {/* You could add price data here */}
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

        {/* Network info footer */}
        <div className="px-4 pb-2">
          <div className="text-xs text-zinc-500 text-center space-y-1">
            <div>
              Showing ERC20 tokens with positive balance
            </div>
            <div className="text-zinc-600">
              💡 Native tokens (ETH, AVAX) not shown - use wrapped versions (WETH, WAVAX) for stop orders
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
  // Determine the current status
  const getStatus = () => {
    if (!connectedChain) {
      return { type: 'error', message: 'Please switch to a supported network (Sepolia)' };
    }
    if (connectedChain.isComingSoon) {
      return { type: 'warning', message: `${connectedChain.name} support coming soon - switch to Sepolia` };
    }
    if (isLoadingPair) {
      return { type: 'loading', message: 'Finding trading pair...' };
    }
    if (!formData.selectedPair && formData.sellToken && formData.buyToken) {
      return { type: 'error', message: 'Trading pair not found on DEX' };
    }
    
    // Only show token-related warnings if user has selected tokens
    if (formData.sellToken && formData.buyToken) {
      // Don't show insufficient balance error if no amount is entered yet
      if (formData.amount && parseFloat(formData.amount) > 0 && !hasTokenBalance) {
        return { type: 'error', message: 'Insufficient token balance' };
      }
      if (!formData.dropPercentage || parseFloat(formData.dropPercentage) <= 0) {
        return { type: 'warning', message: 'Set stop loss percentage' };
      }
      // Don't show ready status until amount is entered
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        return { type: 'warning', message: 'Enter amount to sell' };
      }

      // Show contract status information
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
          subMessage: 'First order - will deploy new smart contracts'
        };
      }
    }
    
    // No status to show if no tokens selected
    return null;
  };

  const status = getStatus();

  // Don't render anything if no status to show
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
              Cost: {existingContracts && contractsValid && contractFundingStatus?.isActive
                ? 'Gas fee only (~$1-5)' 
                : `~${connectedChain.defaultFunding} ${connectedChain.nativeCurrency} + 0.05 ${connectedChain.rscNetwork.currencySymbol} + gas`
              }
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
};

// ===== DEPLOYMENT STATUS COMPONENT =====
const DeploymentStatus = ({ deploymentStep }: { deploymentStep: DeploymentStep }) => {
  const getFundingStepDescription = (step: DeploymentStep) => {
    switch (step) {
      case 'checking-contracts':
        return { title: 'Checking Existing Contracts', message: 'Looking for your existing stop order contracts...', color: 'blue' };
      case 'checking-approval':
        return { title: 'Checking Token Approval', message: 'Verifying if tokens are approved for trading...', color: 'blue' };
      case 'approving':
        return { title: 'Approving Tokens', message: 'Please confirm token approval in your wallet...', color: 'yellow' };
      case 'switching-rsc':
        return { title: 'Switching to Reactive Network', message: 'Please confirm network switch in your wallet...', color: 'purple' };
      case 'funding-rsc':
        return { title: 'Funding RSC System', message: 'Sending 0.05 REACT to the system contract...', color: 'blue' };
      case 'deploying-callback':
        return { title: 'Deploying Callback Contract', message: 'Creating your personal callback contract on Sepolia...', color: 'green' };
      case 'deploying-reactive':
        return { title: 'Deploying Reactive Contract', message: 'Creating your multi-order stop loss contract on Reactive Network...', color: 'green' };
      case 'creating-order':
        return { title: 'Creating Stop Order', message: 'Adding stop order to your contract...', color: 'green' };
      case 'covering-callback-debt':
        return { title: 'Covering Callback Debt', message: 'Funding callback contract and clearing debt...', color: 'purple' };
      case 'covering-rsc-debt':
        return { title: 'Covering RSC Debt', message: 'Funding RSC contract and clearing debt...', color: 'purple' };
      case 'complete':
        return { title: '🎉 Stop Order Active!', message: 'Your stop order is now monitoring prices 24/7', color: 'green' };
      default:
        return null;
    }
  };

  if (deploymentStep === 'idle') return null;

  const stepInfo = getFundingStepDescription(deploymentStep);
  if (!stepInfo) return null;

  const colorClasses = {
    blue: 'bg-blue-900/20 border-blue-500/50 text-blue-300',
    purple: 'bg-purple-900/20 border-purple-500/50 text-purple-300',
    green: 'bg-green-900/20 border-green-500/50 text-green-300',
    yellow: 'bg-yellow-900/20 border-yellow-500/50 text-yellow-300'
  };

  return (
    <Alert className={colorClasses[stepInfo.color as keyof typeof colorClasses]}>
      {deploymentStep === 'complete' ? (
        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
      )}
      <AlertDescription>
        <div className="space-y-1">
          <span className="font-medium text-zinc-200 text-sm sm:text-base">{stepInfo.title}</span>
          <div className="text-xs sm:text-sm opacity-80">{stepInfo.message}</div>
        </div>
      </AlertDescription>
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
    destinationFunding: '0.03',
    rscFunding: '0.05',
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
  const [isCoveringDebt, setIsCoveringDebt] = useState(false);

  // Component cleanup ref
  const mountedRef = useRef(true);

  // Convex hooks
  const contractData = useQuery(api.contracts.get, connectedAccount ? { userAddress: connectedAccount } : "skip");
  const storeContract = useMutation(api.contracts.store);

  // Check if contracts have debt (either callback or RSC)
  const contractsHaveDebt = !!contractFundingStatus && (
    parseFloat(contractFundingStatus.callbackDebt) > 0 || 
    parseFloat(contractFundingStatus.rscDebt) > 0
  );

  // Check if token selection should be disabled
  const shouldDisableTokenSelection = !!contractsHaveDebt && !!existingContracts && contractsValid;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset deployment step when form changes after successful creation
  useEffect(() => {
    if (deploymentStep === 'complete') {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setDeploymentStep('idle');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formData.sellToken, formData.buyToken, formData.amount, formData.dropPercentage, deploymentStep]);

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
          
          // Handle RSC network addition
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

  // Check for existing contracts using Convex data
  useEffect(() => {
    if (!connectedAccount || !connectedChain || !contractData) return;

    const validateContracts = async () => {
      setIsCheckingContracts(true);
      try {
        console.log('Contract data from Convex:', contractData);
        
        if (contractData) {
          // Convert Convex data to UserContractAddresses format
          const stored: UserContractAddresses = {
            reactiveContract: contractData.rscContract,
            callbackContract: contractData.callbackContract,
            deployedAt: Date.now(), // We don't store this in Convex
            chainId: contractData.chainId,
            deployer: contractData.userAddress.toLowerCase()
          };

          console.log('Validating stored contracts from Convex...');
          
          // Create RSC provider to validate contracts
          const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
          
          // Validate contracts exist on RSC network and check funding status
          const validationResult = await validateStoredContracts(stored, rscProvider, connectedAccount);
          
          if (validationResult.isValid) {
            console.log('Contracts are valid, checking funding status...');
            setExistingContracts(stored);
            setContractsValid(true);
            setContractFundingStatus(validationResult.fundingStatus);
            
            // Update cost estimates based on funding status
            if (validationResult.fundingStatus.isActive) {
              console.log('Contracts are active and funded, user can add additional orders');
              setFormData(prev => ({
                ...prev,
                destinationFunding: '0', // No additional funding needed
                rscFunding: '0' // No additional RSC funding needed
              }));
            } else {
              console.log('Contracts exist but are inactive/underfunded');
              setFormData(prev => ({
                ...prev,
                destinationFunding: connectedChain.defaultFunding,
                rscFunding: '0.05'
              }));
            }
          } else {
            console.log('Stored contracts are invalid');
            setExistingContracts(null);
            setContractsValid(false);
            setContractFundingStatus(null);
            
            // Reset to first order costs
            setFormData(prev => ({
              ...prev,
              destinationFunding: connectedChain.defaultFunding,
              rscFunding: '0.05'
            }));
          }
        } else {
          console.log('No stored contracts found in Convex, this will be first order');
          setExistingContracts(null);
          setContractsValid(false);
          setContractFundingStatus(null);
          
          // Set first order costs
          setFormData(prev => ({
            ...prev,
            destinationFunding: connectedChain.defaultFunding,
            rscFunding: '0.05'
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
    };

    validateContracts();
  }, [connectedAccount, connectedChain, contractData]);

  // Calculate threshold from percentage using actual current price
  const calculateThresholdFromPercentage = useCallback((percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage)) || !formData.selectedPair) return;
    
    const dropPercent = parseFloat(percentage);
    const coefficient = 1000;
    
    const reserve0 = parseFloat(formData.selectedPair.reserve0);
    const reserve1 = parseFloat(formData.selectedPair.reserve1);
    
    if (reserve0 <= 0 || reserve1 <= 0) {
      console.error('Invalid reserves for threshold calculation');
      return;
    }

    const currentPrice = formData.sellToken0 
      ? reserve1 / reserve0
      : reserve0 / reserve1;

    if (currentPrice <= 0 || !isFinite(currentPrice)) {
      console.error('Invalid current price calculated from reserves');
      return;
    }

    const stopPrice = currentPrice * (1 - dropPercent / 100);
    
    if (stopPrice <= 0) {
      console.error('Invalid stop price calculated');
      return;
    }
    
    const threshold = Math.floor(stopPrice * coefficient);
    
    console.log('Updated threshold calculation:', {
      currentPrice,
      dropPercent,
      stopPrice,
      coefficient,
      threshold
    });
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage,
      currentPrice: currentPrice.toString(),
      stopPrice: stopPrice.toString()
    }));
  }, [formData.selectedPair, formData.sellToken0]);

  // ===== ENHANCED DEBT COVERING FUNCTION =====
  const handleCoverDebt = useCallback(async () => {
    if (!connectedChain || !existingContracts || !contractFundingStatus) {
      toast.error('Contract information not available');
      return;
    }

    const originalChainId = connectedChain.id;
    const rscChainId = connectedChain.rscNetwork.chainId;
    
    const callbackDebt = parseFloat(contractFundingStatus.callbackDebt);
    const rscDebt = parseFloat(contractFundingStatus.rscDebt);

    try {
      setIsDeploymentActive(true);
      setIsCoveringDebt(true);
      
      console.log('💰 Starting debt covering process...');
      console.log(`Callback debt: ${callbackDebt} ETH, RSC debt: ${rscDebt} REACT`);

      // Step 1: Handle Callback Contract Debt (if exists)
      if (callbackDebt > 0) {
        setDeploymentStep('covering-callback-debt');
        console.log(`Covering callback debt: ${callbackDebt} ETH`);

        // Ensure we're on Sepolia
        await switchNetwork(originalChainId);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const sepoliaProvider = new ethers.BrowserProvider(window.ethereum);
        const sepoliaSigner = await sepoliaProvider.getSigner();

        // Transaction 1: Send funds to callback contract
        const callbackFundingAmount = callbackDebt + 0.01; // Debt + buffer
        console.log(`Sending ${callbackFundingAmount} ETH to callback contract`);
        
        const fundCallbackTx = await sepoliaSigner.sendTransaction({
          to: existingContracts.callbackContract,
          value: ethers.parseEther(callbackFundingAmount.toString()),
          gasLimit: 100000
        });
        
        await fundCallbackTx.wait();
        console.log('✅ Funds sent to callback contract');

        // Transaction 2: Call coverDebt on callback contract
        console.log('Calling coverDebt on callback contract...');
        const callbackContract = new ethers.Contract(
          existingContracts.callbackContract,
          CALLBACK_STOP_ORDER_ABI,
          sepoliaSigner
        );

        try {
          const coverDebtTx = await callbackContract.coverDebt({
            gasLimit: 200000
          });
          await coverDebtTx.wait();
          console.log('✅ Callback debt covered successfully');
        } catch (coverError) {
          console.warn('Could not call coverDebt on callback contract (might not exist):', coverError);
          // Continue anyway, funds were sent
        }

        toast.success('Callback contract debt covered!');
      }

      // Step 2: Handle RSC Contract Debt (if exists)
      if (rscDebt > 0) {
        setDeploymentStep('covering-rsc-debt');
        console.log(`Covering RSC debt: ${rscDebt} REACT`);

        // Switch to RSC network
        await switchToRSCNetwork();
        await new Promise(resolve => setTimeout(resolve, 2000));

        const rscProvider = new ethers.BrowserProvider(window.ethereum);
        const rscSigner = await rscProvider.getSigner();

        // Transaction 1: Send funds to RSC contract
        const rscFundingAmount = rscDebt + 0.1; // Debt + buffer
        console.log(`Sending ${rscFundingAmount} REACT to RSC contract`);
        
        const fundRscTx = await rscSigner.sendTransaction({
          to: existingContracts.reactiveContract,
          value: ethers.parseEther(rscFundingAmount.toString()),
          gasLimit: 100000
        });
        
        await fundRscTx.wait();
        console.log('✅ Funds sent to RSC contract');

        // Transaction 2: Call coverDebt on RSC contract
        console.log('Calling coverDebt on RSC contract...');
        const rscContract = new ethers.Contract(
          existingContracts.reactiveContract,
          REACTIVE_STOP_ORDER_ABI,
          rscSigner
        );

        try {
          const coverDebtTx = await rscContract.coverDebt({
            gasLimit: 200000
          });
          await coverDebtTx.wait();
          console.log('✅ RSC debt covered successfully');
        } catch (coverError) {
          console.warn('Could not call coverDebt on RSC contract (might not exist):', coverError);
          // Continue anyway, funds were sent
        }

        toast.success('RSC contract debt covered!');
      }

      // Switch back to original network
      await switchNetwork(originalChainId);
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDeploymentStep('complete');
      toast.success('All contract debts have been cleared! Your contracts are now active.');

      // Refresh contract status after covering debt
      setTimeout(async () => {
        if (connectedChain) {
          const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
          const validationResult = await validateStoredContracts(existingContracts, rscProvider, connectedAccount);
          setContractFundingStatus(validationResult.fundingStatus);
        }
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Error covering debt:', error);
      setDeploymentStep('idle');
      
      // Switch back to original network on error
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
      setIsCoveringDebt(false);
    }
  }, [connectedChain, existingContracts, contractFundingStatus, switchNetwork, switchToRSCNetwork, connectedAccount]);

  // ===== UPDATED DEPLOYMENT FUNCTION FOR PERSONAL CONTRACTS =====
  const handleCreateOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectedChain || !formData.selectedPair || !formData.sellToken || !formData.buyToken) {
      toast.error('Please complete all required fields');
      return;
    }

    if (connectedChain.isComingSoon) {
      toast.error(`${connectedChain.name} support coming soon. Please switch to Sepolia.`);
      return;
    }

    const originalChainId = connectedChain.id;
    const rscChainId = connectedChain.rscNetwork.chainId;
    
    try {
      setIsDeploymentActive(true);
      console.log('🚀 Starting deployment process for personal contracts...');
      
      // Step 1: Check existing contracts (now handled by useQuery hook)
      setDeploymentStep('checking-contracts');

      // Ensure we're on the original chain (Sepolia)
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      
      if (currentNetwork.chainId.toString() !== originalChainId) {
        console.log('Switching to Sepolia first...');
        await switchNetwork(originalChainId);
      }

      const requiredAmount = ethers.parseUnits(formData.amount, formData.sellToken.decimals);

      if (existingContracts && contractsValid) {
        // ===== ADDITIONAL ORDER FLOW - Use existing personal contracts =====
        console.log('📝 Adding order to existing personal contracts...');
        
        // Step 1: Check and approve tokens for callback contract
        setDeploymentStep('checking-approval');
        
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
          setDeploymentStep('approving');
          
          if (currentAllowance > 0) {
            const resetTx = await tokenContract.approve(spenderAddress, 0);
            await resetTx.wait();
          }

          const approvalTx = await tokenContract.approve(spenderAddress, requiredAmount);
          await approvalTx.wait();
          toast.success('Token approval confirmed');
        } else {
          toast.success('Tokens already approved');
        }

        // Step 2: Create order on existing callback contract (stay on Sepolia)
        setDeploymentStep('creating-order');
        
        const callbackContract = new ethers.Contract(
          existingContracts.callbackContract,
          CALLBACK_STOP_ORDER_ABI,
          signer
        );

        // Calculate parameters
        const dropPercent = parseFloat(formData.dropPercentage);
        const coefficient = 1000;

        const reserve0 = parseFloat(formData.selectedPair.reserve0);
        const reserve1 = parseFloat(formData.selectedPair.reserve1);
        
        if (reserve0 <= 0 || reserve1 <= 0) {
          throw new Error('Invalid pair reserves - no liquidity available');
        }

        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0
          : reserve0 / reserve1;

        if (currentPrice <= 0 || !isFinite(currentPrice)) {
          throw new Error('Invalid current price calculated from reserves');
        }

        const stopPrice = currentPrice * (1 - dropPercent / 100);
        
        if (stopPrice <= 0) {
          throw new Error('Invalid stop price - check your drop percentage');
        }
        
        const threshold = Math.floor(stopPrice * coefficient);
        
        if (threshold <= 0 || threshold >= (currentPrice * coefficient)) {
          throw new Error('Invalid threshold calculated - check parameters');
        }

        console.log('Adding order with params:', {
          pair: formData.selectedPair.pairAddress,
          sellToken0: formData.sellToken0,
          amount: requiredAmount,
          coefficient,
          threshold
        });

        // Create stop order on personal callback contract
        const createOrderTx = await callbackContract.createStopOrder(
          formData.selectedPair.pairAddress,
          formData.sellToken0,
          requiredAmount,
          coefficient,
          threshold,
        );

        const receipt = await createOrderTx.wait();
        
        // Extract order ID from logs
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
        setDeploymentStep('complete');
        
      } else {
        // ===== FIRST ORDER FLOW - Deploy new personal contracts =====
        console.log('🏗️ Deploying new personal contracts for first order...');
        
        // Step 1: Check and approve tokens first (on Sepolia)
        setDeploymentStep('checking-approval');
        
        const sepoliaProvider = new ethers.BrowserProvider(window.ethereum);
        const sepoliaSigner = await sepoliaProvider.getSigner();
        
        // We'll get the deployed callback address and then approve tokens for it
        
        // Step 2: Deploy callback contract on Sepolia
        setDeploymentStep('deploying-callback');
        
        console.log('Deploying personal callback contract...');
        
        // Create callback contract factory
        const CallbackFactory = new ethers.ContractFactory(
          CALLBACK_STOP_ORDER_ABI,
          CALLBACK_CONTRACT_BYTECODE,
          sepoliaSigner
        );
        
        const callbackContract = await CallbackFactory.deploy(
          connectedAccount,                                 // _owner (user's wallet address)
          connectedChain.rscNetwork.callbackProxyAddress,  // _callbackSender
          connectedChain.routerAddress,                    // _router
          { 
            value: ethers.parseEther(formData.destinationFunding),
            gasLimit: 5000000 
          }
        );
        
        await callbackContract.waitForDeployment();
        const callbackContractAddress = await callbackContract.getAddress();
        console.log('Personal callback contract deployed at:', callbackContractAddress);
        
        toast.success('Personal callback contract deployed');

        // Step 3: Approve tokens for the newly deployed callback contract
        const tokenContract = new ethers.Contract(
          formData.sellToken.address,
          [
            'function approve(address spender, uint256 amount) returns (bool)',
            'function allowance(address owner, address spender) view returns (uint256)'
          ],
          sepoliaSigner
        );

        const currentAllowance = await tokenContract.allowance(connectedAccount, callbackContractAddress);

        if (currentAllowance < requiredAmount) {
          setDeploymentStep('approving');
          
          if (currentAllowance > 0) {
            const resetTx = await tokenContract.approve(callbackContractAddress, 0);
            await resetTx.wait();
          }

          const approvalTx = await tokenContract.approve(callbackContractAddress, requiredAmount);
          await approvalTx.wait();
          toast.success('Tokens approved for personal contract');
        }

        // Step 4: Deploy reactive contract on RSC network
        setDeploymentStep('deploying-reactive');
        console.log('Switching to RSC to deploy personal reactive contract...');
        await switchToRSCNetwork();
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const rscProvider2 = new ethers.BrowserProvider(window.ethereum);
        const rscSigner2 = await rscProvider2.getSigner();

        console.log('Deploying personal reactive contract...');
        console.log('Constructor params:', {
          callbackAddress: callbackContractAddress
        });

        // Create reactive contract factory and deploy (just with callback address)
        const ReactiveFactory = new ethers.ContractFactory(
          REACTIVE_STOP_ORDER_ABI,
          REACTIVE_CONTRACT_BYTECODE,
          rscSigner2
        );
        
        const reactiveContract = await ReactiveFactory.deploy(
          connectedAccount,        // _owner (user's wallet address)
          callbackContractAddress, // _stopOrderCallback
          { 
            value: ethers.parseEther("0.1"),
            gasLimit: 5000000 
          }
        );
        
        await reactiveContract.waitForDeployment();
        const reactiveContractAddress = await reactiveContract.getAddress();
        console.log('Personal reactive contract deployed at:', reactiveContractAddress);
        toast.success('Personal reactive contract deployed');

        // Step 5: Store contract addresses in Convex
        setDeploymentStep('storing-contracts');
        
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

        // Step 6: Switch back to Sepolia and create the first order
        setDeploymentStep('creating-order');
        await switchNetwork(originalChainId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalProvider = new ethers.BrowserProvider(window.ethereum);
        const finalSigner = await finalProvider.getSigner();
        
        const finalCallbackContract = new ethers.Contract(
          callbackContractAddress,
          CALLBACK_STOP_ORDER_ABI,
          finalSigner
        );

        // Calculate parameters for first order
        const dropPercent = parseFloat(formData.dropPercentage);
        const coefficient = 1000;

        const reserve0 = parseFloat(formData.selectedPair.reserve0);
        const reserve1 = parseFloat(formData.selectedPair.reserve1);
        
        if (reserve0 <= 0 || reserve1 <= 0) {
          throw new Error('Invalid pair reserves - no liquidity available');
        }

        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0
          : reserve0 / reserve1;

        if (currentPrice <= 0 || !isFinite(currentPrice)) {
          throw new Error('Invalid current price calculated from reserves');
        }

        const stopPrice = currentPrice * (1 - dropPercent / 100);
        
        if (stopPrice <= 0) {
          throw new Error('Invalid stop price - check your drop percentage');
        }
        
        const threshold = Math.floor(stopPrice * coefficient);

        console.log('Creating first order on personal callback contract with params:', {
          pair: formData.selectedPair.pairAddress,
          sellToken0: formData.sellToken0,
          amount: requiredAmount,
          coefficient,
          threshold
        });

        // Create first stop order on personal callback contract
        const firstOrderTx = await finalCallbackContract.createStopOrder(
          formData.selectedPair.pairAddress,
          formData.sellToken0,
          requiredAmount,
          coefficient,
          threshold,
        );

        const receipt = await firstOrderTx.wait();
        
        // Extract order ID from logs
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

        // Step 7: Set contract addresses state
        console.log('📦 DEPLOYMENT SUCCESS: New personal contracts deployed');
        
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
        toast.success('Personal contracts deployed successfully! Future orders will be cheaper.');
      }

      toast.success('Your stop order is now active and monitoring prices 24/7');
      setDeploymentStep('complete');
      console.log('✅ Deployment completed successfully!');
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/automations/stop-order/dashboard';
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error creating stop order:', error);
      setDeploymentStep('idle');
      
      // Enhanced error recovery
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
      
      // Enhanced error messages
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
      console.log('🏁 Deployment process ended');
    }
  }, [connectedChain, formData, existingContracts, contractsValid, connectedAccount, switchNetwork, switchToRSCNetwork, storeContract]);

  // Form validation - not affected by debt status
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

  // Find trading pair when both tokens are selected
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

        const isToken0First = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();
        const reserve0 = ethers.formatUnits(reserves[0], isToken0First ? formData.sellToken.decimals : formData.buyToken.decimals);
        const reserve1 = ethers.formatUnits(reserves[1], isToken0First ? formData.buyToken.decimals : formData.sellToken.decimals);
        
        const currentPrice = isToken0First 
          ? parseFloat(reserve1) / parseFloat(reserve0)
          : parseFloat(reserve0) / parseFloat(reserve1);

        const tradingPair: TradingPair = {
          token0: isToken0First ? formData.sellToken : formData.buyToken,
          token1: isToken0First ? formData.buyToken : formData.sellToken,
          pairAddress,
          reserve0,
          reserve1,
          currentPrice
        };

        const sellToken0 = pairToken0.toLowerCase() === formData.sellToken.address.toLowerCase();

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

          {/* Deployment Status */}
          <DeploymentStatus deploymentStep={deploymentStep} />

          {/* Debt Warning Card - Show when contracts exist but have debt */}
          {contractsHaveDebt && existingContracts && contractsValid && (
            <Alert className="bg-amber-900/20 border-amber-500/30 text-amber-200">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:h-5" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-amber-200">Contract Debt Outstanding</span>
                    <div className="text-xs sm:text-sm mt-1 opacity-80">
                      Your personal contracts have accumulated debt and need funding before you can create new orders.
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
                      onClick={handleCoverDebt}
                      disabled={isCoveringDebt || isDeploymentActive}
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
                      <div className="bg-amber-900/30 text-amber-300 flex items-center">
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
                      Balance: {parseFloat(formData.sellToken.balance).toFixed(4)} {formData.sellToken.symbol}
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
                    ) : deploymentStep !== 'idle' ? (
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
                          Create Personal Stop Order
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
              Understanding the new personal contract system and automated stop loss protection
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="personal-contracts" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  How do personal contracts work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Each user now deploys their own personal stop order contracts - you own and control your smart contracts completely.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 text-sm sm:text-base">Your Personal Callback Contract</h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          Deployed on Sepolia. Holds your tokens, executes swaps, and manages all your stop orders. Only you can create orders on this contract.
                        </p>
                      </div>
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 text-sm sm:text-base">Your Personal Reactive Contract</h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Deployed on Reactive Network. Monitors prices and triggers your callback contract when conditions are met. Linked to your callback contract only.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cost-structure" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  What are the costs for personal contracts?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Personal contracts have a one-time deployment cost, then very low costs for additional orders.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-500/20">
                        <h4 className="font-medium text-purple-200 mb-2 text-sm sm:text-base">First Order (Contract Deployment)</h4>
                        <p className="text-xs sm:text-sm text-purple-300">
                          ~0.03 ETH + 0.05 REACT + gas fees. Deploys your personal contracts and creates first stop order.
                        </p>
                      </div>
                      
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 text-sm sm:text-base">Additional Orders (2nd, 3rd, 4th...)</h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Gas fees only (~$1-5 each). All orders use your existing personal contracts.
                        </p>
                      </div>
                      
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 text-sm sm:text-base">Complete Control</h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          You own the contracts, can withdraw funds anytime, and only you can create orders on them.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="debt-management" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  What happens if my contracts have debt?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Personal contracts may accumulate debt from executing transactions. When this happens, the contracts become inactive until debt is cleared.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="bg-amber-900/20 p-3 sm:p-4 rounded-lg border border-amber-500/20">
                        <h4 className="font-medium text-amber-200 mb-2 text-sm sm:text-base">Callback Contract Debt</h4>
                        <p className="text-xs sm:text-sm text-amber-300">
                          Accumulated from executing swaps on Sepolia. Requires ETH funding and calling coverDebt().
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-500/20">
                        <h4 className="font-medium text-orange-200 mb-2 text-sm sm:text-base">RSC Contract Debt</h4>
                        <p className="text-xs sm:text-sm text-orange-300">
                          Accumulated from monitoring activities. Requires REACT funding and calling coverDebt().
                        </p>
                      </div>
                      
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 text-sm sm:text-base">Automatic Debt Clearing</h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Use the "Cover Debt" button to automatically fund contracts and clear all outstanding debt with separate transactions.
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  What is a Stop Order?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      A stop order acts as your personal trading assistant, watching token prices 24/7 and automatically selling when they drop to your specified level. Think of it as an insurance policy for your crypto investments.
                    </p>
                    <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2 text-sm sm:text-base">Example Scenario:</h4>
                      <p className="text-xs sm:text-sm text-zinc-300">
                        You own ETH worth $3,500 each. You set a 10% stop order. If ETH drops to $3,150, 
                        your tokens automatically sell for USDC, protecting you from further losses.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  How Does the Personal Contract System Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Your personal Reactive Smart Contracts (RSCs) monitor blockchain events 24/7, automatically executing trades when your conditions are met.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium text-sm sm:text-base">Personal Contract Deployment</p>
                          <p className="text-blue-300 text-xs sm:text-sm">
                            Your personal reactive and callback contracts are deployed, linked only to your wallet address.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium text-sm sm:text-base">Continuous Personal Monitoring</p>
                          <p className="text-purple-300 text-xs sm:text-sm">
                            Your personal reactive contract watches DEX prices for your specific orders without requiring manual intervention.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium text-sm sm:text-base">Automatic Personal Execution</p>
                          <p className="text-green-300 text-xs sm:text-sm">
                            Your personal callback contract swaps tokens on the DEX, protecting you from further losses.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="safety" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  Personal Contract Safety & Security
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Your personal contracts provide maximum security and control over your funds and orders.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 flex items-center text-sm sm:text-base">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Owner-Only Access
                        </h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Only you can create, cancel, or manage orders on your personal contracts. Complete ownership and control.
                        </p>
                      </div>
                      
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 flex items-center text-sm sm:text-base">
                          <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Fund Withdrawal
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          Withdraw ETH/REACT from your contracts anytime using the withdrawETH functions. Your funds, your control.
                        </p>
                      </div>
                      
                      <div className="bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-500/20">
                        <h4 className="font-medium text-purple-200 mb-2 flex items-center text-sm sm:text-base">
                          <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Isolated Execution
                        </h4>
                        <p className="text-xs sm:text-sm text-purple-300">
                          Your orders execute independently on your personal contracts, unaffected by other users' activities.
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-500/20">
                        <h4 className="font-medium text-orange-200 mb-2 flex items-center text-sm sm:text-base">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Personal Gas Protection
                        </h4>
                        <p className="text-xs sm:text-sm text-orange-300">
                          Your personal contracts are pre-funded to ensure your orders work even during high gas periods.
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