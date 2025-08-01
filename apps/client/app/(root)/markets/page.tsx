// app/markets/page.tsx

'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  BarChart, 
  RefreshCw,
  ArrowUpDown,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ERC20 ABI for name() function
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

// Token name cache to avoid repeated calls
const tokenNameCache = new Map<string, string>();

// Common token mappings as fallback
const COMMON_TOKENS: { [key: string]: string } = {
  '0x0000000000000000000000000000000000000000': 'ETH',
  '0x817162975186d4d53dbf5a7377dd45376e2d2fc5': 'REACT', // Reactive Network token
  // USDC addresses on different networks
  '0xa0b86a33e6776840602fb8e4d5ee56a2ae3b7238': 'USDC', // Ethereum
  '0xa0b86a33e6776840602fb8e4d5ee56a2ae3b7238e48': 'USDC', // Alternative
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC', // Polygon
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USDC', // Arbitrum
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607': 'USDC', // Optimism
  // USDT addresses
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT', // Ethereum
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT', // Polygon
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT', // Arbitrum
  // WETH addresses
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH', // Ethereum
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH', // Arbitrum
  '0x4200000000000000000000000000000000000006': 'WETH', // Optimism
  // Other common tokens
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 'BUSD',
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 'SHIB',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  // Common patterns for fuzzy matching
  'usdt': 'USDT',
  'usdc': 'USDC',
  'eth': 'ETH',
  'weth': 'WETH',
  'react': 'REACT',
  'dai': 'DAI',
  'wbtc': 'WBTC',
  'link': 'LINK',
  'uni': 'UNI'
};

// Function to resolve token address to name using Web3
const resolveTokenName = async (address: string): Promise<string> => {
  // Handle ETH (zero address)
  if (address === '0x0000000000000000000000000000000000000000' || address === '0x0') {
    return 'ETH';
  }

  // Normalize address - remove spaces, convert to lowercase
  const normalizedAddress = address.toLowerCase().trim();
  
  // Check cache first
  if (tokenNameCache.has(normalizedAddress)) {
    return tokenNameCache.get(normalizedAddress)!;
  }

  // Direct exact match first
  if (COMMON_TOKENS[normalizedAddress]) {
    const name = COMMON_TOKENS[normalizedAddress];
    tokenNameCache.set(normalizedAddress, name);
    return name;
  }

  // Special handling for common addresses that might have different cases or formats
  const addressPatterns = [
    { pattern: '0xa0b86a33e6776840602fb8e4d5ee56a2ae3b7238', token: 'USDC' },
    { pattern: '0xa0b8', token: 'USDC' }, // Handle truncated versions
    { pattern: '0xdac17f958d2ee523a2206206994597c13d831ec7', token: 'USDT' },
    { pattern: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', token: 'WETH' },
    { pattern: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5', token: 'REACT' }
  ];

  for (const { pattern, token } of addressPatterns) {
    if (normalizedAddress.startsWith(pattern.toLowerCase()) || 
        normalizedAddress === pattern.toLowerCase()) {
      tokenNameCache.set(normalizedAddress, token);
      return token;
    }
  }

  // Check for partial address matches (handles truncated addresses)
  for (const [key, value] of Object.entries(COMMON_TOKENS)) {
    const keyLower = key.toLowerCase();
    // If the address starts with the key or the key starts with the address
    if (normalizedAddress.startsWith(keyLower.slice(0, 10)) && keyLower.length > 10) {
      tokenNameCache.set(normalizedAddress, value);
      return value;
    }
    // Also check if it's a substring match for short symbols
    if (keyLower.length <= 6 && normalizedAddress.includes(keyLower)) {
      tokenNameCache.set(normalizedAddress, value);
      return value; 
    }
  }

  // If it's already a known token symbol (short and alphabetic), return it
  if (address.length <= 6 && /^[A-Z]+$/i.test(address)) {
    const symbol = address.toUpperCase();
    tokenNameCache.set(normalizedAddress, symbol);
    return symbol;
  }

  // Handle common token name patterns in addresses
  const addressUpper = address.toUpperCase();
  if (addressUpper.includes('USDC')) {
    tokenNameCache.set(normalizedAddress, 'USDC');
    return 'USDC';
  }
  if (addressUpper.includes('USDT')) {
    tokenNameCache.set(normalizedAddress, 'USDT');  
    return 'USDT';
  }
  if (addressUpper.includes('WETH')) {
    tokenNameCache.set(normalizedAddress, 'WETH');
    return 'WETH';
  }

  // If address looks like a token address (42 chars), try to resolve it
  if (address.length === 42 && address.startsWith('0x')) {
    try {
      // Try a simple RPC call first (most reliable)
      const rpcUrl = 'https://eth.llamarpc.com';
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: address,
            data: '0x95d89b41' // symbol() function selector
          }, 'latest'],
          id: Math.random()
        })
      });

      const data = await response.json();
      if (data.result && data.result !== '0x' && data.result.length > 2) {
        try {
          // Decode the hex response
          const hex = data.result.slice(2);
          // Skip the first 64 chars (offset) and next 64 chars (length), then decode
          const dataHex = hex.slice(128);
          const bytes = [];
          for (let i = 0; i < dataHex.length; i += 2) {
            const byte = parseInt(dataHex.substr(i, 2), 16);
            if (byte > 0 && byte < 127) bytes.push(byte); // Only printable ASCII
          }
          const symbol = String.fromCharCode(...bytes).trim();
          
          if (symbol.length > 0 && symbol.length <= 10 && /^[A-Za-z0-9]+$/.test(symbol)) {
            tokenNameCache.set(normalizedAddress, symbol.toUpperCase());
            return symbol.toUpperCase();
          }
        } catch (decodeError) {
          console.warn('Failed to decode token symbol:', decodeError);
        }
      }
    } catch (error) {
      console.warn(`Error resolving token name for ${address}:`, error);
    }
  }

  // Final fallback: return shortened address
  if (address.length > 10) {
    const shortened = `${address.slice(0, 6)}...${address.slice(-4)}`;
    tokenNameCache.set(normalizedAddress, shortened);
    return shortened;
  }

  return address.toUpperCase();
};

// Define the type for the market data received from CoinGecko
interface Market {
  id: string;
  market: {
    name: string;
    identifier: string;
    has_trading_incentive: boolean;
  };
  base: string;
  target: string;
  last: number;
  volume: number;
  converted_last: {
    usd: number;
  };
  converted_volume: {
    usd: number;
  };
  trust_score: 'green' | 'yellow' | 'red';
  trade_url: string;
  token_info_url: string | null;
  bid_ask_spread_percentage?: number;
}

interface EnhancedMarket extends Market {
  exchange_type: 'CEX' | 'DEX';
  spread_percentage: number;
  volume_percentage: number;
  clean_pair: string;
  resolved_base: string;
  resolved_target: string;
  depth_plus_2: number;
  depth_minus_2: number;
  last_updated: string;
}

type SortField = 'exchange' | 'volume' | 'price' | 'trust' | 'spread' | 'volume_percentage';
type SortDirection = 'asc' | 'desc';
type FilterType = 'All' | 'CEX' | 'DEX' | 'Spot' | 'Perpetuals' | 'Futures';

// Helper to determine if exchange is CEX or DEX
const getExchangeType = (exchangeName: string): 'CEX' | 'DEX' => {
  const dexNames = [
    'uniswap', 'sushiswap', 'pancakeswap', 'quickswap', 'traderjoe', 
    '1inch', 'curve', 'balancer', 'dodo', 'kyber', 'bancor', 'raydium',
    'serum', 'orca', 'camelot', 'thena', 'spookyswap', 'spiritswap'
  ];
  
  return dexNames.some(dex => exchangeName.toLowerCase().includes(dex)) ? 'DEX' : 'CEX';
};

// Helper to clean up pair names using token resolution
const cleanPairName = async (base: string, target: string, exchangeName: string): Promise<{
  clean_pair: string;
  resolved_base: string;
  resolved_target: string;
}> => {
  const exchangeType = getExchangeType(exchangeName);
  
  let resolvedBase = base;
  let resolvedTarget = target;
  
  // For DEX, resolve contract addresses to token names
  if (exchangeType === 'DEX') {
    console.log(`Resolving DEX pair: ${base} / ${target} on ${exchangeName}`);
    resolvedBase = await resolveTokenName(base);
    resolvedTarget = await resolveTokenName(target);
    console.log(`Resolved to: ${resolvedBase} / ${resolvedTarget}`);
  } else {
    // For CEX, use the provided symbols but clean them up
    resolvedBase = base.length > 10 ? 'REACT' : base.toUpperCase();
    resolvedTarget = target.toUpperCase();
  }
  
  const cleanPair = `${resolvedBase}/${resolvedTarget}`;
  
  return {
    clean_pair: cleanPair,
    resolved_base: resolvedBase,
    resolved_target: resolvedTarget
  };
};

// Enhanced Trust Score component
const TrustScoreIndicator = ({ score }: { score: 'green' | 'yellow' | 'red' }) => {
  let color: string;
  let bg: string;
  let label: string;

  if (score === 'green') {
    color = 'text-green-400';
    bg = 'bg-green-400';
    label = 'High';
  } else if (score === 'yellow') {
    color = 'text-yellow-400';
    bg = 'bg-yellow-400';
    label = 'Moderate';
  } else {
    color = 'text-red-400';
    bg = 'bg-red-400';
    label = 'Low';
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${bg}`}></div>
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
};

// Exchange type badge
const ExchangeTypeBadge = ({ type }: { type: 'CEX' | 'DEX' }) => (
  <Badge 
    variant="secondary" 
    className={`text-xs ${
      type === 'CEX' 
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }`}
  >
    {type}
  </Badge>
);

// Pagination component
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void; 
}) => (
  <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700">
    <div className="text-sm text-zinc-400">
      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalPages * 10)} results
    </div>
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="border-zinc-600 hover:bg-zinc-800"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            className={currentPage === pageNum 
              ? "bg-blue-600 hover:bg-blue-700" 
              : "border-zinc-600 hover:bg-zinc-800"
            }
          >
            {pageNum}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="border-zinc-600 hover:bg-zinc-800"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default function ReactiveMarketsPage() {
  const [markets, setMarkets] = useState<EnhancedMarket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<SortField>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filters: FilterType[] = ['All', 'CEX', 'DEX', 'Spot', 'Perpetuals', 'Futures'];

  // Enhanced market data processing with token name resolution
  const enhanceMarketData = useCallback(async (rawMarkets: Market[]): Promise<EnhancedMarket[]> => {
    const totalVolume = rawMarkets.reduce((sum, market) => sum + market.converted_volume.usd, 0);
    
    const enhancedMarkets = await Promise.all(
      rawMarkets.map(async (market) => {
        const pairInfo = await cleanPairName(market.base, market.target, market.market.name);
        
        return {
          ...market,
          exchange_type: getExchangeType(market.market.name),
          spread_percentage: Math.random() * 2, // Mock data - would come from API
          volume_percentage: (market.converted_volume.usd / totalVolume) * 100,
          clean_pair: pairInfo.clean_pair,
          resolved_base: pairInfo.resolved_base,
          resolved_target: pairInfo.resolved_target,
          depth_plus_2: Math.floor(Math.random() * 5000) + 100, // Mock data
          depth_minus_2: Math.floor(Math.random() * 5000) + 100, // Mock data
          last_updated: 'Recently'
        };
      })
    );
    
    return enhancedMarkets;
  }, []);

  // Filtering logic
  const filteredMarkets = useMemo(() => {
    let filtered = markets;
    
    if (activeFilter === 'CEX') {
      filtered = markets.filter(market => market.exchange_type === 'CEX');
    } else if (activeFilter === 'DEX') {
      filtered = markets.filter(market => market.exchange_type === 'DEX');
    } else if (activeFilter === 'Spot') {
      // Most current markets are spot
      filtered = markets;
    }
    // Note: Perpetuals and Futures would need additional API data
    
    return filtered;
  }, [markets, activeFilter]);

  // Sorting logic
  const sortedMarkets = useMemo(() => {
    return [...filteredMarkets].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'exchange':
          aValue = a.market.name.toLowerCase();
          bValue = b.market.name.toLowerCase();
          break;
        case 'volume':
          aValue = a.converted_volume.usd;
          bValue = b.converted_volume.usd;
          break;
        case 'price':
          aValue = a.converted_last.usd;
          bValue = b.converted_last.usd;
          break;
        case 'spread':
          aValue = a.spread_percentage;
          bValue = b.spread_percentage;
          break;
        case 'volume_percentage':
          aValue = a.volume_percentage;
          bValue = b.volume_percentage;
          break;
        case 'trust':
          const trustOrder = { green: 3, yellow: 2, red: 1 };
          aValue = trustOrder[a.trust_score];
          bValue = trustOrder[b.trust_score];
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });
  }, [filteredMarkets, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedMarkets.length / itemsPerPage));
  const paginatedMarkets = sortedMarkets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try calling our internal API route first
      let data = null;
      let useAPIRoute = true;

      try {
        const response = await fetch('/api/markets', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        });

        if (response.ok) {
          data = await response.json();
        } else if (response.status === 404) {
          // API route doesn't exist, fall back to mock data
          useAPIRoute = false;
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        console.log('API route not available, using mock data');
        useAPIRoute = false;
      }

      // If API route doesn't exist, use mock data
      if (!useAPIRoute || !data) {
        console.log('Using mock data for demonstration');
        
        const mockData = {
          tickers: [
            {
              id: '1',
              market: { name: 'Gate.io', identifier: 'gate', has_trading_incentive: false },
              base: 'REACT',
              target: 'USDT',
              last: 0.06912,
              volume: 539184,
              converted_last: { usd: 0.06912 },
              converted_volume: { usd: 539184 },
              trust_score: 'green',
              trade_url: 'https://gate.io',
              token_info_url: null
            },
            {
              id: '2',
              market: { name: 'Uniswap V2 (Ethereum)', identifier: 'uniswap_v2', has_trading_incentive: false },
              base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5', // REACT
              target: '0xa0b86a33e6776840602fb8e4d5ee56a2ae3b7238', // USDC (exact match)
              last: 0.06938,
              volume: 177156,
              converted_last: { usd: 0.06938 },
              converted_volume: { usd: 177156 },
              trust_score: 'green',
              trade_url: 'https://app.uniswap.org',
              token_info_url: null
            },
            {
              id: '3',
              market: { name: 'KuCoin', identifier: 'kucoin', has_trading_incentive: false },
              base: 'REACT',
              target: 'USDT',
              last: 0.06933,
              volume: 121714,
              converted_last: { usd: 0.06933 },
              converted_volume: { usd: 121714 },
              trust_score: 'green',
              trade_url: 'https://kucoin.com',
              token_info_url: null
            },
            {
              id: '4',
              market: { name: 'Uniswap V4 (Ethereum)', identifier: 'uniswap_v4', has_trading_incentive: false },
              base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5',
              target: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              last: 0.06945,
              volume: 98765,
              converted_last: { usd: 0.06945 },
              converted_volume: { usd: 98765 },
              trust_score: 'green',
              trade_url: 'https://app.uniswap.org',
              token_info_url: null
            },
            {
              id: '5',
              market: { name: 'Crypto.com Exchange', identifier: 'crypto_com', has_trading_incentive: false },
              base: 'REACT',
              target: 'USD',
              last: 0.07043,
              volume: 112797,
              converted_last: { usd: 0.07043 },
              converted_volume: { usd: 112797 },
              trust_score: 'yellow',
              trade_url: 'https://crypto.com',
              token_info_url: null
            },
            {
              id: '6',
              market: { name: 'Coinmetro', identifier: 'coinmetro', has_trading_incentive: false },
              base: 'REACT',
              target: 'USDT',
              last: 0.07054,
              volume: 1204,
              converted_last: { usd: 0.07054 },
              converted_volume: { usd: 1204 },
              trust_score: 'yellow',
              trade_url: 'https://coinmetro.com',
              token_info_url: null
            },
            {
              id: '7',
              market: { name: 'Uniswap V4 (Ethereum)', identifier: 'uniswap_v4_2', has_trading_incentive: false },
              base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5',
              target: '0x0000000000000000000000000000000000000000', // ETH
              last: 0.0718,
              volume: 17326,
              converted_last: { usd: 0.0718 },
              converted_volume: { usd: 17326 },
              trust_score: 'red',
              trade_url: 'https://app.uniswap.org',
              token_info_url: null
            },
            {
              id: '8',
              market: { name: 'BingX', identifier: 'bingx', has_trading_incentive: false },
              base: 'REACT',
              target: 'USDT',
              last: 0.07975,
              volume: 295,
              converted_last: { usd: 0.07975 },
              converted_volume: { usd: 295 },
              trust_score: 'red',
              trade_url: 'https://bingx.com',
              token_info_url: null
            },
            {
              id: '9',
              market: { name: 'Uniswap V3 (Ethereum)', identifier: 'uniswap_v3', has_trading_incentive: false },
              base: '0x817162975186d4d53dbf5a7377dd45376e2d2fc5', // REACT
              target: '0xa0b86a33e6776840602fb8e4d5ee56a2ae3b7238eb48', // USDC variant to test resolution
              last: 0.06855,
              volume: 45320,
              converted_last: { usd: 0.06855 },
              converted_volume: { usd: 45320 },
              trust_score: 'green',
              trade_url: 'https://app.uniswap.org',
              token_info_url: null
            }
          ]
        };

        data = mockData;
        toast.success("Using demo data - Create API route for live data");
      } else if (data._mock) {
        toast.success(data._message || "Using demo data from API route");
      }
      
      if (!data.tickers || !Array.isArray(data.tickers)) {
        throw new Error("Invalid data structure received");
      }
      
      const enhancedMarkets = await enhanceMarketData(data.tickers);
      setMarkets(enhancedMarkets);
      setLastUpdated(new Date());
      
      if (enhancedMarkets.length === 0) {
        setError("No active trading pairs found for Reactive Network.");
      }
      
    } catch (err: any) {
      console.error("Failed to fetch market data:", err);
      setError(`Could not load market data: ${err.message || 'Network error'}`);
      toast.error("Failed to load market data");
    } finally {
      setIsLoading(false);
    }
  }, [enhanceMarketData]);

  useEffect(() => {
    // Clear token cache on page load for fresh resolution
    tokenNameCache.clear();
    
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const handleRefresh = () => {
    toast.promise(fetchMarketData(), {
      loading: 'Refreshing market data...',
      success: 'Market data updated!',
      error: 'Failed to refresh data'
    });
  };

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="relative z-20 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reactive Network Markets</h1>
          <p className="text-zinc-400 text-sm">Affiliate disclosures</p>
        </div>

        {/* Main Card */}
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-800 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={activeFilter === filter 
                      ? "bg-zinc-700 text-white hover:bg-zinc-600" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }
                    disabled={filter === 'Perpetuals' || filter === 'Futures'}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
              
              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-64"
                >
                  <Loader2 className="h-8 w-8 animate-spin mr-3 text-blue-400" />
                  <span className="text-zinc-300">Loading Market Data...</span>
                </motion.div>
              )}
              
              {error && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              {!isLoading && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-hidden">
                    <div className="overflow-x-auto">
                      {/* Table Header */}
                      <div className="grid grid-cols-[60px_200px_80px_140px_100px_80px_90px_90px_110px_80px_100px_100px] gap-3 px-6 py-4 border-b border-zinc-800 text-xs font-medium text-zinc-400 bg-zinc-900/30 min-w-[1200px]">
                        <div className="text-center">#</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('exchange')}
                          className="justify-start p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200 truncate"
                        >
                          Exchange <ArrowUpDown className="h-3 w-3 ml-1 flex-shrink-0" />
                        </Button>
                        <div className="text-center">Type</div>
                        <div className="text-left">Pair</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('price')}
                          className="justify-end p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Price <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('spread')}
                          className="justify-end p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Spread <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                        <div className="text-right">+2% Depth</div>
                        <div className="text-right">-2% Depth</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('volume')}
                          className="justify-end p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          24h Volume <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('volume_percentage')}
                          className="justify-end p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Volume % <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                        <div className="text-right">Last Updated</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('trust')}
                          className="justify-end p-0 h-auto text-xs font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Trust Score <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                      
                      {/* Table Body */}
                      <div className="min-w-[1200px]">
                        {paginatedMarkets.map((market, index) => (
                          <motion.div
                            key={`${market.market.identifier}-${market.target}-${index}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
                            className={`grid grid-cols-[60px_200px_80px_140px_100px_80px_90px_90px_110px_80px_100px_100px] gap-3 px-6 py-4 items-center text-sm border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-zinc-900/20' : 'bg-transparent'
                            }`}
                          >
                            {/* Index */}
                            <div className="text-zinc-500 font-mono text-sm text-center">
                              {((currentPage - 1) * itemsPerPage) + index + 1}
                            </div>
                            
                            {/* Exchange */}
                            <div className="text-zinc-200 font-medium truncate pr-2" title={market.market.name}>
                              {market.market.name}
                            </div>
                            
                            {/* Type */}
                            <div className="flex justify-center">
                              <ExchangeTypeBadge type={market.exchange_type} />
                            </div>
                            
                            {/* Pair */}
                            <div className="min-w-0 pr-2">
                              <a 
                                href={market.trade_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                title={`${market.resolved_base}/${market.resolved_target}`}
                              >
                                <span className="truncate max-w-[120px]">{market.clean_pair}</span>
                                <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                              </a>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right font-mono text-zinc-200 text-sm truncate">
                              ${market.converted_last.usd.toLocaleString('en-US', { 
                                minimumFractionDigits: 4, 
                                maximumFractionDigits: 6 
                              })}
                            </div>
                            
                            {/* Spread */}
                            <div className="text-right font-mono text-zinc-300 text-sm">
                              {market.spread_percentage.toFixed(2)}%
                            </div>
                            
                            {/* +2% Depth */}
                            <div className="text-right font-mono text-zinc-300 text-sm">
                              ${(market.depth_plus_2 / 1000).toFixed(1)}k
                            </div>
                            
                            {/* -2% Depth */}
                            <div className="text-right font-mono text-zinc-300 text-sm">
                              ${(market.depth_minus_2 / 1000).toFixed(1)}k
                            </div>
                            
                            {/* 24h Volume */}
                            <div className="text-right font-mono text-zinc-200 text-sm">
                              ${(market.converted_volume.usd / 1000).toFixed(0)}k
                            </div>
                            
                            {/* Volume % */}
                            <div className="text-right font-mono text-zinc-300 text-sm">
                              {market.volume_percentage.toFixed(1)}%
                            </div>
                            
                            {/* Last Updated */}
                            <div className="text-right text-zinc-400 text-xs truncate">
                              {market.last_updated}
                            </div>
                            
                            {/* Trust Score */}
                            <div className="flex justify-end">
                              <TrustScoreIndicator score={market.trust_score} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden p-4 space-y-4">
                    {paginatedMarkets.map((market, index) => (
                      <Card key={`${market.market.identifier}-${market.target}-${index}`} className="bg-zinc-800/50 border-zinc-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-zinc-100 truncate">{market.market.name}</h3>
                                <ExchangeTypeBadge type={market.exchange_type} />
                              </div>
                              <a 
                                href={market.trade_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center text-blue-400 hover:text-blue-300 text-sm"
                                title={`${market.resolved_base}/${market.resolved_target}`}
                              >
                                <span className="truncate">{market.clean_pair}</span>
                                <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                              </a>
                            </div>
                            <TrustScoreIndicator score={market.trust_score} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-zinc-400">Price</span>
                              <p className="font-mono text-zinc-100 mt-1">
                                ${market.converted_last.usd.toLocaleString('en-US', { 
                                  minimumFractionDigits: 4, 
                                  maximumFractionDigits: 6 
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-400">24h Volume</span>
                              <p className="font-mono text-zinc-100 mt-1">
                                ${(market.converted_volume.usd / 1000).toFixed(0)}k
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-400">Spread</span>
                              <p className="font-mono text-zinc-100 mt-1">
                                {market.spread_percentage.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-zinc-400">Volume %</span>
                              <p className="font-mono text-zinc-100 mt-1">
                                {market.volume_percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}