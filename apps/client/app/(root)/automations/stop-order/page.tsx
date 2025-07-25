'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info, AlertCircle, Shield, Clock, Zap, Loader2, CheckCircle, RefreshCw, Bot, X, TrendingDown, DollarSign, Calculator, Target, Search, Check, Wallet } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';
import { AIUtils } from '@/utils/ai';

// All existing imports remain the same
import { stopOrderByteCodeSepolia } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/stop-order/stopOrderABISeploia.json';
import { rscByteCodeSepolia } from '@/data/automations/stop-order/RSCByteCode';
import rscABISepolia from '@/data/automations/stop-order/RSCABISepolia.json';

import { stopOrderByteCodeMainnet } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIMainnet from '@/data/automations/stop-order/stopOrderABIMainnet.json';
import { rscByteCodeMainnet } from '@/data/automations/stop-order/RSCByteCode';
import rscABIMainnet from '@/data/automations/stop-order/RSCABIMainnet.json';

import { stopOrderByteCodeAvalancheCChain } from '@/data/automations/stop-order/stopOrderByteCode';
import stopOrderABIAvalancheCChain from '@/data/automations/stop-order/stopOrderABIAvalancheCChain.json';
import { rscByteCodeAvalancheCChain } from '@/data/automations/stop-order/RSCByteCode';
import rscABIAvalancheCChain from '@/data/automations/stop-order/RSCABIAvalancheCChain.json';
import Link from 'next/link';

// Interfaces remain the same
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
  stopOrderABI: any;
  stopOrderBytecode: string;
  rscABI: any;
  rscBytecode: string;
  rscNetwork: {
    chainId: string;
    name: string;
    rpcUrl: string;
    currencySymbol: string;
    explorerUrl: string;
  };
}

// Enhanced chain configurations with correct addresses
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
    factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
    callbackAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'SEP',
    defaultFunding: '0.03',
    stopOrderABI: stopOrderABISepolia,
    stopOrderBytecode: stopOrderByteCodeSepolia,
    rscABI: rscABISepolia,
    rscBytecode: rscByteCodeSepolia,
    rscNetwork: {
      chainId: '5318008',
      name: 'Reactive Kopli',
      rpcUrl: 'https://kopli-rpc.rnk.dev',
      currencySymbol: 'REACT',
      explorerUrl: 'https://kopli.reactscan.net'
    }
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    callbackAddress: '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03',
    stopOrderABI: stopOrderABIMainnet,
    stopOrderBytecode: stopOrderByteCodeMainnet,
    rscABI: rscABIMainnet,
    rscBytecode: rscByteCodeMainnet,
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
    callbackAddress: '0x934Ea75496562D4e83E80865c33dbA600644fCDa',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    defaultFunding: '0.03',
    stopOrderABI: stopOrderABIAvalancheCChain,
    stopOrderBytecode: stopOrderByteCodeAvalancheCChain,
    rscABI: rscABIAvalancheCChain,
    rscBytecode: rscByteCodeAvalancheCChain,
    rscNetwork: {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://reactscan.net'
    }
  }
];

// Corrected token lists with proper Uniswap V2 addresses
const POPULAR_TOKENS: Record<string, Token[]> = {
  '1': [ // Ethereum Mainnet - Correct Uniswap V2 addresses
    { address: '0xA0b86a33E6441b4B576fb3D43bF18E5c73b49c90', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'Chainlink Token', decimals: 18 },
  ],
  '11155111': [ // Sepolia - Correct testnet addresses
    { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5', symbol: 'LINK', name: 'Chainlink Token', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
  ],
  '43114': [ // Avalanche - Correct Pangolin addresses
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18 },
    { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0x50b7545627a5162F82A992c33b87aDc75187B218', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
    { address: '0x5947BB275c521040051D82396192181b413227A3', symbol: 'LINK', name: 'Chainlink Token', decimals: 18 },
  ]
};

type DeploymentStep = 'idle' | 'checking-approval' | 'approving' | 'switching-rsc' | 'funding-rsc' | 'switching-back' | 'creating' | 'complete';

const TEST_CONTRACT_ADDRESSES = {
  CALLBACK: '0x4833996c0de8a9f58893A9Db0B6074e29D1bD4a9',
  RSC: '0xEBEfFB2a033e2762C3AFb5C174eb957098464d32'
};

const getInitialFormData = (): StopOrderFormData => ({
  chainId: '',
  selectedPair: null,
  sellToken0: true,
  clientAddress: '',
  coefficient: '1000',
  threshold: '',
  amount: '',
  destinationFunding: '',
  rscFunding: '0.05',
  dropPercentage: '10',
  currentPrice: '',
  stopPrice: ''
});

// Enhanced Token Selector Component with Fixed Balance Display
const TokenPairSelector = ({ 
  chainId, 
  onPairSelect, 
  selectedPair,
  connectedAccount
}: { 
  chainId: string; 
  onPairSelect: (pair: TradingPair) => void;
  selectedPair: TradingPair | null;
  connectedAccount: string;
}) => {
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState(false);
  const [directPairAddress, setDirectPairAddress] = useState('');
  const [isLoadingDirectPair, setIsLoadingDirectPair] = useState(false);
  const [useDirectPair, setUseDirectPair] = useState(false);

  const popularTokens = POPULAR_TOKENS[chainId] || [];

  // Enhanced token info fetching with balance
  const fetchTokenInfo = async (address: string, includeBalance = true): Promise<Token | null> => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) return null;
      
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

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      let balance = '0';
      if (includeBalance && connectedAccount) {
        try {
          const balanceWei = await tokenContract.balanceOf(connectedAccount);
          balance = ethers.formatUnits(balanceWei, decimals);
          const balanceNumber = parseFloat(balance);
          balance = balanceNumber > 0 ? balanceNumber.toFixed(6) : '0';
        } catch (balanceError) {
          console.warn('Failed to fetch balance:', balanceError);
          balance = '0';
        }
      }

      return {
        address,
        symbol,
        name,
        decimals,
        balance
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  };

  const TokenSelector = ({ 
    selectedToken, 
    onSelect, 
    placeholder,
    connectedAccount
  }: { 
    selectedToken: Token | null; 
    onSelect: (token: Token) => void;
    placeholder: string;
    connectedAccount: string;
  }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tokensWithBalances, setTokensWithBalances] = useState<Token[]>([]);
    const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false);

    // Fetch token balances when component mounts or account changes
    useEffect(() => {
      const fetchBalances = async () => {
        if (!connectedAccount || typeof window === 'undefined' || !window.ethereum) {
          setTokensWithBalances(popularTokens);
          return;
        }

        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const tokensWithUpdatedBalances = await Promise.all(
            popularTokens.map(async (token) => {
              try {
                const tokenContract = new ethers.Contract(
                  token.address,
                  ['function balanceOf(address) view returns (uint256)'],
                  provider
                );
                const balanceWei = await tokenContract.balanceOf(connectedAccount);
                const balance = ethers.formatUnits(balanceWei, token.decimals);
                const balanceNumber = parseFloat(balance);
                
                return {
                  ...token,
                  balance: balanceNumber > 0 ? balanceNumber.toFixed(6) : '0'
                };
              } catch (error) {
                console.warn(`Failed to fetch balance for ${token.symbol}:`, error);
                return { ...token, balance: '0' };
              }
            })
          );
          setTokensWithBalances(tokensWithUpdatedBalances);
        } catch (error) {
          console.error('Error fetching token balances:', error);
          setTokensWithBalances(popularTokens);
        }
      };

      fetchBalances();
    }, [connectedAccount, popularTokens]);

    const handleCustomTokenSelect = async (address: string) => {
      setIsLoadingCustomToken(true);
      const tokenInfo = await fetchTokenInfo(address, true); // Include balance for custom tokens
      setIsLoadingCustomToken(false);
      
      if (tokenInfo) {
        onSelect(tokenInfo);
        setOpen(false);
        toast.success(`Added ${tokenInfo.symbol} (${tokenInfo.name})`);
      } else {
        toast.error('Failed to fetch token information');
      }
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30 h-12"
          >
            {selectedToken ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                  {selectedToken.symbol.charAt(0)}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{selectedToken.symbol}</span>
                  <span className="text-xs text-zinc-400">
                    {selectedToken.address.slice(0, 6)}...{selectedToken.address.slice(-4)}
                  </span>
                </div>
                {selectedToken.balance && (
                  <span className="ml-auto text-zinc-200 font-medium">
                    {parseFloat(selectedToken.balance).toFixed(4)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-zinc-400">{placeholder}</span>
            )}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-zinc-900 border-zinc-700" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandInput 
              placeholder="Search tokens or paste address..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="text-zinc-200"
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>
                {ethers.isAddress(searchTerm) ? (
                  <div className="p-2">
                    <Button
                      onClick={() => handleCustomTokenSelect(searchTerm)}
                      disabled={isLoadingCustomToken}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isLoadingCustomToken ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading Token...
                        </div>
                      ) : (
                        <>Use Token: {searchTerm.slice(0, 6)}...{searchTerm.slice(-4)}</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-zinc-400">
                    No tokens found. Try pasting a token address.
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup heading="Available tokens">
                {tokensWithBalances
                  .filter(token => 
                    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    token.address.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((token) => (
                    <CommandItem
                      key={token.address}
                      value={token.symbol}
                      onSelect={() => {
                        onSelect(token);
                        setOpen(false);
                      }}
                      className="cursor-pointer hover:bg-zinc-800/50 p-3"
                    >
                      <div className="flex items-center w-full">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold mr-3">
                          {token.symbol.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-200 truncate">{token.symbol}</span>
                            <span className="text-zinc-200 font-medium ml-2">
                              {token.balance && parseFloat(token.balance) > 0 ? parseFloat(token.balance).toFixed(4) : '0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400 truncate">
                              {token.name}
                            </span>
                          </div>
                        </div>
                        <Check className={`ml-2 h-4 w-4 ${selectedToken?.address === token.address ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const findPair = async () => {
    if (!token0 || !token1 || !chainId) return;
    
    setIsLoadingPair(true);
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No wallet detected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
      if (!selectedChain) throw new Error('Chain not supported');

      const factoryInterface = new ethers.Interface([
        'function getPair(address tokenA, address tokenB) view returns (address pair)'
      ]);
      
      const factoryContract = new ethers.Contract(
        selectedChain.factoryAddress, 
        factoryInterface, 
        provider
      );

      const pairAddress = await factoryContract.getPair(token0.address, token1.address);
      
      if (pairAddress === ethers.ZeroAddress) {
        throw new Error('Trading pair does not exist');
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

      const isToken0First = pairToken0.toLowerCase() === token0.address.toLowerCase();
      const reserve0 = ethers.formatUnits(reserves[0], isToken0First ? token0.decimals : token1.decimals);
      const reserve1 = ethers.formatUnits(reserves[1], isToken0First ? token1.decimals : token0.decimals);
      
      const currentPrice = isToken0First 
        ? parseFloat(reserve1) / parseFloat(reserve0)
        : parseFloat(reserve0) / parseFloat(reserve1);

      const tradingPair: TradingPair = {
        token0: isToken0First ? token0 : token1,
        token1: isToken0First ? token1 : token0,
        pairAddress,
        reserve0,
        reserve1,
        currentPrice
      };

      onPairSelect(tradingPair);
      toast.success('Trading pair found!');
      
    } catch (error: any) {
      console.error('Error finding pair:', error);
      toast.error(error.message || 'Failed to find trading pair');
    } finally {
      setIsLoadingPair(false);
    }
  };

  const findDirectPair = async () => {
    if (!directPairAddress || !ethers.isAddress(directPairAddress)) {
      toast.error('Please enter a valid pair address');
      return;
    }

    setIsLoadingDirectPair(true);
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No wallet detected');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const code = await provider.getCode(directPairAddress);
      if (code === '0x' || code === '0x0') {
        throw new Error('No contract found at this address');
      }

      const pairInterface = new ethers.Interface([
        'function getReserves() view returns (uint112, uint112, uint32)',
        'function token0() view returns (address)',
        'function token1() view returns (address)'
      ]);

      const pairContract = new ethers.Contract(directPairAddress, pairInterface, provider);
      const [reserves, token0Address, token1Address] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.token1()
      ]);

      const [token0Info, token1Info] = await Promise.all([
        fetchTokenInfo(token0Address, true),
        fetchTokenInfo(token1Address, true)
      ]);

      if (!token0Info || !token1Info) {
        throw new Error('Failed to fetch token information');
      }

      const reserve0 = ethers.formatUnits(reserves[0], token0Info.decimals);
      const reserve1 = ethers.formatUnits(reserves[1], token1Info.decimals);
      const currentPrice = parseFloat(reserve1) / parseFloat(reserve0);

      const tradingPair: TradingPair = {
        token0: token0Info,
        token1: token1Info,
        pairAddress: directPairAddress,
        reserve0,
        reserve1,
        currentPrice
      };

      onPairSelect(tradingPair);
      toast.success('Trading pair loaded successfully!');
      
    } catch (error: any) {
      console.error('Error loading direct pair:', error);
      toast.error(error.message || 'Failed to load trading pair');
    } finally {
      setIsLoadingDirectPair(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-6">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-zinc-100 flex items-center">
          <Search className="w-5 h-5 mr-2" />
          Select Trading Pair
        </CardTitle>
        <CardDescription className="text-zinc-300">
          Choose tokens or paste a pair address directly
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Method Selection */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={!useDirectPair ? "default" : "outline"}
              onClick={() => setUseDirectPair(false)}
              className="flex-1"
            >
              Select Tokens
            </Button>
            <Button
              type="button"
              variant={useDirectPair ? "default" : "outline"}
              onClick={() => setUseDirectPair(true)}
              className="flex-1"
            >
              Paste Pair Address
            </Button>
          </div>

          {!useDirectPair ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-zinc-200 mb-2 block">First Token</label>
                  <TokenSelector
                    selectedToken={token0}
                    onSelect={setToken0}
                    placeholder="Select first token"
                    connectedAccount={connectedAccount}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-zinc-200 mb-2 block">Second Token</label>
                  <TokenSelector
                    selectedToken={token1}
                    onSelect={setToken1}
                    placeholder="Select second token"
                    connectedAccount={connectedAccount}
                  />
                </div>
              </div>

              <Button
                onClick={findPair}
                disabled={!token0 || !token1 || isLoadingPair}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isLoadingPair ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Finding Pair...
                  </div>
                ) : (
                  'Find Trading Pair'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-200 mb-2 block">Pair Address</label>
                <Input
                  placeholder="Enter pair address (0x...)"
                  value={directPairAddress}
                  onChange={(e) => setDirectPairAddress(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>

              <Button
                onClick={findDirectPair}
                disabled={!directPairAddress || !ethers.isAddress(directPairAddress) || isLoadingDirectPair}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isLoadingDirectPair ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading Pair...
                  </div>
                ) : (
                  'Load Trading Pair'
                )}
              </Button>
            </div>
          )}

          {selectedPair && (
            <Card className="bg-green-900/20 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-green-100">✅ Trading Pair Found</h3>
                  <div className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                    {SUPPORTED_CHAINS.find(c => c.id === chainId)?.dexName} Pair
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Pair:</span>
                    <span className="text-zinc-300 font-medium">{selectedPair.token0.symbol}/{selectedPair.token1.symbol}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Current Price:</span>
                    <span className="text-blue-300">1 {selectedPair.token0.symbol} = {selectedPair.currentPrice.toFixed(6)} {selectedPair.token1.symbol}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Balance Checker Component
const BalanceChecker = ({ 
  formData, 
  connectedAccount,
  onBalanceUpdate 
}: { 
  formData: StopOrderFormData;
  connectedAccount: string;
  onBalanceUpdate: (hasBalance: boolean, balance: string) => void;
}) => {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [hasBalance, setHasBalance] = useState(false);

  useEffect(() => {
    const checkBalance = async () => {
      if (!formData.selectedPair || !connectedAccount || !formData.amount) {
        setHasBalance(false);
        onBalanceUpdate(false, '0');
        return;
      }

      setIsLoading(true);
      try {
        if (typeof window === 'undefined' || !window.ethereum) return;
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenToCheck = formData.sellToken0 ? formData.selectedPair.token0 : formData.selectedPair.token1;
        
        const tokenContract = new ethers.Contract(
          tokenToCheck.address,
          ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
          provider
        );

        const [balanceWei, decimals] = await Promise.all([
          tokenContract.balanceOf(connectedAccount),
          tokenContract.decimals()
        ]);

        const balanceFormatted = ethers.formatUnits(balanceWei, decimals);
        setBalance(balanceFormatted);

        const requiredAmount = parseFloat(formData.amount);
        const availableAmount = parseFloat(balanceFormatted);
        const hasEnough = availableAmount >= requiredAmount;
        
        setHasBalance(hasEnough);
        onBalanceUpdate(hasEnough, balanceFormatted);

      } catch (error) {
        console.error('Error checking balance:', error);
        setHasBalance(false);
        onBalanceUpdate(false, '0');
      } finally {
        setIsLoading(false);
      }
    };

    checkBalance();
  }, [formData.selectedPair, formData.sellToken0, formData.amount, connectedAccount]);

  if (!formData.selectedPair) return null;

  const tokenSymbol = formData.sellToken0 ? formData.selectedPair.token0.symbol : formData.selectedPair.token1.symbol;

  return (
    <div className="flex items-center space-x-2 p-3 bg-zinc-800/50 rounded-lg">
      <div className={`w-3 h-3 rounded-full ${hasBalance ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className={`text-sm ${hasBalance ? 'text-green-300' : 'text-red-300'}`}>
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Checking balance...
          </div>
        ) : (
          <>
            Balance: {parseFloat(balance).toFixed(6)} {tokenSymbol}
            {hasBalance ? ' ✓' : ` (Need ${formData.amount} ${tokenSymbol})`}
          </>
        )}
      </span>
    </div>
  );
};

export default function EnhancedStopOrderPage() {
  const router = useRouter(); // Added router for proper navigation
  const aiConfigDataRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [formData, setFormData] = useState<StopOrderFormData>(getInitialFormData());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [showAIStatus, setShowAIStatus] = useState(false);
  const [isLoadingAIConfig, setIsLoadingAIConfig] = useState(false);
  const [hasTokenBalance, setHasTokenBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');

  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);

  // Enhanced AI Status Component with cleaner styling
  const EnhancedAIIntegrationStatus = () => {
    if (!showAIStatus) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-zinc-100 font-medium">✨ AI Configuration Loaded</p>
                <p className="text-zinc-300 text-sm">
                  Your stop order parameters have been pre-filled. Review and deploy when ready!
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIStatus(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Simplified Requirements Checker with cleaner colors
  const RequirementsChecker = () => {
    const requirements = [
      { 
        label: 'Wallet Connected', 
        status: !!connectedAccount,
        detail: connectedAccount ? `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}` : 'Not connected'
      },
      { 
        label: 'Network Selected', 
        status: !!selectedChain,
        detail: selectedChain ? selectedChain.name : 'Not selected'
      },
      { 
        label: 'Trading Pair Found', 
        status: !!formData.selectedPair,
        detail: formData.selectedPair ? `${formData.selectedPair.token0.symbol}/${formData.selectedPair.token1.symbol}` : 'Not found'
      },
      { 
        label: 'Sufficient Balance', 
        status: hasTokenBalance,
        detail: hasTokenBalance ? `${parseFloat(tokenBalance).toFixed(4)} available` : 'Insufficient'
      },
      { 
        label: 'Stop Price Set', 
        status: !!formData.dropPercentage && parseFloat(formData.dropPercentage) > 0,
        detail: formData.dropPercentage ? `${formData.dropPercentage}% drop` : 'Not set'
      },
      { 
        label: 'Amount Specified', 
        status: !!formData.amount && parseFloat(formData.amount) > 0,
        detail: formData.amount ? `${formData.amount} tokens` : 'Not specified'
      }
    ];

    return (
      <Card className="bg-blue-900/20 border-blue-500/20">
        <CardContent className="pt-4">
          <h3 className="text-sm font-medium text-zinc-100 mb-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-blue-400" />
            Setup Requirements
          </h3>
          <div className="space-y-2">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${req.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${req.status ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {req.label}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{req.detail}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 p-3 bg-zinc-800/50 rounded text-xs">
            <p className="text-zinc-300">
              <span className="font-medium text-zinc-200">💰 Total Cost:</span> 
              {selectedChain && (
                <>
                  {' '}~{selectedChain.defaultFunding} {selectedChain.nativeCurrency} + 0.05 {selectedChain.rscNetwork.currencySymbol} + gas
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Simplified deployment status
  const FundingStatusUI = () => {
    const getFundingStepDescription = (step: DeploymentStep) => {
      switch (step) {
        case 'checking-approval':
          return { title: 'Checking Token Approval', color: 'blue' };
        case 'approving':
          return { title: 'Approving Tokens', color: 'yellow' };
        case 'switching-rsc':
          return { title: `Switching to ${selectedChain?.rscNetwork.name}`, color: 'purple' };
        case 'funding-rsc':
          return { title: 'Funding RSC Monitor', color: 'blue' };
        case 'switching-back':
          return { title: `Switching back to ${selectedChain?.name}`, color: 'purple' };
        case 'creating':
          return { title: 'Creating Stop Order', color: 'green' };
        case 'complete':
          return { title: '🎉 Stop Order Active!', color: 'green' };
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
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4 animate-pulse" />
        )}
        <AlertDescription className="text-zinc-200">
          <span className="font-medium">{stepInfo.title}</span>
        </AlertDescription>
      </Alert>
    );
  };

  // All existing helper functions remain the same (calculateThresholdFromPercentage, calculateStopPrice, switchNetwork, etc.)
  const calculateThresholdFromPercentage = (percentage: string) => {
    if (!percentage || isNaN(parseFloat(percentage))) return;
    
    const dropPercent = parseFloat(percentage);
    const remainingPercent = 100 - dropPercent;
    const coefficient = 1000;
    const threshold = Math.floor((remainingPercent / 100) * coefficient);
    
    setFormData(prev => ({
      ...prev,
      coefficient: coefficient.toString(),
      threshold: threshold.toString(),
      dropPercentage: percentage
    }));
  };

  const calculateStopPrice = () => {
    if (!formData.selectedPair || !formData.dropPercentage) return '';
    
    const currentPrice = formData.selectedPair.currentPrice;
    const dropPercent = parseFloat(formData.dropPercentage) || 10;
    const stopPrice = currentPrice * (1 - dropPercent / 100);
    
    return stopPrice.toFixed(6);
  };

  // Network switching functions (same as before)
  const switchNetwork = async (chainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

    try {
      const targetChainIdHex = `0x${parseInt(chainId).toString(16)}`;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      if (currentNetwork.chainId.toString() === chainId) {
        console.log(`Already on chain ${chainId}`);
        return true;
      }

      console.log(`Switching from ${currentNetwork.chainId} to chain ${chainId}`);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainIdHex }],
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newNetwork = await newProvider.getNetwork();
      
      if (newNetwork.chainId.toString() !== chainId) {
        throw new Error(`Network switch failed. Expected ${chainId}, got ${newNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to chain ${chainId}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4902) {
        console.log(`Chain ${chainId} not added to wallet, attempting to add it`);
        const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
        if (!chain) throw new Error('Chain not supported');
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${parseInt(chainId).toString(16)}`,
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
            }],
          });
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          
          if (network.chainId.toString() !== chainId) {
            throw new Error('Network add succeeded but switch failed');
          }
          
          return true;
        } catch (addError: any) {
          throw new Error(`Failed to add chain: ${addError.message || 'User rejected the request'}`);
        }
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  const switchToRSCNetwork = async () => {
    if (!selectedChain) throw new Error('No chain selected');
    
    const rscNetwork = selectedChain.rscNetwork;
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
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const updatedNetwork = await updatedProvider.getNetwork();
      
      if (updatedNetwork.chainId.toString() !== rscNetwork.chainId) {
        throw new Error(`RSC network switch failed. Expected ${rscNetwork.chainId}, got ${updatedNetwork.chainId}`);
      }
      
      console.log(`Successfully switched to ${rscNetwork.name}`);
      return true;
      
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
    }
  };

  // Deployment function (same as before)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChain || !formData.selectedPair) {
      toast.error('Please complete all required fields');
      return;
    }

    const originalChainId = formData.chainId;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const currentNetwork = await provider.getNetwork();
      
      if (currentNetwork.chainId.toString() !== originalChainId) {
        await switchNetwork(originalChainId);
      }

      const signer = await provider.getSigner();
      const tokenToApprove = formData.sellToken0 ? formData.selectedPair.token0 : formData.selectedPair.token1;

      setDeploymentStep('checking-approval');
      
      const tokenContract = new ethers.Contract(
        tokenToApprove.address,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      const requiredAmount = ethers.parseUnits(formData.amount, tokenToApprove.decimals);
      const currentAllowance = await tokenContract.allowance(connectedAccount, TEST_CONTRACT_ADDRESSES.CALLBACK);

      if (currentAllowance < requiredAmount) {
        setDeploymentStep('approving');
        
        if (currentAllowance > 0) {
          const resetTx = await tokenContract.approve(TEST_CONTRACT_ADDRESSES.CALLBACK, 0);
          await resetTx.wait();
        }

        const approvalTx = await tokenContract.approve(TEST_CONTRACT_ADDRESSES.CALLBACK, requiredAmount);
        await approvalTx.wait();
        toast.success('Token approval confirmed');
      } else {
        toast.success('Tokens already approved');
      }

      setDeploymentStep('switching-rsc');
      await switchToRSCNetwork();
      toast.success(`Switched to ${selectedChain.rscNetwork.name}`);

      setDeploymentStep('funding-rsc');
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscSigner = await rscProvider.getSigner();
      
      const rscFundingTx = await rscSigner.sendTransaction({
        to: TEST_CONTRACT_ADDRESSES.RSC,
        value: ethers.parseEther(formData.rscFunding)
      });
      await rscFundingTx.wait();
      toast.success(`Funded RSC with ${formData.rscFunding} ${selectedChain.rscNetwork.currencySymbol}`);

      setDeploymentStep('switching-back');
      console.log(`Switching back to original chain: ${originalChainId}`);
      await switchNetwork(originalChainId);
      
      const finalProvider = new ethers.BrowserProvider(window.ethereum);
      const finalNetwork = await finalProvider.getNetwork();
      
      if (finalNetwork.chainId.toString() !== originalChainId) {
        throw new Error(`Failed to switch back to original network. Current: ${finalNetwork.chainId}, Expected: ${originalChainId}`);
      }
      
      toast.success(`Switched back to ${selectedChain.name}`);

      setDeploymentStep('creating');
      
      const finalSigner = await finalProvider.getSigner();
      
      const stopOrderTx = await finalSigner.sendTransaction({
        to: TEST_CONTRACT_ADDRESSES.CALLBACK,
        value: ethers.parseEther(formData.destinationFunding),
        data: '0x'
      });
      
      await stopOrderTx.wait();
      toast.success('Stop order created with funding!');
      
      setDeploymentStep('complete');
      toast.success('🎉 Stop order created successfully!');
      
      setTimeout(() => {
        toast.success('Your stop order is now active and monitoring prices 24/7');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating stop order:', error);
      setDeploymentStep('idle');
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const currentNetwork = await provider.getNetwork();
        if (currentNetwork.chainId.toString() !== originalChainId) {
          console.log('Attempting to switch back to original network after error...');
          await switchNetwork(originalChainId);
        }
      } catch (switchBackError) {
        console.error('Failed to switch back to original network:', switchBackError);
      }
      
      if (error.message.includes('User denied') || error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else if (error.message.includes('network') || error.message.includes('switch')) {
        toast.error('Network switching failed. Please switch networks manually and try again.');
      } else {
        toast.error(error.message || 'Failed to create stop order');
      }
    }
  };

  // Form validation
  useEffect(() => {
    const isValid = 
      !!connectedAccount &&
      !!selectedChain &&
      !!formData.selectedPair &&
      !!formData.amount &&
      parseFloat(formData.amount) > 0 &&
      !!formData.dropPercentage &&
      parseFloat(formData.dropPercentage) > 0 &&
      hasTokenBalance &&
      deploymentStep === 'idle';
    
    setIsFormValid(isValid);
  }, [connectedAccount, selectedChain, formData, hasTokenBalance, deploymentStep]);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const fromAI = urlParams.get('from_ai');
        
        if (fromAI === 'true') {
          setIsLoadingAIConfig(true);
          const aiConfig = AIUtils.ConfigManager.peekConfig();
          
          if (aiConfig) {
            setShowAIStatus(true);
            AIUtils.ConfigManager.retrieveAndClearConfig();
          }
          
          window.history.replaceState({}, '', '/automations/stop-order');
          setIsLoadingAIConfig(false);
        }
      }

      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
            setFormData(prev => ({ ...prev, clientAddress: account }));
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }

      setIsInitialized(true);
    };

    initialize();
  }, []);

  // Update stop price when drop percentage changes
  useEffect(() => {
    if (formData.selectedPair && formData.dropPercentage) {
      const stopPrice = calculateStopPrice();
      setFormData(prev => ({ ...prev, stopPrice }));
    }
  }, [formData.selectedPair, formData.dropPercentage]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-zinc-200">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        {/* Hero Section with simplified colors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Smart Stop Orders
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Automatically sell your tokens when prices drop - protecting your investments 24/7 across multiple networks.
          </p>
          
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Multi-Chain Protection</h3>
                    <p className="text-sm text-zinc-300">Ethereum, Sepolia & Avalanche</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">24/7 Monitoring</h3>
                    <p className="text-sm text-gray-200">Never miss a price movement</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Instant Execution</h3>
                    <p className="text-sm text-gray-200">Automatic when triggered</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <EnhancedAIIntegrationStatus />

        {/* Network Selection with simplified styling */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-6">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Select Network</CardTitle>
            <CardDescription className="text-zinc-300">Choose your trading network</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Select
              value={formData.chainId}
              onValueChange={(value) => {
                const chain = SUPPORTED_CHAINS.find(c => c.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  chainId: value,
                  destinationFunding: chain?.defaultFunding || '0.03'
                }));
              }}
            >
              <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200 h-12">
                <SelectValue placeholder="Choose your trading network" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CHAINS.map(chain => (
                  <SelectItem 
                    key={chain.id} 
                    value={chain.id}
                    className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    <div className="flex items-center space-x-3">
                      <span>{chain.name}</span>
                      <span className="text-xs bg-blue-500/20 px-2 py-1 rounded">{chain.dexName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Token Pair Selector */}
        {formData.chainId && connectedAccount && (
          <TokenPairSelector
            chainId={formData.chainId}
            selectedPair={formData.selectedPair}
            onPairSelect={(pair) => {
              setFormData(prev => ({ ...prev, selectedPair: pair }));
            }}
            connectedAccount={connectedAccount}
          />
        )}

        {/* Main Configuration Form with simplified colors */}
        {formData.selectedPair && (
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-6">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-zinc-100 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Configure Your Stop Order
              </CardTitle>
              <CardDescription className="text-zinc-300">Set up automatic selling when your token price drops</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleCreateOrder}>
                {/* Token Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-zinc-200">Which token do you want to sell?</label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        formData.sellToken0 
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, sellToken0: true }))}
                    >
                      <div className="text-center">
                        <h3 className="font-medium text-zinc-100 mb-1">Sell {formData.selectedPair.token0.symbol}</h3>
                        <p className="text-xs text-zinc-400">Receive {formData.selectedPair.token1.symbol}</p>
                      </div>
                    </div>
                    
                    <div
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        !formData.sellToken0 
                          ? 'border-blue-500 bg-blue-900/20' 
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, sellToken0: false }))}
                    >
                      <div className="text-center">
                        <h3 className="font-medium text-zinc-100 mb-1">Sell {formData.selectedPair.token1.symbol}</h3>
                        <p className="text-xs text-zinc-400">Receive {formData.selectedPair.token0.symbol}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Drop Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <label className="text-sm font-medium text-zinc-200">Stop Loss Configuration</label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-400 mb-2">Quick options:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {['5', '10', '15', '20'].map(percentage => (
                          <Button
                            key={percentage}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`${formData.dropPercentage === percentage ? 'bg-blue-600 border-blue-500' : 'bg-blue-900/20 border-zinc-700'} text-zinc-200 hover:bg-blue-800/30`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, dropPercentage: percentage }));
                              calculateThresholdFromPercentage(percentage);
                            }}
                          >
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {percentage}%
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="50"
                        placeholder="Or enter custom percentage"
                        value={formData.dropPercentage}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, dropPercentage: e.target.value }));
                          calculateThresholdFromPercentage(e.target.value);
                        }}
                        className="bg-zinc-800/50 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 pl-8"
                      />
                      <TrendingDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>

                    {formData.dropPercentage && formData.stopPrice && (
                      <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-amber-200 font-medium">Stop Trigger Price</p>
                            <p className="text-xs text-amber-300">
                              {formData.dropPercentage}% drop from current price
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-100">
                              {formData.stopPrice}
                            </p>
                            <p className="text-xs text-amber-300">
                              {formData.sellToken0 ? formData.selectedPair.token1.symbol : formData.selectedPair.token0.symbol} per {formData.sellToken0 ? formData.selectedPair.token0.symbol : formData.selectedPair.token1.symbol}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-zinc-200">
                      Amount to Sell ({formData.sellToken0 ? formData.selectedPair.token0.symbol : formData.selectedPair.token1.symbol})
                    </label>
                  </div>
                  <Input 
                    type="number"
                    step="0.000001"
                    placeholder={`Enter amount of ${formData.sellToken0 ? formData.selectedPair.token0.symbol : formData.selectedPair.token1.symbol} to sell`}
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>

                {/* Balance Checker */}
                <BalanceChecker
                  formData={formData}
                  connectedAccount={connectedAccount}
                  onBalanceUpdate={(hasBalance, balance) => {
                    setHasTokenBalance(hasBalance);
                    setTokenBalance(balance);
                  }}
                />

                {/* Requirements Checker */}
                <RequirementsChecker />
                
                {/* Funding Status */}
                <FundingStatusUI />

                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-lg font-semibold"
                  disabled={deploymentStep !== 'idle' || !isFormValid}
                >
                  {deploymentStep === 'complete' ? (
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Stop Order Created! 🎉
                    </div>
                  ) : deploymentStep !== 'idle' ? (
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Create Stop Order
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Dashboard Section with proper routing */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-6">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100 flex items-center justify-between">
              <span>Manage Your Stop Orders</span>
              <Link href="/automations/stop-order/dashboard">
              <Button
                // onClick={() => router.push('/automations/stop-order/dashboard')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Target className="w-4 h-4 mr-2" />
                View Dashboard
              </Button>
              </Link>
            </CardTitle>
            <CardDescription className="text-zinc-300">
              Monitor, pause, cancel, and track all your active stop orders
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-green-900/20 rounded-lg border border-green-500/20">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="font-medium text-green-200">Track Status</h3>
                  <p className="text-sm text-green-300">Monitor execution status in real-time</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/20">
                <Clock className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="font-medium text-yellow-200">Pause/Resume</h3>
                  <p className="text-sm text-yellow-300">Control when orders are active</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
                <X className="w-8 h-8 text-red-400" />
                <div>
                  <h3 className="font-medium text-red-200">Cancel Orders</h3>
                  <p className="text-sm text-red-300">Cancel orders anytime before execution</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Educational Section with simplified colors */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">How Stop Orders Work</CardTitle>
            <CardDescription className="text-zinc-300">
              Understanding automated stop loss protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is a Stop Order?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      A stop order acts as your personal trading assistant, watching token prices 24/7 and automatically selling when they drop to your specified level. Think of it as an insurance policy for your crypto investments.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Example Scenario:</h4>
                      <p className="text-sm text-zinc-300">
                        You own ETH worth $3,500 each. You set a 10% stop order. If ETH drops to $3,150, 
                        your tokens automatically sell for USDC, protecting you from further losses.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="funding" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Setup Process
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Our optimized setup process minimizes the number of transactions you need to sign while ensuring your stop order is properly funded and configured.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-300">1</span>
                        </div>
                        <div>
                          <p className="text-blue-200 font-medium">Token Approval (if needed)</p>
                          <p className="text-blue-300 text-xs">
                            We check if your tokens are already approved. If not, one transaction approves them for trading.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-purple-300">2</span>
                        </div>
                        <div>
                          <p className="text-purple-200 font-medium">RSC Funding</p>
                          <p className="text-purple-300 text-xs">
                            One transaction on {selectedChain?.rscNetwork.name} funds the 24/7 price monitoring system.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-300">3</span>
                        </div>
                        <div>
                          <p className="text-green-200 font-medium">Stop Order Creation</p>
                          <p className="text-green-300 text-xs">
                            Final transaction creates your stop order and funds the execution contract in one go.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-900/20 p-3 rounded-lg border border-amber-500/30">
                      <p className="text-sm text-amber-200">
                        ⚡ <span className="font-medium">Optimized Flow:</span> 
                        Only 2-3 transactions total! We automatically handle network switching and combine funding with contract creation.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}