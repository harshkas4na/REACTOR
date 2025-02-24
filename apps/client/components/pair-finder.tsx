// PairFinder component to be added to the main page
// This can be placed before the main form card

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

// Define the chain interface that matches what the parent component provides
interface Chain {
  id: string;
  name: string;
  dexName: string;
  factoryAddress: string;
  rpcUrl?: string;
  routerAddress: string;
  stopOrderABI: any;
  stopOrderBytecode: any;
  rscABI: any;
  rscBytecode: any;
}

interface PairInfo {
  address: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0?: string;
  reserve1?: string;
}

// Define the props interface for the component
interface PairFinderProps {
  chains: Chain[];
  onPairSelect: (pairAddress: string, chainId: string) => void;
}

function PairFinder({ chains, onPairSelect }: PairFinderProps) {
  const [chainId, setChainId] = useState<string>('');
  const [token0Address, setToken0Address] = useState<string>('');
  const [token1Address, setToken1Address] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundPairs, setFoundPairs] = useState<PairInfo[]>([]);
  
  const selectedChain = chains.find(chain => chain.id === chainId);
  const dexName = selectedChain?.dexName || 'Uniswap V2';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chainId) {
      setSearchError('Please select a chain first');
      return;
    }
    
    if (!ethers.isAddress(token0Address) || !ethers.isAddress(token1Address)) {
      setSearchError('Please enter valid token addresses');
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    setFoundPairs([]);
    
    try {
      // Switch to the selected network
      await switchToNetwork(chainId);
      
      const chain = chains.find(c => c.id === chainId);
      if (!chain) throw new Error('Chain not found');
      
      // Create a provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get factory contract
      const factoryInterface = new ethers.Interface([
        'function getPair(address tokenA, address tokenB) view returns (address pair)'
      ]);
      
      const factoryContract = new ethers.Contract(
        chain.factoryAddress,
        factoryInterface,
        provider
      );
      
      // Query pair address
      const pairAddress = await factoryContract.getPair(token0Address, token1Address);
      
      if (pairAddress === ethers.ZeroAddress) {
        setSearchError('No pair found for these tokens');
        setIsSearching(false);
        return;
      }
      
      // Get pair details
      const pairInfo = await getPairDetails(pairAddress, provider);
      setFoundPairs([pairInfo]);
      
    } catch (error: any) {
      console.error('Error finding pairs:', error);
      setSearchError(error.message || 'Error finding pairs');
    } finally {
      setIsSearching(false);
    }
  };
  
  const getPairDetails = async (pairAddress: string, provider: ethers.BrowserProvider): Promise<PairInfo> => {
    const pairInterface = new ethers.Interface([
      'function token0() view returns (address)',
      'function token1() view returns (address)',
      'function getReserves() view returns (uint112, uint112, uint32)'
    ]);
    
    const erc20Interface = new ethers.Interface([
      'function symbol() view returns (string)',
      'function name() view returns (string)',
      'function decimals() view returns (uint8)'
    ]);
    
    const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
    
    const [token0, token1, reserves] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      pairContract.getReserves()
    ]);
    
    let token0Symbol = 'Unknown', token1Symbol = 'Unknown';
    
    try {
      const token0Contract = new ethers.Contract(token0, erc20Interface, provider);
      token0Symbol = await token0Contract.symbol();
    } catch (error) {
      try {
        const token0Contract = new ethers.Contract(token0, erc20Interface, provider);
        token0Symbol = await token0Contract.name();
      } catch (error) {
        console.warn("Could not fetch token0 symbol or name:", error);
      }
    }
    
    try {
      const token1Contract = new ethers.Contract(token1, erc20Interface, provider);
      token1Symbol = await token1Contract.symbol();
    } catch (error) {
      try {
        const token1Contract = new ethers.Contract(token1, erc20Interface, provider);
        token1Symbol = await token1Contract.name();
      } catch (error) {
        console.warn("Could not fetch token1 symbol or name:", error);
      }
    }
    
    return {
      address: pairAddress,
      token0,
      token1,
      token0Symbol,
      token1Symbol,
      reserve0: ethers.formatUnits(reserves[0], 18),
      reserve1: ethers.formatUnits(reserves[1], 18)
    };
  };
  
  const switchToNetwork = async (chainId: string) => {
    if (!window.ethereum) throw new Error('MetaMask is not installed');
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        const chain = chains.find(c => c.id === chainId);
        if (!chain) throw new Error('Chain not supported');
        
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${parseInt(chainId).toString(16)}`,
            chainName: chain.name,
            nativeCurrency: {
              name: chain.id === '43114' ? 'AVAX' : 'ETH',
              symbol: chain.id === '43114' ? 'AVAX' : 'ETH',
              decimals: 18
            },
            rpcUrls: [chain.rpcUrl || '']
          }],
        });
        return true;
      }
      throw error;
    }
  };
  
  const handlePairSelect = (pair: PairInfo) => {
    onPairSelect(pair.address, chainId);
  };

  return (
    <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-6">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-zinc-100">Find Pair</CardTitle>
        <CardDescription className="text-zinc-300">
          Discover available {selectedChain ? selectedChain.dexName : 'DEX'} pairs for your tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200">Select Chain</label>
            <Select
              value={chainId}
              onValueChange={setChainId}
            >
              <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="Select chain" />
              </SelectTrigger>
              <SelectContent>
                {chains.map(chain => (
                  <SelectItem 
                    key={chain.id} 
                    value={chain.id}
                    className="text-zinc-200 hover:bg-blue-600/20 focus:bg-blue-600/20"
                  >
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Token 1 Address</label>
              <Input
                placeholder="0x..."
                value={token0Address}
                onChange={(e) => setToken0Address(e.target.value)}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Token 2 Address</label>
              <Input
                placeholder="0x..."
                value={token1Address}
                onChange={(e) => setToken1Address(e.target.value)}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            disabled={isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Pair
              </>
            )}
          </Button>
        </form>
        
        {searchError && (
          <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">
              {searchError}
            </AlertDescription>
          </Alert>
        )}
        
        {foundPairs.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-zinc-100">Found Pairs</h3>
            {foundPairs.map((pair, index) => (
              <Card key={index} className="bg-blue-900/20 border-blue-500/20">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Pair Address</p>
                        <p className="text-xs text-zinc-400 break-all">{pair.address}</p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handlePairSelect(pair)}
                      >
                        Use This Pair
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{pair.token0Symbol}</p>
                        <p className="text-xs text-zinc-400 break-all">{pair.token0}</p>
                        <p className="text-sm text-blue-400 mt-1">Reserve: {pair.reserve0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{pair.token1Symbol}</p>
                        <p className="text-xs text-zinc-400 break-all">{pair.token1}</p>
                        <p className="text-sm text-blue-400 mt-1">Reserve: {pair.reserve1}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PairFinder;