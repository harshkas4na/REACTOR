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
import { Info, AlertCircle, Clock, Zap, Loader2, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';

// Define types for form data
interface FeeCollectorFormData {
  chainId: string;
  tokenId: string;
}

interface PositionInfo {
  token0: string;
  token1: string;
  fee: number;
  token0Symbol?: string;
  token1Symbol?: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  owner?: string;
  lastCollection?: number;
  tokensOwed0?: string; // Track uncollected fees
  tokensOwed1?: string; // Track uncollected fees
  isRegistered?: boolean; // Whether position is registered with our system
}

interface ChainConfig {
  id: string;
  name: string;
  positionManagerAddress: string;
  feeCollectorAddress: string;
  rpcUrl?: string;
  nativeCurrency: string;
}

// Configuration constants
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    positionManagerAddress: '0x1238536071e1c677a632429e3655c799b22cda52',
    feeCollectorAddress: '0xc503ae4404d188ca8ec4588ef4f091fb5a78e5a2',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: 'ETH'
  },
  // Additional networks to be added later
  {
    id: '1',
    name: 'Ethereum Mainnet (Coming Soon)',
    positionManagerAddress: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
    feeCollectorAddress: '',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeCurrency: 'ETH'
  },
  {
    id: '43114',
    name: 'Avalanche C-Chain (Coming Soon)',
    positionManagerAddress: '0x655c406ebfa14ee2006250925e54ec43ad184f8b',
    feeCollectorAddress: '',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX'
  }
];

type SetupStep = 'idle' | 'approving' | 'registering' | 'complete';

export default function UniswapV3FeeCollectorPage() {
  const [formData, setFormData] = useState<FeeCollectorFormData>({
    chainId: '11155111', // Default to Sepolia
    tokenId: ''
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [positionInfo, setPositionInfo] = useState<PositionInfo | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  
  // Find the currently selected chain configuration
  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId) || SUPPORTED_CHAINS[0];

  useEffect(() => {
    const getConnectedAccount = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const account = accounts[0].address;
            setConnectedAccount(account);
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

  const handleFetchPositionInfo = async (tokenId: string) => {
    setIsLoadingPosition(true);
    setFetchError('');
    
    try {
      if (!tokenId || isNaN(parseInt(tokenId))) {
        throw new Error('Invalid token ID format');
      }
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
  
      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }
  
      // Make sure we have a properly checksummed address for the position manager
      // This is critical for ethers.js v6 which strictly enforces EIP-55
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) {
        throw new Error('Chain configuration not found');
      }
      
      // Normalize the position manager address with proper checksum
      const positionManagerAddress = ethers.getAddress(selectedChain.positionManagerAddress);
  
      // Interface for Uniswap V3 Position Manager
      const positionManagerInterface = new ethers.Interface([
        'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function isApprovedForAll(address owner, address operator) view returns (bool)'
      ]);
  
      const positionManagerContract = new ethers.Contract(
        positionManagerAddress,
        positionManagerInterface,
        provider
      );
  
      console.log("Fetching position data for token ID:", tokenId);
      console.log("Position Manager address:", positionManagerAddress);
  
      try {
        const [positionData, owner] = await Promise.all([
          positionManagerContract.positions(tokenId),
          positionManagerContract.ownerOf(tokenId)
        ]);
        
        console.log("Position data fetched:", positionData);
        
        // Check if the position is already approved for the Fee Collector
        if (connectedAccount.toLowerCase() === owner.toLowerCase()) {
          const feeCollectorAddress = ethers.getAddress(selectedChain.feeCollectorAddress);
          const approvalStatus = await positionManagerContract.isApprovedForAll(owner, feeCollectorAddress);
          setIsApproved(approvalStatus);
          console.log("Position approval status:", approvalStatus);
        } else {
          setIsApproved(false);
        }
        
        // ERC20 interface for token symbols
        const erc20Interface = new ethers.Interface([
          'function symbol() view returns (string)'
        ]);
  
        let token0Symbol = 'Unknown', token1Symbol = 'Unknown';
        const token0 = ethers.getAddress(positionData.token0);
        const token1 = ethers.getAddress(positionData.token1);
  
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
        
        // Check if the position is already registered in the Fee Collector
        let lastCollection = 0;
        let isRegistered = false;
        try {
          if (selectedChain.feeCollectorAddress) {
            const feeCollectorInterface = new ethers.Interface([
              'function lastCollectionTimestamp(uint256) view returns (uint256)',
              'function activePositions(uint256) view returns (bool)'
            ]);
            
            const feeCollectorContract = new ethers.Contract(
              selectedChain.feeCollectorAddress,
              feeCollectorInterface,
              provider
            );
            
            lastCollection = Number(await feeCollectorContract.lastCollectionTimestamp(tokenId));
            isRegistered = await feeCollectorContract.activePositions(tokenId);
          }
        } catch (error) {
          console.warn("Could not fetch registration status:", error);
        }
  
        setPositionInfo({
          token0,
          token1,
          fee: Number(positionData.fee),
          tickLower: Number(positionData.tickLower),
          tickUpper: Number(positionData.tickUpper),
          liquidity: positionData.liquidity.toString(),
          token0Symbol,
          token1Symbol,
          owner: ethers.getAddress(owner),
          lastCollection,
          tokensOwed0: positionData.tokensOwed0.toString(),
          tokensOwed1: positionData.tokensOwed1.toString(),
          isRegistered
        });
  
      } catch (contractError: any) {
        console.error("Contract error:", contractError);
        throw new Error(`Failed to fetch position: ${contractError.message}`);
      }
  
    } catch (error: any) {
      console.error('Error fetching position info:', error);
      setFetchError(error.message || 'Failed to fetch position information');
      setPositionInfo(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  // Enhanced network switching function with better error handling
  const switchNetwork = async (chainId: string) => {
    if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

    try {
      // Check if already on the correct network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId === chainId) {
        console.log(`Already on chain ${chainId}`);
        return true;
      }
      
      console.log(`Switching to chain ${chainId}`);
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
      });
      
      // Verify the switch was successful
      const newNetwork = await provider.getNetwork();
      if (newNetwork.chainId.toString() !== chainId) {
        throw new Error('Network switch failed or was rejected');
      }
      
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to wallet, attempt to add it
        console.log(`Chain ${chainId} not added to wallet, attempting to add it`);
        const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
        if (!chain) throw new Error('Chain not supported in this application');
        
        try {
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
              rpcUrls: [chain.rpcUrl || ''],
              blockExplorerUrls: [
                chain.id === '1' ? 'https://etherscan.io' : 
                chain.id === '11155111' ? 'https://sepolia.etherscan.io' :
                chain.id === '43114' ? 'https://snowtrace.io' : ''
              ]
            }],
          });
          
          // Verify the add and switch was successful
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          if (network.chainId.toString() !== chainId) {
            throw new Error('Network add succeeded but switch failed or was rejected');
          }
          
          return true;
        } catch (addError: any) {
          throw new Error(`Failed to add chain: ${addError.message || 'User rejected the request'}`);
        }
      }
      throw new Error(`Network switch failed: ${error.message || 'User rejected the request'}`);
    }
  };

  // Function to approve NFT position manager to allow FeeCollector contract to manage token
  async function approvePositionManager() {
    try {
      if (!positionInfo || !positionInfo.owner) {
        throw new Error('Position information not available');
      }
      
      // Check if the connected account is the owner
      if (connectedAccount.toLowerCase() !== positionInfo.owner.toLowerCase()) {
        throw new Error('You are not the owner of this position');
      }
      
      setSetupStep('approving');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Interface for ERC721 approval
      const positionManagerInterface = new ethers.Interface([
        'function setApprovalForAll(address operator, bool approved) external'
      ]);
      
      const feeCollectorAddress = ethers.getAddress(selectedChain.feeCollectorAddress);
      
      const positionManagerContract = new ethers.Contract(
        selectedChain.positionManagerAddress,
        positionManagerInterface,
        signer
      );
      
      const tx = await positionManagerContract.setApprovalForAll(feeCollectorAddress, true);
      await tx.wait();
      
      console.log("Approved FeeCollector to manage positions");
      setIsApproved(true);
      
      // Move to the next step - registering
      setSetupStep('registering');
      
      // Automatically continue to registration
      await registerPosition();
      
      return true;
    } catch (error: any) {
      console.error('Error approving position manager:', error);
      setSetupStep('idle');
      throw new Error(`NFT approval failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Function to register position in the FeeCollector contract
  async function registerPosition() {
    try {
      if (!positionInfo) {
        throw new Error('Position information not available');
      }
      
      if (!isApproved) {
        // If not approved, start with approval process
        return await approvePositionManager();
      }
      
      setSetupStep('registering');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const feeCollectorInterface = new ethers.Interface([
        'function registerPosition(uint256 tokenId) external'
      ]);
      
      const feeCollectorAddress = ethers.getAddress(selectedChain.feeCollectorAddress);
      
      const feeCollectorContract = new ethers.Contract(
        feeCollectorAddress,
        feeCollectorInterface,
        signer
      );
      
      const tx = await feeCollectorContract.registerPosition(formData.tokenId);
      await tx.wait();
      
      console.log("Position registered successfully");
      setSetupStep('complete');
      
      // Refresh position info to update registration status
      await handleFetchPositionInfo(formData.tokenId);
      
      return true;
    } catch (error: any) {
      console.error('Error registering position:', error);
      setSetupStep('idle');
      throw new Error(`Position registration failed: ${error.message || 'Unknown error'}`);
    }
  }
  
  // Standard function to collect fees directly from position manager
  async function collectFees() {
    try {
      if (!positionInfo) {
        throw new Error('Position information not available');
      }
      
      // Check if the connected account is the owner
      if (connectedAccount.toLowerCase() !== positionInfo.owner?.toLowerCase()) {
        throw new Error('You are not the owner of this position');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Interface for position manager's collect function
      const positionManagerInterface = new ethers.Interface([
        'function collect(tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external returns (uint256 amount0, uint256 amount1)'
      ]);
      
      const positionManagerContract = new ethers.Contract(
        selectedChain.positionManagerAddress,
        positionManagerInterface,
        signer
      );
      
      // Prepare collect parameters
      const collectParams = {
        tokenId: formData.tokenId,
        recipient: connectedAccount,
        amount0Max: ethers.MaxUint256, // Collect all available fees
        amount1Max: ethers.MaxUint256  // Collect all available fees
      };
      
      const tx = await positionManagerContract.collect(collectParams);
      await tx.wait();
      
      console.log("Fees collected successfully via position manager");
      toast.success('Fees collected successfully!');
      
      // Refresh position info
      await handleFetchPositionInfo(formData.tokenId);
      
      return true;
    } catch (error: any) {
      console.error('Error collecting fees:', error);
      toast.error(`Fee collection failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  }
  
  // Function to force collect fees through our Fee Collector contract
  async function forceCollectFees() {
    try {
      if (!positionInfo) {
        throw new Error('Position information not available');
      }
      
      // Check if the connected account is the owner
      if (connectedAccount.toLowerCase() !== positionInfo.owner?.toLowerCase()) {
        throw new Error('You are not the owner of this position');
      }
      
      // Check if position is registered
      if (!positionInfo.isRegistered) {
        throw new Error('Position is not registered with the Fee Collector');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const feeCollectorInterface = new ethers.Interface([
        'function forceCollectFees(uint256 tokenId) external'
      ]);
      
      const feeCollectorAddress = ethers.getAddress(selectedChain.feeCollectorAddress);
      
      const feeCollectorContract = new ethers.Contract(
        feeCollectorAddress,
        feeCollectorInterface,
        signer
      );
      
      const tx = await feeCollectorContract.forceCollectFees(formData.tokenId);
      await tx.wait();
      
      console.log("Fees force-collected successfully");
      toast.success('Fees collected successfully through automated system!');
      
      // Refresh position info
      await handleFetchPositionInfo(formData.tokenId);
      
      return true;
    } catch (error: any) {
      console.error('Error force-collecting fees:', error);
      toast.error(`Automated fee collection failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  }

  // Main function to handle fee collector setup
  const handleSetupFeeCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Form validation
      if (!formData.chainId) {
        throw new Error('Please select a blockchain network');
      }
      if (!formData.tokenId || isNaN(parseInt(formData.tokenId))) {
        throw new Error('Please enter a valid token ID');
      }
      
      // Check if position info was successfully fetched
      if (!positionInfo) {
        throw new Error('Position information not available. Please fetch a valid position first.');
      }
      
      // If liquidity is zero, reject
      if (positionInfo.liquidity === '0') {
        throw new Error('Position has no liquidity. Only active positions with liquidity can be managed.');
      }
      
      // Get selected chain configuration
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) throw new Error('Invalid chain selected');

      // Check if this network is still in "Coming Soon" state
      if (selectedChain.id !== '11155111') {
        throw new Error('This network is coming soon and not yet supported');
      }

      // Check if user is on the correct network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== formData.chainId) {
        throw new Error(`Please switch to ${selectedChain.name} network before proceeding`);
      }

      // Check if the connected account is the owner
      if (connectedAccount.toLowerCase() !== positionInfo.owner?.toLowerCase()) {
        throw new Error('You are not the owner of this position');
      }

      // Start the setup process
      if (!isApproved) {
        // First step is to approve if not already approved
        await approvePositionManager();
      } else {
        // If already approved, just register the position
        await registerPosition();
      }
      
      toast.success('Fee Collector setup completed successfully!');
      
      // Add a helpful message about what to expect
      setTimeout(() => {
        toast.success('Your position is now being monitored for automatic fee collection');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error setting up fee collector:', error);
      
      // Clear the setup step to allow retrying
      setSetupStep('idle');
      
      // Show detailed error message
      toast.error(error.message || 'Failed to setup fee collector');
      
      // Provide guidance based on error type
      if (error.message.includes("approval")) {
        toast.error('Please ensure you have permission to manage this NFT position');
      } else if (error.message.includes("switch")) {
        toast.error('Please switch to the correct network');
      }
    }
  };
  
  // Update the setup status UI
  const SetupStatusUI = () => {
    return (
      <>
      {setupStep !== 'idle' && (
        <Alert className={
          setupStep === 'complete' 
            ? "bg-green-900/20 border-green-500/50" 
            : "bg-blue-900/20 border-blue-500/50"
        }>
          {setupStep === 'complete' 
            ? <CheckCircle className="h-4 w-4 text-green-400" /> 
            : <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
          }
          <AlertDescription className="text-zinc-200">
            {setupStep === 'approving' && (
              <div className="flex flex-col gap-1">
                <span>Approving position management...</span>
                <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
              </div>
            )}
            {setupStep === 'registering' && (
              <div className="flex flex-col gap-1">
                <span>Registering position with Fee Collector...</span>
                <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
              </div>
            )}
            {setupStep === 'complete' && (
              <div className="flex flex-col gap-1">
                <span>Fee Collector setup completed successfully!</span>
                <span className="text-xs text-zinc-400">Your position is now being monitored for automatic fee collection</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      </>
    );
  };

  // Convert ticks to price
  const tickToPrice = (tick: number, decimals0: number = 18, decimals1: number = 18) => {
    // Uniswap formula: price = 1.0001^tick
    const price = Math.pow(1.0001, tick);
    return price.toFixed(8);
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

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
            Uniswap V3 Fee Collector
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Automatically collect fees from your Uniswap V3 positions without manual intervention, ensuring you receive your earned fees directly to your wallet.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Automatic Fee Collection</h3>
                    <p className="text-sm text-zinc-300">No manual action needed</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Real-Time Monitoring</h3>
                    <p className="text-sm text-gray-200">Collects after every swap</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Gas-Efficient</h3>
                    <p className="text-sm text-gray-200">Optimized collection times</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Form Card */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Setup Fee Collector</CardTitle>
            <CardDescription className="text-zinc-300">Configure automated fee collection for your Uniswap V3 position</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSetupFeeCollector}>
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
                        Choose the blockchain network where your Uniswap V3 position is located.
                        Currently only Sepolia testnet is supported. Ethereum Mainnet and Avalanche C-Chain support coming soon.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <Select
                  value={formData.chainId}
                  onValueChange={(value) => {
                    const chain = SUPPORTED_CHAINS.find(c => c.id === value);
                    setFormData({ 
                      ...formData, 
                      chainId: value
                    });
                    if (chain && chain.id === '11155111') switchNetwork(chain.id);
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
                        disabled={chain.id !== '11155111'} // Only enable Sepolia for now
                      >
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NFT Position ID */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-zinc-200">Position Token ID</label>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Info className="h-4 w-4 text-zinc-400" />
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 text-zinc-200">
                      <p className="text-sm">
                        Enter the NFT Token ID of your Uniswap V3 position. You can find this in the Uniswap interface
                        or in your wallet's NFT section. Only positions with active liquidity can be managed.
                      </p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Enter position token ID"
                    value={formData.tokenId}
                    onChange={(e) => setFormData({...formData, tokenId: e.target.value})}
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
                    onClick={() => handleFetchPositionInfo(formData.tokenId)}
                    disabled={!formData.tokenId || isLoadingPosition}
                  >
                    {isLoadingPosition ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingPosition ? 'Loading...' : 'Fetch Position'}
                  </Button>
                </div>
              </div>

              {/* Show loading state */}
              {isLoadingPosition && (
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-zinc-200">Fetching position information...</span>
                  </div>
                </div>
              )}

              {/* Show error message if any */}
              {fetchError && (
                <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {fetchError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Position Information Card */}
              {positionInfo && (
                <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-6">
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">Token 0</p>
                      <p className="text-xs text-zinc-400 break-all">{positionInfo.token0}</p>
                      <p className="text-sm text-blue-400">{positionInfo.token0Symbol}</p>
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">Token 1</p>
                      <p className="text-xs text-zinc-400 break-all">{positionInfo.token1}</p>
                      <p className="text-sm text-blue-400">{positionInfo.token1Symbol}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-700/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-zinc-400">Fee Tier</p>
                        <p className="text-zinc-200">{positionInfo.fee / 10000}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Liquidity</p>
                        <p className="text-zinc-200">{positionInfo.liquidity === '0' ? 
                          <span className="text-red-400">No active liquidity</span> : 
                          'Active'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Price Range (Lower)</p>
                        <p className="text-zinc-200">
                          {tickToPrice(positionInfo.tickLower)} {positionInfo.token1Symbol}/{positionInfo.token0Symbol}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Price Range (Upper)</p>
                        <p className="text-zinc-200">
                          {tickToPrice(positionInfo.tickUpper)} {positionInfo.token1Symbol}/{positionInfo.token0Symbol}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fee information */}
                  <div className="pt-2 border-t border-zinc-700/50">
                    <p className="text-sm font-medium text-zinc-200">Uncollected Fees</p>
                    <div className="flex justify-between mt-1">
                      <p className="text-sm text-zinc-400">
                        Token 0: <span className="text-zinc-200">{positionInfo.tokensOwed0 && BigInt(positionInfo.tokensOwed0) > BigInt(0) ? ethers.formatUnits(positionInfo.tokensOwed0, 18) : '0'} {positionInfo.token0Symbol}</span>
                      </p>
                      <p className="text-sm text-zinc-400">
                        Token 1: <span className="text-zinc-200">{positionInfo.tokensOwed1 && BigInt(positionInfo.tokensOwed1) > BigInt(0) ? ethers.formatUnits(positionInfo.tokensOwed1, 18) : '0'} {positionInfo.token1Symbol}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Last collection (for registered positions) */}
                  {positionInfo.isRegistered && positionInfo.lastCollection && positionInfo.lastCollection > 0 && (
                    <div className="pt-2 border-t border-zinc-700/50">
                      <p className="text-sm text-zinc-400">Last Fee Collection</p>
                      <p className="text-zinc-200">{formatTimestamp(positionInfo.lastCollection)}</p>
                    </div>
                  )}
                  
                  {positionInfo.owner && (
                    <div className="pt-2 border-t border-zinc-700/50">
                      <p className="text-sm text-zinc-400">Owner</p>
                      <p className="text-xs text-zinc-200 break-all">{positionInfo.owner}</p>
                      {connectedAccount.toLowerCase() !== positionInfo.owner.toLowerCase() && (
                        <Alert variant="destructive" className="mt-2 bg-red-900/20 border-red-500/50">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <AlertDescription className="text-red-200">
                            Warning: You are not the owner of this position
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  
                  {/* Fee Collection Buttons */}
                  {positionInfo && positionInfo.owner && connectedAccount.toLowerCase() === positionInfo.owner.toLowerCase() && (
                    <div className="pt-2 border-t border-zinc-700/50">
                      {(() => {
                        const hasFees = positionInfo && 
                          ((positionInfo.tokensOwed0 && BigInt(positionInfo.tokensOwed0) > BigInt(0)) || 
                          (positionInfo.tokensOwed1 && BigInt(positionInfo.tokensOwed1) > BigInt(0)));
                        
                        return (
                          <>
                            {/* Standard fee collection button - works for all positions
                            <Button 
                              type="button"
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white mt-2"
                              onClick={collectFees}
                              disabled={(setupStep !== 'idle' && setupStep !== 'complete') || !hasFees}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {true ? 'Collect Fees' : 'No Fees to Collect'}
                            </Button>
                            <p className="text-xs text-zinc-400 text-center mt-1">
                              {true 
                                ? 'Collect accumulated fees directly to your wallet'
                                : 'No uncollected fees available for this position at this time'}
                            </p>
                             */}
                            {/* Force collection button - only for registered positions */}
                            {positionInfo.isRegistered && (
                              <div className="mt-4">
                                <Button 
                                  type="button"
                                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                  onClick={forceCollectFees}
                                  disabled={(setupStep !== 'idle' && setupStep !== 'complete')}
                                >
                                  <Zap className="h-4 w-4 mr-2" />
                                  Force Automatic Collection
                                </Button>
                                <p className="text-xs text-zinc-400 text-center mt-1">
                                  Bypass the cooldown period and trigger our automated collection system
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
              
              {/* Approval Status */}
              {positionInfo && isApproved && (
                <Alert className="bg-green-900/20 border-green-500/50">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-zinc-200">
                    Position already approved for management. You can register it with Fee Collector.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Registration Status */}
              {positionInfo && positionInfo.isRegistered && (
                <Alert className="bg-blue-900/20 border-blue-500/50">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-zinc-200">
                    This position is already registered with our Fee Collector system. Fees will be automatically collected and sent to your wallet.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Setup Status */}
              {SetupStatusUI()}

              {/* Requirements/Prerequisites Info Card */}
              <Card className="bg-blue-900/20 border-blue-500/20 mb-4">
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium text-zinc-100 mb-2">Requirements for Fee Collector:</h3>
                  <ul className="text-xs text-zinc-300 space-y-1">
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${connectedAccount ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Connected wallet {connectedAccount ? '✓' : '- Please connect your wallet'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${selectedChain ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Selected chain {selectedChain ? '✓' : '- Please select a chain'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${positionInfo ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Valid position {positionInfo ? '✓' : '- Please enter a valid position token ID'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${positionInfo && positionInfo.liquidity !== '0' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Active liquidity {positionInfo && positionInfo.liquidity !== '0' ? '✓' : '- Position must have active liquidity'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${positionInfo && positionInfo.owner && connectedAccount.toLowerCase() === positionInfo.owner.toLowerCase() ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      Position ownership {positionInfo && positionInfo.owner && connectedAccount.toLowerCase() === positionInfo.owner.toLowerCase() ? '✓' : '- You must be the position owner'}
                    </li>
                    <li className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${isApproved ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      Position approval {isApproved ? '✓' : '- Will be done during setup'}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Only show registration button if not already registered */}
              {!positionInfo?.isRegistered ? (
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  disabled={setupStep !== 'idle' || !positionInfo || positionInfo.liquidity === '0' || 
                          connectedAccount.toLowerCase() !== positionInfo?.owner?.toLowerCase() || 
                          selectedChain.id !== '11155111'}
                >
                  {isApproved ? 'Register Position with Fee Collector' : 'Approve & Register Position'}
                </Button>
              ) : (
                <Button 
                  type="button"
                  className="w-full bg-zinc-700 text-white cursor-not-allowed"
                  disabled={true}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Position Already Registered
                </Button>
              )}
              
              {selectedChain.id !== '11155111' && (
                <p className="text-center text-amber-400 text-sm">
                  This network is coming soon. Currently only Sepolia testnet is supported.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Educational Section */}
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-zinc-100">Understanding Uniswap V3 Fee Collection</CardTitle>
            <CardDescription className="text-zinc-300">
              Learn how automated fee collection maximizes your earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {/* Accordion items with updated styling */}
              <AccordionItem value="what-is" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  What is Fee Collection?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p>
                      Fee collection is the process of claiming trading fees that your Uniswap V3 position has earned. In Uniswap V3, fees are not automatically reinvested or sent to your wallet - they accumulate within the position and must be manually collected.
                    </p>
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-zinc-100 mb-2">Why it matters:</h4>
                      <p className="text-sm text-zinc-300">
                        Uncollected fees don't earn additional yield and are at risk if the pool contract is ever compromised. Our automated fee collector ensures your earned fees are promptly transferred to your wallet after significant swap activity.
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
                      Our system uses an efficient event-based approach to collect fees at optimal times:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">1. Event Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          Monitors swap events in pools where you have positions
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">2. Fee Collection</h4>
                        <p className="text-sm text-zinc-300">
                          Collects accumulated fees when significant activity occurs
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">3. Direct Transfer</h4>
                        <p className="text-sm text-zinc-300">
                          Transfers collected fees directly to your wallet
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cooldown-system" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Cooldown System
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <p className="text-zinc-300">
                      Our fee collector uses a cooldown system to ensure gas-efficient fee collection:
                    </p>
                    <div className="bg-blue-500/10 p-4 rounded-lg space-y-3">
                      <h4 className="font-medium text-zinc-100">How the Cooldown Works:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
                        <li><span className="font-medium">Default Cooldown:</span> Fee collection has a default 1-hour cooldown period</li>
                        <li><span className="font-medium">Gas Efficiency:</span> Prevents excessive gas usage from too-frequent collections</li>
                        <li><span className="font-medium">Optimal Timing:</span> Collects fees after significant trading activity</li>
                        <li><span className="font-medium">Manual Override:</span> You can force collection at any time by using the "Force Automatic Collection" button</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="advantages" className="border-zinc-800">
                <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                  Advantages Over Manual Collection
                </AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">24/7 Monitoring</h4>
                        <p className="text-sm text-zinc-300">
                          System continuously watches swap activity even when you're offline
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Automatic Transfers</h4>
                        <p className="text-sm text-zinc-300">
                          Collected fees are sent directly to your wallet, no extra steps needed
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Gas Optimization</h4>
                        <p className="text-sm text-zinc-300">
                          Cooldown period ensures collections only happen when economically beneficial
                        </p>
                      </div>
                      <div className="bg-blue-500/10 p-4 rounded-lg">
                        <h4 className="font-medium text-zinc-100 mb-2">Increased Security</h4>
                        <p className="text-sm text-zinc-300">
                          Regular collection reduces risk of having significant unclaimed fees
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
                        <li>Position must have active liquidity to be managed</li>
                        <li>Fees are collected only if they exceed gas costs (economically beneficial)</li>
                        <li>You can force fee collection at any time with the Force Collection button</li>
                        <li>All collected fees are sent directly to your wallet address</li>
                        <li>The system works best for positions with regular trading activity</li>
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