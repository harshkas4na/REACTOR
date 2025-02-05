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
import { stopOrderByteCode } from '@/data/automations/uniswap-stop-order/stopOrderByteCode';
import  stopOrderABI  from '@/data/automations/uniswap-stop-order/stopOrderABI.json';
import { rscByteCode } from '@/data/automations/uniswap-stop-order/RSCByteCode';
import  rscABI  from '@/data/automations/uniswap-stop-order/RSCABI.json';
import { toast } from 'react-hot-toast';

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

// Configuration constants
const SUPPORTED_CHAINS = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia', 
    routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    factoryAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
  }
];

export default function UniswapStopOrderPage() {

  const [formData, setFormData] = useState<StopOrderFormData>({
    chainId: '',
    pairAddress: '',
    sellToken0: true,
      clientAddress: '',  // This will be updated when we get the connected account
    coefficient: '1000',
    threshold: '',
    amount: ''
  });


    const [fetchError, setFetchError] = useState<string | null>(null);
    const [connectedAccount, setConnectedAccount] = useState<string>('');

    const [deploymentStep, setDeploymentStep] = useState<'idle' | 'deploying-destination' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'approving' | 'complete'>('idle');
  const [pairInfo, setPairInfo] = useState<PairInfo | null>(null);
  const [isLoadingPair, setIsLoadingPair] = useState(false);


    // Add effect to get connected account
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

    // Listen for account changes
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

const handleFetchPairInfo = async (pairAddress: string) => {
    setIsLoadingPair(true);
    setFetchError('');
    
    try {
      // First validate the address format
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address format');
      }
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();

      // Check if the current chain matches the selected chain
      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('You are currently connected to a different network than selected. Please switch networks or select the correct chain.');
      }
  
      // First check if there's any code at the address
      const code = await provider.getCode(pairAddress);
      
      if (code === '0x' || code === '0x0') {
        throw new Error('No contract found at this address');
      }
  
      // Define the interface for the pair contract
      const pairInterface = new ethers.Interface([
          'function token0() view returns (address)',
          'function token1() view returns (address)',
          'function getReserves() view returns (uint112, uint112, uint32)'
      ]);
  
      const pairContract = new ethers.Contract(
        pairAddress,
        pairInterface,
        provider
      );

      // Wrap each call in try-catch to handle specific failures
      let token0, token1, reserves;
      try {
        token0 = await pairContract.token0();
        token1 = await pairContract.token1();
      } catch (error) {
        console.error("Error fetching tokens:", error);
        throw new Error('Failed to fetch token addresses - this might not be a valid Uniswap V2 pair');
      }
  
      try {
        reserves = await pairContract.getReserves();
      } catch (error) {
        console.error("Error fetching reserves:", error);
        throw new Error('Failed to fetch reserves - this might not be a valid Uniswap V2 pair');
      }
  
      // If we got here, try to fetch the symbols
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

  async function switchToKopliNetwork(): Promise<boolean> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }
  
    try {
      // Kopli network parameters
      const kopliChainParams = {
        chainId: '0x512578', // 5318008 in hex
        chainName: 'Kopli',
        nativeCurrency: {
          name: 'KOPLI',
          symbol: 'KOPLI',
          decimals: 18
        },
        rpcUrls: ['https://kopli-rpc.rkt.ink'], 
        blockExplorerUrls: ['https://kopli.reactscan.net'] 
      };
  
      try {
        // First try to switch to Kopli if it's already added
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: kopliChainParams.chainId }],
        });
        return true;
      } catch (switchError: any) {
        // If chain hasn't been added yet, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [kopliChainParams],
          });
          return true;
        }
        throw switchError;
      }
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      throw new Error(`Failed to switch to Kopli network: ${error.message}`);
    }
  } 



  // Modified handleCreateOrder to handle network switching
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {

      // Step 1: Deploy Destination Contract
      setDeploymentStep('deploying-destination');
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) throw new Error('Invalid chain selected');

      const destinationAddress = await deployDestinationContract(
        selectedChain.routerAddress
      );

     

      // Step 2: Approve Token Spending
      setDeploymentStep('approving');
      const tokenToApprove = formData.sellToken0 ? pairInfo?.token0 : pairInfo?.token1;
      if (!tokenToApprove) throw new Error('Token address not found');

      await approveTokens(
        tokenToApprove,
        destinationAddress,
        formData.amount
      );

       // Switch to Kopli network
       setDeploymentStep('switching-network');
       await switchToKopliNetwork();

      // Step 3: Deploy RSC on Kopli
      setDeploymentStep('deploying-rsc');
      await deployRSC({
        pair: formData.pairAddress,
        stopOrder: destinationAddress,
        client: formData.clientAddress,
        token0: formData.sellToken0,
        coefficient: formData.coefficient,
        threshold: formData.threshold
      });
      
      // // Switch back to original network
      // setDeploymentStep('switching-back');
      // await switchToNetwork(originalChainId);
      



      setDeploymentStep('complete');
    } catch (error: any) {
      console.error('Error creating stop order:', error);
      toast.error(error.message || 'Failed to create stop order');
      setDeploymentStep('idle');
    }
  };

  




async function deployDestinationContract(routerAddress: string): Promise<string> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Create contract factory
      
      const factory = new ethers.ContractFactory(
        stopOrderABI,
        stopOrderByteCode,
        signer
      );

    // Deploy contract
      const contract = await factory.deploy(
        routerAddress,
      { value: ethers.parseEther("0") } // Fund contract with 0.1 ETH
      );
      await contract.waitForDeployment();
    return contract.target.toString();
    } catch (error) {
      console.error('Error deploying destination contract:', error);
      throw error;
    }
}

async function deployRSC(params: {
    pair: string;
    stopOrder: string;
    client: string;
    token0: boolean;
    coefficient: string;
    threshold: string;
  }): Promise<string> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Verify network
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Check if we're on Kopli network (chain ID: 5318008)
      if (chainId !== 5318008) {
        throw new Error('Please switch to Kopli network for deployment');
      }
  
      // Estimate gas before deployment
      const factory = new ethers.ContractFactory(
        rscABI,
        rscByteCode,
        signer
      );
  
      // Estimate deployment gas
      const deploymentGas = await factory.getDeployTransaction(
        params.pair,
        params.stopOrder,
        params.client,
        params.token0,
        params.coefficient,
        params.threshold
      ).then(tx => provider.estimateGas(tx));
  
      // Add 20% buffer to gas estimate
      const gasLimit = (deploymentGas * BigInt(120)) / BigInt(100);
  
      // Get gas price
      const gasPrice = await provider.getFeeData().then(fees => fees.gasPrice);
      if (!gasPrice) throw new Error('Failed to get gas price');
  
      // Check if user has enough balance
      const signerAddress = await signer.getAddress();
      const balance = await provider.getBalance(signerAddress);
      const requiredBalance = gasLimit * gasPrice;
  
      if (balance < requiredBalance) {
        throw new Error('Insufficient balance for RSC deployment');
      }
  
      // Deploy contract with gas settings
    

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
      const contractAddress = await deployedContract.getAddress();
      
      return contractAddress;
  
    } catch (error: any) {
      console.error('Error deploying RSC:', error);
      throw new Error(`RSC deployment failed: ${error.message || 'Unknown error'}`);
    }
  }

async function approveTokens(
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<void> {
    try {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }
      if (!ethers.isAddress(spenderAddress)) {
        throw new Error('Invalid spender address');
      }
      if (spenderAddress === ethers.ZeroAddress) {
        throw new Error('Spender address cannot be zero address');
      }
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get token contract with extended interface including decimals
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
  
      // Parse amount with correct decimals
      const parsedAmount = ethers.parseUnits(amount, decimals);
  
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(await signer.getAddress(), spenderAddress);
  
      // If current allowance is not zero and less than desired amount, first reset it
      if (currentAllowance.toString() !== "0" && currentAllowance.lt(parsedAmount)) {
        const resetTx = await tokenContract.approve(spenderAddress, 0);
        await resetTx.wait();
      }
  
      // Approve new amount
      const tx = await tokenContract.approve(spenderAddress, parsedAmount);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
    } catch (error:any) {
      console.error('Error in approveTokens:', error);
      throw new Error(`Token approval failed: ${error.message || 'Unknown error'}`);
    }
  }
  

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
            Uniswap Stop Order
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Set up automatic sell orders that trigger when token prices drop below your specified threshold - like a safety net for your crypto investments.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 ">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Set Your Price</h3>
                    <p className="text-sm text-zinc-300">Choose when to sell</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Automatic Protection</h3>
                    <p className="text-sm text-gray-200">We watch 24/7</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Instant Execution</h3>
                    <p className="text-sm text-gray-200">Sells immediately when triggered</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Form Card */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800  mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Create Stop Order</CardTitle>
            <CardDescription className="text-zinc-300">Configure your automated token swap</CardDescription>
        </CardHeader>
        <CardContent>
            <form className="space-y-6">
              {/* Chain Selection */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 ">
                      <p className="text-sm text-zinc-200">
                        Choose the blockchain network where your tokens are located. 
                        This determines which Uniswap V2 contracts we'll interact with.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => setFormData({...formData, chainId: value})}
                >
                  <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200">
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent className="">
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

              {/* Pair Address */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Uniswap V2 Pair Address</label>
                <HoverCard>
                  <HoverCardTrigger>
                    <Info className="h-4 w-4 text-gray-400" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm">
                        Enter the Uniswap V2 pair contract address where you want to create the stop order.
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
                  <label className="text-sm font-medium">Token Pair</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <p className="text-sm text-gray-200">
                        Enter the addresses of both tokens in the trading pair.
                        The order doesn't matter - you'll select which one to sell next.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Input 
                  placeholder="Token 0 Address"
                  disabled
                  value={pairInfo?.token0}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                <Input 
                  placeholder="Token 1 Address"
                  disabled
                  value={pairInfo?.token1}
                  className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                />
                
                {/* Sell Direction */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Token to Sell</label>
                  <Select
                    value={formData.sellToken0 ? "token0" : "token1"}
                    onValueChange={(value) => setFormData({...formData, sellToken0: value === "token0"})}
                  >
                    <SelectTrigger className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500">
                      <SelectValue placeholder="Select token to sell" />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500">
                      <SelectItem value="token0">Token 0</SelectItem>
                      <SelectItem value="token1">Token 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client Address */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Client Address</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80  text-gray-200">
                      <p className="text-sm text-gray-200">
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
                  Current Price Ratio: {/* Add price ratio calculation */}
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
                <AlertDescription className="mt-1 text-zinc-200">
                  {deploymentStep === 'deploying-destination' && 'Deploying destination contract...'}
                  {deploymentStep === 'switching-network' && 'Switching to Kopli network...'}
                  {deploymentStep === 'deploying-rsc' && 'Deploying reactive smart contract on Kopli...'}
                  {deploymentStep === 'switching-back' && 'Switching back to original network...'}
                  {deploymentStep === 'approving' && 'Approving token spending...'}
                  {deploymentStep === 'complete' && 'Stop order created successfully!'}
                </AlertDescription>
              </Alert>
                )}

            <Button 
              type="submit"
              onClick={handleCreateOrder}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
                Create Stop Order
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Educational Section */}
      <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 ">
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

              <AccordionItem value="how-it-works">
                <AccordionTrigger>How Does It Work?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-gray-200">
                      Our system uses Reactive Smart Contracts (RSCs) to monitor Uniswap V2 pool prices in real-time. When your price threshold is reached, the contract automatically executes the trade.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Price Monitoring</h4>
                        <p className="text-sm text-gray-200">
                          Continuously watches token pair prices through Uniswap V2 pool reserves
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Automatic Execution</h4>
                        <p className="text-sm text-gray-200">
                          Trades execute instantly when conditions are met, no manual intervention needed
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="threshold">
                <AccordionTrigger>Setting the Right Threshold</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p className="text-gray-200">
                      The threshold determines when your order triggers. It works with the coefficient to provide precise price control.
                    </p>
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-white">How to Calculate:</h4>
                      <p className="text-sm text-gray-200">
                        1. Choose your target price ratio (e.g., 0.95 for 5% drop)
                      </p>
                      <p className="text-sm text-gray-200">
                        2. Multiply by coefficient (e.g., 0.95 × 1000 = 950)
                      </p>
                      <p className="text-sm text-gray-200">
                        3. Use 1000 as coefficient and 950 as threshold
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="best-practices">
                <AccordionTrigger>Best Practices</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Consider Market Volatility</h4>
                        <p className="text-sm text-gray-200">
                          Set your threshold with enough buffer to avoid premature triggers during normal market fluctuations
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Check Pool Liquidity</h4>
                        <p className="text-sm text-gray-200">
                          Ensure the token pair has sufficient liquidity to handle your order size
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Test With Small Amounts</h4>
                        <p className="text-sm text-gray-200">
                          Start with a small order to familiarize yourself with the system
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-white mb-2">Monitor Your Orders</h4>
                        <p className="text-sm text-gray-200">
                          Regularly review your active orders and adjust as market conditions change
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="important-notes">
                <AccordionTrigger>Important Notes</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-white">Key Points to Remember:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-gray-200">
                        <li>Ensure sufficient token approval for the contract</li>
                        <li>Orders execute based on Uniswap V2 pool prices</li>
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
  )
}

