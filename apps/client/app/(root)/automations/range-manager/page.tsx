'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import { Info, AlertCircle, Shield, Clock, Zap, Loader2, CheckCircle, RefreshCw, ChevronRight, Sliders, Activity, Lock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { toast } from 'react-hot-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Import contract artifacts (you'll need to create these files similar to your stop order implementation)
import { rangeAdjusterByteCode } from '@/data/automations/v3-range-manager/rangeAdjusterByteCode';
import rangeAdjusterABI from '@/data/automations/v3-range-manager/rangeAdjusterABI.json';
import { rangeManagerReactiveByteCode } from '@/data/automations/v3-range-manager/rangeManagerReactiveByteCode';
import rangeManagerReactiveABI from '@/data/automations/v3-range-manager/rangeManagerReactiveABI.json';

// Define types for form data and position info
interface RangeManagerFormData {
  chainId: string;
  tokenId: string;
  callbackFunding: string;
  rscFunding: string;
}

interface NftPosition {
  tokenId: string;
  token0: string;
  token1: string;
  token0Symbol?: string;
  token1Symbol?: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  owner?: string;
}

interface ChainConfig {
  id: string;
  name: string;
  positionManagerAddress: string;
  factoryAddress: string;
  rangeAdjusterABI: any;
  rangeAdjusterBytecode: any;
  rangeManagerReactiveABI: any;
  rangeManagerReactiveBytecode: any;
  rpcUrl?: string;
  nativeCurrency: string;
  defaultFunding: string;
}

type DeploymentStep = 'idle' | 'deploying-adjuster' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'registering' | 'complete';

// Configuration constants
const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    positionManagerAddress: '0x1238536071E1c677A632429e3655c799B22cDA52',
    factoryAddress: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    rangeAdjusterABI: rangeAdjusterABI,
    rangeAdjusterBytecode: rangeAdjusterByteCode,
    rangeManagerReactiveABI: rangeManagerReactiveABI,
    rangeManagerReactiveBytecode: rangeManagerReactiveByteCode,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03'
  },
  // You can add mainnet and other chains here when ready
];

export default function UniswapV3RangeManagerPage() {
  const [formData, setFormData] = useState<RangeManagerFormData>({
    chainId: '',
    tokenId: '',
    callbackFunding: '',
    rscFunding: '0.05'
  });

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string>('');
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [positionInfo, setPositionInfo] = useState<NftPosition | null>(null);
  const [isLoadingPosition, setIsLoadingPosition] = useState<boolean>(false);
  const [userPositions, setUserPositions] = useState<NftPosition[]>([]);
  const [isLoadingUserPositions, setIsLoadingUserPositions] = useState<boolean>(false);
  const [positionHealthStatus, setPositionHealthStatus] = useState<'in-range' | 'near-edge' | 'out-of-range' | 'unknown'>('unknown');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [volatilityEstimate, setVolatilityEstimate] = useState<string | null>(null);
  
  // Find the currently selected chain configuration
  const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);

  // Update destination funding when chain changes
  useEffect(() => {
    if (selectedChain) {
      setFormData(prev => ({
        ...prev,
        callbackFunding: selectedChain.defaultFunding
      }));
    }
  }, [formData.chainId]);

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
  
  // Create Funding Configuration UI component
  const FundingConfigurationUI = () => {
    // Get RSC network details based on source chain
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
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
            Uniswap V3 Range Manager
          </h1>
          <p className="text-xl text-zinc-200 mb-8">
            Automatically optimize your Uniswap V3 position ranges based on market movements, volatility, and price trends.
          </p>
          
          {/* Features Card */}
          <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-100">Smart Range Adjustments</h3>
                    <p className="text-sm text-zinc-300">Based on price movements</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <Sliders className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Volatility Analysis</h3>
                    <p className="text-sm text-gray-200">Adapts to market conditions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Set & Forget</h3>
                    <p className="text-sm text-gray-200">24/7 position management</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Section with Tabs */}
        <Tabs defaultValue="positions" className="mb-12">
          <TabsList className="bg-zinc-900/60 border border-zinc-800 p-1">
            <TabsTrigger value="positions" className="data-[state=active]:bg-blue-900/30">Your Positions</TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-blue-900/30">Manual Setup</TabsTrigger>
            <TabsTrigger value="how-it-works" className="data-[state=active]:bg-blue-900/30">How It Works</TabsTrigger>
          </TabsList>
          
          {/* Your Positions Tab */}
          <TabsContent value="positions" className="mt-6">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-zinc-100">Your Uniswap V3 Positions</CardTitle>
                    <CardDescription className="text-zinc-300">
                      Select a position to automate its range management
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    className="bg-blue-900/20 border-blue-700/50 text-blue-300 hover:bg-blue-800/30"
                    onClick={() => {
                      if (!selectedChain) {
                        toast.error('Please select a chain first');
                        return;
                      }
                      fetchUserPositions();
                    }}
                    disabled={isLoadingUserPositions}
                  >
                    {isLoadingUserPositions ? 
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                      <RefreshCw className="h-4 w-4 mr-2" />
                    }
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Chain Selection */}
                <div className="mb-6">
                  <div className="flex items-center mb-2 space-x-2">
                    <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                    <HoverCard>
                      <HoverCardTrigger>
                        <Info className="h-4 w-4 text-zinc-400" />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 text-zinc-200">
                        <p className="text-sm">
                          Choose the blockchain network where your Uniswap V3 positions are located.
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
                        chainId: value,
                        callbackFunding: chain ? chain.defaultFunding : formData.callbackFunding
                      });
                      setUserPositions([]);
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
                
                {/* Loading state */}
                {isLoadingUserPositions && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                    <p className="text-zinc-300">Loading your positions...</p>
                  </div>
                )}
                
                {/* Empty state */}
                {!isLoadingUserPositions && userPositions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    {formData.chainId ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center mb-4">
                          <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-200 mb-2">No positions found</h3>
                        <p className="text-zinc-400 text-center max-w-md mb-4">
                          We couldn't find any Uniswap V3 positions for your account on {selectedChain?.name}.
                        </p>
                        <Button 
                          variant="outline" 
                          className="bg-blue-900/20 border-blue-700/50 text-blue-300 hover:bg-blue-800/30"
                          onClick={fetchUserPositions}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center mb-4">
                          <Shield className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-200 mb-2">Select a chain first</h3>
                        <p className="text-zinc-400 text-center max-w-md">
                          Choose a blockchain network to view your Uniswap V3 positions.
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                {/* Position grid */}
                {!isLoadingUserPositions && userPositions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userPositions.map(position => (
                      <PositionCard key={position.tokenId} position={position} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Manual Setup Tab */}
          <TabsContent value="manual" className="mt-6">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Manual Position Setup</CardTitle>
                <CardDescription className="text-zinc-300">
                  Set up range management for a specific position by ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Chain Selection */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">Select Chain</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            Choose the blockchain network where your Uniswap V3 position is located.
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
                          chainId: value,
                          callbackFunding: chain ? chain.defaultFunding : formData.callbackFunding
                        });
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
                  
                  {/* Position ID */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-zinc-200">Position Token ID</label>
                      <HoverCard>
                        <HoverCardTrigger>
                          <Info className="h-4 w-4 text-zinc-400" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 text-zinc-200">
                          <p className="text-sm">
                            Enter the NFT token ID of your Uniswap V3 position. 
                            You can find this in your Uniswap V3 interface or by checking your NFT positions.
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="Enter position ID (e.g., 123456)"
                        value={formData.tokenId}
                        onChange={(e) => setFormData({...formData, tokenId: e.target.value})}
                        className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
                      />
                      <Button 
                        variant="outline" 
                        className="bg-blue-900/20 border-blue-700/50 text-blue-300 hover:bg-blue-800/30 whitespace-nowrap"
                        onClick={() => handleFetchPositionInfo(formData.tokenId)}
                        disabled={isLoadingPosition || !formData.tokenId || !formData.chainId}
                      >
                        {isLoadingPosition ? 
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                          <RefreshCw className="h-4 w-4 mr-2" />
                        }
                        Fetch
                      </Button>
                    </div>
                  </div>
                  
                  {/* Error message */}
                  {fetchError && (
                    <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-200">
                        {fetchError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Position details */}
                  {positionInfo && (
                    <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-zinc-100">Position #{positionInfo.tokenId}</h3>
                        <PositionHealthIndicator />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-400">Token Pair</p>
                          <p className="text-zinc-200 font-medium">{positionInfo.token0Symbol}/{positionInfo.token1Symbol}</p>
                          <div className="flex space-x-1 text-xs text-zinc-500">
                            <span className="truncate max-w-[120px]">{positionInfo.token0}</span>
                            <span>/</span>
                            <span className="truncate max-w-[120px]">{positionInfo.token1}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-400">Fee Tier</p>
                          <p className="text-zinc-200 font-medium">{positionInfo.fee / 10000}%</p>
                          <p className="text-xs text-zinc-500">Pool volatility: {volatilityEstimate || 'Unknown'}</p>
                        </div>
                      </div>
                      
                      <Separator className="bg-zinc-800 my-2" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-400">Tick Range</p>
                          <p className="text-zinc-200 font-medium">{positionInfo.tickLower} → {positionInfo.tickUpper}</p>
                          <p className="text-xs text-zinc-500">
                            {currentPrice 
                              ? `Current price: ${currentPrice.toFixed(8)}`
                              : 'Current price: Not available'
                            }
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-zinc-400">Liquidity</p>
                          <p className="text-zinc-200 font-medium">{ethers.formatUnits(positionInfo.liquidity || '0', 0)}</p>
                          <p className="text-xs text-zinc-500">
                            {positionHealthStatus === 'in-range'
                              ? 'Currently earning fees'
                              : positionHealthStatus === 'out-of-range'
                                ? 'Not earning fees (out of range)'
                                : positionHealthStatus === 'near-edge'
                                  ? 'Earning fees (near range edge)'
                                  : 'Status unknown'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {positionHealthStatus === 'out-of-range' && (
                        <Alert className="bg-red-900/20 border-red-500/30 mt-2">
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          <AlertDescription className="text-red-200">
                            This position is currently out of range and not earning fees.
                            Automated range management will help keep it in range.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {positionHealthStatus === 'near-edge' && (
                        <Alert className="bg-yellow-900/20 border-yellow-500/30 mt-2">
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                          <AlertDescription className="text-yellow-200">
                            This position is near the edge of its range and may soon stop earning fees.
                            Automated range management will help optimize its position.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                  
                  {/* Funding configuration */}
                  {positionInfo && (
                    <div id="position-form">
                      {FundingConfigurationUI()}
                      
                      {/* Deployment status */}
                      {DeploymentStatusUI()}
                      
                      {/* Requirements/Prerequisites Info Card */}
                      <Card className="bg-blue-900/20 border-blue-500/20 mb-4 mt-4">
                        <CardContent className="pt-4">
                          <h3 className="text-sm font-medium text-zinc-100 mb-2">Requirements to create a range manager:</h3>
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
                              Valid position {positionInfo ? '✓' : '- Please enter a valid position ID'}
                            </li>
                            <li className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                              Minimum {formData.callbackFunding || (selectedChain?.defaultFunding || '0.03')} {selectedChain?.nativeCurrency || 'ETH'} on {selectedChain?.name || 'selected chain'}
                            </li>
                            <li className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                              Minimum {formData.rscFunding || '0.05'} {getRSCNetworkForChain(formData.chainId).currencySymbol} on {getRSCNetworkForChain(formData.chainId).name}
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                      
                      {/* Create automation button */}
                      <Button 
                        type="button"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        disabled={
                          deploymentStep !== 'idle' || 
                          !positionInfo ||
                          !formData.chainId || 
                          !formData.tokenId || 
                          !formData.callbackFunding || 
                          !formData.rscFunding
                        }
                        onClick={handleCreateAutomation}
                      >
                        Create Range Manager
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* How It Works Tab */}
          <TabsContent value="how-it-works" className="mt-6">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">How Range Manager Works</CardTitle>
                <CardDescription className="text-zinc-300">
                  Understand the technology and benefits of automated range management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="what-is" className="border-zinc-800">
                    <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                      What is Range Management?
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-300">
                      <div className="space-y-4">
                        <p>
                          Range management is the process of optimizing your Uniswap V3 position's price range to maximize fee generation. Unlike Uniswap V2, where liquidity is spread across all price points, Uniswap V3 allows you to concentrate liquidity within specific price ranges.
                        </p>
                        <p>
                          When prices move outside your defined range, your position stops earning fees. Our range manager automatically adjusts your position to keep it in the optimal range based on current market conditions.
                        </p>
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                          <h4 className="font-medium text-zinc-100 mb-2">Key Benefits:</h4>
                          <ul className="list-disc list-inside space-y-1 text-zinc-300">
                            <li>Keep positions in-range to continuously earn fees</li>
                            <li>Optimize range width based on volatility analysis</li>
                            <li>Adjust to market trends without manual intervention</li>
                            <li>Increase capital efficiency compared to manual management</li>
                          </ul>
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
                        <p>
                          Our system uses Reactive Smart Contracts (RSCs) to continuously monitor price movements in your token pair. When specific conditions are met, it automatically adjusts your position range.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Continuous Monitoring</h4>
                            <p className="text-sm">
                              Monitors price movements and analyzes volatility patterns
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Smart Algorithms</h4>
                            <p className="text-sm">
                              Determines optimal range width based on market conditions
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Automatic Execution</h4>
                            <p className="text-sm">
                              Withdraws and redeposits liquidity with optimized parameters
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Fee Collection</h4>
                            <p className="text-sm">
                              Collects earned fees during each adjustment
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="adjustment-strategies" className="border-zinc-800">
                    <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                      Adjustment Strategies
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-300">
                      <div className="space-y-4">
                        <p>
                          Our system employs several strategies to determine when and how to adjust your position range:
                        </p>
                        <div className="space-y-4">
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Out-of-Range Detection</h4>
                            <p className="text-sm">
                              Immediately adjusts positions that have moved out of range to restore fee generation
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Volatility-Based Sizing</h4>
                            <p className="text-sm">
                              Widens ranges during high volatility periods and narrows them during stable periods to optimize fee capture
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Trend Following</h4>
                            <p className="text-sm">
                              Creates asymmetric ranges that account for directional price trends
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Gas-Aware Execution</h4>
                            <p className="text-sm">
                              Balances adjustment frequency with gas costs to maximize net returns
                            </p>
                          </div>
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
                            <h4 className="font-medium text-zinc-100 mb-2">Choose Appropriate Pairs</h4>
                            <p className="text-sm">
                              Range management works best for pairs with moderate volatility and sufficient trading volume
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Provide Sufficient Funding</h4>
                            <p className="text-sm">
                              Ensure both contracts are adequately funded to cover gas costs for multiple adjustments
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Monitor Occasionally</h4>
                            <p className="text-sm">
                              While the system is fully automated, periodically check on performance and contract balances
                            </p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-lg">
                            <h4 className="font-medium text-zinc-100 mb-2">Start with a Test Position</h4>
                            <p className="text-sm">
                              Begin with a smaller position to observe the system's behavior before committing larger amounts
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
                          <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>Range adjustments will consume some gas, which is paid from the range adjuster contract</li>
                            <li>The system will automatically collect any accrued fees during range adjustments</li>
                            <li>Adjustments are triggered by market conditions, not on a fixed schedule</li>
                            <li>Highly volatile markets may require more frequent adjustments</li>
                            <li>You can always manually unregister your position if needed</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default UniswapV3RangeManagerPage;
      <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
        <h3 className="text-sm font-medium text-zinc-100">Contract Funding</h3>
        
        {/* Range Adjuster Funding */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-zinc-200">
              Range Adjuster Funding ({selectedChain?.nativeCurrency || 'ETH'})
            </label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-zinc-200">
                <p className="text-sm">
                  Amount of {selectedChain?.nativeCurrency || 'ETH'} to fund the range adjuster contract.
                  This is used to pay for gas when adjusting your position ranges.
                  Recommended: {selectedChain?.defaultFunding || '0.03'} {selectedChain?.nativeCurrency || 'ETH'}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input 
            type="number"
            step="0.001"
            placeholder={`Enter amount (${selectedChain?.nativeCurrency || 'ETH'})`}
            value={formData.callbackFunding}
            onChange={(e) => setFormData({...formData, callbackFunding: e.target.value})}
            className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        
        {/* RSC Contract Funding */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-zinc-200">
              RSC Contract Funding ({rscNetwork.currencySymbol})
            </label>
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-zinc-400" />
              </HoverCardTrigger>
              <HoverCardContent className="w-80 text-zinc-200">
                <p className="text-sm">
                  Amount of {rscNetwork.currencySymbol} to fund the Reactive Smart Contract on {rscNetwork.name}.
                  This is used to monitor pool prices and calculate optimal ranges.
                  Recommended: 0.05 {rscNetwork.currencySymbol}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input 
            type="number"
            step="0.001"
            placeholder={`Enter amount (${rscNetwork.currencySymbol})`}
            value={formData.rscFunding}
            onChange={(e) => setFormData({...formData, rscFunding: e.target.value})}
            className="bg-blue-900/20 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
      </div>
    );
  };
  
  // Deployment Status UI component
  const DeploymentStatusUI = () => {
    // Get RSC network details based on source chain
    const rscNetwork = getRSCNetworkForChain(formData.chainId);
    
    return (
      <>
      {deploymentStep !== 'idle' && (
        <Alert className={
          deploymentStep === 'complete' 
            ? "bg-green-900/20 border-green-500/50" 
            : "bg-blue-900/20 border-blue-500/50"
        }>
          {deploymentStep === 'complete' 
            ? <CheckCircle className="h-4 w-4 text-green-400" /> 
            : <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
          }
          <AlertDescription className="text-zinc-200">
            {deploymentStep === 'deploying-adjuster' && (
              <div className="flex flex-col gap-1">
                <span>Deploying range adjuster contract...</span>
                <span className="text-xs text-zinc-400">This will require approximately {formData.callbackFunding} {selectedChain?.nativeCurrency || 'ETH'} plus gas fees</span>
              </div>
            )}
            {deploymentStep === 'switching-network' && (
              <div className="flex flex-col gap-1">
                <span>Switching to {rscNetwork.name}...</span>
                <span className="text-xs text-zinc-400">Please confirm the network change in your wallet</span>
              </div>
            )}
            {deploymentStep === 'deploying-rsc' && (
              <div className="flex flex-col gap-1">
                <span>Deploying reactive smart contract...</span>
                <span className="text-xs text-zinc-400">This will require {formData.rscFunding} {rscNetwork.currencySymbol} plus gas fees</span>
              </div>
            )}
            {deploymentStep === 'switching-back' && (
              <div className="flex flex-col gap-1">
                <span>Switching back to {selectedChain?.name}...</span>
                <span className="text-xs text-zinc-400">Please confirm the network change in your wallet</span>
              </div>
            )}
            {deploymentStep === 'registering' && (
              <div className="flex flex-col gap-1">
                <span>Registering position #{formData.tokenId}...</span>
                <span className="text-xs text-zinc-400">Please confirm the transaction in your wallet</span>
              </div>
            )}
            {deploymentStep === 'complete' && (
              <div className="flex flex-col gap-1">
                <span>Range manager created successfully!</span>
                <span className="text-xs text-zinc-400">Your position is now being actively managed 24/7</span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      </>
    );
  };
  
  // Position Health Indicator component
  const PositionHealthIndicator = () => {
    if (positionHealthStatus === 'unknown') {
      return (
        <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700">
          <div className="w-2 h-2 rounded-full bg-zinc-500 mr-1" />
          Unknown
        </Badge>
      );
    }
    
    if (positionHealthStatus === 'in-range') {
      return (
        <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-700">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
          In Range
        </Badge>
      );
    }
    
    if (positionHealthStatus === 'near-edge') {
      return (
        <Badge variant="outline" className="bg-yellow-900/20 text-yellow-300 border-yellow-700">
          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
          Near Edge
        </Badge>
      );
    }
    
    if (positionHealthStatus === 'out-of-range') {
      return (
        <Badge variant="outline" className="bg-red-900/20 text-red-300 border-red-700">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
          Out of Range
        </Badge>
      );
    }
    
    return null;
  };
  
  // Position Card component for displaying user positions
  const PositionCard = ({ position }: { position: NftPosition }) => {
    return (
      <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 hover:border-blue-600 transition-all overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-zinc-100">Position #{position.tokenId}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-700">
                Fee: {position.fee / 10000}%
              </Badge>
            </div>
          </div>
          <CardDescription className="text-zinc-300">
            {position.token0Symbol}/{position.token1Symbol}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <p className="text-zinc-400">Tick Range</p>
                <p className="text-zinc-200">{position.tickLower} → {position.tickUpper}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-400">Liquidity</p>
                <p className="text-zinc-200">{ethers.formatUnits(position.liquidity || '0', 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-t border-zinc-800 px-6 py-3">
          <Button 
            variant="default" 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => handlePositionSelect(position.tokenId)}
          >
            Select
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (

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
                name: chain.nativeCurrency,
                symbol: chain.nativeCurrency,
                decimals: 18
              },
              rpcUrls: [chain.rpcUrl || ''],
              blockExplorerUrls: [
                chain.id === '1' ? 'https://etherscan.io' : 
                chain.id === '11155111' ? 'https://sepolia.etherscan.io' : ''
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

  // Helper function to get the RSC network for a chain
  function getRSCNetworkForChain(sourceChainId:string) {
    // Production chains use Reactive Mainnet
    if (sourceChainId === '1') {
      return {
        chainId: '1597',
        name: 'Reactive Mainnet',
        rpcUrl: 'https://mainnet-rpc.rnk.dev/',
        currencySymbol: 'REACT'
      };
    } 
    // Testnets use Kopli
    else {
      return {
        chainId: '5318008',
        name: 'Kopli Testnet',
        rpcUrl: 'https://kopli-rpc.rnk.dev',
        currencySymbol: 'KOPLI'
      };
    }
  }

  // Function to switch to RSC network
  async function switchToRSCNetwork(sourceChainId:string) {
    if (!window.ethereum) throw new Error('MetaMask or compatible wallet not detected');

    try {
      // Get the appropriate RSC network based on source chain
      const rscNetwork = getRSCNetworkForChain(sourceChainId);
      const rscChainIdHex = `0x${parseInt(rscNetwork.chainId).toString(16)}`;
      
      // Check if already on the correct RSC network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId === rscNetwork.chainId) {
        console.log(`Already on ${rscNetwork.name}`);
        return true;
      }
      
      console.log(`Switching to ${rscNetwork.name}...`);
      
      // Try to switch to the RSC network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: rscChainIdHex }],
        });
      } catch (switchError:any) {
        // If the chain hasn't been added to MetaMask
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
              blockExplorerUrls: [
                rscNetwork.chainId === '1597' ? 'https://reactscan.net' : 'https://kopli.reactscan.net'
              ]
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      // Add a small delay to allow the network change to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the network after switching
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const updatedNetwork = await updatedProvider.getNetwork();
      const updatedChainId = updatedNetwork.chainId.toString();
      
      if (updatedChainId !== rscNetwork.chainId) {
        throw new Error(`Network switch verification failed. Expected ${rscNetwork.name} (${rscNetwork.chainId}) but got ${updatedChainId}`);
      }
      
      return true;
    } catch (error:any) {
      if (error.code === 4001) {
        throw new Error('User rejected the request to switch networks');
      }
      
      throw new Error(`Failed to switch to RSC network: ${error.message || 'Unknown error'}`);
    }
  }

  // Function to get the correct callback sender address based on chain ID
  function getCallbackSenderAddress(chainId: string): string {
    const callbackAddresses: Record<string, string> = {
      '1': '0x1D5267C1bb7D8bA68964dDF3990601BDB7902D76',
      '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA'
    };

    return callbackAddresses[chainId] || '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA';
  }

  // Function to fetch a user's positions
  const fetchUserPositions = async () => {
    if (!connectedAccount || !selectedChain) return;
    
    setIsLoadingUserPositions(true);
    setFetchError(null);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (network.chainId.toString() !== selectedChain.id) {
        await switchNetwork(selectedChain.id);
      }
      
      const positionManagerInterface = new ethers.Interface([
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
        'function balanceOf(address owner) view returns (uint256)',
        'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
      ]);
      
      const positionManagerContract = new ethers.Contract(
        selectedChain.positionManagerAddress,
        positionManagerInterface,
        provider
      );
      
      // Get the number of positions owned by the user
      const balance = await positionManagerContract.balanceOf(connectedAccount);
      
      if (balance === 0) {
        setUserPositions([]);
        setIsLoadingUserPositions(false);
        return;
      }
      
      // Fetch each position
      const positions: NftPosition[] = [];
      
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await positionManagerContract.tokenOfOwnerByIndex(connectedAccount, i);
          const position = await fetchPositionDetails(tokenId.toString());
          if (position) {
            positions.push(position);
          }
        } catch (error) {
          console.error(`Error fetching position at index ${i}:`, error);
        }
      }
      
      setUserPositions(positions);
    } catch (error: any) {
      console.error('Error fetching user positions:', error);
      setFetchError(`Failed to fetch positions: ${error.message}`);
    } finally {
      setIsLoadingUserPositions(false);
    }
  };

  // Function to fetch details about a specific position
  const fetchPositionDetails = async (tokenId: string): Promise<NftPosition | null> => {
    if (!selectedChain) return null;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const positionManagerInterface = new ethers.Interface([
        'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
      ]);
      
      const positionManagerContract = new ethers.Contract(
        selectedChain.positionManagerAddress,
        positionManagerInterface,
        provider
      );
      
      const position = await positionManagerContract.positions(tokenId);
      
      // Fetch token symbols
      const token0Symbol = await fetchTokenSymbol(position.token0);
      const token1Symbol = await fetchTokenSymbol(position.token1);
      
      return {
        tokenId,
        token0: position.token0,
        token1: position.token1,
        token0Symbol,
        token1Symbol,
        fee: position.fee,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        liquidity: position.liquidity.toString(),
        owner: connectedAccount
      };
    } catch (error: any) {
      console.error('Error fetching position details:', error);
      return null;
    }
  };

  // Function to fetch token symbol
  const fetchTokenSymbol = async (tokenAddress: string): Promise<string> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const tokenInterface = new ethers.Interface([
        'function symbol() view returns (string)'
      ]);
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenInterface,
        provider
      );
      
      return await tokenContract.symbol();
    } catch (error) {
      console.error('Error fetching token symbol:', error);
      return 'Unknown';
    }
  };

  // Function to handle specific position selection
  const handlePositionSelect = async (tokenId: string) => {
    setFormData(prev => ({
      ...prev,
      tokenId
    }));
    
    await handleFetchPositionInfo(tokenId);
    
    // Scroll to the form section
    document.getElementById('position-form')?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  // Function to fetch position info
  const handleFetchPositionInfo = async (tokenId: string) => {
    if (!selectedChain) {
      setFetchError('Please select a chain first');
      return;
    }
    
    setIsLoadingPosition(true);
    setFetchError(null);
    
    try {
      const position = await fetchPositionDetails(tokenId);
      
      if (!position) {
        throw new Error('Failed to fetch position details');
      }
      
      setPositionInfo(position);
      
      // Fetch current price to determine position health
      await fetchCurrentPrice(position);
      
      // Estimate volatility based on recent price movements
      await estimateVolatility(position);
      
    } catch (error: any) {
      console.error('Error fetching position info:', error);
      setFetchError(error.message);
      setPositionInfo(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  // Function to fetch current price
  const fetchCurrentPrice = async (position: NftPosition) => {
    if (!selectedChain) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get the pool address from the factory
      const factoryInterface = new ethers.Interface([
        'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
      ]);
      
      const factoryContract = new ethers.Contract(
        selectedChain.factoryAddress,
        factoryInterface,
        provider
      );
      
      const poolAddress = await factoryContract.getPool(
        position.token0,
        position.token1,
        position.fee
      );
      
      if (poolAddress === ethers.ZeroAddress) {
        throw new Error('Pool not found');
      }
      
      // Get current sqrtPriceX96 from pool
      const poolInterface = new ethers.Interface([
        'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
      ]);
      
      const poolContract = new ethers.Contract(
        poolAddress,
        poolInterface,
        provider
      );
      
      const slot0 = await poolContract.slot0();
      const currentTick = slot0.tick;
      
      // Convert tick to price
      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const Q96 = 2n ** 96n;
      const price = Number((sqrtPriceX96 * sqrtPriceX96 * 10n ** 18n) / (Q96 * Q96)) / 10**18;
      
      setCurrentPrice(price);
      
      // Determine position health
      if (currentTick >= position.tickLower && currentTick <= position.tickUpper) {
        // Check if near edge (within 10% of range)
        const rangeTicks = position.tickUpper - position.tickLower;
        const buffer = rangeTicks * 0.1;
        
        if (currentTick <= position.tickLower + buffer || currentTick >= position.tickUpper - buffer) {
          setPositionHealthStatus('near-edge');
        } else {
          setPositionHealthStatus('in-range');
        }
      } else {
        setPositionHealthStatus('out-of-range');
      }
      
    } catch (error: any) {
      console.error('Error fetching current price:', error);
      setPositionHealthStatus('unknown');
    }
  };

  // Function to estimate volatility
  const estimateVolatility = async (position: NftPosition) => {
    if (!selectedChain) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get the pool address from the factory
      const factoryInterface = new ethers.Interface([
        'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
      ]);
      
      const factoryContract = new ethers.Contract(
        selectedChain.factoryAddress,
        factoryInterface,
        provider
      );
      
      const poolAddress = await factoryContract.getPool(
        position.token0,
        position.token1,
        position.fee
      );
      
      if (poolAddress === ethers.ZeroAddress) {
        throw new Error('Pool not found');
      }
      
      // This is a simplified volatility estimation
      // In a real implementation, you would query historical ticks
      // and calculate actual volatility
      
      // For this demonstration, we'll use the fee tier as a proxy for expected volatility
      let volatilityEstimate;
      switch (position.fee) {
        case 500: // 0.05% fee tier
          volatilityEstimate = 'Low (~1-3% daily)';
          break;
        case 3000: // 0.3% fee tier
          volatilityEstimate = 'Medium (~3-7% daily)';
          break;
        case 10000: // 1% fee tier
          volatilityEstimate = 'High (>7% daily)';
          break;
        default:
          volatilityEstimate = 'Unknown';
      }
      
      setVolatilityEstimate(volatilityEstimate);
      
    } catch (error: any) {
      console.error('Error estimating volatility:', error);
      setVolatilityEstimate(null);
    }
  };

  // Deploy the range adjuster contract
  async function deployRangeAdjuster(chain: ChainConfig, fundingAmount: string): Promise<string> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get the current network to ensure we're using the right callback address
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      // Get the correct callback sender address for this chain
      const callbackSenderAddress = getCallbackSenderAddress(currentChainId);
      
      if (!callbackSenderAddress || !ethers.isAddress(callbackSenderAddress)) {
        throw new Error("Invalid callback sender address for this chain.");
      }
      
      console.log("Chain ID:", currentChainId);
      console.log("Using callback sender address:", callbackSenderAddress);
      console.log("Using position manager address:", chain.positionManagerAddress);
      console.log("Funding amount:", fundingAmount);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        chain.rangeAdjusterABI,
        chain.rangeAdjusterBytecode,
        signer
      );
      
      // Deploy with required constructor parameters and funding
      const contract = await factory.deploy(
        chain.positionManagerAddress,
        callbackSenderAddress,
        { value: ethers.parseEther(fundingAmount) }
      );
      
      console.log("Deployment transaction sent:", contract.deploymentTransaction()?.hash);
      
      // Wait for deployment
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      console.log("Range Adjuster deployed at:", deployedAddress);
      return deployedAddress;
    } catch (error) {
      console.error("Detailed error in deployRangeAdjuster:", error);
      
      if (error instanceof Error) {
        throw new Error(`Range Adjuster deployment failed: ${error.message}`);
      } else {
        throw new Error(`Range Adjuster deployment failed with unknown error: ${String(error)}`);
      }
    }
  }

  // Deploy the RSC
  async function deployRangeManagerRSC(adjusterAddress: string, chain: ChainConfig, fundingAmount: string): Promise<string> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log("Deploying Range Manager RSC...");
      console.log("Range Adjuster address:", adjusterAddress);
      console.log("Funding amount:", fundingAmount);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        chain.rangeManagerReactiveABI,
        chain.rangeManagerReactiveBytecode,
        signer
      );
      
      // Deploy with the range adjuster address and funding
      const contract = await factory.deploy(
        adjusterAddress,
        { value: ethers.parseEther(fundingAmount) }
      );
      
      console.log("RSC deployment transaction sent:", contract.deploymentTransaction()?.hash);
      
      // Wait for deployment
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      console.log("Range Manager RSC deployed at:", deployedAddress);
      return deployedAddress;
    } catch (error) {
      console.error("Detailed error in deployRangeManagerRSC:", error);
      
      if (error instanceof Error) {
        throw new Error(`RSC deployment failed: ${error.message}`);
      } else {
        throw new Error(`RSC deployment failed with unknown error: ${String(error)}`);
      }
    }
  }

  // Register a position with the range adjuster
  async function registerPosition(adjusterAddress: string, tokenId: string): Promise<boolean> {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log("Registering position...");
      console.log("Range Adjuster address:", adjusterAddress);
      console.log("Token ID:", tokenId);
      
      // Create contract instance
      const contract = new ethers.Contract(
        adjusterAddress,
        [
          'function registerPosition(uint256 tokenId) external'
        ],
        signer
      );
      
      // Register the position
      const tx = await contract.registerPosition(tokenId);
      await tx.wait();
      
      console.log("Position registered successfully");
      return true;
    } catch (error) {
      console.error("Error registering position:", error);
      
      if (error instanceof Error) {
        throw new Error(`Position registration failed: ${error.message}`);
      } else {
        throw new Error(`Position registration failed with unknown error: ${String(error)}`);
      }
    }
  }

  // Handle the full deployment and registration process
  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Form validation
      if (!formData.chainId) {
        throw new Error('Please select a blockchain network');
      }
      if (!formData.tokenId) {
        throw new Error('Please enter a valid position token ID');
      }
      if (!formData.callbackFunding || parseFloat(formData.callbackFunding) <= 0) {
        throw new Error('Please enter a valid callback funding amount');
      }
      if (!formData.rscFunding || parseFloat(formData.rscFunding) <= 0) {
        throw new Error('Please enter a valid RSC funding amount');
      }
      
      // Get selected chain configuration
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === formData.chainId);
      if (!selectedChain) throw new Error('Invalid chain selected');

      // Check if user is on the correct network
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== formData.chainId) {
        throw new Error(`Please switch to ${selectedChain.name} network before proceeding`);
      }

      // Check if user has enough balance for contract deployment
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      const balance = await provider.getBalance(signerAddress);
      
      // Add 10% to account for gas
      const callbackFunding = ethers.parseEther(formData.callbackFunding);
      const estimatedCost = callbackFunding + (callbackFunding * BigInt(10)) / BigInt(100);

      if (balance < estimatedCost) {
        throw new Error(`Insufficient balance for deployment. You need at least ${ethers.formatEther(estimatedCost)} ${selectedChain.nativeCurrency} on ${selectedChain.name}`);
      }

      // 1. Deploy Range Adjuster Contract
      setDeploymentStep('deploying-adjuster');
      let adjusterAddress;
      try {
        adjusterAddress = await deployRangeAdjuster(selectedChain, formData.callbackFunding);
      } catch (error: any) {
        console.error("Range adjuster deployment failed:", error);
        throw new Error(`Failed to deploy range adjuster: ${error.message || 'Unknown error'}`);
      }

      // 2. Switch to the appropriate RSC network based on source chain
      setDeploymentStep('switching-network');
      
      // Determine the RSC network to use based on source chain
      const rscNetwork = getRSCNetworkForChain(formData.chainId);
      
      try {
        await switchToRSCNetwork(formData.chainId);
      } catch (error: any) {
        throw new Error(`Failed to switch to ${rscNetwork.name} network: ${error.message}. Please add ${rscNetwork.name} network to your wallet manually.`);
      }

      // Check if user has enough REACT/KOPLI for RSC deployment
      const rscProvider = new ethers.BrowserProvider(window.ethereum);
      const rscBalance = await rscProvider.getBalance(signerAddress);
      
      // Add 10% to account for gas
      const rscFunding = ethers.parseEther(formData.rscFunding);
      const rscEstimatedCost = rscFunding + (rscFunding * BigInt(10)) / BigInt(100);

      if (rscBalance < rscEstimatedCost) {
        throw new Error(`Insufficient ${rscNetwork.currencySymbol} balance. You need at least ${ethers.formatEther(rscEstimatedCost)} ${rscNetwork.currencySymbol} on ${rscNetwork.name} network. Please obtain some ${rscNetwork.currencySymbol} from the faucet.`);
      }

      // 3. Deploy RSC
      setDeploymentStep('deploying-rsc');
      try {
        await deployRangeManagerRSC(adjusterAddress, selectedChain, formData.rscFunding);
      } catch (error: any) {
        console.error("RSC deployment failed:", error);
        if (error.message.includes("insufficient funds")) {
          throw new Error(`RSC deployment failed: Insufficient ${rscNetwork.currencySymbol}. You need at least ${formData.rscFunding} ${rscNetwork.currencySymbol} plus gas.`);
        } else {
          throw new Error(`RSC deployment failed: ${error.message}`);
        }
      }

      // 4. Switch back to the original network for position registration
      setDeploymentStep('switching-back');
      try {
        if (formData.chainId !== rscNetwork.chainId) {
          await switchNetwork(formData.chainId);
        }
      } catch (error: any) {
        console.warn(`Note: Failed to switch back to original network: ${error.message}`);
        // Don't throw here, as we need to proceed with registration
      }

      // 5. Register the position with the range adjuster
      setDeploymentStep('registering');
      try {
        await registerPosition(adjusterAddress, formData.tokenId);
      } catch (error: any) {
        console.error("Position registration failed:", error);
        throw new Error(`Position registration failed: ${error.message}`);
      }

      setDeploymentStep('complete');
      toast.success('Range Manager automation created successfully!');
      
      // Add a helpful message about what to expect
      setTimeout(() => {
        toast.success('Your position is now being actively managed 24/7');
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating automation:', error);
      
      // Clear the deployment step to allow retrying
      setDeploymentStep('idle');
      
      // Show detailed error message
      toast.error(error.message || 'Failed to create automation');
      
      // Provide guidance based on error type
      if (error.message.includes("Insufficient balance") || error.message.includes("insufficient funds")) {
        toast.error('Please make sure you have enough funds for both deployment and gas fees');
      } else if (error.message.includes("switch")) {
        toast.error('Please add the required RSC network to your wallet if not already added');
      }
    }
  };
