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
  Shrink
} from 'lucide-react';
import Image from 'next/image';
import { useWeb3 } from '@/app/_context/Web3Context';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Import deployment functions
import { 
  deployDestinationContract, 
  approveTokens, 
  deployRSC, 
  switchNetwork, 
  switchToRSCNetwork,
  getRSCNetworkForChain,
  SUPPORTED_CHAINS 
} from '@/utils/stopOrderDeployment';
import { ethers } from 'ethers';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: any;
  pairInfo?: {
    pairAddress: string;
    currentPrice: number;
    token0: string;
    token1: string;
  };
}

interface AIResponse {
  success: boolean;
  data?: {
    message: string;
    intent: string;
    needsUserInput: boolean;
    inputType?: 'amount' | 'token' | 'network' | 'confirmation';
    options?: Array<{ value: string; label: string }>;
    automationConfig?: any;
    nextStep?: string;
    pairInfo?: {
      pairAddress: string;
      currentPrice: number;
      token0: string;
      token1: string;
    };
  };
  error?: string;
}

// Utility function to format markdown text
const formatMarkdownText = (text: string): JSX.Element => {
  // Split text by lines to preserve structure
  const lines = text.split('\n');
  
  return (
    <div>
      {lines.map((line, lineIndex) => {
        // Process each line for markdown
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        
        return (
          <div key={lineIndex} className={lineIndex > 0 ? 'mt-1' : ''}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                return (
                  <strong key={partIndex} className="font-semibold text-white">
                    {part.slice(2, -2)}
                  </strong>
                );
              } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                // Italic text
                return (
                  <em key={partIndex} className="italic">
                    {part.slice(1, -1)}
                  </em>
                );
              } else if (part.startsWith('`') && part.endsWith('`')) {
                // Code text
                return (
                  <code key={partIndex} className="bg-gray-700 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">
                    {part.slice(1, -1)}
                  </code>
                );
              } else {
                // Regular text
                return <span key={partIndex}>{part}</span>;
              }
            })}
          </div>
        );
      })}
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
  const [showDeploymentHandler, setShowDeploymentHandler] = useState(false);
  const [pendingDeploymentConfig, setPendingDeploymentConfig] = useState<any>(null);
  const [deploymentStep, setDeploymentStep] = useState<string>('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { account, selectedNetwork } = useWeb3();
  const router = useRouter();

  // Dynamic sizing based on expanded state
  const chatWidth = isExpanded ? 'w-[600px]' : 'w-96';
  const chatHeight = isMinimized ? 60 : (isExpanded ? 700 : 550);
  const messageAreaHeight = isExpanded ? 'h-[520px]' : 'h-80';

  // Generate conversation ID on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Add welcome message with enhanced styling
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        type: 'ai',
        content: "Hi! I'm Reactor AI ✨\n\nI can help you:\n• **Create Stop Orders** - Protect your tokens from price drops\n• **Answer Questions** - Learn about DeFi automation and RSCs\n• **Explain Features** - Understand how our automations work\n\nWhat would you like to do today?",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isOpen, conversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && !showDeploymentHandler) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, showDeploymentHandler]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      console.log('Sending message to AI:', { 
        message: content.trim(), 
        conversationId, 
        wallet: account, 
        network: getChainIdFromNetwork(selectedNetwork) 
      });

      const response = await fetch('http://localhost:8000/ai-automation/automate', {
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

      const data: AIResponse = await response.json();
      console.log('AI Response:', data);

      if (data.success && data.data) {
        // Simulate typing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          type: 'ai',
          content: data.data.message,
          timestamp: new Date(),
          options: data.data.options,
          inputType: data.data.inputType,
          automationConfig: data.data.automationConfig,
          pairInfo: data.data.pairInfo
        };

        setMessages(prev => [...prev, aiMessage]);

        // If we have a complete automation config, prepare for deployment
        if (data.data.automationConfig && data.data.inputType === 'confirmation') {
          console.log('Automation config ready for deployment:', data.data.automationConfig);
          setPendingDeploymentConfig(data.data.automationConfig);
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Connection Error**\n\nSorry, I encountered an error: ${error.message}\n\nThis could be due to:\n• **Network issues** - Check your internet connection\n• **Server problems** - AI service might be temporarily down\n• **Wallet issues** - Make sure your wallet is connected\n\nPlease try again in a moment!`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Connection error - please try again');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleOptionSelect = (option: { value: string; label: string }) => {
    sendMessage(option.value, true);
  };

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed && pendingDeploymentConfig) {
      // Show deployment handler instead of redirecting
      setShowDeploymentHandler(true);
      
      // Add confirmation message to chat
      const confirmMessage: Message = {
        id: `msg_${Date.now()}_confirm`,
        type: 'ai',
        content: "🚀 **Excellent!** Starting the deployment process now.\n\nThis will require signing a few transactions in your wallet. Please:\n• **Keep your wallet ready**\n• **Don't close this window**\n• **Confirm each transaction**\n\nLet's deploy your stop order! 🎯",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
    } else {
      // User cancelled - send message to AI
      sendMessage(confirmed ? 'yes' : 'no', true);
      setPendingDeploymentConfig(null);
    }
  };

  const handleDeploymentComplete = (success: boolean, result?: any) => {
    setShowDeploymentHandler(false);
    setPendingDeploymentConfig(null);
    
    if (success) {
      const successMessage: Message = {
        id: `msg_${Date.now()}_success`,
        type: 'ai',
        content: `🎉 **Stop Order Deployed Successfully!**\n\nYour automation is now **active** and monitoring prices 24/7!\n\n**Contract Details:**\n• **Destination**: \`${result.destinationAddress.slice(0, 8)}...${result.destinationAddress.slice(-6)}\`\n• **RSC**: \`${result.rscAddress.slice(0, 8)}...${result.rscAddress.slice(-6)}\`\n• **Network**: ${result.chainName}\n\n✨ **Your tokens are now protected!** The stop order will automatically execute if the price drops to your specified threshold.\n\nWould you like to create another automation or visit the RSC Monitor to track this one?`,
        timestamp: new Date(),
        options: [
          { value: 'create another', label: '🔄 Create Another Stop Order' },
          { value: 'visit monitor', label: '📊 View RSC Monitor' },
          { value: 'done', label: '✅ All Done' }
        ]
      };
      setMessages(prev => [...prev, successMessage]);
      toast.success('🎉 Stop order deployed successfully!');
    } else {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `❌ **Deployment Failed**\n\n**Error:** ${result?.error || 'Unknown error occurred'}\n\n**Common causes:**\n• **Insufficient funds** - Not enough tokens or gas\n• **Network issues** - Connection problems\n• **User cancellation** - Transaction was rejected\n• **Contract issues** - Invalid parameters\n\nWould you like to try again?`,
        timestamp: new Date(),
        options: [
          { value: 'try again', label: '🔄 Try Again' },
          { value: 'manual deployment', label: '🛠️ Use Manual Interface' },
          { value: 'help', label: '❓ Get Help' }
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Deployment failed - see chat for details');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
  };

  const getChainIdFromNetwork = (network: string): number => {
    const networkMap: { [key: string]: number } = {
      'ETHEREUM': 1,
      'SEPOLIA': 11155111,
      'AVALANCHE': 43114,
      'KOPLI': 5318008,
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const formatPairInfo = (pairInfo: any) => {
    if (!pairInfo) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30"
      >
        <div className="flex items-center space-x-2 mb-3">
          <Network className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-300">Trading Pair Information</span>
        </div>
        <div className="grid grid-cols-1 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Pair:</span>
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
              {pairInfo.token0}/{pairInfo.token1}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Address:</span>
            <div className="flex items-center space-x-1">
              <code className="bg-gray-800 px-2 py-1 rounded text-blue-300">
                {pairInfo.pairAddress.slice(0, 8)}...{pairInfo.pairAddress.slice(-6)}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-blue-600/20"
                onClick={() => copyToClipboard(pairInfo.pairAddress)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Price:</span>
            <span className="text-green-400 font-mono">${pairInfo.currentPrice.toFixed(6)}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 ${isExpanded ? 'max-w-[90%]' : 'max-w-[85%]'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 ml-2' 
              : 'bg-gradient-to-r from-gray-700 to-gray-600 mr-2'
          }`}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-300" />
            )}
          </div>
          
          {/* Message Content */}
          <div className={`rounded-2xl px-4 py-3 ${isUser 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
            : 'bg-gradient-to-r from-gray-800 to-gray-750 text-gray-100 border border-gray-600/50'
          }`}>
            <div className="text-sm leading-relaxed">
              {formatMarkdownText(message.content)}
            </div>
            
            {/* Pair information */}
            {!isUser && message.pairInfo && formatPairInfo(message.pairInfo)}
            
            {/* Options for AI messages */}
            {!isUser && message.options && (
              <div className="mt-4 space-y-2">
                {message.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left bg-gray-700/50 border-gray-600 hover:bg-gray-600/70 text-gray-100 transition-all duration-200"
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Enhanced confirmation buttons for automation config */}
            {!isUser && message.inputType === 'confirmation' && message.automationConfig && (
              <div className="mt-4 space-y-3">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
                    onClick={() => handleConfirmation(true)}
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 hover:bg-gray-700/50"
                    onClick={() => handleConfirmation(false)}
                  >
                    <X className="w-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                  onClick={() => {
                    // Store config and redirect to manual interface
                    localStorage.setItem('ai_automation_config', JSON.stringify(message.automationConfig));
                    router.push('/automations/stop-order?from_ai=true');
                    setIsOpen(false);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Use Manual Interface Instead
                </Button>
              </div>
            )}
            
            {/* Timestamp */}
            <div className="mt-2 text-xs opacity-60">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Deployment handler functions (rest of the implementation)
  const handleDeployment = async (config: any) => {
    try {
      setDeploymentError(null);
      setDeploymentStep('starting');

      if (!config || !config.chainId) {
        throw new Error('Invalid configuration');
      }

      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === config.chainId);
      if (!selectedChain) {
        throw new Error('Invalid chain configuration');
      }

      if (!window.ethereum) {
        throw new Error('Please connect your wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== config.chainId) {
        setDeploymentStep('switching-network');
        await switchNetwork(config.chainId);
      }

      setDeploymentStep('deploying-destination');
      const destinationAddress = await deployDestinationContract(
        selectedChain, 
        config.destinationFunding || '0.03'
      );

      setDeploymentStep('approving-tokens');
      const tokenToApprove = await getTokenAddressFromConfig(config);
      await approveTokens(tokenToApprove, destinationAddress, config.amount);

      setDeploymentStep('switching-to-rsc');
      await switchToRSCNetwork(config.chainId);

      setDeploymentStep('deploying-rsc');
      const rscAddress = await deployRSC({
        pair: config.pairAddress,
        stopOrder: destinationAddress,
        client: config.clientAddress,
        token0: config.sellToken0,
        coefficient: config.coefficient,
        threshold: config.threshold
      }, selectedChain, config.rscFunding || '0.05');

      setDeploymentStep('switching-back');
      await switchNetwork(config.chainId);

      setDeploymentStep('complete');
      return {
        success: true,
        destinationAddress,
        rscAddress,
        chainId: config.chainId,
        chainName: selectedChain.name
      };

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentError(error.message || 'Deployment failed');
      setDeploymentStep('error');
      throw error;
    }
  };

  const getTokenAddressFromConfig = async (config: any): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const pairContract = new ethers.Contract(
      config.pairAddress,
      ['function token0() view returns (address)', 'function token1() view returns (address)'],
      provider
    );
    
    return config.sellToken0 ? await pairContract.token0() : await pairContract.token1();
  };

  const renderDeploymentStep = (step: string) => {
    const steps = [
      { id: 'starting', label: 'Initializing deployment', icon: Rocket },
      { id: 'switching-network', label: 'Switching to target network', icon: Network },
      { id: 'deploying-destination', label: 'Deploying destination contract', icon: Coins },
      { id: 'approving-tokens', label: 'Approving token spending', icon: CheckCircle },
      { id: 'switching-to-rsc', label: 'Switching to RSC network', icon: Network },
      { id: 'deploying-rsc', label: 'Deploying Reactive Smart Contract', icon: Sparkles },
      { id: 'switching-back', label: 'Switching back to original network', icon: Network },
      { id: 'complete', label: 'Deployment complete', icon: CheckCircle }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);
    
    return (
      <div className="space-y-3">
        {steps.map((s, index) => {
          let iconColor = 'text-gray-400';
          let textColor = 'text-gray-400';
          let IconComponent = s.icon;
          
          if (index < currentStepIndex || step === 'complete') {
            IconComponent = CheckCircle;
            iconColor = 'text-green-400';
            textColor = 'text-green-400';
          } else if (index === currentStepIndex && step !== 'complete') {
            IconComponent = Loader2;
            iconColor = 'text-blue-400 animate-spin';
            textColor = 'text-blue-400';
          }
          
          return (
            <motion.div 
              key={s.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <IconComponent className={`h-4 w-4 ${iconColor}`} />
              <span className={`text-sm ${textColor}`}>{s.label}</span>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Enhanced deployment handler UI (with dynamic sizing)
  if (showDeploymentHandler && pendingDeploymentConfig) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -100, y: 100 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -100, y: 100 }}
        transition={{ duration: 0.3 }}
        className={`fixed bottom-6 left-6 z-50 ${chatWidth} max-w-[calc(100vw-3rem)]`}
      >
        <Card className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-sm border-blue-500/30 shadow-2xl">
          <CardHeader className="border-b border-blue-500/20">
            <CardTitle className="text-zinc-100 flex items-center space-x-2">
              <Rocket className="h-5 w-5 text-blue-400" />
              <span>Deploy Stop Order</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Configuration Summary */}
            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-500/20">
              <h3 className="text-zinc-100 font-medium mb-3 flex items-center">
                <TrendingDown className="h-4 w-4 mr-2" />
                Configuration Summary
              </h3>
              <div className="space-y-2 text-sm text-zinc-300">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <Badge variant="secondary">{SUPPORTED_CHAINS.find(c => c.id === pendingDeploymentConfig.chainId)?.name}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-mono">{pendingDeploymentConfig.amount} {pendingDeploymentConfig.tokenToSell}</span>
                </div>
                <div className="flex justify-between">
                  <span>Drop Trigger:</span>
                  <span className="text-red-400">{pendingDeploymentConfig.dropPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Trade:</span>
                  <span>{pendingDeploymentConfig.tokenToSell} → {pendingDeploymentConfig.tokenToBuy}</span>
                </div>
              </div>
            </div>

            {/* Deployment Steps */}
            {deploymentStep !== 'idle' && (
              <div className="space-y-4">
                <h3 className="text-zinc-100 font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Deployment Progress
                </h3>
                {renderDeploymentStep(deploymentStep)}
              </div>
            )}

            {/* Error Display */}
            {deploymentError && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-200">
                  {deploymentError}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {deploymentStep === 'complete' && (
              <Alert className="bg-green-900/20 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  🎉 Stop order deployed successfully! Your automation is now active.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {deploymentStep === 'idle' && (
                <>
                  <Button
                    onClick={async () => {
                      try {
                        const result = await handleDeployment(pendingDeploymentConfig);
                        handleDeploymentComplete(true, result);
                      } catch (error: any) {
                        handleDeploymentComplete(false, { error: error.message });
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Stop Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeploymentHandler(false);
                      setPendingDeploymentConfig(null);
                    }}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-700/50"
                  >
                    Cancel
                  </Button>
                </>
              )}
              
              {(deploymentStep === 'complete' || deploymentStep === 'error') && (
                <Button
                  onClick={() => {
                    setShowDeploymentHandler(false);
                    setPendingDeploymentConfig(null);
                    setDeploymentStep('idle');
                    setDeploymentError(null);
                  }}
                  className="w-full bg-zinc-700 hover:bg-zinc-600"
                >
                  Close
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

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
            >
              <Button
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 relative overflow-hidden"
              >
                <Image 
                  src="/Symbol/Color/DarkBg.png" 
                  alt="Reactor AI" 
                  width={50} 
                  height={50}
                  className="transition-transform duration-300 hover:scale-110"
                />
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
              </Button>
            </motion.div>
            
            {/* Enhanced notification indicator */}
            <motion.div 
              className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-3 h-3 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Chat Interface with Dynamic Sizing */}
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
            <Card className="bg-gray-900/95 backdrop-blur-md border-gray-700/50 shadow-2xl overflow-hidden h-full">
              {/* Enhanced Header with Resize Controls */}
              <CardHeader className="pb-3 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-750/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center relative">
                      <Sparkles className="w-5 h-5 text-white" />
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-gray-100 text-base">Reactor AI</CardTitle>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-400">
                          {isTyping ? 'Thinking...' : 'Online'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      onClick={() => setIsExpanded(!isExpanded)}
                      title={isExpanded ? "Shrink window" : "Expand window"}
                    >
                      {isExpanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages with Dynamic Height */}
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
                        className={`${messageAreaHeight} overflow-y-auto p-4 bg-gradient-to-b from-gray-950/50 to-gray-950 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800`}
                      >
                        {messages.map(renderMessage)}
                        
                        {/* Enhanced loading indicator */}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start mb-4"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-blue-300" />
                              </div>
                              <div className="bg-gradient-to-r from-gray-800 to-gray-750 text-gray-100 rounded-2xl px-4 py-3 border border-gray-600/50">
                                <div className="flex items-center space-x-3">
                                  <div className="flex space-x-1">
                                    <motion.div 
                                      className="w-2 h-2 bg-blue-400 rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                    />
                                    <motion.div 
                                      className="w-2 h-2 bg-purple-400 rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                    />
                                    <motion.div 
                                      className="w-2 h-2 bg-blue-400 rounded-full"
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

                      {/* Enhanced Input */}
                      <div className="border-t border-gray-700/50 p-4 bg-gradient-to-r from-gray-900/80 to-gray-850/80">
                        <form onSubmit={handleSubmit} className="flex space-x-3">
                          <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask me anything about DeFi automation..."
                            className="flex-1 bg-gray-800/50 border-gray-600/50 text-gray-100 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                            disabled={isLoading}
                            maxLength={500}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                        
                        {/* Enhanced status indicators */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                          <div className="flex items-center space-x-3">
                            {account ? (
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span>Wallet connected</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3 text-yellow-400" />
                                <span>Connect wallet for automations</span>
                              </div>
                            )}
                            
                            {selectedNetwork && (
                              <Badge variant="secondary" className="text-xs bg-blue-600/20 text-blue-300">
                                {selectedNetwork}
              </Badge>
                            )}
                          </div>
                          
                          <span className="text-gray-500">
                            {inputValue.length}/500
                          </span>
                        </div>
                      </div>
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