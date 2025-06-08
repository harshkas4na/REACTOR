export interface AIAutomationConfig {
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
  // Additional metadata from AI
  tokenToSell?: string;
  tokenToBuy?: string;
  dropPercentage?: number;
  selectedNetwork?: number;
}

export interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: AIAutomationConfig;
  nextStep?: string;
}

export interface AIResponse {
  success: boolean;
  data?: {
    message: string;
    intent: 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'UNKNOWN';
    needsUserInput: boolean;
    inputType?: 'amount' | 'token' | 'network' | 'confirmation';
    options?: Array<{ value: string; label: string }>;
    collectedData?: any;
    automationConfig?: AIAutomationConfig;
    nextStep?: string;
  };
  error?: string;
}

export interface ConversationState {
  intent: NonNullable<AIResponse['data']>['intent'];
  currentStep: string;
  collectedData: {
    connectedWallet?: string;
    tokenToSell?: string;
    tokenToBuy?: string;
    amount?: string;
    dropPercentage?: number;
    selectedNetwork?: number;
    pairAddress?: string;
    coefficient?: string;
    threshold?: string;
    destinationFunding?: string;
    rscFunding?: string;
  };
  missingData: string[];
  confidence: number;
  lastUpdated: number;
}

export interface AIFeatures {
  supportedAutomations: Array<{
    type: string;
    name: string;
    description: string;
    supportedChains: number[];
    status: 'active' | 'coming_soon' | 'beta';
  }>;
  supportedQuestions: string[];
}

// Utility types for better type safety
export type AIIntent = NonNullable<AIResponse['data']>['intent'];
export type AIInputType = NonNullable<AIResponse['data']>['inputType'];
export type MessageType = AIMessage['type'];

// Constants
export const AI_INTENTS = {
  CREATE_STOP_ORDER: 'CREATE_STOP_ORDER',
  ANSWER_QUESTION: 'ANSWER_QUESTION', 
  CREATE_FEE_COLLECTOR: 'CREATE_FEE_COLLECTOR',
  CREATE_RANGE_MANAGER: 'CREATE_RANGE_MANAGER',
  UNKNOWN: 'UNKNOWN'
} as const;

export const AI_INPUT_TYPES = {
  AMOUNT: 'amount',
  TOKEN: 'token',
  NETWORK: 'network', 
  CONFIRMATION: 'confirmation'
} as const; 