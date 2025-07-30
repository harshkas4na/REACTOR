import { useState, useCallback } from 'react';
import { useWeb3 } from '@/app/_context/Web3Context';

// Enhanced interfaces for Aave support
export interface AavePositionInfo {
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

export interface AIMessage {
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
  // NEW: Aave position information
  aavePositionInfo?: AavePositionInfo;
  showDeploymentHandler?: boolean;
}

export interface AIResponse {
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
    // NEW: Aave position information
    aavePositionInfo?: AavePositionInfo;
  };
  error?: string;
}

// Enhanced response interface for handling multiple messages
export interface AIMessageResponse {
  success: boolean;
  messages?: AIMessage[];
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
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    currentConversationId?: string
  ): Promise<AIMessageResponse> => {
    setIsLoading(true);
    setError(null);

    try {
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

      if (data.data) {
        const messages: AIMessage[] = [];
        const baseTimestamp = new Date();

        // Add the main AI message with enhanced data support
        const mainMessage: AIMessage = {
          id: `msg_${Date.now()}_ai_main`,
          type: 'ai',
          content: data.data.message,
          timestamp: baseTimestamp,
          options: data.data.options,
          inputType: data.data.inputType,
          automationConfig: data.data.automationConfig,
          pairInfo: data.data.pairInfo,
          // NEW: Include Aave position information
          aavePositionInfo: data.data.aavePositionInfo
        };
        messages.push(mainMessage);

        // Add follow-up message if it exists
        if (data.data.followUpMessage) {
          const followUpMessage: AIMessage = {
            id: `msg_${Date.now()}_ai_followup`,
            type: 'ai',
            content: data.data.followUpMessage,
            timestamp: new Date(baseTimestamp.getTime() + 100),
            options: data.data.needsUserInput ? data.data.options : undefined,
            inputType: data.data.needsUserInput ? data.data.inputType : undefined,
            automationConfig: data.data.needsUserInput ? data.data.automationConfig : undefined,
            // Follow-up messages can also include Aave data for continuity
            aavePositionInfo: data.data.needsUserInput ? data.data.aavePositionInfo : undefined
          };
          messages.push(followUpMessage);
        }

        return {
          success: true,
          messages
        };
      }

      return {
        success: true,
        messages: []
      };

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