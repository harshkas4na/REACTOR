export interface MessageContext {
  message: string;
  conversationId: string;
  connectedWallet?: string;
  currentNetwork?: number;
}

export interface ConversationState {
  intent: 'CREATE_STOP_ORDER' | 'CREATE_RSC' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'GENERAL_QUERY';
  collectedData: {
    tokenToSell?: string;
    tokenToBuy?: string;
    amount?: string;
    dropPercentage?: number;
    selectedNetwork?: number;
    pairAddress?: string;
    sellToken0?: boolean;
    coefficient?: number;
    threshold?: number;
    clientAddress?: string;
    destinationFunding?: string;
    rscFunding?: string;
  };
  missingData: string[];
  lastStep?: string;
  nextStep?: string;
  deploymentReady?: boolean;
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
    routeTo?: string;
    deploymentReady?: boolean;
  };
  error?: string;
}

export interface AutomationConfig {
  pairAddress: string;
  sellToken0: boolean;
  amount: string;
  coefficient: number;
  threshold: number;
  clientAddress: string;
  chainId: number;
  destinationFunding: string;
  rscFunding: string;
  deploymentReady: boolean;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  currency: string;
  dex: string;
  status: 'active' | 'inactive';
}

export interface AutomationType {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  features: string[];
  supportedChains: number[];
  costEstimate: string;
  useCase: string;
}

export interface KnowledgeBase {
  platform: {
    name: string;
    description: string;
    website: string;
    documentation: string;
  };
  reactiveNetwork: {
    name: string;
    description: string;
    documentation: string;
    mainnet: {
      chainId: number;
      name: string;
      currency: string;
      explorer: string;
    };
    testnet: {
      chainId: number;
      name: string;
      currency: string;
      explorer: string;
    };
    features: string[];
  };
  automations: {
    [key: string]: AutomationType;
  };
  networks: {
    [key: string]: NetworkConfig;
  };
  faq: {
    [key: string]: {
      answer: string;
      relatedTopics: string[];
    };
  };
  responseTemplates: {
    [key: string]: string;
  };
  routes: {
    [key: string]: string;
  };
} 