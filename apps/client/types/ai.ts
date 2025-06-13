export interface AIAutomationConfig {
  // Basic Configuration
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
  
  // Additional Context Data
  tokenToSell?: string;
  tokenToBuy?: string;
  dropPercentage?: number;
  currentPrice?: number;
  targetPrice?: number;
  userBalance?: string;
  deploymentReady?: boolean;
  
  // Network Information
  networkName?: string;
  dexName?: string;
}

export interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  options?: Array<{ value: string; label: string }>;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  automationConfig?: AIAutomationConfig;
}

export interface AIResponse {
  success: boolean;
  data?: {
    message: string;
    intent: string;
    needsUserInput: boolean;
    inputType?: 'amount' | 'token' | 'network' | 'confirmation';
    options?: Array<{ value: string; label: string }>;
    automationConfig?: AIAutomationConfig;
    nextStep?: string;
    collectedData?: any;
  };
  error?: string;
}

export interface ConversationContext {
  conversationId: string;
  connectedWallet?: string;
  currentNetwork?: number;
  lastActivity: Date;
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  balance?: string;
  name?: string;
}

export interface PairInfo {
  exists: boolean;
  pairAddress?: string;
  token0?: TokenInfo;
  token1?: TokenInfo;
  reserves?: {
    reserve0: string;
    reserve1: string;
  };
  currentPrice?: number;
  targetPrice?: number;
  priceImpact?: number;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  nativeCurrency: string;
  dexName: string;
  isSupported: boolean;
}

export interface StopOrderParams {
  tokenToSell: string;
  tokenToBuy: string;
  amount: string;
  dropPercentage: number;
  network: number;
  walletAddress: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  sanitizedData?: any;
}

export interface DeploymentConfig {
  chainId: string;
  pairAddress: string;
  sellToken0: boolean;
  clientAddress: string;
  coefficient: string;
  threshold: string;
  amount: string;
  destinationFunding: string;
  rscFunding: string;
  estimatedCosts?: {
    destinationContract: string;
    tokenApproval: string;
    rscContract: string;
    total: string;
  };
}

export interface AICapabilities {
  stopOrders: boolean;
  feeCollectors: boolean;
  rangeManagers: boolean;
  crossChain: boolean;
  realTimeData: boolean;
}

export interface ConversationState {
  intent: 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'UNKNOWN';
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
    userBalance?: string;
    currentPrice?: number;
    targetPrice?: number;
  };
  missingData: string[];
  confidence: number;
  lastUpdated: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  suggestions?: string[];
  recoveryActions?: Array<{
    action: string;
    label: string;
  }>;
}

export interface AIHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    ai: boolean;
    blockchain: boolean;
    validation: boolean;
  };
  lastChecked: Date;
  uptime: number;
}

// Utility types for better type safety
export type AutomationType = 'stop_order' | 'fee_collector' | 'range_manager';
export type NetworkType = 'mainnet' | 'testnet';
export type TokenSymbol = 'ETH' | 'USDC' | 'USDT' | 'DAI' | 'WBTC' | 'AVAX';
export type ChainId = 1 | 11155111 | 43114 | 1597 | 5318008;

// Enhanced interfaces for better AI integration
export interface SmartRecommendation {
  type: 'amount' | 'percentage' | 'token' | 'network';
  value: any;
  reason: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MarketContext {
  currentPrice: number;
  priceChange24h?: number;
  volume24h?: string;
  marketCap?: string;
  volatility?: number;
  liquidity?: {
    usd: number;
    sufficient: boolean;
  };
}

export interface AutomationSummary {
  id: string;
  type: AutomationType;
  status: 'active' | 'triggered' | 'expired' | 'cancelled';
  createdAt: Date;
  config: AIAutomationConfig;
  performance?: {
    triggeredAt?: Date;
    executedAt?: Date;
    finalPrice?: number;
    slippage?: number;
    gasUsed?: string;
  };
}