'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Stop Order Contract ABI - only the functions we need
const STOP_ORDER_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "pair", "type": "address" },
      { "internalType": "bool", "name": "sellToken0", "type": "bool" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "coefficient", "type": "uint256" },
      { "internalType": "uint256", "name": "threshold", "type": "uint256" }
    ],
    "name": "createStopOrder",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserOrders",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "orderId", "type": "uint256" }],
    "name": "getOrder",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address", "name": "client", "type": "address" },
          { "internalType": "address", "name": "pair", "type": "address" },
          { "internalType": "address", "name": "tokenSell", "type": "address" },
          { "internalType": "address", "name": "tokenBuy", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "bool", "name": "sellToken0", "type": "bool" },
          { "internalType": "uint256", "name": "coefficient", "type": "uint256" },
          { "internalType": "uint256", "name": "threshold", "type": "uint256" },
          { "internalType": "uint8", "name": "status", "type": "uint8" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "uint256", "name": "executedAt", "type": "uint256" },
          { "internalType": "uint8", "name": "retryCount", "type": "uint8" },
          { "internalType": "uint256", "name": "lastExecutionAttempt", "type": "uint256" }
        ],
        "internalType": "struct StopOrderCallback.StopOrder",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

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
  };
}

type DeploymentStep = 'idle' | 'checking-approval' | 'approving' | 'switching-rsc' | 'funding-rsc' | 'switching-back' | 'creating' | 'complete';

// ===== CONFIGURATION DATA =====
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
    defaultFunding: '0.03',
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net/'
    }
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
    isComingSoon: true,
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net'
    }
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
    isComingSoon: true,
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net'
    }
  }
];

// Popular tokens by chain (fallback when API doesn't work)
const POPULAR_TOKENS: Record<string, Token[]> = {
  '1': [
    { address: '0xA0b86a33E6441b4B576fb3D43bF18E5c73b49c90', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],
  '11155111': [
    { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ],
  '43114': [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18 },
    { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ]
};

// Contract addresses
const CONTRACT_ADDRESSES = {
  CALLBACK: '0x9148309eFB90b8803187413DFEE904327DFD8835',
  RSC: '0x820bEaada84dD6D507edcE56D211038bd9444049'
};

// ===== TOKEN SERVICE CLASS =====
class TokenService {
  private static cache = new Map<string, { data: Token[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // API configuration for different networks
  private static getApiConfig(chainId: string) {
    const configs = {
      '1': {
        url: 'https://api.ethplorer.io',
        nativeSymbol: 'ETH',
        wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
      },
      '11155111': {
        url: 'https://sepolia-api.ethplorer.io',
        nativeSymbol: 'ETH', 
        wethAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14'
      }
    };

    return configs[chainId as keyof typeof configs] || null;
  }

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

  // Fetch all tokens for a user on a specific network
  static async fetchUserTokens(chainId: string, address: string): Promise<Token[]> {
    const cacheKey = `${chainId}-${address}`;
    
    // Check cache first
    const cachedTokens = this.getCachedTokens(cacheKey);
    if (cachedTokens) {
      return cachedTokens;
    }

    const apiConfig = this.getApiConfig(chainId);
    
    if (apiConfig) {
      try {
        const tokens = await this.fetchFromEthplorer(apiConfig, address);
        this.setCachedTokens(cacheKey, tokens);
        return tokens;
      } catch (error) {
        console.warn('Ethplorer API failed, falling back to manual fetch:', error);
        return this.fetchPopularTokensWithBalances(chainId, address);
      }
    } else {
      // Fallback for unsupported networks
      return this.fetchPopularTokensWithBalances(chainId, address);
    }
  }

  // Fetch tokens from Ethplorer API
  private static async fetchFromEthplorer(
    apiConfig: { url: string; nativeSymbol: string; wethAddress: string }, 
    address: string
  ): Promise<Token[]> {
    const apiKey = process.env.NEXT_PUBLIC_ETHPLORER_API_KEY || 'freekey';
    const response = await fetch(`${apiConfig.url}/getAddressInfo/${address}?apiKey=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API returned error');
    }

    const tokens: Token[] = [];

    // Add native token (ETH) if available
    if (data.ETH && data.ETH.balance && parseFloat(data.ETH.balance) > 0) {
      tokens.push({
        address: apiConfig.wethAddress,
        symbol: apiConfig.nativeSymbol,
        name: 'Ethereum',
        decimals: 18,
        balance: parseFloat(data.ETH.balance).toFixed(6),
        logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
      });
    }

    // Add ERC20 tokens
    if (data.tokens && Array.isArray(data.tokens)) {
      const erc20Tokens = data.tokens
        .filter((tokenData: any) => {
          return tokenData.balance && 
                 parseFloat(tokenData.balance) > 0 && 
                 tokenData.tokenInfo &&
                 tokenData.tokenInfo.symbol &&
                 tokenData.tokenInfo.name;
        })
        .map((tokenData: any) => {
          const tokenInfo = tokenData.tokenInfo;
          const rawBalance = tokenData.balance;
          const decimals = parseInt(tokenInfo.decimals) || 18;
          
          // Convert raw balance to readable format
          const balance = parseFloat(rawBalance) / Math.pow(10, decimals);
          
          return {
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            decimals: decimals,
            balance: balance.toFixed(6),
            logoURI: tokenInfo.image || `https://tokens.1inch.io/${tokenInfo.address.toLowerCase()}.png`
          } as Token;
        })
        .sort((a: Token, b: Token) => {
          // Sort by balance value (highest first)
          return parseFloat(b.balance || '0') - parseFloat(a.balance || '0');
        });

      tokens.push(...erc20Tokens);
    }

    return tokens;
  }

  // Fallback method for unsupported networks
  private static async fetchPopularTokensWithBalances(chainId: string, address: string): Promise<Token[]> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return [];
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const popularTokens = POPULAR_TOKENS[chainId] || [];
      
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
      return tokensWithBalances.filter(token => 
        parseFloat(token.balance || '0') > 0
      );
    } catch (error) {
      console.error('Error fetching popular tokens:', error);
      return [];
    }
  }

  // Fetch individual token information
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

  // Clear cache (useful for forcing refresh)
  static clearCache(): void {
    this.cache.clear();
  }

  // Clear cache for specific user/network
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
  const fetchAllUserTokens = async () => {
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
  };

  const handleCustomTokenSelect = async (address: string) => {
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
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllUserTokens();
    }
  }, [isOpen, connectedAccount, chainId]);

  // Enhanced search functionality
  const getTokensToDisplay = () => {
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
  };

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
                `Your tokens (${tokensToDisplay.length})`
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
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            ((e.currentTarget.nextElementSibling) as HTMLElement)!.style.display = 'flex';  
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
          <div className="text-xs text-zinc-500 text-center">
            {chainId === '1' || chainId === '11155111' ? (
              <>Showing all tokens via Ethplorer API</>
            ) : (
              <>Showing popular tokens • Custom ERC20 not fully supported on this network</>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ===== SIMPLE STATUS INDICATOR =====
const SimpleStatusIndicator = ({ 
  formData, 
  connectedAccount, 
  connectedChain, 
  hasTokenBalance,
  isLoadingPair 
}: {
  formData: StopOrderFormData;
  connectedAccount: string;
  connectedChain: ChainConfig | null;
  hasTokenBalance: boolean;
  isLoadingPair: boolean;
}) => {
  // Determine the current status
  const getStatus = () => {
    if (!connectedAccount) {
      return { type: 'error', message: 'Connect your wallet to continue' };
    }
    if (!connectedChain) {
      return { type: 'error', message: 'Please switch to Ethereum Sepolia network' };
    }
    if (connectedChain.isComingSoon) {
      return { type: 'warning', message: `${connectedChain.name} support coming soon - switch to Sepolia` };
    }
    if (!formData.sellToken || !formData.buyToken) {
      return { type: 'warning', message: 'Select tokens to create stop order' };
    }
    if (isLoadingPair) {
      return { type: 'loading', message: 'Finding trading pair...' };
    }
    if (!formData.selectedPair) {
      return { type: 'error', message: 'Trading pair not found on DEX' };
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return { type: 'warning', message: 'Enter amount to sell' };
    }
    if (!hasTokenBalance) {
      return { type: 'error', message: 'Insufficient token balance' };
    }
    if (!formData.dropPercentage || parseFloat(formData.dropPercentage) <= 0) {
      return { type: 'warning', message: 'Set stop loss percentage' };
    }
    return { type: 'success', message: 'Ready to create stop order!' };
  };

  const status = getStatus();

  const getStatusStyles = () => {
    switch (status.type) {
      case 'error':
        return 'bg-red-900/20 border-red-500/30 text-red-200';
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
    switch (status.type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
  };

  return (
    <Alert className={`${getStatusStyles()} mb-6 sm:mb-8 lg:mb-10`}>
      {getStatusIcon()}
      <AlertDescription className="text-sm sm:text-base">
        {status.message}
        {connectedChain && status.type === 'success' && (
          <div className="text-xs sm:text-sm mt-1 opacity-80">
            Cost: ~{connectedChain.defaultFunding} {connectedChain.nativeCurrency} + 0.05 {connectedChain.rscNetwork.currencySymbol} + gas
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

// ===== DEPLOYMENT STATUS COMPONENT =====
const DeploymentStatus = ({ deploymentStep }: { deploymentStep: DeploymentStep }) => {
  const getFundingStepDescription = (step: DeploymentStep) => {
    switch (step) {
      case 'checking-approval':
        return { title: 'Checking Token Approval', message: 'Verifying if tokens are approved for trading...', color: 'blue' };
      case 'approving':
        return { title: 'Approving Tokens', message: 'Please confirm token approval in your wallet...', color: 'yellow' };
      case 'switching-rsc':
        return { title: 'Switching to Reactive Lasna', message: 'Please confirm network switch in your wallet...', color: 'purple' };
      case 'funding-rsc':
        return { title: 'Funding RSC Monitor', message: 'Sending 0.05 REACT to price monitoring system...', color: 'blue' };
      case 'switching-back':
        return { title: 'Switching Back to Sepolia', message: 'Please confirm network switch back to Sepolia...', color: 'purple' };
      case 'creating':
        return { title: 'Creating Stop Order', message: 'Deploying your stop order contract...', color: 'green' };
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
export default function EnhancedStopOrderWithFunctionality() {
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
  const [isDeploymentActive, setIsDeploymentActive] = useState(false); // Flag to completely disable refresh during deployment

  // Professional network switching functions (like Aave protection)
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
              chain.id === '43114' ? 'https://snowtrace.io' : ''
            ]
          };
          
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
  };

  const switchToRSCNetwork = async () => {
    if (!connectedChain) throw new Error('No chain selected');
    
    const rscNetwork = connectedChain.rscNetwork;
    const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === rscNetwork.chainId) {
        console.log(`Already on ${rscNetwork.name}`);
        return true;
      }

      console.log(`Switching to ${rscNetwork.name}...`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: rscChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log(`${rscNetwork.name} not added to wallet, attempting to add it`);
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: rscChainIdHex,
              chainName: rscNetwork.name,
              nativeCurrency: {
                name: rscNetwork.currencySymbol,
                symbol: rscNetwork.currencySymbol,
                decimals: 18
              },
              rpcUrls: [rscNetwork.rpcUrl],
              blockExplorerUrls: [rscNetwork.explorerUrl]
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      // Wait longer for RSC network to settle
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify switch multiple times if needed
      let attempts = 0;
      let switched = false;
      
      while (attempts < 3 && !switched) {
        try {
          const updatedProvider = new ethers.BrowserProvider(window.ethereum);
          const updatedNetwork = await updatedProvider.getNetwork();
          
          if (updatedNetwork.chainId.toString() === rscNetwork.chainId) {
            switched = true;
            console.log(`Successfully switched to ${rscNetwork.name} (attempt ${attempts + 1})`);
          } else {
            console.log(`Network not switched yet, attempt ${attempts + 1}, got: ${updatedNetwork.chainId}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (verifyError) {
          console.log(`Verification attempt ${attempts + 1} failed:`, verifyError);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        attempts++;
      }
      
      if (!switched) {
        throw new Error(`Failed to verify RSC network switch after ${attempts} attempts`);
      }
      
      toast.success(`Switched to ${rscNetwork.name}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
    }
  };

  // FIXED: Calculate threshold from percentage using actual current price
  const calculateThresholdFromPercentage = (percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage)) || !formData.selectedPair) return;
    
    const dropPercent = parseFloat(percentage);
    const coefficient = 1000;
    
    // Get current price from pair reserves with validation
    const reserve0 = parseFloat(formData.selectedPair.reserve0);
    const reserve1 = parseFloat(formData.selectedPair.reserve1);
    
    if (reserve0 <= 0 || reserve1 <= 0) {
      console.error('Invalid reserves for threshold calculation');
      return;
    }

    // Get current price based on sell direction
    const currentPrice = formData.sellToken0 
      ? reserve1 / reserve0  // token1 per token0
      : reserve0 / reserve1; // token0 per token1

    if (currentPrice <= 0 || !isFinite(currentPrice)) {
      console.error('Invalid current price calculated from reserves');
      return;
    }

    // Calculate actual stop price
    const stopPrice = currentPrice * (1 - dropPercent / 100);
    
    if (stopPrice <= 0) {
      console.error('Invalid stop price calculated');
      return;
    }
    
    // Convert to threshold format (actual price * coefficient)
    const threshold = Math.floor(stopPrice * coefficient);
    
    console.log('Updated threshold calculation:', {
      currentPrice,
      dropPercent,
      stopPrice,
      coefficient,
      threshold,
      'Previous (wrong) threshold': Math.floor(coefficient * (100 - dropPercent) / 100)
    });
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage,
      currentPrice: currentPrice.toString(),
      stopPrice: stopPrice.toString()
    }));
  };

  // Enhanced deployment function with FIXED threshold calculation
  const handleCreateOrder = async (e: React.FormEvent) => {
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
    let currentStep: DeploymentStep = 'idle';
    
    try {
      // Activate deployment mode to prevent page refreshes
      setIsDeploymentActive(true);
      console.log('🚀 Starting deployment process...');
      
      // Ensure we're on the correct network first
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      
      if (currentNetwork.chainId.toString() !== originalChainId) {
        console.log('Switching to original chain first...');
        await switchNetwork(originalChainId);
      }

      // Step 1: Check and approve tokens if needed
      currentStep = 'checking-approval';
      setDeploymentStep(currentStep);
      
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const tokenToApprove = formData.sellToken;

      const tokenContract = new ethers.Contract(
        tokenToApprove.address,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      const requiredAmount = ethers.parseUnits(formData.amount, tokenToApprove.decimals);
      const currentAllowance = await tokenContract.allowance(connectedAccount, CONTRACT_ADDRESSES.CALLBACK);

      if (currentAllowance < requiredAmount) {
        currentStep = 'approving';
        setDeploymentStep(currentStep);
        
        // Reset allowance to 0 first if needed
        if (currentAllowance > 0) {
          const resetTx = await tokenContract.approve(CONTRACT_ADDRESSES.CALLBACK, 0);
          await resetTx.wait();
        }

        // Approve the required amount
        const approvalTx = await tokenContract.approve(CONTRACT_ADDRESSES.CALLBACK, requiredAmount);
        await approvalTx.wait();
        toast.success('Token approval confirmed');
      } else {
        toast.success('Tokens already approved');
      }

      // Step 2: Switch to RSC network and fund it
      currentStep = 'switching-rsc';
      setDeploymentStep(currentStep);
      await switchToRSCNetwork();
      
      // Important: Wait for network to fully settle and create fresh provider
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Network settled, creating fresh provider for RSC funding...');
      
      currentStep = 'funding-rsc';
      setDeploymentStep(currentStep);
      
      // Create completely fresh provider and signer after network switch
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscNetwork = await rscProvider.getNetwork();
      console.log('RSC Provider network:', rscNetwork.chainId.toString());
      
      const rscSigner = await rscProvider.getSigner();
      
      // Get current gas price and add some buffer
      const gasPrice = await rscProvider.getFeeData();
      console.log('Gas price data:', gasPrice);
      
      const rscFundingTx = await rscSigner.sendTransaction({
        to: CONTRACT_ADDRESSES.RSC,
        value: ethers.parseEther(formData.rscFunding)
      });
      await rscFundingTx.wait();

      setDeploymentStep('switching-back');
      console.log(`Switching back to original chain: ${originalChainId}`);
      await switchNetwork(originalChainId);
      
      const finalProvider = new ethers.BrowserProvider(window.ethereum);
      const finalNetwork = await finalProvider.getNetwork();
      
      if (finalNetwork.chainId.toString() !== originalChainId) {
        throw new Error(`Failed to switch back to original network. Current: ${finalNetwork.chainId}, Expected: ${originalChainId}`);
      }
      
      setDeploymentStep('creating');
      
      console.log(`Successfully verified back on chain ${originalChainId}`);
      toast.success(`Switched back to ${connectedChain.name}`);

      // Step 4: Create the stop order with CORRECTED threshold calculation
      currentStep = 'creating';
      setDeploymentStep(currentStep);
      
      console.log('Starting stop order creation...');
      
      const finalSigner = await finalProvider.getSigner();
      
      // Create the stop order contract instance
      const stopOrderContract = new ethers.Contract(
        CONTRACT_ADDRESSES.CALLBACK,
        STOP_ORDER_ABI,
        finalSigner
      );

      // FIXED: Calculate threshold from actual current price, not just percentage
      const dropPercent = parseFloat(formData.dropPercentage);
      const coefficient = 1000; // Standard coefficient

      // Get current price from pair reserves with validation
      const reserve0 = parseFloat(formData.selectedPair.reserve0);
      const reserve1 = parseFloat(formData.selectedPair.reserve1);
      
      if (reserve0 <= 0 || reserve1 <= 0) {
        throw new Error('Invalid pair reserves - no liquidity available');
      }

      const currentPrice = formData.sellToken0 
        ? reserve1 / reserve0  // token1 per token0
        : reserve0 / reserve1; // token0 per token1

      if (currentPrice <= 0 || !isFinite(currentPrice)) {
        throw new Error('Invalid current price calculated from reserves');
      }

      // Calculate the actual stop price (target price that should trigger sale)
      const stopPrice = currentPrice * (1 - dropPercent / 100);
      
      if (stopPrice <= 0) {
        throw new Error('Invalid stop price - check your drop percentage');
      }
      
      // Convert to threshold format the contract expects
      const threshold = Math.floor(stopPrice * coefficient);
      
      if (threshold <= 0 || threshold >= (currentPrice * coefficient)) {
        throw new Error('Invalid threshold calculated - check parameters');
      }

      console.log('Threshold calculation:', {
        currentPrice,
        dropPercent,
        stopPrice,
        coefficient,
        threshold,
        'Previous (wrong) threshold': Math.floor(coefficient * (100 - dropPercent) / 100)
      });

      console.log('Creating stop order with params:', {
        pair: formData.selectedPair.pairAddress,
        sellToken0: formData.sellToken0,
        amount: requiredAmount.toString(),
        coefficient,
        threshold, // This is now the ACTUAL price threshold, not percentage
        funding: formData.destinationFunding
      });

      // Call createStopOrder function with corrected threshold
      const createOrderTx = await stopOrderContract.createStopOrder(
        formData.selectedPair.pairAddress,
        formData.sellToken0,
        requiredAmount,
        coefficient,
        threshold, // Now contains actual price * coefficient
        { 
          value: ethers.parseEther(formData.destinationFunding),
          gasLimit: 500000 // Provide sufficient gas
        }
      );

      const receipt = await createOrderTx.wait();
      
      // Extract order ID from transaction logs
      const orderCreatedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('StopOrderCreated(address,uint256,address,bool,address,address,uint256,uint256,uint256)')
      );
      
      let orderId = null;
      if (orderCreatedEvent) {
        orderId = parseInt(orderCreatedEvent.topics[2], 16);
      }
      
      toast.success(`Stop order created successfully! ${orderId ? `Order ID: ${orderId}` : ''}`);
      
      setDeploymentStep('complete');
      toast.success('🎉 Your stop order is now active and monitoring prices 24/7');
      
      console.log('✅ Deployment completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Error creating stop order:', error);
      setDeploymentStep('idle');
      
      // Enhanced error recovery - try to switch back to original network
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
      
      // Enhanced error messages with specific handling for funding failures
      if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else if (error.message.includes('transaction execution reverted')) {
        toast.error('RSC funding failed - please check your REACT balance and try again');
      } else if (error.message.includes('network') || error.message.includes('switch')) {
        toast.error('Network switching failed. Please switch networks manually and try again.');
      } else if (error.message.includes('Insufficient balance')) {
        toast.error('Insufficient token balance to create stop order');
      } else if (error.message.includes('Insufficient allowance')) {
        toast.error('Token allowance too low. Please approve more tokens.');
      } else {
        toast.error(error.message || 'Failed to create stop order');
      }
    } finally {
      // Always deactivate deployment mode
      setIsDeploymentActive(false);
      console.log('🏁 Deployment process ended');
    }
  };

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

    // Handle network and account changes professionally (like Aave protection)
    const handleChainChanged = (chainId: string) => {
      console.log('Network changed to:', chainId, 'Deployment active:', isDeploymentActive);
      // During deployment, we handle network changes programmatically, not through page refresh
      if (!isDeploymentActive && deploymentStep === 'idle') {
        console.log('Not in deployment, reloading page...');
        setTimeout(() => window.location.reload(), 100);
      }
      // During deployment: do nothing, let the deployment flow handle network changes
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Account changed:', accounts, 'Deployment active:', isDeploymentActive);
      // During deployment, account changes should not interrupt the flow
      if (!isDeploymentActive && deploymentStep === 'idle') {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          setFormData(prev => ({ ...prev, clientAddress: accounts[0] }));
        }
        setTimeout(() => window.location.reload(), 100);
      }
      // During deployment: do nothing to avoid interrupting the process
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Cleanup listeners
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

    // Small delay to let the page settle after initial load
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

        // Determine if we're selling token0 or token1
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

  // FIXED: Calculate stop price when drop percentage changes using actual price
  useEffect(() => {
    if (formData.selectedPair && formData.dropPercentage && formData.sellToken && formData.buyToken) {
      const reserve0 = parseFloat(formData.selectedPair.reserve0);
      const reserve1 = parseFloat(formData.selectedPair.reserve1);
      
      if (reserve0 > 0 && reserve1 > 0) {
        // Get current price based on sell direction
        const currentPrice = formData.sellToken0 
          ? reserve1 / reserve0  // token1 per token0
          : reserve0 / reserve1; // token0 per token1
          
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
  const calculateReceiveAmount = () => {
    if (!formData.amount || !formData.stopPrice || !formData.sellToken || !formData.buyToken) {
      return '0.0';
    }
    
    const sellAmount = parseFloat(formData.amount);
    const stopPrice = parseFloat(formData.stopPrice);
    const receiveAmount = sellAmount * stopPrice;
    
    return receiveAmount.toFixed(6);
  };

  const openTokenModal = (type: 'sell' | 'buy') => {
    setTokenModalType(type);
    setIsTokenModalOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    if (tokenModalType === 'sell') {
      setFormData(prev => ({ ...prev, sellToken: token }));
    } else {
      setFormData(prev => ({ ...prev, buyToken: token }));
    }
  };

  // Swap tokens function with animation
  const handleSwapTokens = async () => {
    if (!formData.sellToken || !formData.buyToken) return;
    
    setIsSwapping(true);
    
    // Wait for animation
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        sellToken: prev.buyToken,
        buyToken: prev.sellToken,
        amount: '', // Clear amount as it's no longer valid
        selectedPair: null // Will be recalculated
      }));
      setIsSwapping(false);
    }, 200);
  };

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
            Smart Stop Orders
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-zinc-200 mb-4 text-center lg:text-left">
            Automatically sell your tokens when prices drop - protecting your investments 24/7.
          </p>
          
          <div className="mb-6 sm:mb-8">
            <Alert className="bg-blue-900/20 border-blue-500/30">
              <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              <AlertDescription className="text-blue-200 text-sm sm:text-base">
                <span className="font-medium">Currently live on Ethereum Sepolia</span> • 
                Ethereum Mainnet and Avalanche C-Chain support coming soon
              </AlertDescription>
            </Alert>
          </div>
          
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100 text-sm sm:text-base">Multi-Chain Protection</h3>
                    <p className="text-xs sm:text-sm text-zinc-300">Ethereum, Sepolia & Avalanche</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100 text-sm sm:text-base">24/7 Monitoring</h3>
                    <p className="text-xs sm:text-sm text-zinc-300">Never miss a price movement</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 sm:col-span-2 lg:col-span-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100 text-sm sm:text-base">Instant Execution</h3>
                    <p className="text-xs sm:text-sm text-zinc-300">Automatic when triggered</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Enhanced Funding Requirements Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-4 sm:mt-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-amber-100 mb-2 text-sm sm:text-base">Protection Setup Costs</h3>
                  <p className="text-xs sm:text-sm text-amber-200 mb-3">
                    RSC Monitoring: 0.05 REACT • Callback Execution: 0.03 ETH • Plus gas fees
                  </p>
                  <div className="">
                    <p className="text-xs sm:text-sm text-amber-200 mb-2">
                      📝 <span className="font-medium">Note:</span> To fund a Reactive Smart Contract, you will need gas on the Reactive Network.
                    </p>
                    <a
                      href="/markets" // Changed href to the new page route
                      className="inline-flex items-center text-xs sm:text-sm text-amber-300 hover:text-amber-200 underline"
                    >
                      See here where you can obtain REACT tokens
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
                {/* <div className="text-right">
                  <p className="text-xs text-amber-300">
                    Covers 24/7 monitoring & automatic execution
                  </p>
                </div> */}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Interface Container */}
        <div className="space-y-6 sm:space-y-8">
          
            {/* Status Indicator */}
            <SimpleStatusIndicator
              formData={formData}
              connectedAccount={connectedAccount}
              connectedChain={connectedChain}
              hasTokenBalance={hasTokenBalance}
              isLoadingPair={isLoadingPair}
            />

            {/* Combined Stop Order Configuration */}
            <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mx-auto max-w-2xl">
            
              <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-zinc-100">
                  Configure Stop Order
                </CardTitle>
                <CardDescription className="text-zinc-300 text-sm sm:text-base">
                  Set up automatic selling when your token price drops
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
                      />
                      
                      <Button
                        onClick={() => openTokenModal('sell')}
                        className="bg-blue-700/80 hover:bg-blue-600 border-blue-600 text-zinc-100 px-2 py-1.5 sm:px-3 sm:py-2 h-auto text-sm sm:text-base"
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
                        disabled={!formData.sellToken || !formData.buyToken}
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
                      
                      <Button
                        onClick={() => openTokenModal('buy')}
                        className="bg-blue-700/80 hover:bg-blue-600 border-blue-600 text-zinc-100 px-2 py-1.5 sm:px-3 sm:py-2 h-auto text-sm sm:text-base"
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

                    {/* Deployment Status */}
                    <DeploymentStatus deploymentStep={deploymentStep} />

                    {/* Create Stop Order Button */}
                    <Button 
                      onClick={handleCreateOrder}
                      className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={!isFormValid}
                    >
                      {deploymentStep === 'complete' ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Stop Order Created! 🎉
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
                      ) : (
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Create Stop Order
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Simple Dashboard Link Component */}
            <DashboardLink />

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

        {/* Educational Section */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-6 sm:mt-8">
          <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
            <CardTitle className="text-zinc-100 flex items-center text-lg sm:text-xl">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription className="text-zinc-300 text-sm sm:text-base">
              Understanding automated stop loss protection
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
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
                  How Does It Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Our Reactive Smart Contracts (RSCs) monitor blockchain events 24/7, automatically executing trades when your conditions are met.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium text-sm sm:text-base">Continuous Monitoring</p>
                          <p className="text-blue-300 text-xs sm:text-sm">
                            RSCs watch DEX prices across chains without requiring manual intervention.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium text-sm sm:text-base">Automatic Trigger</p>
                          <p className="text-purple-300 text-xs sm:text-sm">
                            When price drops to your threshold, the RSC automatically triggers a sell order.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium text-sm sm:text-base">Instant Execution</p>
                          <p className="text-green-300 text-xs sm:text-sm">
                            Your tokens are swapped on the DEX, protecting you from further losses.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="funding" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  Setup Process & Costs
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Our optimized setup process minimizes transactions while ensuring your stop order is properly funded and configured.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium text-sm sm:text-base">Token Approval (if needed)</p>
                          <p className="text-blue-300 text-xs sm:text-sm">
                            We check if your tokens are already approved. If not, one transaction approves them for trading.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium text-sm sm:text-base">RSC Funding</p>
                          <p className="text-purple-300 text-xs sm:text-sm">
                            One transaction on RN funds the 24/7 price monitoring system.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium text-sm sm:text-base">Stop Order Creation</p>
                          <p className="text-green-300 text-xs sm:text-sm">
                            Final transaction creates your stop order and funds the execution contract in one go.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-500/30">
                      <p className="text-xs sm:text-sm text-amber-200">
                        ⚡ <span className="font-medium">Optimized Flow:</span> 
                        Only 2-3 transactions total! We automatically handle network switching and combine funding with contract creation.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="safety" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100 text-sm sm:text-base text-left">
                  Safety & Security Features
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300 text-sm sm:text-base">
                  <div className="space-y-3 sm:space-y-4">
                    <p>
                      Your funds and orders are protected by multiple layers of security and safety mechanisms.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-green-900/20 p-3 sm:p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-medium text-green-200 mb-2 flex items-center text-sm sm:text-base">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Smart Contract Security
                        </h4>
                        <p className="text-xs sm:text-sm text-green-300">
                          Audited contracts with pausability and emergency stop functions for maximum protection.
                        </p>
                      </div>
                      
                      <div className="bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-medium text-blue-200 mb-2 flex items-center text-sm sm:text-base">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Order Management
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-300">
                          Pause, resume, or cancel your stop orders anytime before they execute.
                        </p>
                      </div>
                      
                      <div className="bg-purple-900/20 p-3 sm:p-4 rounded-lg border border-purple-500/20">
                        <h4 className="font-medium text-purple-200 mb-2 flex items-center text-sm sm:text-base">
                          <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Price Validation
                        </h4>
                        <p className="text-xs sm:text-sm text-purple-300">
                          Multiple price checks ensure orders execute only at valid market prices.
                        </p>
                      </div>
                      
                      <div className="bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-500/20">
                        <h4 className="font-medium text-orange-200 mb-2 flex items-center text-sm sm:text-base">
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Gas Protection
                        </h4>
                        <p className="text-xs sm:text-sm text-orange-300">
                          Pre-funded execution ensures your orders work even during high gas periods.
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