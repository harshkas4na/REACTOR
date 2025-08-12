'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User,
  CheckCircle,
  AlertCircle,
  Minimize2,
  Maximize2,
  ExternalLink,
  Info,
  Rocket,
  Clock,
  AlertTriangle,
  Copy,
  Sparkles,
  TrendingDown,
  Coins,
  Network,
  Expand,
  Shrink,
  HelpCircle,
  Zap,
  Shield,
  BookOpen,
  Activity,
  DollarSign,
  Heart,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';
import { useWeb3 } from '@/app/_context/Web3Context';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { AIUtils } from '@/utils/ai';
import { AIDeploymentHandler } from './AIDeploymentHandler';
// RE-ENABLE_AAVE_PROTECTION: Uncomment the line below to restore Aave deployment UI when enabling the feature.
// import { AaveDeploymentHandler } from './AaveDeploymentHandler';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { FormattedMessage } from './FormattedMessage';
import { PairInfoDisplay } from './PairInfoDisplay';

// Enhanced interfaces to match the updated hook
interface AavePositionInfo {
  totalCollateralETH: string;
  totalDebtETH: string;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  availableBorrowsETH: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  userAssets: Array<{
    address: string;
    symbol: string;
    name: string;
    collateralBalance: number;
    debtBalance: number;
    collateralUSD: number;
    debtUSD: number;
    priceUSD: number;
    decimals: number;
  }>;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation' | 'choice' | 'number';
  automationConfig?: any;
  pairInfo?: {
    pairAddress: string;
    currentPrice: number;
    token0: string;
    token1: string;
  };
  aavePositionInfo?: AavePositionInfo;
  showDeploymentHandler?: boolean;
}

interface AIResponse {
  success: boolean;
  data?: {
    message: string;
    followUpMessage?: string;
    intent: string;
    needsUserInput: boolean;
    inputType?: 'amount' | 'token' | 'network' | 'confirmation' | 'choice' | 'number';
    options?: Array<{ value: string; label: string }>;
    automationConfig?: any;
    nextStep?: string;
    pairInfo?: {
      pairAddress: string;
      currentPrice: number;
      token0: string;
      token1: string;
    };
    aavePositionInfo?: AavePositionInfo;
  };
  error?: string;
}

// Aave Position Display Component
interface AavePositionDisplayProps {
  positionInfo: AavePositionInfo;
  isExpanded?: boolean;
}

const AavePositionDisplay: React.FC<AavePositionDisplayProps> = ({ 
  positionInfo, 
  isExpanded = false 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!positionInfo.hasPosition) {
    return (
      <div className="my-4 p-3 sm:p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-amber-100 text-sm sm:text-base">No Aave Position Found</h3>
            <p className="text-xs sm:text-sm text-amber-200">
              You need an active Aave lending position to use liquidation protection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const healthFactorColor = parseFloat(positionInfo.healthFactor) > 1.5 
    ? 'text-green-400' 
    : parseFloat(positionInfo.healthFactor) > 1.2 
    ? 'text-amber-400' 
    : 'text-red-400';

  const healthFactorBg = parseFloat(positionInfo.healthFactor) > 1.5 
    ? 'bg-green-900/20 border-green-500/30' 
    : parseFloat(positionInfo.healthFactor) > 1.2 
    ? 'bg-amber-900/20 border-amber-500/30' 
    : 'bg-red-900/20 border-red-500/30';

  return (
    <div className={`my-4 p-3 sm:p-4 ${healthFactorBg} rounded-lg border`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-100 text-sm sm:text-base">Aave Position</h3>
            <p className="text-xs sm:text-sm text-zinc-300">Current lending position details</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-zinc-400 hover:text-zinc-200 p-1 sm:p-2"
        >
          {showDetails ? <Shrink className="h-3 w-3 sm:h-4 sm:w-4" /> : <Expand className="h-3 w-3 sm:h-4 sm:w-4" />}
        </Button>
      </div>

      {/* Main Position Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div className="bg-zinc-800/50 p-2 sm:p-3 rounded-lg">
          <p className="text-xs sm:text-sm text-zinc-400 mb-1">Total Collateral</p>
          <p className="text-zinc-200 font-medium text-base sm:text-lg">
            ${positionInfo.totalCollateralUSD.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">
            ({parseFloat(positionInfo.totalCollateralETH).toFixed(6)} ETH)
          </p>
        </div>
        
        <div className="bg-zinc-800/50 p-2 sm:p-3 rounded-lg">
          <p className="text-xs sm:text-sm text-zinc-400 mb-1">Total Debt</p>
          <p className="text-zinc-200 font-medium text-base sm:text-lg">
            ${positionInfo.totalDebtUSD.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">
            ({parseFloat(positionInfo.totalDebtETH).toFixed(6)} ETH)
          </p>
        </div>
      </div>

      {/* Health Factor - Prominent Display */}
      <div className="bg-zinc-800/50 p-3 sm:p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-zinc-400 mb-1">Health Factor</p>
            <p className={`font-bold text-lg sm:text-xl ${healthFactorColor}`}>
              {parseFloat(positionInfo.healthFactor).toFixed(3)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                parseFloat(positionInfo.healthFactor) > 1.5 
                  ? 'border-green-500 text-green-400' 
                  : parseFloat(positionInfo.healthFactor) > 1.2 
                  ? 'border-amber-500 text-amber-400' 
                  : 'border-red-500 text-red-400'
              }`}
            >
              {parseFloat(positionInfo.healthFactor) > 1.5 
                ? 'Healthy' 
                : parseFloat(positionInfo.healthFactor) > 1.2 
                ? 'At Risk' 
                : 'Critical'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Detailed Asset Breakdown */}
      {showDetails && positionInfo.userAssets && positionInfo.userAssets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-medium text-zinc-200">Asset Breakdown:</h4>
            <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
              🔮 Live from Aave Oracle
            </div>
          </div>
          <div className="grid gap-2">
            {positionInfo.userAssets.map((asset, index) => (
              <div key={asset.symbol + index} className="flex justify-between items-center p-2 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-400">
                      {asset.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{asset.symbol}</p>
                    <p className="text-xs text-zinc-400">${asset.priceUSD.toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {asset.collateralBalance > 0 && (
                    <div className="text-green-400 text-xs">
                      <span className="font-medium">+{asset.collateralBalance.toFixed(4)}</span>
                      <span className="text-xs ml-1">(${asset.collateralUSD.toFixed(2)})</span>
                    </div>
                  )}
                  {asset.debtBalance > 0 && (
                    <div className="text-red-400 text-xs">
                      <span className="font-medium">-{asset.debtBalance.toFixed(4)}</span>
                      <span className="text-xs ml-1">(${asset.debtUSD.toFixed(2)})</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {showDetails && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-400">LTV</p>
            <p className="text-zinc-200 font-medium">{positionInfo.ltv}%</p>
          </div>
          <div>
            <p className="text-zinc-400">Liquidation Threshold</p>
            <p className="text-zinc-200 font-medium">{positionInfo.currentLiquidationThreshold}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Component Props Interface
interface ReactorAIProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReactorAI({ isOpen, onClose }: ReactorAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDeploymentHandler, setShowDeploymentHandler] = useState(false);
  const [currentDeploymentConfig, setCurrentDeploymentConfig] = useState<any>(null);
  const [deploymentType, setDeploymentType] = useState<'stop_order' | 'aave_protection'>('stop_order');
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { account, selectedNetwork } = useWeb3();
  const router = useRouter();

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Avoid layout shifts when AI opens; overlay floats above content
  useEffect(() => {
    return () => {
      document.body.style.marginRight = '0';
      document.body.style.transition = '';
    };
  }, []);

  // Generate conversation ID on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newConversationId);
      
      // Check for saved deployment configuration
      const savedConfig = AIUtils.ConfigManager.peekConfig();
      
      // Add enhanced welcome message
      let welcomeContent = "Hi! I'm **Reactor AI** ✨ Your intelligent DeFi automation assistant!\n\n🚀 **I can help you:**\n• **Create Stop Orders** - Protect your tokens from price drops\n• **Protect Aave Positions** - Guard your loans against liquidation\n• **Learn About Reactor** - Understand RSCs and DeFi automation\n• **Check Balances** - Get real-time token information\n• **Find Trading Pairs** - Discover available markets\n\n💡 **Quick Examples:**\n• \"Create a stop order for my ETH\"\n• \"Protect my Aave position from liquidation\"\n• \"What is Reactor?\"\n• \"How much USDC do I have?\"\n• \"Tell me about RSCs\"";
      
      if (savedConfig) {
        welcomeContent += "\n\n🎯 **I found a saved configuration!** You can say \"deploy my automation\" to continue with your previous setup.";
        setCurrentDeploymentConfig(savedConfig);
      }
      
      welcomeContent += "\n\n**What would you like to do today?** 🎯";
      
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        type: 'ai',
        content: welcomeContent,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // Track conversation started
      AIUtils.Analytics.trackEvent('ai_conversation_started', {
        hasWallet: !!account,
        network: selectedNetwork,
        hasSavedConfig: !!savedConfig
      });
    }
  }, [isOpen, conversationId, account, selectedNetwork]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChainIdFromNetwork = (network: string): number => {
    const networkMap: { [key: string]: number } = {
      'ETHEREUM': 1,
      'SEPOLIA': 11155111,
      'AVALANCHE': 43114,
      'Lasna': 5318007,
      'REACT': 1597,
      'ARBITRUM': 42161,
      'MANTA': 169,
      'BASE': 8453,
      'BSC': 56,
      'POLYGON': 137,
      'POLYGON_ZKEVM': 1101,
      'OPBNB': 204
    };
    return networkMap[network] || 1;
  };

  // Enhanced sendMessage function to handle multiple AI messages and Aave data
  const sendMessage = async (content: string, isOptionSelection: boolean = false) => {
    if (!content.trim() && !isOptionSelection) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('https://app.thereactor.in/api/ai-automation/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
          connectedWallet: account,
          currentNetwork: getChainIdFromNetwork(selectedNetwork)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();

      if (data.success && data.data) {
        const baseTimestamp = new Date();
        await new Promise(resolve => setTimeout(resolve, 800));

        const mainMessage: Message = {
          id: `msg_${Date.now()}_ai_main`,
          type: 'ai',
          content: data.data.message,
          timestamp: baseTimestamp,
          options: data.data.options,
          inputType: data.data.inputType,
          automationConfig: data.data.automationConfig,
          pairInfo: data.data.pairInfo,
          aavePositionInfo: data.data.aavePositionInfo
        };

        setMessages(prev => [...prev, mainMessage]);

        if (data.data.followUpMessage) {
          setTimeout(() => {
            const followUpMessage: Message = {
              id: `msg_${Date.now()}_ai_followup`,
              type: 'ai',
              content: data.data?.followUpMessage || '',
              timestamp: new Date(baseTimestamp.getTime() + 1000),
              options: data.data?.needsUserInput ? data.data.options : undefined,
              inputType: data.data?.needsUserInput ? data.data.inputType : undefined,
              automationConfig: data.data?.needsUserInput ? data.data.automationConfig : undefined,
              aavePositionInfo: data.data?.needsUserInput ? data.data.aavePositionInfo : undefined
            };

            setMessages(prev => [...prev, followUpMessage]);
          }, 1200);
        }

        if (data.data.automationConfig && data.data.automationConfig.deploymentReady) {
          handleAutomationRedirect(data.data);
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Connection Error**\n\nSorry, I encountered an error: ${error.message}\n\nPlease try again in a moment! 🔄`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Connection error - please try again');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleAutomationRedirect = (responseData: any) => {
    const config = responseData.automationConfig;
    if (!config) return;

    if (config.protectionType !== undefined) {
      // RE-ENABLE_AAVE_PROTECTION: Original redirect to Aave flow disabled. To re-enable, restore the three lines below.
      // setDeploymentType('aave_protection');
      // setCurrentDeploymentConfig(config);
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_aave_coming_soon`,
        type: 'ai',
        content: '🚧 Aave Liquidation Protection is coming soon! For now, you can create a Stop Order instead.',
        timestamp: new Date()
      }]);
    } else if (config.pairAddress) {
      setDeploymentType('stop_order');
      setCurrentDeploymentConfig(config);
    }
  };

  const handleOptionSelect = (option: { value: string; label: string }) => {
    const lowerValue = option.value.toLowerCase();
    
    if (lowerValue === 'deploy now' || lowerValue === 'subscribe now') {
      handleDirectDeployment();
    } else if (lowerValue === 'manual setup') {
      handleManualSetup();
    } else {
      sendMessage(option.value, true);
    }
  };

  const handleDirectDeployment = () => {
    if (currentDeploymentConfig) {
      setShowDeploymentHandler(true);
      
      const deployMessage: Message = {
        id: `msg_${Date.now()}_deploy`,
        type: 'ai',
        // RE-ENABLE_AAVE_PROTECTION: Restore the dynamic label below when enabling Aave protection flow.
        // content: `🚀 **Perfect!** Let's deploy your ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} directly here!\n\nI'll guide you through the deployment process step by step. ✨`,
        content: `🚀 **Perfect!** Let's deploy your stop order directly here!\n\nI'll guide you through the deployment process step by step. ✨`,
        timestamp: new Date(),
        showDeploymentHandler: true
      };
      setMessages(prev => [...prev, deployMessage]);
      
      toast.success('🎯 Starting deployment process!');
    }
  };

  const handleManualSetup = () => {
    if (currentDeploymentConfig) {
      const stored = AIUtils.ConfigManager.storeConfig(currentDeploymentConfig);
      
      if (stored) {
        const redirectMessage: Message = {
          id: `msg_${Date.now()}_redirect`,
          type: 'ai',
          // RE-ENABLE_AAVE_PROTECTION: Restore the dynamic label below when enabling Aave protection flow.
          // content: `🚀 **Configuration Saved!** Redirecting you to the ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} page...`,
          content: `🚀 **Configuration Saved!** Redirecting you to the stop order page...`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, redirectMessage]);
        
        setTimeout(() => {
          // RE-ENABLE_AAVE_PROTECTION: Restore conditional path when enabling Aave protection flow.
          const redirectPath = '/automations/stop-order?from_ai=true';
          router.push(redirectPath);
          onClose();
        }, 1500);
        
        toast.success('🎯 Redirecting to setup page!');
      }
    }
  };

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      handleDirectDeployment();
    } else {
      sendMessage('no', true);
    }
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
  };

  const handleDeploymentComplete = (success: boolean, result?: any) => {
    setShowDeploymentHandler(false);
    setCurrentDeploymentConfig(null);
    
    if (success && result) {
      const successMessage: Message = {
        id: `msg_${Date.now()}_success`,
        type: 'ai',
        content: `🎉 **Deployment Successful!** Your ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} is now active!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      toast.success('🎉 Deployment successful!');
    } else {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Deployment Failed**\n\nPlease try again or contact support.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('❌ Deployment failed');
    }
  };

  const handleDeploymentCancel = () => {
    setShowDeploymentHandler(false);
    setCurrentDeploymentConfig(null);
    
    const cancelMessage: Message = {
      id: `msg_${Date.now()}_cancel`,
      type: 'ai',
      content: `📝 **Deployment Cancelled**\n\nWhat would you like to do next? 🤔`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
    toast('Deployment cancelled');
  };

  const handleQuickAction = (text: string) => {
    setInputValue(text);
  };

  // Enhanced MessageBubble component
  const MessageBubble = ({ message }: { message: Message }) => {
    return (
      <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
        <div className="flex items-start space-x-2 max-w-[95%] sm:max-w-[90%]">
          {message.type === 'ai' && (
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
          )}
          
          <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base ${
            message.type === 'user' 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted/50 text-foreground border border-border'
          }`}>
            <FormattedMessage content={message.content} />
            
            {message.aavePositionInfo && (
              <AavePositionDisplay 
                positionInfo={message.aavePositionInfo} 
                isExpanded={true}
              />
            )}
            
            {message.pairInfo && (
              <PairInfoDisplay 
                pairInfo={message.pairInfo} 
              />
            )}
            
            {message.options && message.options.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOptionSelect(option)}
                    className="w-full justify-start text-left h-auto py-2 px-3 text-sm bg-background/50 hover:bg-background border-border hover:border-primary/50 transition-colors"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            
            {message.inputType === 'confirmation' && !message.options && (
              <div className="mt-3 flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleConfirmation(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfirmation(false)}
                  className="border-border hover:bg-muted"
                >
                  No
                </Button>
              </div>
            )}
            
            {message.showDeploymentHandler && currentDeploymentConfig && (
              <div className="mt-4">
                {
                  // RE-ENABLE_AAVE_PROTECTION: Restore conditional rendering to include AaveDeploymentHandler when enabling.
                  <AIDeploymentHandler
                    automationConfig={currentDeploymentConfig}
                    onDeploymentComplete={handleDeploymentComplete}
                    onCancel={handleDeploymentCancel}
                  />
                }
              </div>
            )}
          </div>
          
          {message.type === 'user' && (
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Return null if not open
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-l border-border shadow-2xl ${
          isMobile 
            ? 'w-full' 
            : 'w-[360px] md:w-[380px] lg:w-[420px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Reactor AI</h3>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">
                  {isTyping ? 'Thinking...' : 'Online'}
                </span>
                {account && (
                  <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                    Connected
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 sm:p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          >
            {/* Render messages */}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted/50 text-foreground rounded-2xl px-3 py-2 sm:px-4 sm:py-3 border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <motion.div 
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div 
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-secondary rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 sm:p-4 bg-muted/20">
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    account 
                      ? "Ask me about DeFi automation..." 
                      : "Ask me about REACTOR..."
                  }
                  className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                  disabled={isLoading}
                  maxLength={500}
                  autoComplete="off"
                  spellCheck="false"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>

              {/* Status and Character Count */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
                  {account ? (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span>Wallet connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Connect wallet for automations</span>
                      <span className="sm:hidden">Connect wallet</span>
                    </div>
                  )}
                  {selectedNetwork && (
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                      {selectedNetwork}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs ${inputValue.length > 450 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {inputValue.length}/500
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-1">
                {[
                  { icon: Shield, label: "Stop Order", text: "Create a stop order" },
                  { icon: Heart, label: "Protection", text: "Protect my Aave position" },
                  { icon: BookOpen, label: "Learn", text: "What is Reactor?" }
                ].map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 sm:h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => handleQuickAction(action.text)}
                    disabled={isLoading}
                  >
                    <action.icon className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{action.label}</span>
                    <span className="sm:hidden">{action.label.split(' ')[0]}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}