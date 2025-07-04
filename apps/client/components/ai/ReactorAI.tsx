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
  BookOpen
} from 'lucide-react';
import Image from 'next/image';
import { useWeb3 } from '@/app/_context/Web3Context';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { AIUtils } from '@/utils/ai';
import { AIDeploymentHandler } from './AIDeploymentHandler';

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
  showDeploymentHandler?: boolean;
}

// NEW: Updated interface to match the new hook response
interface AIMessageResponse {
  success: boolean;
  messages?: Message[]; // Array of AI messages
  error?: string;
}

interface AIResponse {
  success: boolean;
  data?: {
    message: string;
    followUpMessage?: string; // NEW: Optional follow-up message
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

// Enhanced message formatting component
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const formatText = (text: string) => {
    // Split by lines to preserve structure
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
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
    });
  };

  return <div className="text-sm leading-relaxed">{formatText(content)}</div>;
};

// Enhanced pair info component
const PairInfoDisplay: React.FC<{ pairInfo: any }> = ({ pairInfo }) => {
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
              onClick={() => navigator.clipboard.writeText(pairInfo.pairAddress)}
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
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newConversationId);
      
      // Check for saved deployment configuration
      const savedConfig = AIUtils.ConfigManager.peekConfig();
      
      // Add enhanced welcome message
      let welcomeContent = "Hi! I'm **Reactor AI** ✨ Your intelligent DeFi automation assistant!\n\n🚀 **I can help you:**\n• **Create Stop Orders** - Protect your tokens from price drops\n• **Learn About Reactor** - Understand RSCs and DeFi automation\n• **Check Balances** - Get real-time token information\n• **Find Trading Pairs** - Discover available markets\n\n💡 **Quick Examples:**\n• \"Create a stop order for my ETH\"\n• \"What is Reactor?\"\n• \"How much USDC do I have?\"\n• \"Tell me about RSCs\"";
      
      if (savedConfig) {
        welcomeContent += "\n\n🎯 **I found a saved configuration!** You can say \"deploy my stop order\" to continue with your previous setup.";
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

  // NEW: Updated sendMessage function to handle multiple AI messages
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
        // NEW: Handle multiple messages (main message + optional followUpMessage)
        const aiMessages: Message[] = [];
        const baseTimestamp = new Date();

        // Simulate typing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        // Add the main AI message
        const mainMessage: Message = {
          id: `msg_${Date.now()}_ai_main`,
          type: 'ai',
          content: data.data.message,
          timestamp: baseTimestamp,
          options: data.data.options,
          inputType: data.data.inputType,
          automationConfig: data.data.automationConfig,
          pairInfo: data.data.pairInfo
        };
        aiMessages.push(mainMessage);

        // Add main message to state first
        setMessages(prev => [...prev, mainMessage]);

        // NEW: Handle follow-up message if it exists
        if (data.data.followUpMessage) {
          // Add a slight delay before showing follow-up message for natural conversation flow
          setTimeout(() => {
            const followUpMessage: Message = {
              id: `msg_${Date.now()}_ai_followup`,
              type: 'ai',
              content: data.data?.followUpMessage || '',
              timestamp: new Date(baseTimestamp.getTime() + 1000), // 1 second later
              // Follow-up messages typically contain continuation prompts, so they inherit interactive properties
              options: data.data?.needsUserInput ? data.data.options : undefined,
              inputType: data.data?.needsUserInput ? data.data.inputType : undefined,
              automationConfig: data.data?.needsUserInput ? data.data.automationConfig : undefined
            };

            setMessages(prev => [...prev, followUpMessage]);
          }, 1200); // 1.2 second delay for natural conversation flow
        }

        // Track successful response
        AIUtils.Analytics.trackEvent('ai_response_received', {
          intent: data.data.intent,
          needsUserInput: data.data.needsUserInput,
          hasOptions: !!data.data.options?.length,
          hasConfig: !!data.data.automationConfig,
          hasFollowUp: !!data.data.followUpMessage // NEW: Track follow-up messages
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

  const handleOptionSelect = (option: { value: string; label: string }) => {
    sendMessage(option.value, true);
  };

  const handleConfirmation = (confirmed: boolean) => {
    if (confirmed) {
      // Find the message with automation config
      const configMessage = messages.find(msg => msg.automationConfig);
      if (configMessage?.automationConfig) {
        // Validate that the config is ready for deployment
        const config = configMessage.automationConfig;
        if (config.deploymentReady) {
          // Show deployment handler directly in chat
          setCurrentDeploymentConfig(config);
          setShowDeploymentHandler(true);
          
          // Add deployment starting message
          const deployMessage: Message = {
            id: `msg_${Date.now()}_deploy`,
            type: 'ai',
            content: "🚀 **Perfect!** Let's deploy your stop order directly here!\n\nI'll guide you through the deployment process step by step. Make sure your wallet is connected and you have enough funds for gas fees. ✨",
            timestamp: new Date(),
            showDeploymentHandler: true
          };
          setMessages(prev => [...prev, deployMessage]);
          
          // Track deployment initiated
          AIUtils.Analytics.trackEvent('ai_deployment_initiated', {
            configType: 'stop_order',
            chainId: config.chainId,
            hasWallet: !!account
          });
          
          toast.success('🎯 Starting deployment process!');
        } else {
          // Store config and redirect to form for manual completion
          const stored = AIUtils.ConfigManager.storeConfig(config);
          
          if (stored) {
            const deployMessage: Message = {
              id: `msg_${Date.now()}_deploy`,
              type: 'ai',
              content: "🚀 **Configuration saved!** Redirecting you to complete the setup...\n\nSome parameters need manual configuration. The form will be pre-filled with your settings. ✨",
              timestamp: new Date()
            };
            setMessages(prev => [...prev, deployMessage]);
            
            // Track config stored
            AIUtils.Analytics.trackConfigLoaded(true, config);
            
            // Redirect after a short delay
            setTimeout(() => {
              router.push('/automations/stop-order?from_ai=true');
              setIsOpen(false);
            }, 1500);
            
            toast.success('🎯 Redirecting to manual setup!');
          } else {
            toast.error('Failed to save configuration. Please try again.');
          }
        }
      }
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
        content: `🎉 **Deployment Successful!** Your stop order is now active!\n\n✅ **Deployment Details:**\n• **Destination Contract:** \`${result.destinationAddress}\`\n• **RSC Address:** \`${result.rscAddress}\`\n• **Network:** ${result.chainName}\n\n🔍 **What happens next?**\nYour automation is now monitoring the market 24/7. When your price conditions are met, the stop order will execute automatically!\n\n💡 **Pro Tip:** You can monitor your automation in the RSC Monitor section.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Track successful deployment
      AIUtils.Analytics.trackEvent('ai_deployment_success', {
        destinationAddress: result.destinationAddress,
        rscAddress: result.rscAddress,
        chainId: result.chainId
      });
      
      toast.success('🎉 Stop order deployed successfully!');
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
      content: "📝 **Deployment Cancelled**\n\nNo worries! Your configuration is still saved. You can:\n\n• **Try again** by saying \"deploy my stop order\"\n• **Modify settings** by asking me to change specific parameters\n• **Use manual interface** - I can redirect you to the form\n\nWhat would you like to do next? 🤔",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
    
    // Track deployment cancellation
    AIUtils.Analytics.trackEvent('ai_deployment_cancelled', {});
    
    toast('Deployment cancelled');
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
          {/* Enhanced Avatar */}
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
          
          {/* Enhanced Message Content */}
          <div className={`rounded-2xl px-4 py-3 ${isUser 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
            : 'bg-gradient-to-r from-gray-800 to-gray-750 text-gray-100 border border-gray-600/50'
          }`}>
            <FormattedMessage content={message.content} />
            
            {/* Pair information */}
            {!isUser && message.pairInfo && (
              <PairInfoDisplay pairInfo={message.pairInfo} />
            )}
            
            {/* Enhanced Options for AI messages */}
            {!isUser && message.options && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400 mb-2">Choose an option:</div>
                {message.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left bg-gray-700/50 border-gray-600 hover:bg-gray-600/70 text-gray-100 transition-all duration-200 hover:scale-[1.02]"
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
                <div className="text-xs text-gray-400 mb-2">Ready to proceed?</div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg transition-all duration-200 hover:scale-105"
                    onClick={() => handleConfirmation(true)}
                  >
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 hover:bg-gray-700/50 transition-all duration-200"
                    onClick={() => handleConfirmation(false)}
                  >
                    <X className="w-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 transition-all duration-200"
                  onClick={() => {
                    // Store config and redirect to manual interface
                    if (message.automationConfig) {
                      AIUtils.ConfigManager.storeConfig(message.automationConfig);
                      router.push('/automations/stop-order?from_ai=true');
                      setIsOpen(false);
                    }
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Use Manual Interface Instead
                </Button>
              </div>
            )}

            {/* AIDeploymentHandler for deployment messages */}
            {!isUser && message.showDeploymentHandler && showDeploymentHandler && currentDeploymentConfig && (
              <div className="mt-4">
                <AIDeploymentHandler
                  automationConfig={currentDeploymentConfig}
                  onDeploymentComplete={handleDeploymentComplete}
                  onCancel={handleDeploymentCancel}
                />
              </div>
            )}
            
            {/* Enhanced Timestamp */}
            <div className="mt-2 text-xs opacity-60 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  console.log('currentDeploymentConfig', currentDeploymentConfig);
  
  return (
    <>
      {/* Enhanced Floating AI Button */}
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
                className="w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 relative overflow-hidden"
              >
                <Image 
                  src="/Symbol/Color/DarkBg.png" 
                  alt="Reactor AI" 
                  width={50} 
                  height={50}
                  className="transition-transform duration-300 hover:scale-110"
                />
                
                {/* Enhanced glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full animate-pulse"></div>
              </Button>
              
              {/* Enhanced notification indicator */}
              <motion.div 
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-3 h-3 text-white" />
              </motion.div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Chat with Reactor AI
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Chat Interface */}
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
              {/* Enhanced Header */}
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
                        {account && (
                          <Badge variant="secondary" className="text-xs bg-blue-600/20 text-blue-300">
                            Connected
                          </Badge>
                        )}
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

              {/* Enhanced Messages Area */}
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

                      {/* Enhanced Input Area */}
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
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                        
                        {/* Enhanced status indicators */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                          <div className="flex items-center space-x-4">
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
                        
                        {/* Quick action buttons */}
                        <div className="flex space-x-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                            onClick={() => setInputValue("What is Reactor?")}
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            Learn
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                            onClick={() => setInputValue("Create a stop order")}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Protect
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/30"
                            onClick={() => setInputValue("How much ETH do I have?")}
                          >
                            <Coins className="w-3 h-3 mr-1" />
                            Balance
                          </Button>
                          {currentDeploymentConfig && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-700/30"
                              onClick={() => setInputValue("Deploy my stop order")}
                            >
                              <Rocket className="w-3 h-3 mr-1" />
                              Deploy
                            </Button>
                          )}
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