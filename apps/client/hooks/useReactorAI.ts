import { useState, useCallback } from 'react';
import { useWeb3 } from '@/app/_context/Web3Context';

export interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: any;
}

export interface AIResponse {
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

export const useReactorAI = () => {
  const [conversationId, setConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { account, selectedNetwork } = useWeb3();

  const generateConversationId = useCallback(() => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(id);
    return id;
  }, []);

  const getChainIdFromNetwork = useCallback((network: string): number => {
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
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    currentConversationId?: string
  ): Promise<AIResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use provided conversation ID or generate new one
      const convId = currentConversationId || conversationId || generateConversationId();

      const response = await fetch('http://localhost:8000/ai-automation/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          conversationId: convId,
          connectedWallet: account,
          currentNetwork: getChainIdFromNetwork(selectedNetwork)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to communicate with AI';
      setError(errorMessage);
      console.error('AI Hook Error:', err);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [account, selectedNetwork, conversationId, generateConversationId, getChainIdFromNetwork]);

  const clearConversation = useCallback(async (): Promise<boolean> => {
    if (!conversationId) return true;

    try {
      const response = await fetch('http://localhost:8000/ai-automation/clear-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId
        }),
      });

      if (response.ok) {
        setConversationId('');
        setError(null);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error clearing conversation:', err);
      return false;
    }
  }, [conversationId]);

  const checkAIHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/ai-automation/health', {
        method: 'GET',
      });
      
      return response.ok;
    } catch (err) {
      console.error('AI health check failed:', err);
      return false;
    }
  }, []);

  const getSupportedFeatures = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/ai-automation/features', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error fetching AI features:', err);
      return null;
    }
  }, []);

  return {
    conversationId,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    checkAIHealth,
    getSupportedFeatures,
    generateConversationId
  };
}; 