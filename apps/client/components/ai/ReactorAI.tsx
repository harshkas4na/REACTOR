'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Maximize2
} from 'lucide-react';
import Image from 'next/image';
import { useWeb3 } from '@/app/_context/Web3Context';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: any;
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
  };
  error?: string;
}

export default function ReactorAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { account, selectedNetwork } = useWeb3();
  const router = useRouter();

  // Generate conversation ID on first open
  useEffect(() => {
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        type: 'ai',
        content: "Hi! I'm Reactor AI 🤖\n\nI can help you:\n• **Create Stop Orders** - Protect your tokens from price drops\n• **Answer Questions** - Learn about DeFi automation and RSCs\n• **Explain Features** - Understand how our automations work\n\nWhat would you like to do?",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isOpen, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

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

    try {
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

      if (data.success && data.data) {
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          type: 'ai',
          content: data.data.message,
          timestamp: new Date(),
          options: data.data.options,
          inputType: data.data.inputType,
          automationConfig: data.data.automationConfig
        };

        setMessages(prev => [...prev, aiMessage]);

        // If we have a complete automation config, handle it
        if (data.data.automationConfig && data.data.inputType === 'confirmation') {
          // This means the AI has prepared everything and is asking for final confirmation
          console.log('Automation config ready:', data.data.automationConfig);
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `Sorry, I encountered an error: ${error.message}. Please try again or connect your wallet if you haven't already.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: { value: string; label: string }) => {
    sendMessage(option.value, true);
  };

  const handleConfirmation = (confirmed: boolean) => {
    const lastMessage = messages[messages.length - 1];
    
    if (confirmed && lastMessage.automationConfig) {
      // User confirmed - redirect to stop order page with pre-filled data
      const config = lastMessage.automationConfig;
      
      // Store the config in localStorage temporarily
      localStorage.setItem('ai_automation_config', JSON.stringify(config));
      
      // Navigate to stop order page
      router.push('/automations/stop-order?from_ai=true');
      
      // Close the chat
      setIsOpen(false);
      
      // Send confirmation message
      sendMessage('yes', true);
    } else {
      // User cancelled or wants to edit
      sendMessage(confirmed ? 'yes' : 'no', true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 max-w-[80%]`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-600 ml-2' : 'bg-gray-700 mr-2'}`}>
            {isUser ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-blue-400" />
            )}
          </div>
          
          {/* Message Content */}
          <div className={`rounded-lg px-4 py-2 ${isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-100 border border-gray-700'
          }`}>
            <div className="whitespace-pre-line text-sm">{message.content}</div>
            
            {/* Options for AI messages */}
            {!isUser && message.options && (
              <div className="mt-3 space-y-2">
                {message.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-100"
                    onClick={() => handleOptionSelect(option)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Confirmation buttons for automation config */}
            {!isUser && message.inputType === 'confirmation' && message.automationConfig && (
              <div className="mt-3 flex space-x-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleConfirmation(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Yes, Deploy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 hover:bg-gray-700"
                  onClick={() => handleConfirmation(false)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 hover:bg-gray-700"
                  onClick={() => sendMessage('edit', true)}
                >
                  Edit Parameters
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
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
            <Button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-0"
            >
              <Image 
                src="/Symbol/Color/DarkBg.png" 
                alt="Reactor AI" 
                width={50} 
                height={50}
                className="transition-transform duration-300 hover:scale-110"
              />
            </Button>
            
            {/* Notification pulse */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100, y: 100 }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              y: 0,
              height: isMinimized ? 60 : 500
            }}
            exit={{ opacity: 0, x: -100, y: 100 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
          >
            <Card className="bg-gray-900 border-gray-700 shadow-2xl overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-2 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-gray-100 text-sm">Reactor AI</CardTitle>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-gray-400 hover:text-gray-200"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-gray-400 hover:text-gray-200"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="p-0">
                      <div 
                        ref={chatContainerRef}
                        className="h-80 overflow-y-auto p-4 bg-gray-950"
                      >
                        {messages.map(renderMessage)}
                        
                        {/* Loading indicator */}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start mb-4"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="bg-gray-800 text-gray-100 rounded-lg px-4 py-2 border border-gray-700">
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Thinking...</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input */}
                      <div className="border-t border-gray-700 p-4 bg-gray-900">
                        <form onSubmit={handleSubmit} className="flex space-x-2">
                          <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask me anything about DeFi automation..."
                            className="flex-1 bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400"
                            disabled={isLoading}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !inputValue.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                        
                        {/* Status indicators */}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <div className="flex items-center space-x-2">
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
                          </div>
                          
                          {selectedNetwork && (
                            <span className="text-blue-400">{selectedNetwork}</span>
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