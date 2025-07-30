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
import { AaveDeploymentHandler } from './AaveDeploymentHandler';
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

// NEW: Aave Position Display Component
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
      <div className="my-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-amber-100">No Aave Position Found</h3>
            <p className="text-sm text-amber-200">
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
    <div className={`my-4 p-4 ${healthFactorBg} rounded-lg border`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-100">Aave Position</h3>
            <p className="text-sm text-zinc-300">Current lending position details</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {showDetails ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Position Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 p-3 rounded-lg">
          <p className="text-sm text-zinc-400 mb-1">Total Collateral</p>
          <p className="text-zinc-200 font-medium text-lg">
            ${positionInfo.totalCollateralUSD.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">
            ({parseFloat(positionInfo.totalCollateralETH).toFixed(6)} ETH)
          </p>
        </div>
        
        <div className="bg-zinc-800/50 p-3 rounded-lg">
          <p className="text-sm text-zinc-400 mb-1">Total Debt</p>
          <p className="text-zinc-200 font-medium text-lg">
            ${positionInfo.totalDebtUSD.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">
            ({parseFloat(positionInfo.totalDebtETH).toFixed(6)} ETH)
          </p>
        </div>
      </div>

      {/* Health Factor - Prominent Display */}
      <div className="bg-zinc-800/50 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Health Factor</p>
            <p className={`font-bold text-2xl ${healthFactorColor}`}>
              {parseFloat(positionInfo.healthFactor).toFixed(3)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <Badge 
              variant="outline" 
              className={`${
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-200">Asset Breakdown:</h4>
            <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
              🔮 Live from Aave Oracle
            </div>
          </div>
          <div className="grid gap-2">
            {positionInfo.userAssets.map((asset, index) => (
              <div key={asset.symbol + index} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
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
                    <div className="text-green-400 text-sm">
                      <span className="font-medium">+{asset.collateralBalance.toFixed(4)}</span>
                      <span className="text-xs ml-1">(${asset.collateralUSD.toFixed(2)})</span>
                    </div>
                  )}
                  {asset.debtBalance > 0 && (
                    <div className="text-red-400 text-sm">
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

export default function ReactorAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDeploymentHandler, setShowDeploymentHandler] = useState(false);
  const [currentDeploymentConfig, setCurrentDeploymentConfig] = useState<any>(null);
  const [deploymentType, setDeploymentType] = useState<'stop_order' | 'aave_protection'>('stop_order');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { account, selectedNetwork } = useWeb3();
  const router = useRouter();

  // Dynamic sizing based on expanded state
  const chatWidth = isExpanded ? 'w-[700px]' : 'w-96';
  const chatHeight = isMinimized ? 60 : (isExpanded ? 700 : 550);
  const messageAreaHeight = isExpanded ? 'h-[480px]' : 'h-80';

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
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

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
    console.log('Sending content to AI:', { content });

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

    // Track message sent
    AIUtils.Analytics.trackEvent('ai_message_sent', {
      messageLength: content.length,
      isOptionSelection,
      hasWallet: !!account,
      network: selectedNetwork
    });

    try {
      console.log('Sending message to AI:', { 
        message: content.trim(), 
        conversationId, 
        wallet: account, 
        network: getChainIdFromNetwork(selectedNetwork) 
      });

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
      console.log('AI Response:', data);

      if (data.success && data.data) {
        // Handle multiple messages (main message + optional followUpMessage)
        const aiMessages: Message[] = [];
        const baseTimestamp = new Date();

        // Simulate typing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        // Add the main AI message with all data including Aave info
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
        aiMessages.push(mainMessage);

        // Add main message to state first
        setMessages(prev => [...prev, mainMessage]);

        // Handle follow-up message if it exists
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

        // Handle automation configuration redirection
        if (data.data.automationConfig && data.data.automationConfig.deploymentReady) {
          handleAutomationRedirect(data.data);
        }

        // Track successful response
        AIUtils.Analytics.trackEvent('ai_response_received', {
          intent: data.data.intent,
          needsUserInput: data.data.needsUserInput,
          hasOptions: !!data.data.options?.length,
          hasConfig: !!data.data.automationConfig,
          hasFollowUp: !!data.data.followUpMessage,
          hasAavePosition: !!data.data.aavePositionInfo
        });

      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Connection Error**\n\nSorry, I encountered an error: ${error.message}\n\n**This could be due to:**\n• **Network issues** - Check your internet connection\n• **Server problems** - AI service might be temporarily down\n• **Rate limiting** - Too many requests, please wait a moment\n\nPlease try again in a moment! 🔄`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Connection error - please try again');
      
      // Track error
      AIUtils.Analytics.trackEvent('ai_error', {
        error: error.message,
        statusCode: error.status
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Enhanced automation configuration redirection
  const handleAutomationRedirect = (responseData: any) => {
    const config = responseData.automationConfig;
    
    if (!config) return;

    // Determine automation type and set deployment type
    if (config.protectionType !== undefined) {
      // This is an Aave protection configuration
      setDeploymentType('aave_protection');
      setCurrentDeploymentConfig(config);
      
      
      
    } else if (config.pairAddress) {
      // This is a stop order configuration
      setDeploymentType('stop_order');
      setCurrentDeploymentConfig(config);
      
      
    }
  };

  const handleOptionSelect = (option: { value: string; label: string }) => {
    const lowerValue = option.value.toLowerCase();
    
    // Handle deployment choices
    if (lowerValue === 'deploy now' || lowerValue === 'subscribe now') {
      handleDirectDeployment();
    } else if (lowerValue === 'manual setup') {
      handleManualSetup();
    } else {
      // Handle other options normally
      sendMessage(option.value, true);
    }
  };

  const handleDirectDeployment = () => {
    if (currentDeploymentConfig) {
      setShowDeploymentHandler(true);
      
      const deployMessage: Message = {
        id: `msg_${Date.now()}_deploy`,
        type: 'ai',
        content: `🚀 **Perfect!** Let's deploy your ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} directly here!\n\nI'll guide you through the deployment process step by step. Make sure your wallet is connected and you have enough funds for gas fees. ✨`,
        timestamp: new Date(),
        showDeploymentHandler: true
      };
      setMessages(prev => [...prev, deployMessage]);
      
      // Track deployment initiated
      AIUtils.Analytics.trackEvent('ai_deployment_initiated', {
        configType: deploymentType,
        chainId: currentDeploymentConfig.chainId,
        hasWallet: !!account
      });
      
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
          content: `🚀 **Configuration Saved!** Redirecting you to the ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} page...\n\nThe form will be pre-filled with your settings. ✨`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, redirectMessage]);
        
        // Track config stored
        AIUtils.Analytics.trackConfigLoaded(true, currentDeploymentConfig);
        
        // Redirect after a short delay
        setTimeout(() => {
          const redirectPath = deploymentType === 'aave_protection' 
            ? '/automations/aave-protection?from_ai=true'
            : '/automations/stop-order?from_ai=true';
          router.push(redirectPath);
          setIsOpen(false);
        }, 1500);
        
        toast.success('🎯 Redirecting to setup page!');
      } else {
        toast.error('Failed to save configuration. Please try again.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDeploymentComplete = (success: boolean, result?: any) => {
    setShowDeploymentHandler(false);
    setCurrentDeploymentConfig(null);
    
    if (success && result) {
      // Add success message with deployment details
      const successMessage: Message = {
        id: `msg_${Date.now()}_success`,
        type: 'ai',
        content: `🎉 **Deployment Successful!** Your ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'} is now active!\n\n✅ **Deployment Details:**\n• **${deploymentType === 'aave_protection' ? 'Protection Contract' : 'Destination Contract'}:** \`${result.destinationAddress || result.protectionAddress}\`\n• **RSC Address:** \`${result.rscAddress || 'N/A'}\`\n• **Network:** ${result.chainName}\n\n🔍 **What happens next?**\nYour automation is now monitoring 24/7 automatically. ${deploymentType === 'aave_protection' ? 'Your health factor will be checked periodically and protection will trigger when needed.' : 'When your conditions are met, it will execute automatically!'}\n\n💡 **Pro Tip:** You can monitor your automation in the RSC Monitor section.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Track successful deployment
      AIUtils.Analytics.trackEvent('ai_deployment_success', {
        deploymentType,
        destinationAddress: result.destinationAddress || result.protectionAddress,
        rscAddress: result.rscAddress,
        chainId: result.chainId
      });
      
      toast.success(`🎉 ${deploymentType === 'aave_protection' ? 'Aave protection' : 'Stop order'} deployed successfully!`);
    } else {
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Deployment Failed**\n\nI'm sorry, but the deployment encountered an error: ${result?.error || 'Unknown error'}\n\n🔧 **Troubleshooting:**\n• Check your wallet connection\n• Ensure you have enough gas fees\n• Verify you're on the correct network\n• Try again in a few moments\n\n💬 **Need help?** Feel free to ask me questions or try again!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Track deployment failure
      AIUtils.Analytics.trackEvent('ai_deployment_failed', {
        deploymentType,
        error: result?.error || 'Unknown error'
      });
      
      toast.error('❌ Deployment failed - please try again');
    }
  };

  const handleDeploymentCancel = () => {
    setShowDeploymentHandler(false);
    setCurrentDeploymentConfig(null);
    
    // Add cancellation message
    const cancelMessage: Message = {
      id: `msg_${Date.now()}_cancel`,
      type: 'ai',
      content: `📝 **Deployment Cancelled**\n\nNo worries! Your configuration is still saved. You can:\n\n• **Try again** by saying "deploy my ${deploymentType === 'aave_protection' ? 'Aave protection' : 'stop order'}"\n• **Modify settings** by asking me to change specific parameters\n• **Use manual interface** - I can redirect you to the form\n\nWhat would you like to do next? 🤔`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
    
    // Track deployment cancellation
    AIUtils.Analytics.trackEvent('ai_deployment_cancelled', {
      deploymentType
    });
    
    toast('Deployment cancelled');
  };

  // Handler for quick action buttons
  const handleQuickAction = (text: string) => {
    setInputValue(text);
    // Optionally, auto-send: sendMessage(text);
  };

  // Enhanced MessageBubble component with Aave support
  const MessageBubble = ({ message }: { message: Message }) => {
    return (
      <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className="flex items-start space-x-2 max-w-[85%]">
          {message.type === 'ai' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted/80 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          )}
          
          <div className={`rounded-2xl px-4 py-3 ${
            message.type === 'user' 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-card text-foreground border border-border'
          }`}>
            <FormattedMessage content={message.content} />
            
            {/* Render Aave Position Info if present */}
            {message.aavePositionInfo && (
              <AavePositionDisplay 
                positionInfo={message.aavePositionInfo} 
                isExpanded={isExpanded}
              />
            )}
            
            {/* Existing pair info display */}
            {message.pairInfo && (
              <PairInfoDisplay 
                pairInfo={message.pairInfo} 
              />
            )}
            
            {/* Options buttons */}
            {message.options && message.options.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOptionSelect(option)}
                    className="w-full justify-start text-left h-auto py-2 px-3 bg-muted/50 hover:bg-muted border-border hover:border-primary/50 transition-colors"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Confirmation buttons */}
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
            
            {/* Deployment handler */}
            {message.showDeploymentHandler && currentDeploymentConfig && (
              <div className="mt-4">
                {deploymentType === 'aave_protection' ? (
                  <AaveDeploymentHandler
                    automationConfig={currentDeploymentConfig}
                    onDeploymentComplete={handleDeploymentComplete}
                    onCancel={handleDeploymentCancel}
                  />
                ) : (
                  <AIDeploymentHandler
                    automationConfig={currentDeploymentConfig}
                    onDeploymentComplete={handleDeploymentComplete}
                    onCancel={handleDeploymentCancel}
                  />
                )}
              </div>
            )}
          </div>
          
          {message.type === 'user' && (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating AI Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Button
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 p-0 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 relative overflow-hidden"
              >
                <Image 
                  src="/Symbol/Color/DarkBg.png" 
                  alt="Reactor AI" 
                  width={50} 
                  height={50}
                  className="transition-transform duration-300 hover:scale-110"
                />
                
                {/* Enhanced glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full animate-pulse"></div>
              </Button>
              
              {/* Enhanced notification indicator */}
              <motion.div 
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-accent to-secondary rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-3 h-3 text-foreground" />
              </motion.div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-popover text-popover-foreground text-xs rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-border">
                Chat with Reactor AI
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100, y: 100 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              y: 0,
              height: chatHeight
            }}
            exit={{ opacity: 0, x: -100, y: 100 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`fixed bottom-6 left-6 z-50 ${chatWidth} max-w-[calc(100vw-3rem)]`}
          >
            <Card className="bg-card/95 backdrop-blur-md border-border shadow-2xl overflow-hidden h-full">
              {/* Chat Header */}
              <ChatHeader
                isTyping={isTyping}
                account={account}
                selectedNetwork={selectedNetwork}
                isExpanded={isExpanded}
                isMinimized={isMinimized}
                onExpand={() => setIsExpanded(!isExpanded)}
                onMinimize={() => setIsMinimized(!isMinimized)}
                onClose={() => setIsOpen(false)}
              />

              {/* Messages Area */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col"
                  >
                    <CardContent className="p-0 flex-1 flex flex-col">
                      <div 
                        ref={chatContainerRef}
                        className={`${messageAreaHeight} overflow-y-auto p-4 bg-gradient-to-b from-background/50 to-background scrollbar-thin scrollbar-thumb-muted scrollbar-track-muted/50`}
                      >
                        {/* Render messages using enhanced MessageBubble */}
                        {messages.map((message) => (
                          <MessageBubble key={message.id} message={message} />
                        ))}
                        
                        {/* Loading indicator */}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start mb-4"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted/80 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary" />
                              </div>
                              <div className="bg-card text-foreground rounded-2xl px-4 py-3 border border-border">
                                <div className="flex items-center space-x-3">
                                  <div className="flex space-x-1">
                                    <motion.div 
                                      className="w-2 h-2 bg-primary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                    />
                                    <motion.div 
                                      className="w-2 h-2 bg-secondary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                    />
                                    <motion.div 
                                      className="w-2 h-2 bg-primary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                    />
                                  </div>
                                  <span className="text-sm">AI is thinking...</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input */}
                      <ChatInput
                        inputValue={inputValue}
                        onInputChange={(e) => setInputValue(e.target.value)}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        account={account}
                        selectedNetwork={selectedNetwork}
                        onQuickAction={handleQuickAction}
                        currentDeploymentConfig={currentDeploymentConfig}
                      />
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}