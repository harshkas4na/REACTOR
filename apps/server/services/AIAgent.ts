import { BlockchainService, EnhancedBlockchainService } from './BlockchainService';
import { ValidationService } from './ValidationService';
import { KnowledgeBaseHelper } from './KnowledgeBaseHelper';
// Remove Gemini imports - we'll use custom model instead
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationUtils, MessageAnalysis } from './ConversationUtils';
import { REACTOR_KNOWLEDGE_BASE } from '../config/knowledgeBase';

// Add these interfaces
interface EmbeddingChunk {
  id: string;
  content: string;
  embeddings: number[];
  metadata: {
    source: string;
    category: 'reactor_overview' | 'rsc_technical' | 'stop_orders' | 'networks' | 'costs' | 'faq';
    priority: number;
  };
}

interface RAGResponse {
  answer: string;
  relevantChunks: EmbeddingChunk[];
  confidence: number;
  sources: string[];
}

// Specific error types for better handling
class BlockchainDataError extends Error {
  constructor(
    public type: 'BALANCE_FETCH_FAILED' | 'PAIR_NOT_FOUND' | 'PRICE_FETCH_FAILED' | 'NETWORK_ERROR' | 'TOKEN_INVALID',
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BlockchainDataError';
  }
}

export interface MessageContext {
  message: string;
  conversationId: string;
  connectedWallet?: string;
  currentNetwork?: number;
}

export interface ConversationState {
  intent: 'CREATE_STOP_ORDER' | 'ANSWER_REACTOR_QUESTION' | 'UNKNOWN';
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
    customTokenAddresses?: { [symbol: string]: string };
  };
  confidence: number;
  nextStep: string;
  lastUpdated: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastQuestion?: string; // Add this to track context for parameter extraction
}

// Training patterns for improved NLP recognition (from Chat.tsx)
const tradingPatterns = [
  {
    id: 1,
    original_request: "Hi can you create a stop order to protect my tokenA for TokenB i want to sell 15 token A when stop-loss hits 15%",
    sell_currency: "TokenA",
    buy_currency: "TokenB",
    threshold: "15%",
    amount_to_sell: "15"
  },
  {
    id: 2,
    original_request: "protect my usdc and sell them for receiving usdt at 50% loss",
    sell_currency: "USDC",
    buy_currency: "USDT",
    threshold: "50%",
    amount_to_sell: "not specified"
  },
  {
    id: 3,
    original_request: "stop order create 200 usdc sell receive DAI 50 loss % 45",
    sell_currency: "USDC",
    buy_currency: "DAI",
    threshold: "45%",
    amount_to_sell: "200"
  },
  {
    id: 4,
    original_request: "lets create a stop order which protects my Xai for Aave when loss % drops to 12%",
    sell_currency: "XAI",
    buy_currency: "AAVE",
    threshold: "12%",
    amount_to_sell: "not specified"
  },
  {
    id: 5,
    original_request: "sell my eurs to at 40% loss",
    sell_currency: "EURS",
    buy_currency: "not specified",
    threshold: "40%",
    amount_to_sell: "not specified"
  },
  {
    id: 6,
    original_request: "stop order for xavi buy me Pepe instead",
    sell_currency: "XAVI",
    buy_currency: "PEPE",
    threshold: "not specified",
    amount_to_sell: "not specified"
  },
  {
    id: 7,
    original_request: "lets create a stop order sell my usdt to get usdc when loss is 20%",
    sell_currency: "USDT",
    buy_currency: "USDC",
    threshold: "20%",
    amount_to_sell: "not specified"
  },
  {
    id: 8,
    original_request: "can you protect my tokens i want wbtc to be sold for a loss of 20% and buy weth",
    sell_currency: "WBTC",
    buy_currency: "WETH",
    threshold: "20%",
    amount_to_sell: "not specified"
  },
  {
    id: 9,
    original_request: "set up a stop loss for my ETH, sell 100 tokens for USDC when it drops 25%",
    sell_currency: "ETH",
    buy_currency: "USDC",
    threshold: "25%",
    amount_to_sell: "100"
  },
  {
    id: 10,
    original_request: "I need protection on my MATIC holdings, convert to DAI if loss reaches 30%",
    sell_currency: "MATIC",
    buy_currency: "DAI",
    threshold: "30%",
    amount_to_sell: "not specified"
  }
];

export class AIAgent {
  private conversations = new Map<string, ConversationState>();
  // Remove Gemini-related properties
  // private genAI: GoogleGenerativeAI;
  // private embeddingModel = 'gemini-embedding-001';
  private knowledgeBase: EmbeddingChunk[] = [];
  private embeddingCache = new Map<string, number[]>();
  private ragInitialized = false;
  private blockchainService: EnhancedBlockchainService;
  private validationService: ValidationService;
  // Replace with custom model endpoint
  private customModelApiKey: string;
  private customModelBaseUrl = process.env.CUSTOM_MODEL_BASE_URL || 'https://your-custom-model-api.com/v1/chat';
  private maxConversationHistory = 6;

  // Focused system prompt for stop orders only
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform.

ABOUT REACTOR:
REACTOR is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs). The platform enables automated interactions between smart contracts across different blockchain networks.

YOUR CORE CAPABILITIES:
1. **Create Stop Orders**: Guide users through creating automated sell orders to protect investments
2. **Educational Support**: Explain Reactor, RSCs, DeFi automation, and stop order concepts

SUPPORTED AUTOMATIONS:
- **Stop Orders** ✅ Available: Automatically sell tokens when price drops

IMPORTANT LIMITATIONS:
- You do NOT provide blockchain querying services (checking balances, viewing positions, transaction history, etc.)
- You do NOT provide market data or price information outside of automation setup
- You focus ONLY on helping users create stop orders and learn about REACTOR

FOCUS AREAS:
- Be helpful and educational about Reactor platform and stop order automation
- Guide users through stop order creation step by step
- Explain RSCs, automation concepts, and how stop orders work
- Stay focused on Reactor-specific topics
- Politely decline blockchain query requests and redirect to stop order creation

TONE: Conversational, educational, and enthusiastic about DeFi automation.`;

  constructor(blockchainService: EnhancedBlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
    this.customModelApiKey = process.env.CUSTOM_MODEL_API_KEY || '';

    // Remove Gemini initialization
    // this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.initializeRAGSystem().catch(console.error);
  }

  /**
   * Initialize RAG system with REACTOR knowledge (simplified for stop orders)
   */
  private async initializeRAGSystem(): Promise<void> {
    if (this.ragInitialized) return;

    console.log('🧠 Initializing REACTOR knowledge base...');

    const knowledgeChunks = [
      {
        content: `REACTOR Platform: ${REACTOR_KNOWLEDGE_BASE.platform.description}. Features: ${REACTOR_KNOWLEDGE_BASE.platform.features.join(', ')}. Enables DeFi automation through Reactive Smart Contracts with event-driven architecture, cross-chain operations, and user-friendly interfaces.`,
        metadata: { source: 'Platform_Overview', category: 'reactor_overview' as const, priority: 5 }
      },
      {
        content: `Stop Orders: ${REACTOR_KNOWLEDGE_BASE.automations.STOP_ORDER.description}. Features: ${REACTOR_KNOWLEDGE_BASE.automations.STOP_ORDER.features.join(', ')}. Cost: ${REACTOR_KNOWLEDGE_BASE.automations.STOP_ORDER.costEstimate}. Available on Ethereum, Avalanche, and Sepolia networks.`,
        metadata: { source: 'Stop_Orders', category: 'stop_orders' as const, priority: 5 }
      },
      {
        content: `RSCs (Reactive Smart Contracts): ${REACTOR_KNOWLEDGE_BASE.faq['what are rscs'].answer}`,
        metadata: { source: 'RSC_Technical', category: 'rsc_technical' as const, priority: 4 }
      },
      {
        content: `REACTOR FAQ: ${REACTOR_KNOWLEDGE_BASE.faq['what is reactor'].answer}`,
        metadata: { source: 'FAQ_Overview', category: 'faq' as const, priority: 3 }
      }
    ];

    // For now, store without embeddings (you can add embedding generation later if needed)
    for (const chunk of knowledgeChunks) {
      this.knowledgeBase.push({
        id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: chunk.content,
        embeddings: [], // Empty for now
        metadata: chunk.metadata
      });
    }

    this.ragInitialized = true;
    console.log(`✅ RAG system initialized with ${this.knowledgeBase.length} chunks`);
  }

  async processMessage(context: MessageContext) {
    const conversation = this.getOrCreateConversation(context.conversationId);
    
    if (context.connectedWallet) conversation.collectedData.connectedWallet = context.connectedWallet;
    if (context.currentNetwork) conversation.collectedData.selectedNetwork = context.currentNetwork;

    conversation.conversationHistory.push({ role: 'user', content: context.message });

    try {
      console.log('Processing message:', context.message);
      console.log('Current intent:', conversation.intent);
      console.log('Current step:', conversation.currentStep);

      // Check for blockchain query requests first
      if (this.isBlockchainQueryRequest(context.message)) {
        return this.handleBlockchainQueryDecline(context.message);
      }

      // CHECK FOR AUTOMATION SWITCHING OR RESET REQUESTS
      const resetResponse = this.handleAutomationSwitching(context.message, conversation);
      if (resetResponse) {
        return resetResponse;
      }

      // Handle custom token address input if needed
      if (conversation.currentStep === 'tokenToSell' || conversation.currentStep === 'tokenToBuy') {
        const addressValidationResponse = await this.handleTokenAddressInput(context.message, conversation);
        if (addressValidationResponse) {
          return addressValidationResponse;
        }
      }

      // Classify message intent
      const messageIntent = this.classifyMessageIntent(context.message, conversation);
      console.log('Message intent:', messageIntent);

      // Handle based on intent
      switch (messageIntent) {
        case 'CREATE_STOP_ORDER':
          if (conversation.intent !== 'CREATE_STOP_ORDER') {
            this.resetConversationForNewIntent(conversation, 'CREATE_STOP_ORDER');
          }
          await this.extractStopOrderEntities(context.message, conversation);
          return this.handleStopOrderFlow(conversation, context);
        
        case 'ANSWER_REACTOR_QUESTION':
          return await this.handleReactorQuestions(conversation, context);

        default:
          // Continue ongoing task or provide help
          if (conversation.intent === 'CREATE_STOP_ORDER') {
            await this.extractStopOrderEntities(context.message, conversation);
            return this.handleStopOrderFlow(conversation, context);
          } else {
            return this.generateHelpResponse(context, conversation);
          }
      }

    } catch (error: any) {
      console.error('AI Processing Error:', error);
      return this.generateErrorResponse(error, conversation);
    }
  }

  // ENHANCED PARAMETER EXTRACTION (from Chat.tsx)
  
  // Normalize currency names and validate known currencies
  private normalizeCurrency(currency: string): string {
    // Skip common trading/command words that aren't currencies
    const nonCurrencyWords = ['stop', 'order', 'loss', 'buy', 'sell', 'for', 'and', 'the', 'with', 'from', 'into', 'swap', 'protect'];
    if (nonCurrencyWords.includes(currency.toLowerCase())) {
      console.log("Rejecting non-currency word:", currency);
      return '';
    }
    
    // Create currency mapping from common variations
    const commonVariations: { [key: string]: string } = {
      'usdc': 'USDC', 'usd coin': 'USDC', 'usdt': 'USDT', 'tether': 'USDT',
      'dai': 'DAI', 'ethereum': 'ETH', 'eth': 'ETH', 'bitcoin': 'BTC', 'btc': 'BTC',
      'matic': 'MATIC', 'polygon': 'MATIC', 'chainlink': 'LINK', 'link': 'LINK',
      'solana': 'SOL', 'sol': 'SOL', 'binance': 'BNB', 'bnb': 'BNB',
      'cardano': 'ADA', 'ada': 'ADA', 'avalanche': 'AVAX', 'avax': 'AVAX',
      'polkadot': 'DOT', 'dot': 'DOT', 'uniswap': 'UNI', 'uni': 'UNI',
      'algorand': 'ALGO', 'algo': 'ALGO', 'cosmos': 'ATOM', 'atom': 'ATOM',
      'fantom': 'FTM', 'ftm': 'FTM', 'near': 'NEAR', 'sandbox': 'SAND', 'sand': 'SAND',
      'decentraland': 'MANA', 'mana': 'MANA', 'dogecoin': 'DOGE', 'doge': 'DOGE',
      'litecoin': 'LTC', 'ltc': 'LTC', 'cronos': 'CRO', 'cro': 'CRO',
      'shiba': 'SHIB', 'shib': 'SHIB', 'compound': 'COMP', 'comp': 'COMP',
      'graph': 'GRT', 'grt': 'GRT', 'aave': 'AAVE', 'luna': 'LUNA',
      'internet computer': 'ICP', 'icp': 'ICP', 'flow': 'FLOW', 'theta': 'THETA',
      'enjin': 'ENJ', 'enj': 'ENJ', 'vechain': 'VET', 'vet': 'VET',
      'hedera': 'HBAR', 'hbar': 'HBAR', 'wrapped bitcoin': 'WBTC', 'wbtc': 'WBTC',
      'wrapped ethereum': 'WETH', 'weth': 'WETH', 'xai': 'XAI', 'euros': 'EURS',
      'eurs': 'EURS', 'xavi': 'XAVI', 'pepe': 'PEPE', 'busd': 'BUSD',
      'tokena': 'TokenA', 'tokenb': 'TokenB'
    };
    
    const normalized = commonVariations[currency.toLowerCase()];
    if (normalized) {
      console.log("Currency normalized:", currency, "->", normalized);
      return normalized;
    }
    
    console.log("Currency not recognized:", currency);
    return '';
  }

  // Enhanced parameter extraction function (from Chat.tsx)
  private extractTradingParams(input: string, lastQuestion?: string): Partial<ConversationState['collectedData']> {
    const extracted: Partial<ConversationState['collectedData']> = {};
  
  // Context-aware extraction based on last question (HIGHEST PRIORITY)
  if (lastQuestion) {
    const numberOnly = input.match(/(?:about\s+)?(\d+(?:\.\d+)?)%?$/i);
    if (numberOnly) {
      if (lastQuestion.toLowerCase().includes('threshold') || lastQuestion.toLowerCase().includes('percentage')) {
        extracted.dropPercentage = parseFloat(numberOnly[1]);
        return extracted;
      } else if (lastQuestion.toLowerCase().includes('how many') || lastQuestion.toLowerCase().includes('amount')) {
        extracted.amount = numberOnly[1];
        return extracted;
      }
    }
    
    // If it's just a currency name in response to a question - FIXED FIELD NAMES
    const currencyOnly = input.match(/^([A-Za-z]{3,})$/);
    if (currencyOnly) {
      console.log("Currency-only input detected:", currencyOnly[1]);
      const currency = this.normalizeCurrency(currencyOnly[1]);
      console.log("Normalized currency result:", currency);
      console.log("Last question:", lastQuestion);
      if (currency) {
        // More specific context detection - check for receive/triggers first
        if (lastQuestion.toLowerCase().includes('receive') || 
            lastQuestion.toLowerCase().includes('buy') || 
            lastQuestion.toLowerCase().includes('want to buy')) {
          console.log("Setting tokenToBuy to:", currency);
          extracted.tokenToBuy = currency;
          return extracted;
        } else if (lastQuestion.toLowerCase().includes('selling') || 
                   lastQuestion.toLowerCase().includes('protect') ||
                   lastQuestion.toLowerCase().includes('which token would you like to protect') ||
                   lastQuestion.toLowerCase().includes('which currency are you selling')) {
          console.log("Setting tokenToSell to:", currency);
          extracted.tokenToSell = currency;
          return extracted;
        }
      }
    }
  }

    // Try to match against known patterns for improved accuracy
    const inputLower = input.toLowerCase();
    for (const pattern of tradingPatterns) {
      const patternLower = pattern.original_request.toLowerCase();
      const inputWords = inputLower.split(/\s+/);
      const patternWords = patternLower.split(/\s+/);
      const commonWords = inputWords.filter(word => patternWords.includes(word));
      const similarity = commonWords.length / Math.max(inputWords.length, patternWords.length);
      
      if (similarity > 0.5) {
        console.log(`Pattern match found (${Math.round(similarity * 100)}%):`, pattern.original_request);
        
        const inputHasSellCurrency = pattern.sell_currency === "not specified" || 
                                   inputLower.includes(pattern.sell_currency.toLowerCase());
        const inputHasBuyCurrency = pattern.buy_currency === "not specified" || 
                                  inputLower.includes(pattern.buy_currency.toLowerCase());
        
        if (inputHasSellCurrency && inputHasBuyCurrency) {
          if (pattern.sell_currency !== "not specified" && !extracted.tokenToSell) {
            extracted.tokenToSell = pattern.sell_currency;
          }
          if (pattern.buy_currency !== "not specified" && !extracted.tokenToBuy) {
            extracted.tokenToBuy = pattern.buy_currency;
          }
          if (pattern.threshold !== "not specified" && !extracted.dropPercentage) {
            extracted.dropPercentage = parseFloat(pattern.threshold.replace('%', ''));
          }
          if (pattern.amount_to_sell !== "not specified" && !extracted.amount) {
            extracted.amount = pattern.amount_to_sell;
          }
          break;
        }
      }
    }

    // Enhanced sell/buy currency extraction patterns
    const sellPatterns = [
      /(?:set\s+up\s+)?protection\s+for\s+my\s+([A-Za-z]{3,})\s+holdings.*?sell\s+for\s+([A-Za-z]{3,})/i,
      /protect(?:ion)?\s+(?:for\s+)?my\s+([A-Za-z]{3,})\s+holdings/i,
      /(?:auto\s+sell|automatically\s+sell)\s+my\s+([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})/i,
      /trigger\s+sell\s+order\s+for\s+my\s+([A-Za-z]{3,}),?\s+get\s+([A-Za-z]{3,})/i,
      /(?:make\s+)?stop\s+order\s+sell\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{3,})\s+get\s+([A-Za-z]{3,})/i,
      /swap\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})/i,
      /protect\s+my\s+([A-Za-z]{3,})\s+for\s+([A-Za-z]{3,})\s+.*?sell\s+(\d+(?:\.\d+)?)(?!\s*%)/i,
      /(?:sell|selling|want\s+to\s+sell|wanna\s+sell)\s+(\d+(?:\.\d+)?)(?!\s*%)\s*([A-Za-z]{3,})/i,
      /protect\s+my\s+([A-Za-z]{3,})(?!\s*\d)/i,
      /sell\s+([A-Za-z]{3,})/i,
    ];
    
    let swapPatternMatched = false;
    
    for (const pattern of sellPatterns) {
      const match = input.match(pattern);
      if (match) {
        console.log("Sell pattern matched:", pattern.source, "with groups:", match);
        
        // Handle different pattern types
        if (pattern.source.includes('protection') && pattern.source.includes('holdings') && pattern.source.includes('sell')) {
          const sellCurrency = this.normalizeCurrency(match[1]);
          const buyCurrency = this.normalizeCurrency(match[2]);
          if (sellCurrency) extracted.tokenToSell = sellCurrency;
          if (buyCurrency) extracted.tokenToBuy = buyCurrency;
          swapPatternMatched = true;
        } else if (pattern.source.includes('auto') && pattern.source.includes('sell')) {
          const sellCurrency = this.normalizeCurrency(match[1]);
          const buyCurrency = this.normalizeCurrency(match[2]);
          if (sellCurrency) extracted.tokenToSell = sellCurrency;
          if (buyCurrency) extracted.tokenToBuy = buyCurrency;
          swapPatternMatched = true;
        } else if (pattern.source.includes('swap')) {
          const amount = match[1];
          const sellCurrency = this.normalizeCurrency(match[2]);
          const buyCurrency = this.normalizeCurrency(match[3]);
          if (sellCurrency) extracted.tokenToSell = sellCurrency;
          if (buyCurrency) extracted.tokenToBuy = buyCurrency;
          if (amount) extracted.amount = amount;
          swapPatternMatched = true;
        } else if (pattern.source.includes('(\\d+')) {
          if (match[2]) {
            const normalizedCurrency = this.normalizeCurrency(match[2]);
            if (normalizedCurrency) {
              extracted.tokenToSell = normalizedCurrency;
              extracted.amount = match[1];
            }
          } else if (match[1]) {
            const normalizedCurrency = this.normalizeCurrency(match[1]);
            if (normalizedCurrency) {
              extracted.tokenToSell = normalizedCurrency;
            }
          }
        } else {
          const normalizedCurrency = this.normalizeCurrency(match[1]);
          if (normalizedCurrency) {
            extracted.tokenToSell = normalizedCurrency;
          }
        }
        break;
      }
    }

    // Extract buy currency if not already found
    if (!swapPatternMatched) {
      const buyPatterns = [
        /buy\s+me\s+([A-Za-z]{3,})\s+instead/i,
        /protect\s+my\s+[A-Za-z]{3,}\s+for\s+([A-Za-z]{3,})/i,
        /receive\s+([A-Za-z]{3,})/i,
        /buy\s+([A-Za-z]{3,})/i,
        /for\s+([A-Za-z]{3,})/i,
        /get\s+([A-Za-z]{3,})/i,
      ];
      
      for (const pattern of buyPatterns) {
        const match = input.match(pattern);
        if (match) {
          const normalizedCurrency = this.normalizeCurrency(match[1]);
          if (normalizedCurrency) {
            extracted.tokenToBuy = normalizedCurrency;
            break;
          }
        }
      }
    }

    // Extract amount if not found
    if (!extracted.amount) {
      if (input.toLowerCase().includes('all') || input.toLowerCase().includes('everything')) {
        extracted.amount = 'all';
      } else if (input.toLowerCase().includes('half')) {
        extracted.amount = '50%';
      } else {
        const amountPatterns = [
          /(\d+(?:\.\d+)?)\s*(?:coins?|units?|tokens?)/i,
          /amount.*?(\d+(?:\.\d+)?)/i,
          /^(\d+(?:\.\d+)?)$/
        ];
        
        for (const pattern of amountPatterns) {
          const match = input.match(pattern);
          if (match) {
            const numStr = match[1];
            const isPartOfPercentage = input.includes(numStr + '%') || extracted.dropPercentage?.toString() === numStr;
            if (!isPartOfPercentage) {
              extracted.amount = numStr;
              break;
            }
          }
        }
      }
    }

    console.log("Final extracted params:", extracted);
    return extracted;
  }

  private async generateQuestionForMissingData(conversation: ConversationState, missingField: string, context: MessageContext) {
    const data = conversation.collectedData;
    
    switch (missingField) {
      case 'network':
        return {
          message: "🌐 Which network would you like to use?\n\nSupported: Ethereum, Avalanche, or Sepolia\n\nJust tell me the network name:",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'network' as const,
          nextStep: 'network'
        };
  
      case 'tokenToSell':
        return {
          message: "Which currency are you selling?",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToSell'
        };
  
      case 'tokenToBuy':
        return {
          message: `What currency do you want to buy${data.tokenToSell ? ` with your ${data.tokenToSell}` : ''}?`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToBuy'
        };
  
      case 'amount':
        return {
          message: `How many ${data.tokenToSell || 'coins'} are you selling?`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'amount' as const,
          nextStep: 'amount'
        };
  
      case 'dropPercentage':
        return {
          message: `What's your threshold percentage${data.tokenToSell && data.tokenToBuy ? ` for ${data.tokenToSell} to ${data.tokenToBuy}` : ''}?`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'amount' as const,
          nextStep: 'dropPercentage'
        };
  
      default:
        return {
          message: "Please provide more details about your stop order.",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'general'
        };
    }
  }

  // NEW: Detect blockchain query requests and decline politely
  private isBlockchainQueryRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    const blockchainQueryKeywords = [
      'my balance', 'check balance', 'how much do i have', 'balance of', 'token balance',
      'wallet balance', 'show balance', 'current balance', 'account balance',
      'my position', 'check position', 'position status', 'current position', 'portfolio',
      'current price', 'price of', 'what is the price', 'token price', 'eth price',
      'transaction history', 'my transactions', 'recent transactions',
      'my health factor', 'current health factor', 'liquidation risk',
      'on chain data', 'blockchain data', 'contract balance'
    ];
    
    return blockchainQueryKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // NEW: Handle blockchain query decline
  private handleBlockchainQueryDecline(message: string) {
    const lowerMessage = message.toLowerCase();
    
    let specificResponse = '';
    
    if (lowerMessage.includes('balance')) {
      specificResponse = '**Balance Checking** is not currently available through me.';
    } else if (lowerMessage.includes('position')) {
      specificResponse = '**Position Monitoring** is not currently available through me.';
    } else if (lowerMessage.includes('price')) {
      specificResponse = '**Price Checking** is not currently available through me.';
    } else if (lowerMessage.includes('transaction')) {
      specificResponse = '**Transaction History** is not currently available through me.';
    } else {
      specificResponse = '**Blockchain data queries** are not currently available through me.';
    }

    return {
      message: `🚧 **Feature Coming Soon!**\n\n${specificResponse}\n\nWe're actively working on adding comprehensive blockchain querying capabilities to Reactor AI. This will include balance checking, position monitoring, and real-time data analysis.\n\n**What I can help you with right now:**\n\n🛡️ **Create Stop Orders** - Protect your investments automatically\n📚 **Learn About REACTOR** - Understand our platform and RSCs\n\nWhich would you like to do? 🚀`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'blockchain_query_declined',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' }
      ]
    };
  }

  // Handle automation switching and reset requests
  private handleAutomationSwitching(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for explicit automation switching or reset
    if (this.isRejectingAction(lowerMessage)) {
      console.log('🚫 User rejected current flow - resetting');
      return this.handleStopOrderRejection(conversation);
    }
    
    return null;
  }

  // Enhanced rejection detection
  private isRejectingAction(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    if (this.isStopOrderCreationIntent(lowerMessage)) {
      return false;
    }
    
    const rejectionPhrases = [
      'no', 'nope', 'nah', 'cancel', 'abort', 'quit', 'exit',
      'forget it', 'never mind', 'not now', 'maybe later', 'not interested',
      'change my mind', 'go back', 'restart', 'reset',
      'don\'t want', 'not this', 'something else', 'different approach'
    ];
    
    return rejectionPhrases.some(phrase => {
      if (phrase === 'stop' || phrase === 'different') {
        if (lowerMessage.includes('create') || lowerMessage.includes('make') || 
            lowerMessage.includes('set up') || lowerMessage.includes('automation')) {
          return false;
        }
      }
      return lowerMessage.includes(phrase);
    });
  }

  // Reset conversation state for new automation intent
  private resetConversationForNewIntent(conversation: ConversationState, newIntent: ConversationState['intent']) {
    console.log(`🔄 Resetting conversation from ${conversation.intent} to ${newIntent}`);
    
    const connectedWallet = conversation.collectedData.connectedWallet;
    const selectedNetwork = conversation.collectedData.selectedNetwork;
    
    conversation.intent = newIntent;
    conversation.currentStep = 'initial';
    conversation.collectedData = {
      connectedWallet,
      selectedNetwork
    };
    conversation.confidence = 0;
    conversation.nextStep = '';
    conversation.lastQuestion = '';
    
    conversation.conversationHistory.push({ 
      role: 'assistant', 
      content: `[RESET: Switched to ${newIntent}]` 
    });
  }

  // Simplified intent classification
  private classifyMessageIntent(message: string, conversation: ConversationState): string {
    const lowerMessage = message.toLowerCase().trim();
    
    console.log('Classifying intent for:', lowerMessage);

    if (this.isStopOrderCreationIntent(lowerMessage)) {
      return 'CREATE_STOP_ORDER';
    }

    if (this.isReactorQuestionIntent(lowerMessage)) {
      return 'ANSWER_REACTOR_QUESTION';
    }

    return 'UNKNOWN';
  }

  // Detect stop order creation intent
  private isStopOrderCreationIntent(message: string): boolean {
    const stopOrderCreationKeywords = [
      'create stop order', 'make stop order', 'set up stop order', 'setup stop order',
      'create automation', 'protect my', 'sell when', 'sell if',
      'automatic sell', 'stop loss', 'price drop', 'create order',
      'automate sell', 'trigger sell', 'liquidate when', 'exit position',
      'protect investment', 'cut losses', 'emergency sell', 'stop order'
    ];
    
    return stopOrderCreationKeywords.some(keyword => message.includes(keyword));
  }

  // Detect Reactor-related questions
  private isReactorQuestionIntent(message: string): boolean {
    const reactorQuestionKeywords = [
      'what is reactor', 'about reactor', 'how does reactor work',
      'what are rsc', 'reactive smart contract', 'how do rsc work',
      'what automations', 'tell me about stop order', 'explain stop order',
      'what networks', 'what chains', 'how much does it cost',
      'coming soon', 'future features'
    ];
    
    const hasKeywordMatch = reactorQuestionKeywords.some(keyword => message.includes(keyword));
    
    const hasQuestionPattern = message.includes('?') && (
      message.includes('reactor') || 
      message.includes('rsc') || 
      message.includes('automation') ||
      message.includes('stop order')
    );
    
    return hasKeywordMatch || hasQuestionPattern;
  }

  

  // Enhanced stop order flow handling
  private async handleStopOrderFlow(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Handling stop order flow');
    console.log('Current data:', data);
    console.log('Current step:', conversation.currentStep);
    
    // Handle rejection/cancellation
    if (this.isRejectingAction(context.message)) {
      console.log('🚫 User rejected stop order configuration - resetting');
      return this.handleStopOrderRejection(conversation);
    }
    
    // Handle confirmation steps
    if (conversation.currentStep === 'final_confirmation' && this.isConfirmingAction(context.message)) {
      try {
        const automationConfig = await this.prepareFinalConfiguration(conversation);
        
        const response = {
          message: "🚀 **Perfect!** Redirecting you to deploy your stop order...\n\nYour configuration has been prepared and will be loaded automatically. You'll just need to sign the transactions! ✨",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: false,
          automationConfig,
          nextStep: 'deploy'
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      } catch (error: any) {
        return this.generateErrorResponse(error, conversation);
      }
    }
    
    // Handle balance/liquidity confirmation steps
    if (conversation.currentStep === 'confirm_insufficient_balance') {
      if (this.isConfirmingAction(context.message)) {
        console.log('User confirmed to proceed with insufficient balance');
        conversation.currentStep = 'proceed_to_final_confirmation';
      } else {
        console.log('User rejected insufficient balance - asking for new amount');
        conversation.currentStep = 'amount';
        data.amount = undefined;
        
        const response = {
          message: `No problem! Let's adjust the amount.\n\n💰 **How much ${data.tokenToSell}** would you like to protect?\n\nYou can say "all", "half", or a specific amount:`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'amount' as const,
          nextStep: 'amount',
          options: [
            { value: 'all', label: '🎯 All of my tokens' },
            { value: '50%', label: '⚖️ Half of my tokens' }
          ]
        };
        
        conversation.lastQuestion = response.message;
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
    }
    
    if (conversation.currentStep === 'confirm_low_liquidity') {
      if (this.isConfirmingAction(context.message)) {
        console.log('User confirmed to proceed with low liquidity');
        conversation.currentStep = 'proceed_to_balance_check';
      } else {
        console.log('User rejected low liquidity - asking for new tokens');
        conversation.currentStep = 'tokenToBuy';
        data.tokenToBuy = undefined;
        data.pairAddress = undefined;
        
        const response = {
          message: `Good choice! Let's try a different token pair.\n\n🔄 **Which token** should you receive when the stop order triggers instead?\n\n💡 *Popular liquid pairs often include USDC, USDT, or ETH*\n\nJust tell me the token name:`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToBuy'
        };
        
        conversation.lastQuestion = response.message;
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
    }
    
    // Identify missing data
    const missingData = this.identifyMissingStopOrderData(conversation);
    console.log('Missing data:', missingData);
    
    if (missingData.length === 0) {
      // Fetch real blockchain data before validation
      if (!data.userBalance || !data.pairAddress || !data.currentPrice) {
        console.log('📊 Fetching real blockchain data before validation...');
        
        try {
          await this.fetchRealBlockchainDataWithSpecificErrors(conversation);
        } catch (error: any) {
          if (error instanceof BlockchainDataError) {
            return this.handleSpecificBlockchainError(error, conversation);
          } else {
            return this.generateErrorResponse(error, conversation);
          }
        }
      }
      
      // Run validation checks
      if (conversation.currentStep !== 'proceed_to_balance_check' && 
          conversation.currentStep !== 'proceed_to_final_confirmation') {
        
        try {
          const liquidityCheck = await this.checkInsufficientLiquidity(conversation);
          
          if (liquidityCheck.hasInsufficientLiquidity) {
            conversation.currentStep = 'confirm_low_liquidity';
            
            const response = {
              message: liquidityCheck.message!,
              intent: 'CREATE_STOP_ORDER' as const,
              needsUserInput: true,
              inputType: 'confirmation' as const,
              nextStep: 'confirm_low_liquidity',
              options: [
                { value: 'yes proceed', label: '⚠️ Yes, proceed with this risk' },
                { value: 'no different', label: '🔄 No, try different tokens' }
              ]
            };
            
            this.addToHistory(conversation, 'assistant', response.message);
            return response;
          }
        } catch (error: any) {
          console.error('Liquidity check failed:', error);
        }
      }
      
      // Check balance
      if (conversation.currentStep !== 'proceed_to_final_confirmation') {
        try {
          const balanceCheck = await this.checkInsufficientBalance(conversation);
          
          if (balanceCheck.hasInsufficientBalance) {
            conversation.currentStep = 'confirm_insufficient_balance';
            
            const response = {
              message: balanceCheck.message!,
              intent: 'CREATE_STOP_ORDER' as const,
              needsUserInput: true,
              inputType: 'confirmation' as const,
              nextStep: 'confirm_insufficient_balance',
              options: [
                { value: 'yes proceed', label: '✅ Yes, proceed anyway' },
                { value: 'no change', label: '❌ No, let me change the amount' }
              ]
            };
            
            this.addToHistory(conversation, 'assistant', response.message);
            return response;
          }
        } catch (error: any) {
          console.error('Balance check failed:', error);
        }
      }
      
      // Show final confirmation
      try {
        const automationConfig = await this.prepareFinalConfiguration(conversation);
        const confirmationMessage = this.generateConfirmationMessage(conversation, automationConfig);
        
        conversation.currentStep = 'final_confirmation';
        
        const response = {
          message: confirmationMessage,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'confirmation' as const,
          automationConfig,
          nextStep: 'final_confirmation',
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      } catch (error: any) {
        return this.generateErrorResponse(error, conversation);
      }
    }
    
    // Ask for next missing data
    const nextMissing = missingData[0];
    conversation.currentStep = nextMissing;
    
    console.log('Asking for:', nextMissing);
    console.log('Set currentStep to:', conversation.currentStep);
    
    const response = await this.generateQuestionForMissingData(conversation, nextMissing, context);
    conversation.lastQuestion = response.message;
    this.addToHistory(conversation, 'assistant', response.message);
    
    return response;
  }

  // NEW: Fetch blockchain data with specific error types
  private async fetchRealBlockchainDataWithSpecificErrors(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    // Fetch user balance
    if (data.connectedWallet && data.tokenToSell && data.selectedNetwork && !data.userBalance) {
      try {
        console.log(`🏦 Fetching ${data.tokenToSell} balance...`);
        const balance = await this.blockchainService.getTokenBalanceEnhanced(
          data.connectedWallet,
          data.tokenToSell,
          data.selectedNetwork,
          data.customTokenAddresses
        );
        data.userBalance = balance;
        console.log(`✅ Balance fetched: ${balance} ${data.tokenToSell}`);
      } catch (error: any) {
        console.error('❌ Error fetching user balance:', error);
        throw new BlockchainDataError(
          'BALANCE_FETCH_FAILED',
          `Unable to fetch your ${data.tokenToSell} balance. This could be due to network connectivity issues or the token not being available on ${this.getNetworkName(data.selectedNetwork!)}.`,
          { tokenToSell: data.tokenToSell, network: data.selectedNetwork }
        );
      }
    }

    // Fetch pair address and price
    if (data.tokenToSell && data.tokenToBuy && data.selectedNetwork && !data.pairAddress) {
      try {
        console.log(`🔍 Finding trading pair ${data.tokenToSell}/${data.tokenToBuy}...`);
        const pairAddress = await this.blockchainService.findPairAddressEnhanced(
          data.tokenToSell,
          data.tokenToBuy,
          data.selectedNetwork,
          data.customTokenAddresses
        );
        
        if (!pairAddress) {
          throw new BlockchainDataError(
            'PAIR_NOT_FOUND',
            `No trading pair found for ${data.tokenToSell}/${data.tokenToBuy} on ${this.getNetworkName(data.selectedNetwork!)}.`,
            { tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy, network: data.selectedNetwork }
          );
        }
        
        data.pairAddress = pairAddress;
        console.log(`✅ Pair found: ${pairAddress}`);
        
        try {
          const currentPrice = await this.blockchainService.getCurrentPriceEnhanced(
            data.tokenToSell,
            data.tokenToBuy,
            data.selectedNetwork,
            data.customTokenAddresses
          );
          data.currentPrice = currentPrice;
          console.log(`✅ Current price: ${currentPrice}`);
          
          if (data.dropPercentage) {
            data.targetPrice = currentPrice * (1 - data.dropPercentage / 100);
            console.log(`✅ Target price: ${data.targetPrice}`);
          }
        } catch (priceError: any) {
          console.error('❌ Error fetching price:', priceError);
          throw new BlockchainDataError(
            'PRICE_FETCH_FAILED',
            `Found the ${data.tokenToSell}/${data.tokenToBuy} trading pair but couldn't get the current price. This might be due to very low liquidity or network issues.`,
            { pairAddress, tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy }
          );
        }
      } catch (error: any) {
        if (error instanceof BlockchainDataError) {
          throw error;
        }
        console.error('❌ Error fetching pair data:', error);
        throw new BlockchainDataError(
          'NETWORK_ERROR',
          `Unable to access trading pair information due to network connectivity issues. Please try again in a moment.`,
          { tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy, network: data.selectedNetwork }
        );
      }
    }
  }

  // Handle specific blockchain errors
  private handleSpecificBlockchainError(error: BlockchainDataError, conversation: ConversationState) {
    const data = conversation.collectedData;
    
    switch (error.type) {
      case 'BALANCE_FETCH_FAILED':
        return {
          message: `💰 **Unable to Check ${data.tokenToSell} Balance**\n\n❌ ${error.message}\n\n**This might be because:**\n• Network connectivity issues\n• The token contract might be temporarily unavailable\n• The token might not exist on this network\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'balance_fetch_error',
          options: [
            { value: 'retry', label: '🔄 Try Again' },
            { value: 'different token', label: '🪙 Try Different Token' },
            { value: 'proceed anyway', label: '▶️ Proceed Anyway' }
          ]
        };

      case 'PAIR_NOT_FOUND':
        return {
          message: `🔍 **Trading Pair Not Found**\n\n❌ ${error.message}\n\n**This means:**\n• These tokens cannot be directly traded on this network\n• You might need to use different tokens\n• The pair might exist on a different network\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'pair_not_found_error',
          options: [
            { value: 'different tokens', label: '🔄 Try Different Tokens' },
            { value: 'different network', label: '🌐 Switch Network' },
            { value: 'restart', label: '🆕 Start Over' }
          ]
        };

      case 'PRICE_FETCH_FAILED':
        return {
          message: `📊 **Unable to Get Current Price**\n\n❌ ${error.message}\n\n**This usually means:**\n• The trading pair has very low liquidity\n• Price oracles might be temporarily unavailable\n• Network congestion is affecting data retrieval\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'price_fetch_error',
          options: [
            { value: 'retry', label: '🔄 Try Again' },
            { value: 'different pair', label: '🔄 Try Different Pair' },
            { value: 'proceed anyway', label: '▶️ Proceed Anyway' }
          ]
        };

      case 'NETWORK_ERROR':
        return {
          message: `🌐 **Network Connectivity Issue**\n\n❌ ${error.message}\n\n**This is usually temporary and caused by:**\n• High network congestion\n• RPC endpoint issues\n• Temporary service outages\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'network_error',
          options: [
            { value: 'retry', label: '🔄 Try Again' },
            { value: 'wait', label: '⏳ Wait and Retry' },
            { value: 'restart', label: '🆕 Start Over' }
          ]
        };

      default:
        return this.generateErrorResponse(error, conversation);
    }
  }

  // Handle stop order rejection
  private handleStopOrderRejection(conversation: ConversationState) {
    console.log('🚫 Handling stop order rejection');
    
    const connectedWallet = conversation.collectedData.connectedWallet;
    const selectedNetwork = conversation.collectedData.selectedNetwork;
    
    conversation.intent = 'UNKNOWN';
    conversation.currentStep = 'initial';
    conversation.collectedData = {
      connectedWallet,
      selectedNetwork
    };
    conversation.confidence = 0;
    conversation.nextStep = '';
    conversation.lastQuestion = '';
    
    const response = {
      message: "No problem! I've cleared the stop order configuration. 🔄\n\n**What would you like to do instead?**\n\nI can help you with:",
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'after_rejection',
      options: [
        { value: 'create stop order', label: '🛡️ Create a different stop order' },
        { value: 'what is reactor', label: '📚 Learn about REACTOR' }
      ]
    };
    
    this.addToHistory(conversation, 'assistant', response.message);
    return response;
  }

  private identifyMissingStopOrderData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const data = conversation.collectedData;
    
    if (!data.selectedNetwork) missing.push('network');
    if (!data.tokenToSell) missing.push('tokenToSell');
    if (!data.tokenToBuy) missing.push('tokenToBuy');
    if (!data.amount) missing.push('amount');
    if (!data.dropPercentage) missing.push('dropPercentage');
    
    console.log('Missing data identified:', missing);
    return missing;
  }

  
  private async checkInsufficientBalance(conversation: ConversationState): Promise<{
    hasInsufficientBalance: boolean;
    message?: string;
  }> {
    const data = conversation.collectedData;
    
    if (!data.amount || !data.userBalance || !data.tokenToSell) {
      return { hasInsufficientBalance: false };
    }
    
    try {
      const userBalance = parseFloat(data.userBalance);
      
      if (userBalance === 0) {
        const message = `❌ **No ${data.tokenToSell} Balance Found**\n\n**Your Request**: ${data.amount} ${data.tokenToSell}\n**Your Balance**: 0 ${data.tokenToSell}\n\n**You currently don't have any ${data.tokenToSell} tokens in your wallet.**\n\n**This automation could be useful if:**\n• You're planning to acquire ${data.tokenToSell} soon\n• You want to prepare the automation in advance\n• You're expecting a transfer or purchase\n\n**Note**: The stop order will only trigger when you actually have ${data.tokenToSell} tokens in your wallet.\n\n**Do you want to proceed anyway?**`;
        
        return {
          hasInsufficientBalance: true,
          message
        };
      }
      
      let requestedAmount: number;
      
      if (data.amount === 'all') {
        return { hasInsufficientBalance: false };
      } else if (data.amount.includes('%')) {
        return { hasInsufficientBalance: false };
      } else {
        requestedAmount = parseFloat(data.amount);
        
        if (isNaN(requestedAmount)) {
          return { hasInsufficientBalance: false };
        }
      }
      
      if (requestedAmount > userBalance) {
        const shortfall = requestedAmount - userBalance;
        const message = `⚠️ **Insufficient Balance Warning**\n\n**Your Request**: ${data.amount} ${data.tokenToSell}\n**Your Balance**: ${data.userBalance} ${data.tokenToSell}\n**Shortfall**: ${shortfall.toFixed(6)} ${data.tokenToSell}\n\n**This automation might be useful if:**\n• You're planning to acquire more ${data.tokenToSell} soon\n• You want to prepare the automation in advance\n• You're expecting a transfer or purchase\n\n**Note**: The stop order will only trigger if you have sufficient balance when the price condition is met.\n\n**Do you want to proceed anyway?**`;
        
        return {
          hasInsufficientBalance: true,
          message
        };
      }
      
      return { hasInsufficientBalance: false };
      
    } catch (error) {
      console.error('Error checking balance:', error);
      return { hasInsufficientBalance: false };
    }
  }

  private async checkInsufficientLiquidity(conversation: ConversationState): Promise<{
    hasInsufficientLiquidity: boolean;
    message?: string;
  }> {
    const data = conversation.collectedData;
    
    if (!data.pairAddress || !data.selectedNetwork) {
      return { hasInsufficientLiquidity: false };
    }
    
    try {
      console.log('Checking liquidity for pair:', data.pairAddress);
      
      const liquidityCheck = await this.blockchainService.checkPoolLiquidity(
        data.pairAddress,
        data.selectedNetwork
      );
      
      if (!liquidityCheck.hasSufficientLiquidity) {
        const enhancedMessage = `${liquidityCheck.message}\n\n**This may result in:**\n• High price impact (slippage) when your stop order triggers\n• Potential transaction failures\n• Significantly different execution price than expected\n\n**Do you still want to proceed with this ${data.tokenToSell}/${data.tokenToBuy} pair?**`;
        
        return {
          hasInsufficientLiquidity: true,
          message: enhancedMessage
        };
      }
      
      return { hasInsufficientLiquidity: false };
      
    } catch (error) {
      console.error('Error checking liquidity:', error);
      return { hasInsufficientLiquidity: false };
    }
  }

  private async prepareFinalConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    if (!data.tokenToSell || !data.tokenToBuy || !data.selectedNetwork || !data.connectedWallet) {
      throw new Error('Missing required information for stop order');
    }

    try {
      let pairAddress = data.pairAddress;
      if (!pairAddress) {
        const foundPairAddress = await this.blockchainService.findPairAddressEnhanced(
          data.tokenToSell,
          data.tokenToBuy,
          data.selectedNetwork,
          data.customTokenAddresses
        );
        
        if (!foundPairAddress) {
          throw new Error(`Trading pair ${data.tokenToSell}/${data.tokenToBuy} not found on ${this.getNetworkName(data.selectedNetwork)}`);
        }
        
        pairAddress = foundPairAddress;
        data.pairAddress = pairAddress;
      }
      
      let currentPrice = data.currentPrice;
      if (!currentPrice) {
        currentPrice = await this.blockchainService.getCurrentPriceEnhanced(
          data.tokenToSell,
          data.tokenToBuy,
          data.selectedNetwork,
          data.customTokenAddresses
        );
        data.currentPrice = currentPrice;
      }
      
      const dropPercentage = data.dropPercentage || 10;
      const thresholdPrice = currentPrice * (1 - dropPercentage / 100);
      const { coefficient, threshold } = this.calculateThresholdValues(currentPrice, thresholdPrice);
      
      const sellToken0 = await this.blockchainService.isToken0Enhanced(
        pairAddress,  
        data.tokenToSell,  
        data.selectedNetwork,
        data.customTokenAddresses
      );
      
      return {
        chainId: data.selectedNetwork.toString(),
        pairAddress,
        sellToken0,
        clientAddress: data.connectedWallet,
        coefficient: coefficient.toString(),
        threshold: threshold.toString(),
        amount: data.amount || 'all',
        destinationFunding: this.getDefaultFunding(data.selectedNetwork),
        rscFunding: "0.05",
        tokenToSell: data.tokenToSell,
        tokenToBuy: data.tokenToBuy,
        dropPercentage: dropPercentage,
        currentPrice: currentPrice,
        targetPrice: thresholdPrice,
        userBalance: data.userBalance,
        customTokenAddresses: data.customTokenAddresses || {},
        deploymentReady: true
      };
    } catch (error: any) {
      console.error('Error preparing final configuration:', error);
      throw new Error(`Failed to prepare configuration: ${error.message}`);
    }
  }

  private generateConfirmationMessage(conversation: ConversationState, config: any): string {
    const data = conversation.collectedData;
    const networkName = this.getNetworkName(parseInt(config.chainId));
    const rscCurrency = this.getRSCCurrency(parseInt(config.chainId));
    const networkCurrency = this.getNetworkCurrency(parseInt(config.chainId));
    
    return `🎯 **Stop Order Ready for Deployment!**

**📋 Your Configuration:**
💰 **Amount**: ${config.amount === 'all' ? 'All' : config.amount} ${config.tokenToSell}${data.userBalance ? ` (Balance: ${data.userBalance})` : ''}
📉 **Trigger**: ${config.dropPercentage}% price drop
🔄 **Trade**: ${config.tokenToSell} → ${config.tokenToBuy}
🌐 **Network**: ${networkName}

**📊 Market Data:**
💱 **Trading Pair**: \`${config.pairAddress.slice(0, 8)}...${config.pairAddress.slice(-6)}\`
💵 **Current Price**: ${config.currentPrice.toFixed(6)} ${config.tokenToBuy}/${config.tokenToSell}
🎯 **Trigger Price**: ${config.targetPrice.toFixed(6)} ${config.tokenToBuy}/${config.tokenToSell}

**💸 Deployment Costs:**
🏗️ **Destination Contract**: ${config.destinationFunding} ${networkCurrency}
🤖 **RSC Monitor**: ${config.rscFunding} ${rscCurrency}

**✨ Once deployed**, your stop order will:
• Monitor prices 24/7 automatically
• Execute instantly when threshold is hit  
• Protect you from further losses
• Require no manual intervention

**Ready to deploy your automated protection?** 🚀`;
  }

  // Handle Reactor-specific questions using custom model
  private async handleReactorQuestions(conversation: ConversationState, context: MessageContext) {
    try {
      // Use custom model instead of Gemini
      const response = await this.callCustomModelAPI(conversation, context);
      
      const result = {
        message: response,
        intent: 'ANSWER_REACTOR_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'reactor_question_answered',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'what is reactor', label: '📚 Learn More About REACTOR' }
        ]
      };
      
      this.addToHistory(conversation, 'assistant', result.message);
      return result;
    } catch (error: any) {
      console.error('Custom model API Error:', error);
      return this.getReactorKnowledgeFallback(context.message);
    }
  }

  // CUSTOM MODEL API INTEGRATION
  private async callCustomModelAPI(conversation: ConversationState, context: MessageContext): Promise<string> {
    const userContext = this.buildUserContext(conversation, context);
    const conversationHistory = this.formatConversationHistory(conversation);
    
    const prompt = `${this.systemPrompt}

CURRENT USER CONTEXT:
${userContext}

CONVERSATION HISTORY:
${conversationHistory}

USER MESSAGE: "${context.message}"

INSTRUCTIONS:
1. Focus only on REACTOR platform, RSCs, and stop order automation
2. Be helpful and educational about DeFi automation concepts
3. Use emojis and clear formatting
4. If asked about general DeFi topics not related to REACTOR, redirect to our platform capabilities
5. Include actionable next steps when appropriate

Respond as Reactor AI:`;

    try {
      const response = await fetch(this.customModelBaseUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.customModelApiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom model API error: ${response.status}`);
      }
      
      const data:any = await response.json();
      
      // Adapt this based on your custom model's response format
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else if (data.response) {
        return data.response;
      } else {
        throw new Error('Invalid response format from custom model API');
      }
    } catch (error) {
      console.error('Custom model API call failed:', error);
      throw error;
    }
  }

  // Handle custom token address input
  private async handleTokenAddressInput(message: string, conversation: ConversationState) {
    const addressPattern = /(0x[a-fA-F0-9]{40})/;
    const match = message.match(addressPattern);

    if (!match) return null;

    const tokenAddress = match[0];
    const networkId = conversation.collectedData.selectedNetwork;

    if (!networkId) {
      return { 
        message: "🌐 Please select a network before providing a custom token address.", 
        intent: conversation.intent,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'network'
      };
    }

    const validation = await this.blockchainService.validateTokenAddress(tokenAddress, networkId);

    if (validation.isValid && validation.tokenInfo) {
      const { symbol, name } = validation.tokenInfo;
      
      if (!conversation.collectedData.customTokenAddresses) {
        conversation.collectedData.customTokenAddresses = {};
      }
      conversation.collectedData.customTokenAddresses[symbol] = tokenAddress;
      
      conversation.collectedData[conversation.currentStep as 'tokenToSell' | 'tokenToBuy'] = symbol;
      
      return this.handleStopOrderFlow(conversation, { message } as MessageContext);
    } else {
      const networkName = this.getNetworkName(networkId);
      return {
        message: `❌ **Invalid Token Address for ${networkName}**\n\n${validation.error}\n\nPlease provide a valid ERC-20 token contract address.`,
        intent: conversation.intent,
        needsUserInput: true,
        inputType: 'token' as const,
        nextStep: conversation.currentStep
      };
    }
  }

  // UTILITY METHODS

  private isConfirmingAction(message: string): boolean {
    const confirmationWords = [
      'yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right',
      'deploy', 'create', 'go ahead', 'proceed', 'continue', 'do it'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return confirmationWords.some(word => lowerMessage.includes(word));
  }

  private calculateThresholdValues(currentPrice: number, targetPrice: number): { coefficient: number, threshold: number } {
    const coefficient = 1000;
    const ratio = targetPrice / currentPrice;
    const threshold = Math.floor(ratio * coefficient);
    return { coefficient, threshold };
  }

  private getDefaultFunding(chainId: number): string {
    const fundingMap: { [key: number]: string } = {
      1: "0.03", 11155111: "0.03", 43114: "0.01"
    };
    return fundingMap[chainId] || "0.03";
  }

  private getNetworkCurrency(chainId: number): string {
    const currencies: { [key: number]: string } = {
      1: "ETH", 11155111: "ETH", 43114: "AVAX"
    };
    return currencies[chainId] || "ETH";
  }

  private getRSCCurrency(chainId: number): string {
    return (chainId === 1 || chainId === 43114) ? "REACT" : "REACT";
  }

  private getNetworkName(chainId: number): string {
    const networkNames: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Ethereum Sepolia',
      43114: 'Avalanche C-Chain'
    };
    return networkNames[chainId] || `Network ${chainId}`;
  }

  // RESPONSE GENERATION METHODS

  private generateHelpResponse(context: MessageContext, conversation: ConversationState) {
    return {
      message: "🤖 **Hi! I'm Reactor AI.** I can help you with DeFi automation!\n\n**I can help you:**\n\n🛡️ **Create Stop Orders**\n• Automatically sell tokens when price drops\n• Protect your investments 24/7\n• Example: \"Create a stop order to protect my ETH\"\n\n📚 **Learn About REACTOR**\n• Understand Reactive Smart Contracts\n• Learn about our automations\n• Example: \"What is Reactor?\" or \"How do RSCs work?\"\n\n**What would you like to do?** 🚀",
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'awaiting_command',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' }
      ]
    };
  }

  private generateErrorResponse(error: any, conversation: ConversationState) {
    return {
      message: `❌ **Something went wrong!** ${error.message || 'Please try again.'}\n\n**I can help you with:**\n• Creating stop orders\n• Learning about REACTOR\n\nWhat would you like to do? 🔄`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'error_recovery',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' }
      ]
    };
  }

  private getReactorKnowledgeFallback(message: string) {
    return {
      message: `📚 **I'm here to help with REACTOR!** I specialize in:\n\n**🤖 Automation Creation:**\n• Stop Orders - Protect investments from price drops\n\n**📖 Education:**\n• How REACTOR works\n• Reactive Smart Contracts (RSCs)\n• DeFi automation concepts\n• Platform features and capabilities\n\nWhat would you like to know about REACTOR? 🎯`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'knowledge_fallback',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'what is reactor', label: '📚 What is REACTOR?' },
        { value: 'tell me about rsc', label: '🧠 What are RSCs?' }
      ]
    };
  }

  private buildUserContext(conversation: ConversationState, context: MessageContext): string {
    const data = conversation.collectedData;
    let contextStr = '';
    
    contextStr += `- Wallet: ${context.connectedWallet || 'Not connected'}\n`;
    contextStr += `- Network: ${context.currentNetwork ? this.getNetworkName(context.currentNetwork) : 'Not selected'}\n`;
    contextStr += `- Current Intent: ${conversation.intent}\n`;
    
    if (conversation.intent === 'CREATE_STOP_ORDER') {
      contextStr += `- Creating stop order\n`;
      if (data.tokenToSell) contextStr += `- Token to sell: ${data.tokenToSell}\n`;
      if (data.tokenToBuy) contextStr += `- Token to buy: ${data.tokenToBuy}\n`;
      if (data.amount) contextStr += `- Amount: ${data.amount}\n`;
      if (data.dropPercentage) contextStr += `- Drop percentage: ${data.dropPercentage}%\n`;
    }
    
    return contextStr || '- No previous context';
  }

  private formatConversationHistory(conversation: ConversationState): string {
    if (conversation.conversationHistory.length === 0) {
      return 'No previous conversation';
    }
    
    return conversation.conversationHistory
      .slice(-4)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  private addToHistory(conversation: ConversationState, role: 'user' | 'assistant', content: string) {
    conversation.conversationHistory.push({ role, content });
    
    if (conversation.conversationHistory.length > this.maxConversationHistory) {
      conversation.conversationHistory = conversation.conversationHistory.slice(-this.maxConversationHistory);
    }
  }

  private getOrCreateConversation(conversationId: string): ConversationState {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        intent: 'UNKNOWN',
        currentStep: 'initial',
        collectedData: {},
        confidence: 0,
        lastUpdated: Date.now(),
        conversationHistory: [],
        nextStep: ''
      });
    }
    
    const conversation = this.conversations.get(conversationId)!;
    conversation.lastUpdated = Date.now();
    
    return conversation;
  }

  private async extractStopOrderEntities(message: string, conversation: ConversationState) {
    console.log('Extracting stop order entities from:', message);
    console.log('Current conversation lastQuestion:', conversation.lastQuestion);
    console.log('Current step:', conversation.currentStep);
    
    // PRIORITY 1: Handle direct context-aware responses first
    if (conversation.lastQuestion && conversation.currentStep) {
      const directResponse = this.handleDirectResponse(message, conversation.currentStep, conversation.lastQuestion);
      if (directResponse) {
        // Apply the direct response immediately
        Object.assign(conversation.collectedData, directResponse);
        console.log('Applied direct response:', directResponse);
        return;
      }
    }
    
    // PRIORITY 2: Use existing extraction logic as fallback
    const extracted = this.extractTradingParams(message, conversation.lastQuestion);
    console.log('Extracted from extractTradingParams:', extracted);
    
    // Update conversation data with extracted parameters
    if (extracted.tokenToSell) {
      conversation.collectedData.tokenToSell = extracted.tokenToSell;
      console.log('Set tokenToSell to:', extracted.tokenToSell);
    }
    if (extracted.tokenToBuy) {
      conversation.collectedData.tokenToBuy = extracted.tokenToBuy;
      console.log('Set tokenToBuy to:', extracted.tokenToBuy);
    }
    if (extracted.amount) {
      conversation.collectedData.amount = extracted.amount;
      console.log('Set amount to:', extracted.amount);
    }
    if (extracted.dropPercentage) {
      conversation.collectedData.dropPercentage = extracted.dropPercentage;
      console.log('Set dropPercentage to:', extracted.dropPercentage);
    }
    
    console.log('Updated conversation data:', conversation.collectedData);
  }
  
  // NEW METHOD: Handle direct responses based on current step context
  private handleDirectResponse(message: string, currentStep: string, lastQuestion: string): Partial<ConversationState['collectedData']> | null {
    const trimmedMessage = message.trim().toLowerCase();
    
    // Handle single currency responses
    const currencyMatch = message.match(/^([A-Za-z]{3,10})$/i);
    if (currencyMatch) {
      const currency = this.normalizeCurrency(currencyMatch[1]);
      if (currency) {
        console.log(`Direct currency response: ${currency} for step: ${currentStep}`);
        
        if (currentStep === 'tokenToSell') {
          return { tokenToSell: currency };
        } else if (currentStep === 'tokenToBuy') {
          return { tokenToBuy: currency };
        }
      }
    }
    
    // Handle single number responses for amount
    const numberMatch = message.match(/^(\d+(?:\.\d+)?)$/);
    if (numberMatch) {
      const number = numberMatch[1];
      console.log(`Direct number response: ${number} for step: ${currentStep}`);
      
      if (currentStep === 'amount') {
        return { amount: number };
      } else if (currentStep === 'dropPercentage') {
        return { dropPercentage: parseFloat(number) };
      }
    }
    
    // Handle percentage responses
    const percentMatch = message.match(/^(\d+(?:\.\d+)?)%?$/);
    if (percentMatch && currentStep === 'dropPercentage') {
      return { dropPercentage: parseFloat(percentMatch[1]) };
    }
    
    // Handle special amount keywords
    if (currentStep === 'amount') {
      if (trimmedMessage === 'all' || trimmedMessage === 'everything') {
        return { amount: 'all' };
      } else if (trimmedMessage === 'half') {
        return { amount: '50%' };
      }
    }
    
    console.log('No direct response pattern matched');
    return null;
  }

  public getConversationCount(): number {
    return this.conversations ? Object.keys(this.conversations).length : 0;
  }

  public cleanupOldConversations(maxAgeMs: number = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [id, conversation] of this.conversations) {
      if (now - conversation.lastUpdated > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }
}