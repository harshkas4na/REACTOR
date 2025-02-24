'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, AlertCircle, Shield, Clock, Zap, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';
import PairFinder from '@/components/pair-finder'; // Import the PairFinder component

// Import all contract artifacts
import { stopOrderByteCodeSepolia } from '@/data/automations/uniswap-stop-order/stopOrderByteCode';
import stopOrderABISepolia from '@/data/automations/uniswap-stop-order/stopOrderABISeploia.json';
import { rscByteCodeSepolia } from '@/data/automations/uniswap-stop-order/RSCByteCode';
import rscABISepolia from '@/data/automations/uniswap-stop-order/RSCABISepolia.json';

import { stopOrderByteCodeMainnet } from '@/data/automations/uniswap-stop-order/stopOrderByteCode';
import stopOrderABIMainnet from '@/data/automations/uniswap-stop-order/stopOrderABIMainnet.json';
import { rscByteCodeMainnet } from '@/data/automations/uniswap-stop-order/RSCByteCode';
import rscABIMainnet from '@/data/automations/uniswap-stop-order/RSCABIMainnet.json';

import { stopOrderByteCodeAvalancheCChain } from '@/data/automations/uniswap-stop-order/stopOrderByteCode';
import stopOrderABIAvalancheCChain from '@/data/automations/uniswap-stop-order/stopOrderABIAvalancheCChain.json';
import { rscByteCodeAvalancheCChain } from '@/data/automations/uniswap-stop-order/RSCByteCode';
import rscABIAvalancheCChain from '@/data/automations/uniswap-stop-order/RSCABIAvalancheCChain.json';

// Define types for form data and pair info
interface StopOrderFormData {
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
}

interface PairInfo {
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  reserve0?: string;
  reserve1?: string;
}

interface ChainConfig {
  id: string;
  name: string;
  dexName: string; // Added DEX name to display in UI
  routerAddress: string;
  factoryAddress: string;
  stopOrderABI: any;
  stopOrderBytecode: any;
  rscABI: any;
  rscBytecode: any;
  rpcUrl?: string;
}

// Configuration constants
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xb26b2de65d07ebb5e54c7f6282424d3be670e1f0',
    factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
    stopOrderABI: stopOrderABISepolia,
    stopOrderBytecode: stopOrderByteCodeSepolia,
    rscABI: rscABISepolia,
    rscBytecode: rscByteCodeSepolia,
    rpcUrl: 'https://rpc.sepolia.org'
  },
  {
    id: '1',
    name: 'Ethereum Mainnet',
    dexName: 'Uniswap V2',
    routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    stopOrderABI: stopOrderABIMainnet,
    stopOrderBytecode: stopOrderByteCodeMainnet,
    rscABI: rscABIMainnet,
    rscBytecode: rscByteCodeMainnet,
    rpcUrl: 'https://ethereum.publicnode.com'
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain',
    dexName: 'Pangolin',
    routerAddress: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
    factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
    stopOrderABI: stopOrderABIAvalancheCChain,
    stopOrderBytecode: stopOrderByteCodeAvalancheCChain,
    rscABI: rscABIAvalancheCChain,
    rscBytecode: rscByteCodeAvalancheCChain,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc'
  }
];

type DeploymentStep = 'idle' | 'deploying-destination' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'approving' | 'complete';

export default function UniswapStopOrderPage() {
  const [formData, setFormData] = useState<StopOrderFormData>({
    chainId: '',
    pairAddress: '',
    sellToken0: true,
    clientAddress: '',
    coefficient: '1000',
    threshold: '',
    amount: ''
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState<boolean>(false);
  
  // Find the currently selected chain configuration
  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
  // Set default DEX name to display if no chain is selected
  const dexName = selectedChain?.dexName || 'Uniswap V2';

  useEffect(() => {
    const getConnectedAccount = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
            setFormData(prev => ({
              ...prev,
              clientAddress: account
            }));
          }
        } catch (error) {
          console.error('Error getting connected account:', error);
        }
      }
    };

    getConnectedAccount();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setConnectedAccount(accounts[0]);
          setFormData(prev => ({
            ...prev,
            clientAddress: accounts[0]
          }));
        } else {
          setConnectedAccount('');
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Handle pair selection from the PairFinder component
  const handlePairSelected = (pairAddress: string, chainId: string) => {
    setFormData(prev => ({
      ...prev,
      pairAddress,
      chainId
    }));
    
    // Fetch pair info for the selected pair
    handleFetchPairInfo(pairAddress);
    
    // Show success message
    toast.success('Pair selected! Scroll down to continue configuring your stop order.');
  };

  const handleFetchPairInfo = async (pairAddress: string) => {
    setIsLoadingPair(true);
    setFetchError('');
    
    try {
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address format');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();

      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }

      const code = await provider.getCode(pairAddress);
      if (code === '0x' || code === '0x0') {
        throw new Error('No contract found at this address');
      }

      // The interface is the same for both Uniswap V2 and Pangolin pairs
      const pairInterface = new ethers.Interface([
        'function token0() view returns (address)',
        'function token1() view returns (address)',
        'function getReserves() view returns (uint112, uint112, uint32)'
      ]);

      const pairContract = new ethers.Contract(pairAddress, pairInterface, provider);
      const [token0, token1, reserves] = await Promise.all([
        pairContract.token0(),
        pairContract.token1(),
        pairContract.getReserves()
      ]);

      const erc20Interface = new ethers.Interface([
        'function symbol() view returns (string)'
      ]);

      let token0Symbol = 'Unknown', token1Symbol = 'Unknown';

      try {
        const token0Contract = new ethers.Contract(token0, erc20Interface, provider);
        token0Symbol = await token0Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token0 symbol:", error);
      }

      try {
        const token1Contract = new ethers.Contract(token1, erc20Interface, provider);
        token1Symbol = await token1Contract.symbol();
      } catch (error) {
        console.warn("Could not fetch token1 symbol:", error);
      }

      setPairInfo({
        token0,
        token1,
        token0Symbol,
        token1Symbol,
        reserve0: ethers.formatUnits(reserves[0], 18),
        reserve1: ethers.formatUnits(reserves[1], 18)
      });

    } catch (error: any) {
      console.error('Error fetching pair info:', error);
      setFetchError(error.message);
      setPairInfo(null);
    } finally {
      setIsLoadingPair(false);
    }
  };

  const switchNetwork = async (chainId: string) => {
    if (!window.ethereum) throw new Error('MetaMask is not installed');

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
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

  async function switchToKopliNetwork() {
    if (!window.ethereum) throw new Error('MetaMask is not installed');

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x512578' }], // Kopli chainId: 5318008
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x512578',
            chainName: 'Kopli',
            nativeCurrency: {
              name: 'KOPLI',
              symbol: 'KOPLI',
              decimals: 18
            },
            rpcUrls: ['https://kopli-rpc.rnk.dev'],
            blockExplorerUrls: ['https://kopli.reactscan.net']
          }],
        });
        return true;
      }
      throw error;
    }
  }

  async function deployDestinationContract(chain: ChainConfig) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const factory = new ethers.ContractFactory(
      chain.stopOrderABI,
      chain.stopOrderBytecode,
      signer
    );

    const contract = await factory.deploy(
      chain.routerAddress,
      { value: ethers.parseEther("0.1") }
    );
    
    await contract.waitForDeployment();
    return contract.target.toString();
  }

  async function approveTokens(tokenAddress: string, spenderAddress: string, amount: string) {
    try {
      if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(spenderAddress)) {
        throw new Error('Invalid address');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      const decimals = await tokenContract.decimals();
      const parsedAmount = ethers.parseUnits(amount, decimals);
      
      const signerAddress = await signer.getAddress();
      const currentAllowance = await tokenContract.allowance(signerAddress, spenderAddress);
      
      if (currentAllowance.toString() !== "0" && currentAllowance < parsedAmount) {
        const resetTx = await tokenContract.approve(spenderAddress, 0);
        await resetTx.wait();
      }

      const tx = await tokenContract.approve(spenderAddress, parsedAmount);
      await tx.wait();
    } catch (error: any) {
      console.error('Error in approveTokens:', error);
      throw new Error(`Token approval failed: ${error.message || 'Unknown error'}`);
    }
  }

  interface RSCParams {
    pair: string;
    stopOrder: string;
    client: string;
    token0: boolean;
    coefficient: string;
    threshold: string;
  }

  async function deployRSC(params: RSCParams, chain: ChainConfig) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const currentNetwork = await provider.getNetwork();
      const chainId = Number(currentNetwork.chainId);
      
      if (chainId !== 5318008) {
        throw new Error('Please switch to Kopli network for RSC deployment');
      }

      const factory = new ethers.ContractFactory(
        chain.rscABI,
        chain.rscBytecode,
        signer
      );

      const deploymentGas = await factory.getDeployTransaction(
        params.pair,
        params.stopOrder,
        params.client,
        params.token0,
        params.coefficient,
        params.threshold
      ).then(tx => provider.estimateGas(tx));

      const gasLimit = (deploymentGas * BigInt(120)) / BigInt(100);
      const gasPrice = await provider.getFeeData().then(fees => fees.gasPrice);
      
      if (!gasPrice) throw new Error('Failed to get gas price');

      const signerAddress = await signer.getAddress();
      const balance = await provider.getBalance(signerAddress);
      const requiredBalance = gasLimit * gasPrice;

      if (balance < requiredBalance) {
        throw new Error('Insufficient balance for RSC deployment');
      }

      const contract = await factory.deploy(
        params.pair,
        params.stopOrder,
        params.client,
        params.token0,
        params.coefficient,
        params.threshold,
        {
          gasLimit,
          gasPrice
        }
      );

      const deployedContract = await contract.waitForDeployment();
      return deployedContract.target.toString();

    } catch (error: any) {
      console.error('Error deploying RSC:', error);
      throw new Error(`RSC deployment failed: ${error.message || 'Unknown error'}`);
    }
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get selected chain configuration
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) throw new Error('Invalid chain selected');

      // Step 1: Deploy Destination Contract
      setDeploymentStep('deploying-destination');
      const destinationAddress = await deployDestinationContract(selectedChain);

      // Step 2: Approve Token Spending
      setDeploymentStep('approving');
      const tokenToApprove = formData.sellToken0 ? pairInfo?.token0 : pairInfo?.token1;
      if (!tokenToApprove) throw new Error('Token address not found');
      
      await approveTokens(
        tokenToApprove,
        destinationAddress,
        formData.amount
      );

      // Step 3: Switch to Kopli network
      setDeploymentStep('switching-network');
      await switchToKopliNetwork();

      // Step 4: Deploy RSC
      setDeploymentStep('deploying-rsc');
      await deployRSC({
        pair: formData.pairAddress,
        stopOrder: destinationAddress,
        client: formData.clientAddress,
        token0: formData.sellToken0,
        coefficient: formData.coefficient,
        threshold: formData.threshold
      }, selectedChain);

      setDeploymentStep('complete');
      toast.success('Stop order created successfully!');
    } catch (error: any) {
      console.error('Error creating stop order:', error);
      toast.error(error.message || 'Failed to create stop order');
      setDeploymentStep('idle');
    }
  };

  // Get current price ratio if pair info is available
  const currentPriceRatio = pairInfo && pairInfo.reserve0 && pairInfo.reserve1 
    ? formData.sellToken0 
      ? (parseFloat(pairInfo.reserve1) / parseFloat(pairInfo.reserve0)).toFixed(8) 
      : (parseFloat(pairInfo.reserve0) / parseFloat(pairInfo.reserve1)).toFixed(8)
    : 'Not available';

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Multi-Chain Stop Order
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Set up automatic sell orders across Ethereum Mainnet, Sepolia testnet, and Avalanche C-Chain - protecting your positions across multiple networks.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Cross-Chain Protection</h3>
                    <p className="text-sm text-zinc-300">Monitor multiple networks</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">24/7 Monitoring</h3>
                    <p className="text-sm text-gray-200">Automatic execution</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Network Flexibility</h3>
                    <p className="text-sm text-gray-200">Choose your preferred chain</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pair Finder Tool */}
        <PairFinder 
          chains={SUPPORTED_CHAINS} 
          onPairSelect={handlePairSelected} 
        />

        {/* Main Form Card */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Create Stop Order</CardTitle>
            <CardDescription className="text-zinc-300">Configure your automated token swap</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleCreateOrder}>
              {/* Chain Selection */}
              <div className="space-y-2">
                <div className="flex items-center mt-4 space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <p className="text-sm text-zinc-200">
                        Choose the blockchain network where your tokens are located.
                        Available networks: Ethereum Mainnet, Sepolia testnet, and Avalanche C-Chain.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, chainId: value });
                    const chain = SUPPORTED_CHAINS.find(c => c.id === value);
                    if (chain) switchNetwork(chain.id);
                  }}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(chain => (
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

               {/* Pair Address - Dynamic label based on selected chain */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">{dexName} Pair Address</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">
                        Enter the {dexName} pair contract address where you want to create the stop order.
                        This is the pool containing both tokens you want to trade.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <Input 
                placeholder="Enter pair address (0x...)"
                value={formData.pairAddress}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              
                onChange={(e) => setFormData({...formData, pairAddress: e.target.value})}
                onBlur={(e) => {
                    if (ethers.isAddress(e.target.value)) {
                    handleFetchPairInfo(e.target.value);
                    }
                }}
              />
            </div>

            {isLoadingPair && (
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-zinc-200">Fetching pair information...</span>
                </div>
            </div>
            )}

            {fetchError && (
            <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                {fetchError}
                </AlertDescription>
            </Alert>
            )}
            
            {pairInfo && (
            <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-6">
                <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Token 0</p>
                    <p className="text-xs text-zinc-400 break-all">{pairInfo.token0}</p>
                    <p className="text-sm text-blue-400">{pairInfo.token0Symbol}</p>
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">Token 1</p>
                    <p className="text-xs text-zinc-400 break-all">{pairInfo.token1}</p>
                    <p className="text-sm text-blue-400">{pairInfo.token1Symbol}</p>
                </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-zinc-300">
                <p className="text-sm truncate">
                    <span className="font-medium">Reserve 0:</span> {pairInfo.reserve0}
                </p>
                <p className="text-sm truncate">
                    <span className="font-medium">Reserve 1:</span> {pairInfo.reserve1}
                </p>
                </div>
            </div>
            )}

              {/* Token Pair Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-zinc-200">Token Pair</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-zinc-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-zinc-200">
                    <p className="text-sm">
                      Enter the addresses of both tokens in the trading pair.
                      The order doesn't matter - you'll select which one to sell next.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            
              <Input
                placeholder="Token 0 Address"
                disabled
                value={pairInfo?.token0 || ''}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
              <Input 
                placeholder="Token 1 Address"
                disabled
                value={pairInfo?.token1 || ''}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
              
              {/* Sell Direction - Improved Styling */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-200">Select Token to Sell</label>
                <Select
                  value={formData.sellToken0 ? "token0" : "token1"}
                  onValueChange={(value) => setFormData({...formData, sellToken0: value === "token0"})}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select token to sell" />
                  </SelectTrigger>
                  {/* Fixed content styling to improve visibility */}
                  <SelectContent 
                    className="bg-zinc-900 border border-zinc-700" 
                    position="popper"
                    sideOffset={4}
                  >
                    <SelectItem 
                      value="token0" 
                      className="text-zinc-200 focus:bg-blue-800/30 hover:bg-blue-800/30 cursor-pointer"
                    >
                      {pairInfo?.token0Symbol || 'Token 0'}
                    </SelectItem>
                    <SelectItem 
                      value="token1" 
                      className="text-zinc-200 focus:bg-blue-800/30 hover:bg-blue-800/30 cursor-pointer"
                    >
                      {pairInfo?.token1Symbol || 'Token 1'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Address */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-zinc-200">Client Address</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-zinc-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 text-zinc-200">
                    <p className="text-sm">
                      The address that has approved token spending and will receive 
                      the swapped tokens. Make sure this address has approved the contract
                      to spend the tokens you want to sell.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </div>
              <Input 
                placeholder="Enter client address"
                value={formData.clientAddress}
                onChange={(e) => setFormData({...formData, clientAddress: e.target.value})}
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>

            {/* Threshold Configuration */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Price Threshold Settings</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <div className="space-y-2">
                        <h4 className="font-medium">Understanding Threshold Settings</h4>
                        <p className="text-sm text-gray-200">
                          Coefficient and threshold work together to determine when your order triggers.
                          For example, to sell when price drops to 0.95 of current price:
                          - Set coefficient to 1000
                          - Set threshold to 950
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Input 
                  type="number"
                  placeholder="Coefficient (e.g., 1000)"
                  value={formData.coefficient}
                  onChange={(e) => setFormData({...formData, coefficient: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                <Input 
                  type="number"
                  placeholder="Threshold"
                  value={formData.threshold}
                  onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                <p className="text-sm text-gray-400">
                  Current Price Ratio: {currentPriceRatio}
                </p>
              </div>

              {/* Amount to Sell */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Amount to Sell</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <p className="text-sm text-gray-200">
                        The amount of tokens you want to sell when the price threshold 
                        is reached. Make sure to approve at least this amount.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Input 
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
              
              {deploymentStep !== 'idle' && (
                <Alert className="bg-blue-900/20 border-blue-500/50">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-zinc-200">
                    {deploymentStep === 'deploying-destination' && 'Deploying destination contract...'}
                    {deploymentStep === 'switching-network' && 'Switching to Kopli network...'}
                    {deploymentStep === 'deploying-rsc' && 'Deploying reactive smart contract...'}
                    {deploymentStep === 'approving' && 'Approving token spending...'}
                    {deploymentStep === 'complete' && 'Stop order created successfully!'}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                disabled={deploymentStep !== 'idle'}
              >
                Create Stop Order
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Educational Section - Adjust terminology based on selected network */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Understanding Stop Orders</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn how stop orders work and how to use them effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Accordion items with updated styling */}
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is a Stop Order?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      A stop order is like an automated guardian for your tokens. It watches the price 24/7 and automatically sells your tokens when they drop to your specified price level, helping protect you from further losses.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Example:</h4>
                      <p className="text-sm text-zinc-300">
                        If you own tokens worth $100 each and want to protect against significant losses, you might set a stop order at $90. If the price falls to $90, your tokens will automatically sell, limiting your loss to 10%.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-it-works" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  How Does It Work?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      Our system uses Reactive Smart Contracts (RSCs) to monitor {dexName} pool prices in real-time. When your price threshold is reached, the contract automatically executes the trade.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Price Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          Continuously watches token pair prices through {dexName} pool reserves
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Automatic Execution</h4>
                        <p className="text-sm text-zinc-300">
                          Trades execute instantly when conditions are met, no manual intervention needed
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="threshold" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Setting the Right Threshold
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      The threshold determines when your order triggers. It works with the coefficient to provide precise price control.
                    </p>
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">How to Calculate:</h4>
                      <p className="text-sm text-zinc-300">
                        1. Choose your target price ratio (e.g., 0.95 for 5% drop)
                      </p>
                      <p className="text-sm text-zinc-300">
                        2. Multiply by coefficient (e.g., 0.95 × 1000 = 950)
                      </p>
                      <p className="text-sm text-zinc-300">
                        3. Use 1000 as coefficient and 950 as threshold
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="best-practices" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Best Practices
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Consider Market Volatility</h4>
                        <p className="text-sm text-zinc-300">
                          Set your threshold with enough buffer to avoid premature triggers during normal market fluctuations
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Check Pool Liquidity</h4>
                        <p className="text-sm text-zinc-300">
                          Ensure the token pair has sufficient liquidity to handle your order size
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Test With Small Amounts</h4>
                        <p className="text-sm text-zinc-300">
                          Start with a small order to familiarize yourself with the system
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Monitor Your Orders</h4>
                        <p className="text-sm text-zinc-300">
                          Regularly review your active orders and adjust as market conditions change
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="important-notes" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Important Notes
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">Key Points to Remember:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
                        <li>Ensure sufficient token approval for the contract</li>
                        <li>Orders execute based on {dexName} pool prices</li>
                        <li>Orders can't be modified once created (cancel and create new instead)</li>
                        <li>Market conditions may affect execution price</li>
                      </ul>
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

