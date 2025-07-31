import { BlockchainService, EnhancedBlockchainService } from './BlockchainService';
import { ValidationService } from './ValidationService';
import { KnowledgeBaseHelper } from './KnowledgeBaseHelper';
// Add these imports at the top of your existing AIAgent.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationUtils, MessageAnalysis } from './ConversationUtils';
import { REACTOR_KNOWLEDGE_BASE } from '../config/knowledgeBase';

// Add these interfaces
interface EmbeddingChunk {
  id: string;
  content: string;
  embeddings: number[];
  metadata: {
    source: string;
    category: 'reactor_overview' | 'rsc_technical' | 'automations' | 'stop_orders' | 'aave_protection' | 'networks' | 'costs' | 'faq';
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
  intent: 'CREATE_STOP_ORDER' | 'CREATE_AAVE_PROTECTION' | 'ANSWER_REACTOR_QUESTION' | 'UNKNOWN';
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
    // Aave protection specific data
    protectionType?: string;
    healthFactorThreshold?: string;
    targetHealthFactor?: string;
    collateralAsset?: string;
    debtAsset?: string;
    preferDebtRepayment?: boolean;
    currentHealthFactor?: string;
    hasAavePosition?: boolean;
    userAaveAssets?: any[];
  };
  confidence: number;
  nextStep: string;
  lastUpdated: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class AIAgent {
  private conversations = new Map<string, ConversationState>();
  private genAI: GoogleGenerativeAI;
  private embeddingModel = 'gemini-embedding-001';
  private knowledgeBase: EmbeddingChunk[] = [];
  private embeddingCache = new Map<string, number[]>();
  private ragInitialized = false;
  private blockchainService: EnhancedBlockchainService;
  private validationService: ValidationService;
  private geminiApiKey: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  private maxConversationHistory = 6;

  // Focused system prompt
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform.

ABOUT REACTOR:
REACTOR is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs). The platform enables automated interactions between smart contracts across different blockchain networks.

YOUR CORE CAPABILITIES:
1. **Create Stop Orders**: Guide users through creating automated sell orders to protect investments
2. **Create Aave Protection**: Help users set up automated liquidation protection for Aave positions  
3. **Educational Support**: Explain Reactor, RSCs, DeFi automation, and our specific automations

SUPPORTED AUTOMATIONS:
- **Stop Orders** ✅ Available: Automatically sell tokens when price drops
- **Aave Protection** ✅ Available on Sepolia: Protect against liquidation
- **Fee Collectors** 🚧 Coming Soon: Auto-harvest Uniswap V3 fees
- **Range Managers** 🚧 Coming Soon: Optimize LP position ranges

IMPORTANT LIMITATIONS:
- You do NOT provide blockchain querying services (checking balances, viewing positions, transaction history, etc.)
- You do NOT provide market data or price information outside of automation setup
- You focus ONLY on helping users create automations and learn about REACTOR

FOCUS AREAS:
- Be helpful and educational about Reactor platform and automations
- Guide users through stop order and Aave protection creation
- Explain RSCs, health factors, liquidation protection, and automation concepts
- Stay focused on Reactor-specific topics
- Politely decline blockchain query requests and redirect to automation creation

TONE: Conversational, educational, and enthusiastic about DeFi automation.`;

  constructor(blockchainService: EnhancedBlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.initializeRAGSystem().catch(console.error);
  }

  /**
   * Initialize RAG system with REACTOR knowledge
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
        content: `Aave Protection: ${REACTOR_KNOWLEDGE_BASE.automations.AAVE_PROTECTION.description}. Features: ${REACTOR_KNOWLEDGE_BASE.automations.AAVE_PROTECTION.features.join(', ')}. Currently available on Sepolia testnet with Ethereum mainnet coming soon.`,
        metadata: { source: 'Aave_Protection', category: 'aave_protection' as const, priority: 5 }
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

    for (const chunk of knowledgeChunks) {
      try {
        const embedding = await this.generateEmbedding(chunk.content);
        this.knowledgeBase.push({
          id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: chunk.content,
          embeddings: embedding,
          metadata: chunk.metadata
        });
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      } catch (error) {
        console.error(`Failed to generate embedding:`, error);
      }
    }

    this.ragInitialized = true;
    console.log(`✅ RAG system initialized with ${this.knowledgeBase.length} chunks`);
  }

  /**
   * Generate embedding with caching
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const hash = this.hashText(text);
    
    if (this.embeddingCache.has(hash)) {
      return this.embeddingCache.get(hash)!;
    }
    
    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
    const result = await model.embedContent(text);
    
    if (!result.embedding?.values) {
      throw new Error('No embedding values returned');
    }
    
    const embedding = result.embedding.values;
    this.embeddingCache.set(hash, embedding);
    return embedding;
  }

  /**
   * Process RAG query
   */
  private async processRAGQuery(query: string, maxChunks: number = 3): Promise<RAGResponse> {
    if (!this.ragInitialized) {
      await this.initializeRAGSystem();
    }

    const queryEmbedding = await this.generateEmbedding(query);
    
    const relevantChunks = this.knowledgeBase
      .map(chunk => ({
        ...chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embeddings)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxChunks);

    const context = relevantChunks
      .map(chunk => `[${chunk.metadata.source}]: ${chunk.content}`)
      .join('\n\n');

    const prompt = `${this.systemPrompt}

RETRIEVED CONTEXT:
${context}

USER QUERY: "${query}"

Respond as Reactor AI:`;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const avgSimilarity = relevantChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / relevantChunks.length;
    const confidence = Math.min(avgSimilarity * 100, 95);

    return {
      answer: response,
      relevantChunks: relevantChunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        embeddings: [],
        metadata: chunk.metadata
      })),
      confidence,
      sources: relevantChunks.map(chunk => chunk.metadata.source)
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vectors must have same length');
    
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
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

      // Check for blockchain query requests first (NEW)
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
        
        case 'CREATE_AAVE_PROTECTION':
          if (conversation.intent !== 'CREATE_AAVE_PROTECTION') {
            this.resetConversationForNewIntent(conversation, 'CREATE_AAVE_PROTECTION');
          }
          await this.extractAaveEntities(context.message, conversation);
          return this.handleAaveProtectionFlow(conversation, context);
        
        case 'ANSWER_REACTOR_QUESTION':
          return await this.handleReactorQuestions(conversation, context);

        default:
          // Continue ongoing task or provide help
          if (conversation.intent === 'CREATE_STOP_ORDER') {
            await this.extractStopOrderEntities(context.message, conversation);
            return this.handleStopOrderFlow(conversation, context);
          } else if (conversation.intent === 'CREATE_AAVE_PROTECTION') {
            await this.extractAaveEntities(context.message, conversation);
            return this.handleAaveProtectionFlow(conversation, context);
          } else {
            return this.generateHelpResponse(context, conversation);
          }
      }

    } catch (error: any) {
      console.error('AI Processing Error:', error);
      return this.generateErrorResponse(error, conversation);
    }
  }

  // NEW: Detect blockchain query requests and decline politely
  private isBlockchainQueryRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    const blockchainQueryKeywords = [
      // Balance queries
      'my balance', 'check balance', 'how much do i have', 'balance of', 'token balance',
      'wallet balance', 'show balance', 'current balance', 'account balance',
      
      // Position queries
      'my position', 'check position', 'lending position', 'my aave',
      'position status', 'current position', 'portfolio', 'my holdings',
      
      // Price queries
      'current price', 'price of', 'what is the price', 'token price', 'eth price',
      'market price', 'live price', 'real time price',
      
      // Transaction queries
      'transaction history', 'my transactions', 'recent transactions', 'tx history',
      'transaction status', 'pending transactions',
      
      // Health factor queries
      'my health factor', 'current health factor', 'check health factor',
      'health factor status', 'liquidation risk',
      
      // General blockchain queries
      'on chain data', 'blockchain data', 'contract balance', 'smart contract data',
      'defi position', 'yield farming position', 'liquidity position'
    ];
    
    return blockchainQueryKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // NEW: Handle blockchain query decline
  private handleBlockchainQueryDecline(message: string) {
    const lowerMessage = message.toLowerCase();
    
    let specificResponse = '';
    
    if (lowerMessage.includes('balance')) {
      specificResponse = '**Balance Checking** is not currently available through me.';
    } else if (lowerMessage.includes('position') || lowerMessage.includes('aave')) {
      specificResponse = '**Position Monitoring** is not currently available through me.';
    } else if (lowerMessage.includes('price')) {
      specificResponse = '**Price Checking** is not currently available through me.';
    } else if (lowerMessage.includes('transaction')) {
      specificResponse = '**Transaction History** is not currently available through me.';
    } else if (lowerMessage.includes('health factor')) {
      specificResponse = '**Health Factor Monitoring** is not currently available through me.';
    } else {
      specificResponse = '**Blockchain data queries** are not currently available through me.';
    }

    return {
      message: `🚧 **Feature Coming Soon!**\n\n${specificResponse}\n\nWe're actively working on adding comprehensive blockchain querying capabilities to Reactor AI. This will include balance checking, position monitoring, and real-time data analysis.\n\n**What I can help you with right now:**\n\n🛡️ **Create Stop Orders** - Protect your investments automatically\n🏦 **Create Aave Protection** - Guard against liquidation\n📚 **Learn About REACTOR** - Understand our platform and RSCs\n\nWhich automation would you like to create? 🚀`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'blockchain_query_declined',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' }
      ]
    };
  }

  // Handle automation switching and reset requests
  private handleAutomationSwitching(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for explicit automation switching
    if (conversation.intent === 'CREATE_STOP_ORDER' && this.isAaveProtectionCreationIntent(lowerMessage)) {
      console.log('🔄 User switching from Stop Order to Aave Protection');
      this.resetConversationForNewIntent(conversation, 'CREATE_AAVE_PROTECTION');
      
      return {
        message: "🔄 **Switching to Aave Protection!**\n\nI've reset our conversation to focus on creating Aave liquidation protection instead.\n\nLet's set up automated protection for your Aave lending position! 🛡️\n\nFirst, which network is your Aave position on?",
        intent: 'CREATE_AAVE_PROTECTION' as const,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'aave_network',
        options: [
          { value: '11155111', label: '🧪 Sepolia Testnet (Available Now)' },
          { value: '1', label: '🔷 Ethereum Mainnet (Coming Soon)' },
          { value: '43114', label: '🔺 Avalanche (Coming Soon)' }
        ]
      };
    }
    
    if (conversation.intent === 'CREATE_AAVE_PROTECTION' && this.isStopOrderCreationIntent(lowerMessage)) {
      console.log('🔄 User switching from Aave Protection to Stop Order');
      this.resetConversationForNewIntent(conversation, 'CREATE_STOP_ORDER');
      
      return {
        message: "🔄 **Switching to Stop Order Creation!**\n\nI've reset our conversation to focus on creating a stop order instead.\n\nLet's protect your tokens from price drops! 🛡️\n\nWhich token would you like to protect with a stop order?",
        intent: 'CREATE_STOP_ORDER' as const,
        needsUserInput: true,
        inputType: 'token' as const,
        nextStep: 'tokenToSell',
        options: [
          { value: 'ETH', label: '💎 Ethereum (ETH)' },
          { value: 'USDC', label: '💵 USD Coin (USDC)' },
          { value: 'USDT', label: '💵 Tether (USDT)' },
          { value: 'DAI', label: '💵 Dai (DAI)' }
        ]
      };
    }
    
    return null;
  }

  // Reset conversation state for new automation intent
  private resetConversationForNewIntent(conversation: ConversationState, newIntent: ConversationState['intent']) {
    console.log(`🔄 Resetting conversation from ${conversation.intent} to ${newIntent}`);
    
    // Keep basic connection info but reset automation-specific data
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
    
    // Keep conversation history but add a reset marker
    conversation.conversationHistory.push({ 
      role: 'assistant', 
      content: `[RESET: Switched to ${newIntent}]` 
    });
  }

  public getConversationCount(): number {
    return this.conversations ? Object.keys(this.conversations).length : 0;
  }

  // Enhanced rejection detection
  private isRejectingAction(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    // Don't treat automation creation requests as rejections
    if (this.isStopOrderCreationIntent(lowerMessage) || this.isAaveProtectionCreationIntent(lowerMessage)) {
      return false;
    }
    
    // Check for explicit rejection phrases (more specific)
    const rejectionPhrases = [
      'no', 'nope', 'nah', 'cancel', 'abort', 'quit', 'exit',
      'forget it', 'never mind', 'not now', 'maybe later', 'not interested',
      'change my mind', 'go back', 'restart', 'reset',
      'don\'t want', 'not this', 'something else', 'different approach',
      'try something different', 'not what I want'
    ];
    
    // Check for rejection patterns but exclude automation creation contexts
    return rejectionPhrases.some(phrase => {
      if (phrase === 'stop' || phrase === 'different') {
        // For ambiguous words, check context
        if (lowerMessage.includes('create') || lowerMessage.includes('make') || 
            lowerMessage.includes('set up') || lowerMessage.includes('automation')) {
          return false; // This is automation creation, not rejection
        }
      }
      return lowerMessage.includes(phrase);
    });
  }

  // Simplified intent classification
  private classifyMessageIntent(message: string, conversation: ConversationState): string {
    const lowerMessage = message.toLowerCase().trim();
    
    console.log('Classifying intent for:', lowerMessage);

    // Check for stop order creation intents
    if (this.isStopOrderCreationIntent(lowerMessage)) {
      return 'CREATE_STOP_ORDER';
    }

    // Check for Aave protection creation intents
    if (this.isAaveProtectionCreationIntent(lowerMessage)) {
      return 'CREATE_AAVE_PROTECTION';
    }

    // Check for Reactor/automation questions
    if (this.isReactorQuestionIntent(lowerMessage)) {
      return 'ANSWER_REACTOR_QUESTION';
    }

    return 'UNKNOWN';
  }

  // Detect stop order creation intent (ENHANCED)
  private isStopOrderCreationIntent(message: string): boolean {
    const stopOrderCreationKeywords = [
      'create stop order', 'make stop order', 'set up stop order', 'setup stop order',
      'create automation', 'protect my', 'sell when', 'sell if',
      'automatic sell', 'stop loss', 'price drop', 'create order',
      'automate sell', 'trigger sell', 'liquidate when', 'exit position',
      'protect investment', 'cut losses', 'emergency sell', 'stop order',
      'new stop order', 'build stop order', 'configure stop order'
    ];
    
    return stopOrderCreationKeywords.some(keyword => message.includes(keyword));
  }

  // Detect Aave protection creation intent (ENHANCED)
  private isAaveProtectionCreationIntent(message: string): boolean {
    const aaveProtectionCreationKeywords = [
      'create aave protection', 'set up aave protection', 'make aave protection',
      'protect my aave', 'aave liquidation protection', 'create liquidation protection',
      'protect aave position', 'guard against liquidation', 'prevent liquidation',
      'health factor protection', 'aave automation', 'automated aave protection',
      'aave protection', 'new aave protection', 'build aave protection'
    ];
    
    return aaveProtectionCreationKeywords.some(keyword => message.includes(keyword));
  }

  // Detect Reactor-related questions (ENHANCED)
  private isReactorQuestionIntent(message: string): boolean {
    const reactorQuestionKeywords = [
      // About Reactor platform
      'what is reactor', 'about reactor', 'how does reactor work',
      'tell me about reactor', 'explain reactor', 'reactor detail',
      'reactor in detail', 'more about reactor', 'comprehensive reactor',
      
      // About RSCs
      'what are rsc', 'reactive smart contract', 'how do rsc work',
      'tell me about rsc', 'explain rsc', 'rsc detail', 'rsc in detail',
      'more about rsc', 'comprehensive rsc',
      
      // About automations
      'what automations', 'tell me about stop order', 'explain stop order',
      'tell me about aave protection', 'explain aave protection',
      'what is aave protection', 'how does aave protection work',
      'tell me about fee collector', 'explain fee collector',
      'tell me about range manager', 'explain range manager',
      'available automations', 'supported automations',
      
      // About concepts
      'what is health factor', 'explain health factor', 'tell me about health factor',
      'what is liquidation', 'explain liquidation', 'tell me about liquidation',
      
      // General platform questions
      'how much does it cost', 'what networks', 'what chains',
      'coming soon', 'future features', 'roadmap', 'supported networks',
      'supported tokens', 'how it works', 'benefits', 'advantages',
      'why reactor', 'why use reactor'
    ];
    
    // Check for direct keyword matches
    const hasKeywordMatch = reactorQuestionKeywords.some(keyword => message.includes(keyword));
    
    // Check for question patterns with reactor-related terms
    const hasQuestionPattern = message.includes('?') && (
      message.includes('reactor') || 
      message.includes('rsc') || 
      message.includes('automation') ||
      message.includes('aave') ||
      message.includes('stop order') ||
      message.includes('health factor') ||
      message.includes('liquidation') ||
      message.includes('cross chain') ||
      message.includes('defi')
    );
    
    // Check for detailed requests
    const isDetailedRequest = (message.includes('detail') || message.includes('more') || 
                              message.includes('comprehensive') || message.includes('explain') ||
                              message.includes('how does') || message.includes('in depth')) &&
                             (message.includes('reactor') || message.includes('rsc') || 
                              message.includes('automation'));
    
    return hasKeywordMatch || hasQuestionPattern || isDetailedRequest;
  }

  // Handle Reactor-specific questions (ENHANCED)
  private async handleReactorQuestions(conversation: ConversationState, context: MessageContext) {
    const lowerMessage = context.message.toLowerCase();

    // Check if user is asking for detailed information
    const isDetailedRequest = lowerMessage.includes('detail') || lowerMessage.includes('more') || 
                             lowerMessage.includes('comprehensive') || lowerMessage.includes('explain') ||
                             lowerMessage.includes('how does') || lowerMessage.includes('in depth');

    // Enhanced knowledge base for detailed questions
    if (lowerMessage.includes('reactor') && (isDetailedRequest || lowerMessage.includes('tell me about reactor'))) {
      const detailedReactorInfo = `🚀 **REACTOR - Comprehensive Overview**

**What is REACTOR?**
REACTOR is a cutting-edge DeFi automation platform that revolutionizes how users interact with blockchain protocols. Built on Reactive Smart Contracts (RSCs), it enables autonomous, event-driven operations across multiple blockchain networks.

**🧠 Core Technology - Reactive Smart Contracts (RSCs):**
• **Event-Driven Architecture**: Contracts that automatically react to blockchain events
• **Inversion of Control**: Instead of users calling contracts, contracts observe and act
• **Cross-Chain Operations**: Monitor events on one chain, execute on another
• **24/7 Autonomous Monitoring**: No manual intervention required

**🛡️ Available Automations:**

**Stop Orders** ✅ **Active**
• Automatically sell tokens when price drops below threshold
• Protect investments from market volatility
• Available on: Ethereum, Avalanche, Sepolia
• Use case: "Sell my ETH if it drops 10%"

**Aave Liquidation Protection** ✅ **Active on Sepolia**
• Monitor health factor 24/7
• Automatically deposit collateral or repay debt
• Prevent costly liquidation penalties
• Use case: Protect leveraged positions

**🚧 Coming Soon:**
• **Fee Collectors**: Auto-harvest Uniswap V3 fees
• **Range Managers**: Optimize LP position ranges
• **Portfolio Automation**: Multi-asset strategies

**🌐 Cross-Chain Support:**
• Ethereum Mainnet & Sepolia
• Avalanche C-Chain
• Arbitrum, Base, Polygon, BSC
• More networks being added

**💡 Why Choose REACTOR?**
• **No Coding Required**: Intuitive interfaces for everyone
• **Gas Efficient**: Optimized for minimal costs
• **Secure**: Audited smart contracts
• **Community Driven**: Open template library
• **24/7 Operation**: Truly autonomous automation

**🔧 Technical Benefits:**
• Full EVM compatibility
• Event-driven triggers
• Cross-chain state management
• Automated callbacks
• Real-time monitoring

Ready to automate your DeFi strategy? I can help you create your first automation! 🎯`;

      const response = {
        message: detailedReactorInfo,
        intent: 'ANSWER_REACTOR_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'detailed_reactor_explained',
        options: [
          { value: 'create stop order', label: '🛡️ Create My First Stop Order' },
          { value: 'create aave protection', label: '🏦 Create Aave Protection' },
          { value: 'tell me about rsc', label: '🧠 Learn About RSCs' },
          { value: 'what automations are available', label: '🤖 View All Automations' }
        ]
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    }

    // Enhanced RSC explanation
    if (lowerMessage.includes('rsc') || (lowerMessage.includes('reactive smart contract') && isDetailedRequest)) {
      const detailedRSCInfo = `🧠 **Reactive Smart Contracts (RSCs) - Deep Dive**

**What Makes RSCs Revolutionary?**
Traditional smart contracts are "passive" - they only execute when someone calls them. RSCs are "reactive" - they actively monitor blockchain events and automatically execute when conditions are met.

**🔄 How RSCs Work:**

**1. Event Monitoring**
• RSCs continuously watch for specific blockchain events
• They can monitor multiple contracts and chains simultaneously
• Use topic filters to identify relevant events

**2. Automatic Triggering**
• When target events occur, RSCs automatically process them
• No human intervention or manual transactions required
• Executes based on predefined logic and conditions

**3. Cross-Chain Execution**
• Monitor events on Chain A, execute functions on Chain B
• Unified automation across different blockchain networks
• Seamless inter-chain communication

**🏗️ Technical Architecture:**

**Core Components:**
• **AbstractReactive**: Base contract for monitoring capabilities
• **System Contract**: Special contract at \`0x...fffFfF\`
• **Event Listeners**: Filter and capture relevant events
• **Execution Engine**: Process events and determine actions
• **Callback System**: Execute functions on target chains

**🎯 Real-World Example - Stop Order:**
1. RSC monitors ETH/USDC price on Uniswap
2. Detects when price drops 10% (event triggered)
3. Automatically executes swap function on destination chain
4. Your ETH is sold for USDC without manual intervention

**💪 RSC Advantages:**
• **Automation**: Reduces manual monitoring and intervention
• **Reliability**: Guaranteed execution when conditions are met
• **Efficiency**: Gas-optimized operations
• **Flexibility**: Customizable for various use cases
• **Scalability**: Handles multiple automations simultaneously

**🔧 Development Benefits:**
• Built on proven smart contract technology
• Full EVM compatibility
• Extensive testing and auditing
• Open-source and transparent

RSCs represent the future of DeFi - truly autonomous, intelligent contracts that work for you 24/7! 🚀`;

      const response = {
        message: detailedRSCInfo,
        intent: 'ANSWER_REACTOR_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'detailed_rsc_explained',
        options: [
          { value: 'create stop order', label: '🛡️ Try RSCs with Stop Order' },
          { value: 'create aave protection', label: '🏦 Try RSCs with Aave Protection' },
          { value: 'what is reactor', label: '📚 Back to REACTOR Overview' },
          { value: 'how much does it cost', label: '💰 View Costs' }
        ]
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    }

    // Check knowledge base for other topics
    if (typeof KnowledgeBaseHelper?.enhancedSearch === 'function') {
      const knowledgeResult = KnowledgeBaseHelper.enhancedSearch(context.message);
      if (knowledgeResult) {
        const response = {
          message: knowledgeResult.answer,
          intent: 'ANSWER_REACTOR_QUESTION' as const,
          needsUserInput: false,
          nextStep: `knowledge_${knowledgeResult.source}`,
          options: this.generateReactorRelatedOptions(context.message)
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
    }

    // Check for automation-specific questions
    if (typeof KnowledgeBaseHelper?.isQuestionAboutAutomation === 'function' && 
        KnowledgeBaseHelper.isQuestionAboutAutomation(lowerMessage)) {
      if (typeof KnowledgeBaseHelper?.getAutomationAnswer === 'function') {
        const automationAnswer = KnowledgeBaseHelper.getAutomationAnswer(lowerMessage);
        if (automationAnswer) {
          const response = {
            message: automationAnswer.answer,
            intent: 'ANSWER_REACTOR_QUESTION' as const,
            needsUserInput: false,
            nextStep: 'automation_explained',
            options: automationAnswer.relatedTopics.map(topic => ({
              value: topic.toLowerCase().replace(/\s+/g, '_'),
              label: topic
            }))
          };
          
          this.addToHistory(conversation, 'assistant', response.message);
          return response;
        }
      }
    }

    // Use Gemini for complex Reactor questions only if knowledge base doesn't have answer
    try {
      const aiResponse = await this.callGeminiAPI(conversation, context);
      const response = {
        message: aiResponse,
        intent: 'ANSWER_REACTOR_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'gemini_response',
        options: this.generateReactorRelatedOptions(context.message)
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.getReactorKnowledgeFallback(context.message);
    }
  }

  // Generate related options for Reactor topics
  private generateReactorRelatedOptions(message: string): Array<{value: string, label: string}> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('aave') || lowerMessage.includes('liquidation') || lowerMessage.includes('health factor')) {
      return [
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'tell me about health factor', label: '📊 What is Health Factor?' },
        { value: 'explain liquidation', label: '⚠️ Explain Liquidation' },
        { value: 'create stop order', label: '🛡️ Create Stop Order Instead' }
      ];
    }
    
    if (lowerMessage.includes('stop order') || lowerMessage.includes('stop loss')) {
      return [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'tell me about rsc', label: '🧠 Learn About RSCs' },
        { value: 'what networks supported', label: '🌐 Supported Networks' },
        { value: 'how much does it cost', label: '💰 View Costs' }
      ];
    }
    
    if (lowerMessage.includes('fee collector') || lowerMessage.includes('range manager')) {
      return [
        { value: 'create stop order', label: '🛡️ Create Stop Order Now' },
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'tell me about coming soon features', label: '🚀 Coming Soon Features' }
      ];
    }
    
    // Default options
    return [
      { value: 'create stop order', label: '🛡️ Create Stop Order' },
      { value: 'create aave protection', label: '🏦 Create Aave Protection' },
      { value: 'tell me about reactor', label: '📚 Learn About REACTOR' },
      { value: 'what automations are available', label: '🤖 Available Automations' }
    ];
  }

  // COMPLETE STOP ORDER FLOW IMPLEMENTATION
  
  // Extract entities for stop orders
  private async extractStopOrderEntities(message: string, conversation: ConversationState) {
    console.log('Extracting stop order entities from:', message);
    
    if (conversation.currentStep === 'initial') {
      this.extractInitialStopOrderEntities(message, conversation);
    } else {
      this.extractFocusedStopOrderEntity(message, conversation);
    }
  }

  private extractInitialStopOrderEntities(message: string, conversation: ConversationState) {
    const { collectedData } = conversation;
    const lowerMessage = message.toLowerCase();
    
    // Extract tokens
    const tokens = this.extractAllTokens(message);
    if (tokens.length > 0) {
      const roles = this.parseTokenRolesFromSentence(lowerMessage, tokens);
      if (roles.sellToken) collectedData.tokenToSell = roles.sellToken;
      if (roles.buyToken) collectedData.tokenToBuy = roles.buyToken;
      if (!collectedData.tokenToSell) collectedData.tokenToSell = tokens[0];
      if (!collectedData.tokenToBuy && tokens.length > 1) collectedData.tokenToBuy = tokens[1];
    }

    // Extract percentage
    const percentageMatch = lowerMessage.match(/\b(\d+(?:\.\d+)?)\s*%/);
    if (percentageMatch) {
      collectedData.dropPercentage = parseFloat(percentageMatch[1]);
    }

    // Extract amount
    if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
      collectedData.amount = 'all';
    } else if (lowerMessage.includes('half')) {
      collectedData.amount = '50%';
    }
  }

  private extractFocusedStopOrderEntity(message: string, conversation: ConversationState) {
    const { collectedData, currentStep } = conversation;
    const lowerMessage = message.toLowerCase();

    switch (currentStep) {
      case 'tokenToSell':
      case 'tokenToBuy':
        const addressPattern = /0x[a-fA-F0-9]{40}/;
        if (!addressPattern.test(message)) {
          const token = this.extractToken(message);
          if (token) {
            collectedData[currentStep] = token;
            console.log(`Set ${currentStep}: ${token}`);
          }
        }
        break;

      case 'amount':
        if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
          collectedData.amount = 'all';
        } else if (lowerMessage.includes('half') || lowerMessage.includes('50%')) {
          collectedData.amount = '50%';
        } else {
          const amountMatch = message.match(/\b(\d+(?:\.\d+)?)/);
          if (amountMatch) {
            collectedData.amount = amountMatch[1];
          }
        }
        break;

      case 'dropPercentage':
        const percentageMatch = message.match(/\b(\d+(?:\.\d+)?)/);
        if (percentageMatch) {
          collectedData.dropPercentage = parseFloat(percentageMatch[1]);
        }
        break;

      case 'network':
        if (lowerMessage.includes('ethereum') || lowerMessage.includes('mainnet')) {
          collectedData.selectedNetwork = 1;
        } else if (lowerMessage.includes('avalanche')) {
          collectedData.selectedNetwork = 43114;
        } else if (lowerMessage.includes('sepolia') || lowerMessage.includes('testnet')) {
          collectedData.selectedNetwork = 11155111;
        }
        break;
    }
  }

  // Enhanced stop order flow handling with rejection support and improved error handling
  private async handleStopOrderFlow(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Handling stop order flow');
    console.log('Current data:', data);
    console.log('Current step:', conversation.currentStep);
    console.log('Message:', context.message);
    
    // Handle rejection/cancellation with reset
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
    
    // Handle balance confirmation with reset option
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
            { value: '50%', label: '⚖️ Half of my tokens' },
            { value: 'custom', label: '✏️ Custom amount' }
          ]
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
    }
    
    // Handle liquidity confirmation with reset option
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
          message: `Good choice! Let's try a different token pair.\n\n🔄 **Which token** should you receive when the stop order triggers instead?\n\n💡 *Popular liquid pairs often include USDC, USDT, or ETH*`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToBuy',
          options: this.getTokenOptionsExcluding(data.tokenToSell)
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
    }
    
    // Identify missing data
    const missingData = this.identifyMissingStopOrderData(conversation);
    console.log('Missing data:', missingData);
    
    if (missingData.length === 0) {
      // NEW: Improved blockchain data fetching with specific error handling
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
      
      // Run validation checks with improved error handling
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
          // Continue with flow despite liquidity check failure
        }
      }
      
      // Check balance with improved error handling
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
          // Continue with flow despite balance check failure
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
    this.addToHistory(conversation, 'assistant', response.message);
    
    return response;
  }

  // NEW: Fetch blockchain data with specific error types
  private async fetchRealBlockchainDataWithSpecificErrors(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    // Fetch user balance with specific error handling
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

    // Fetch pair address with specific error handling
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
        
        // Fetch price with specific error handling
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
          throw error; // Re-throw specific errors
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

  // NEW: Handle specific blockchain errors with tailored responses
  private handleSpecificBlockchainError(error: BlockchainDataError, conversation: ConversationState) {
    const data = conversation.collectedData;
    
    switch (error.type) {
      case 'BALANCE_FETCH_FAILED':
        return {
          message: `💰 **Unable to Check ${data.tokenToSell} Balance**\n\n\n\n**This might be because:**\n• Network connectivity issues\n• The token contract might be temporarily unavailable\n• The token might not exist on this network\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'balance_fetch_error',
         
        };

      case 'PAIR_NOT_FOUND':
        return {
          message: `🔍 **Trading Pair Not Found**\n\n\n\n**This means:**\n• These tokens cannot be directly traded on this network\n• You might need to use different tokens\n• The pair might exist on a different network\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'pair_not_found_error',
         
        };

      case 'PRICE_FETCH_FAILED':
        return {
          message: `📊 **Unable to Get Current Price**\n\n\n\n**This usually means:**\n• The trading pair has very low liquidity\n• Price oracles might be temporarily unavailable\n• Network congestion is affecting data retrieval\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'price_fetch_error',
          
        };

      case 'NETWORK_ERROR':
        return {
          message: `🌐 **Network Connectivity Issue**\n\n\n\n**This is usually temporary and caused by:**\n• High network congestion\n• RPC endpoint issues\n• Temporary service outages\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'network_error',
          
        };

      case 'TOKEN_INVALID':
        return {
          message: `🪙 **Invalid Token**\n\n\n\n**This means:**\n• The token symbol might be incorrect\n• The token might not exist on this network\n• You might need to provide a contract address\n\n**What would you like to do?**`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'token_invalid_error',
          
        };

      default:
        return this.generateErrorResponse(error, conversation);
    }
  }

  // Handle stop order rejection with reset and options
  private handleStopOrderRejection(conversation: ConversationState) {
    console.log('🚫 Handling stop order rejection');
    
    // Reset the conversation state but keep connection info
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
    
    const response = {
      message: "No problem! I've cleared the stop order configuration. 🔄\n\n**What would you like to do instead?**\n\nI can help you with:",
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'after_rejection',
      options: [
        { value: 'create stop order', label: '🛡️ Create a different stop order' },
        { value: 'create aave protection', label: '🏦 Create Aave protection instead' },
        { value: 'what is reactor', label: '📚 Learn about REACTOR' }      ]
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

  private async generateQuestionForMissingData(conversation: ConversationState, missingField: string, context: MessageContext) {
    const data = conversation.collectedData;
    
    switch (missingField) {
      case 'network':
        return {
          message: "🌐 **Which network** would you like to use for your stop order?\n\nEach network has different costs and features:",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'network' as const,
          nextStep: 'network',
          options: [
            { value: '1', label: '🔷 Ethereum Mainnet (Higher fees, most liquid)' },
            { value: '43114', label: '🔺 Avalanche C-Chain (Lower fees, fast)' },
            { value: '11155111', label: '🧪 Sepolia Testnet (For testing)' }
          ]
        };

      case 'tokenToSell':
        return {
          message: "🪙 **Which token** would you like to protect with a stop order?\n\nJust tell me the token name:",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToSell',
          options: [
            { value: 'ETH', label: '💎 Ethereum (ETH)' },
            { value: 'USDC', label: '💵 USD Coin (USDC)' },
            { value: 'USDT', label: '💵 Tether (USDT)' },
            { value: 'DAI', label: '💵 Dai (DAI)' }
          ]
        };

      case 'tokenToBuy':
        return {
          message: `🔄 Great! You want to protect your **${data.tokenToSell}**.\n\n**Which token** should you receive when the stop order triggers?\n\n💡 *Stablecoins like USDC preserve value during market downturns*`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'tokenToBuy',
          options: this.getTokenOptionsExcluding(data.tokenToSell)
        };

      case 'amount':
        if (data.userBalance) {
          return {
            message: `💰 Perfect! I can see you have **${data.userBalance} ${data.tokenToSell}**.\n\n**How much** would you like to protect?`,
            intent: 'CREATE_STOP_ORDER' as const,
            needsUserInput: true,
            inputType: 'amount' as const,
            nextStep: 'amount',
            options: [
              { value: 'all', label: `🎯 All (${data.userBalance} ${data.tokenToSell})` },
              { value: '50%', label: `⚖️ Half (${(parseFloat(data.userBalance) / 2).toFixed(4)} ${data.tokenToSell})` },
              { value: 'custom', label: '✏️ Custom amount' }
            ]
          };
        } else {
          return {
            message: `💰 **How much ${data.tokenToSell}** would you like to protect?\n\nYou can say "all", "half", or a specific amount:`,
            intent: 'CREATE_STOP_ORDER' as const,
            needsUserInput: true,
            inputType: 'amount' as const,
            nextStep: 'amount',
            options: [
              { value: 'all', label: '🎯 All of my tokens' },
              { value: '50%', label: '⚖️ Half of my tokens' },
              { value: 'custom', label: '✏️ Custom amount' }
            ]
          };
        }

      case 'dropPercentage':
        return {
          message: `📉 **At what percentage drop** should the stop order trigger?\n\nFor example: "10%" means sell when ${data.tokenToSell} price drops 10% from current level.`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'amount' as const,
          nextStep: 'dropPercentage',
          options: [
            { value: '5', label: '🔒 5% drop (Conservative protection)' },
            { value: '10', label: '⚖️ 10% drop (Balanced approach)' },
            { value: '15', label: '🎯 15% drop (Higher risk tolerance)' },
            { value: '20', label: '🚀 20% drop (Maximum risk)' }
          ]
        };

      default:
        return {
          message: "🤔 I need a bit more information to set up your stop order. What would you like to configure?",
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'general'
        };
    }
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
      throw new Error(`Failed to prepare configuration: `);
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

  // COMPLETE AAVE PROTECTION FLOW IMPLEMENTATION
  
  // Extract entities for Aave protection  
  private async extractAaveEntities(message: string, conversation: ConversationState) {
    console.log('Extracting Aave entities from:', message);
    
    const { collectedData, currentStep } = conversation;
    const lowerMessage = message.toLowerCase();

    switch (currentStep) {
      case 'protectionType':
        if (lowerMessage.includes('collateral') && lowerMessage.includes('only')) {
          collectedData.protectionType = '0';
        } else if (lowerMessage.includes('debt') && lowerMessage.includes('only')) {
          collectedData.protectionType = '1';
        } else if (lowerMessage.includes('combined') || lowerMessage.includes('both')) {
          collectedData.protectionType = '2';
        } else if (lowerMessage.includes('0') || lowerMessage.includes('first')) {
          collectedData.protectionType = '0';
        } else if (lowerMessage.includes('1') || lowerMessage.includes('second')) {
          collectedData.protectionType = '1';
        } else if (lowerMessage.includes('2') || lowerMessage.includes('third')) {
          collectedData.protectionType = '2';
        }
        break;

      case 'healthFactorThreshold':
      case 'targetHealthFactor':
        const healthFactorMatch = message.match(/\b(\d+(?:\.\d+)?)\b/);
        if (healthFactorMatch) {
          const value = parseFloat(healthFactorMatch[1]);
          if (value >= 1.0 && value <= 10.0) {
            collectedData[currentStep] = value.toString();
            console.log(`Set ${currentStep}: ${value}`);
          }
        }
        break;

      case 'collateralAsset':
      case 'debtAsset':
        const addressPattern = /0x[a-fA-F0-9]{40}/;
        const addressMatch = message.match(addressPattern);
        if (addressMatch) {
          collectedData[currentStep] = addressMatch[0];
        } else {
          const aaveAssets = this.getAaveAssets(collectedData.selectedNetwork || 11155111);
          const matchedAsset = aaveAssets.find(asset => 
            lowerMessage.includes(asset.symbol.toLowerCase())
          );
          if (matchedAsset) {
            collectedData[currentStep] = matchedAsset.address;
            console.log(`Set ${currentStep}: ${matchedAsset.symbol} (${matchedAsset.address})`);
          }
        }
        break;

      case 'preferDebtRepayment':
        if (lowerMessage.includes('debt') || lowerMessage.includes('repay') || lowerMessage.includes('true')) {
          collectedData.preferDebtRepayment = true;
        } else if (lowerMessage.includes('collateral') || lowerMessage.includes('deposit') || lowerMessage.includes('false')) {
          collectedData.preferDebtRepayment = false;
        }
        break;

      case 'aave_network':
        if (lowerMessage.includes('sepolia') || lowerMessage.includes('testnet') || lowerMessage.includes('11155111')) {
          collectedData.selectedNetwork = 11155111;
        } else if (lowerMessage.includes('ethereum') || lowerMessage.includes('mainnet') || lowerMessage.includes('1')) {
          collectedData.selectedNetwork = 1;
        } else if (lowerMessage.includes('avalanche') || lowerMessage.includes('43114')) {
          collectedData.selectedNetwork = 43114;
        }
        break;
    }
  }

  // Enhanced Aave Protection Flow Handler with rejection support
  private async handleAaveProtectionFlow(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Handling Aave protection flow');
    console.log('Current data:', data);
    console.log('Current step:', conversation.currentStep);
    console.log('Message:', context.message);

    // Handle rejection/cancellation with reset
    if (this.isRejectingAction(context.message)) {
      console.log('🚫 User rejected Aave protection configuration - resetting');
      return this.handleAaveProtectionRejection(conversation);
    }

    // Handle confirmation steps
    if (conversation.currentStep === 'final_aave_confirmation' && this.isConfirmingAction(context.message)) {
      try {
        const aaveConfig = await this.prepareAaveConfig(conversation);
        
        const response = {
          message: "🚀 **Perfect!** Redirecting you to subscribe your Aave liquidation protection...\n\nYour configuration has been prepared and will be loaded automatically. You'll just need to sign the transactions! ✨",
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: false,
          automationConfig: aaveConfig,
          nextStep: 'deploy_aave'
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      } catch (error: any) {
        return this.generateErrorResponse(error, conversation);
      }
    }

    // Check for network requirement first
    if (!data.selectedNetwork) {
      conversation.currentStep = 'aave_network';
      
      const response = {
        message: "🌐 **Aave Liquidation Protection Setup**\n\nFirst, which network is your Aave position on?\n\n**Currently supported:**\n• **Sepolia Testnet** - Full support for testing\n• **Ethereum Mainnet** - Coming soon\n• **Avalanche** - Coming soon",
        intent: 'CREATE_AAVE_PROTECTION' as const,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'aave_network',
        options: [
          { value: '11155111', label: '🧪 Sepolia Testnet (Available Now)' },
          { value: '1', label: '🔷 Ethereum Mainnet (Coming Soon)' },
          { value: '43114', label: '🔺 Avalanche (Coming Soon)' }
        ]
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    }

    // Check if network is supported
    if (data.selectedNetwork && data.selectedNetwork !== 11155111) {
      const networkName = this.getNetworkName(data.selectedNetwork);
      
      const response = {
        message: `🚧 **${networkName} - Coming Soon!**\n\nAave liquidation protection is currently available on **Sepolia Testnet** for testing purposes.\n\n**Ethereum Mainnet** and **Avalanche** support is coming soon!\n\n**Would you like to:**`,
        intent: 'CREATE_AAVE_PROTECTION' as const,
        needsUserInput: true,
        inputType: 'choice' as const,
        nextStep: 'unsupported_network',
        options: [
          { value: '11155111', label: '🧪 Switch to Sepolia for Testing' },
          { value: 'create stop order', label: '🛡️ Create Stop Order Instead' },
          { value: 'notify me', label: '🔔 Notify Me When Mainnet Ready' }
        ]
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    }

    // Check if user has connected wallet
    if (!data.connectedWallet) {
      const response = {
        message: "🔗 **Wallet Connection Required**\n\nTo set up Aave liquidation protection, I need to check your Aave position.\n\nPlease connect your wallet first!",
        intent: 'CREATE_AAVE_PROTECTION' as const,
        needsUserInput: false,
        nextStep: 'wallet_required'
      };
      
      this.addToHistory(conversation, 'assistant', response.message);
      return response;
    }

    // For Aave protection, we skip the actual position checking since we can't query blockchain
    // Instead, we assume the user knows they have a position and proceed with configuration
    if (data.hasAavePosition === undefined) {
      data.hasAavePosition = true; // Assume position exists
    }

    // Identify missing data and ask for next piece
    const missingData = this.identifyMissingAaveData(conversation);
    console.log('Missing Aave data:', missingData);

    if (missingData.length === 0) {
      // All data collected, show final confirmation
      try {
        const aaveConfig = await this.prepareAaveConfig(conversation);
        const confirmationMessage = this.generateAaveConfirmationMessage(conversation, aaveConfig);
        
        conversation.currentStep = 'final_aave_confirmation';
        
        const response = {
          message: confirmationMessage,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'confirmation' as const,
          automationConfig: aaveConfig,
          nextStep: 'final_aave_confirmation',
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      } catch (error: any) {
        return this.generateErrorResponse(error, conversation);
      }
    }

    // Ask for the next missing piece of data
    const nextMissing = missingData[0];
    conversation.currentStep = nextMissing;
    
    console.log('Asking for Aave data:', nextMissing);
    console.log('Set currentStep to:', conversation.currentStep);
    
    const response = await this.generateAaveQuestion(conversation, nextMissing, context);
    this.addToHistory(conversation, 'assistant', response.message);
    
    return response;
  }

  // Handle Aave protection rejection with reset and options
  private handleAaveProtectionRejection(conversation: ConversationState) {
    console.log('🚫 Handling Aave protection rejection');
    
    // Reset the conversation state but keep connection info
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
    
    const response = {
      message: "No problem! I've cleared the Aave protection configuration. 🔄\n\n**What would you like to do instead?**\n\nI can help you with:",
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'after_aave_rejection',
      options: [
        { value: 'create aave protection', label: '🏦 Create different Aave protection' },
        { value: 'create stop order', label: '🛡️ Create stop order instead' },
        { value: 'what is reactor', label: '📚 Learn about REACTOR' }      ]
    };
    
    this.addToHistory(conversation, 'assistant', response.message);
    return response;
  }

  // Identify Missing Aave Data Helper
  private identifyMissingAaveData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const data = conversation.collectedData;
    
    // Check in order of importance
    if (!data.protectionType) missing.push('protectionType');
    if (!data.healthFactorThreshold) missing.push('healthFactorThreshold');
    if (!data.targetHealthFactor) missing.push('targetHealthFactor');
    if (!data.collateralAsset && (data.protectionType === '0' || data.protectionType === '2')) {
      missing.push('collateralAsset');
    }
    if (!data.debtAsset && (data.protectionType === '1' || data.protectionType === '2')) {
      missing.push('debtAsset');
    }
    if (data.protectionType === '2' && data.preferDebtRepayment === undefined) {
      missing.push('preferDebtRepayment');
    }
    
    console.log('Missing Aave data identified:', missing);
    return missing;
  }

  // Generate Aave-Specific Questions
  private async generateAaveQuestion(conversation: ConversationState, missingField: string, context: MessageContext) {
    const data = conversation.collectedData;
    
    switch (missingField) {
      case 'protectionType':
        return {
          message: `🛡️ **Choose Your Protection Strategy**\n\nHow would you like to protect your Aave position from liquidation?\n\n**Strategy Options:**`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'protectionType',
          options: [
            { 
              value: '0', 
              label: '💰 Collateral Deposit Only',
              description: 'Automatically supply additional collateral when health factor drops'
            },
            { 
              value: '1', 
              label: '💳 Debt Repayment Only',
              description: 'Automatically repay debt when health factor drops'
            },
            { 
              value: '2', 
              label: '🔄 Combined Protection',
              description: 'Use both strategies with preference order for maximum safety'
            }
          ]
        };

      case 'healthFactorThreshold':
        return {
          message: `📊 **Set Your Health Factor Trigger Threshold**\n\n${data.currentHealthFactor ? `Your current health factor: **${data.currentHealthFactor}**\n\n` : ''}At what health factor should protection trigger?\n\n**Recommended:** 1.2 (safe margin above liquidation at 1.0)\n**Conservative:** 1.3-1.5 (extra safety)\n**Aggressive:** 1.1 (close to liquidation risk)\n\n💡 *Lower values = closer to liquidation risk*`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'number' as const,
          nextStep: 'healthFactorThreshold',
          options: [
            { value: '1.2', label: '⚖️ 1.2 (Recommended)' },
            { value: '1.3', label: '🛡️ 1.3 (Conservative)' },
            { value: '1.5', label: '🔒 1.5 (Very Safe)' },
            { value: 'custom', label: '✏️ Custom Value' }
          ]
        };

      case 'targetHealthFactor':
        return {
          message: `🎯 **Set Your Target Health Factor**\n\nAfter protection triggers at **${data.healthFactorThreshold}**, what should be the target health factor?\n\n**Must be higher than trigger threshold (${data.healthFactorThreshold})**\n\n**Recommended:** 1.5 (comfortable safety margin)\n**Conservative:** 1.8+ (maximum safety)\n**Balanced:** 1.4-1.6 (good efficiency vs safety)\n\n💡 *Higher values = safer but more capital needed*`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'number' as const,
          nextStep: 'targetHealthFactor',
          options: [
            { value: '1.5', label: '⚖️ 1.5 (Recommended)' },
            { value: '1.8', label: '🛡️ 1.8 (Conservative)' },
            { value: '2.0', label: '🔒 2.0 (Very Safe)' },
            { value: 'custom', label: '✏️ Custom Value' }
          ]
        };

      case 'collateralAsset':
        const collateralAssets = this.getAaveAssets(data.selectedNetwork || 11155111);
        return {
          message: `💰 **Select Collateral Asset**\n\nWhich token will you use for automatic collateral deposits?\n\n**You must have sufficient balance of this token for protection to work.**\n\n**Available Aave assets:**`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'collateralAsset',
          options: collateralAssets.map(asset => ({
            value: asset.address,
            label: `${asset.symbol} - ${asset.name}`
          }))
        };

      case 'debtAsset':
        const debtAssets = this.getAaveAssets(data.selectedNetwork || 11155111);
        return {
          message: `💳 **Select Debt Asset**\n\nWhich token will you use for automatic debt repayment?\n\n**You must have sufficient balance of this token for protection to work.**\n\n**Available Aave assets:**`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'debtAsset',
          options: debtAssets.map(asset => ({
            value: asset.address,
            label: `${asset.symbol} - ${asset.name}`
          }))
        };

      case 'preferDebtRepayment':
        return {
          message: `🔄 **Combined Strategy Preference**\n\nSince you chose combined protection, which strategy should be tried first?\n\n**Strategy Order:**\n• **Primary**: Tried first when health factor drops\n• **Backup**: Used if primary strategy fails\n\n**Recommendation:** Prefer debt repayment in volatile markets, collateral deposit in stable markets.`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'preferDebtRepayment',
          options: [
            { 
              value: 'true', 
              label: '💳 Prefer Debt Repayment First',
              description: 'Try debt repayment first, then collateral deposit'
            },
            { 
              value: 'false', 
              label: '💰 Prefer Collateral Deposit First',
              description: 'Try collateral deposit first, then debt repayment'
            }
          ]
        };

      default:
        return {
          message: "🤔 I need a bit more information to set up your Aave protection. What would you like to configure?",
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'choice' as const,
          nextStep: 'general_aave'
        };
    }
  }

  // Prepare Final Aave Configuration
  private async prepareAaveConfig(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    if (!data.protectionType || !data.healthFactorThreshold || !data.targetHealthFactor || 
        !data.selectedNetwork || !data.connectedWallet) {
      throw new Error('Missing required information for Aave protection');
    }

    // Validate protection strategy requirements
    if ((data.protectionType === '0' || data.protectionType === '2') && !data.collateralAsset) {
      throw new Error('Collateral asset is required for this protection strategy');
    }

    if ((data.protectionType === '1' || data.protectionType === '2') && !data.debtAsset) {
      throw new Error('Debt asset is required for this protection strategy');
    }

    try {
      return {
        chainId: data.selectedNetwork.toString(),
        userAddress: data.connectedWallet,
        protectionType: data.protectionType,
        healthFactorThreshold: data.healthFactorThreshold,
        targetHealthFactor: data.targetHealthFactor,
        collateralAsset: data.collateralAsset || '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Default USDC
        debtAsset: data.debtAsset || '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Default USDC
        preferDebtRepayment: data.preferDebtRepayment || false,
        currentHealthFactor: data.currentHealthFactor,
        hasAavePosition: data.hasAavePosition,
        deploymentReady: true
      };
    } catch (error: any) {
      console.error('Error preparing Aave configuration:', error);
      throw new Error(`Failed to prepare Aave configuration: `);
    }
  }

  // Generate Aave Confirmation Message
  private generateAaveConfirmationMessage(conversation: ConversationState, config: any): string {
    const data = conversation.collectedData;
    const networkName = this.getNetworkName(parseInt(config.chainId));
    const protectionTypeNames = {
      '0': 'Collateral Deposit Only',
      '1': 'Debt Repayment Only', 
      '2': 'Combined Protection'
    };

    const collateralAssetName = this.getAssetNameFromAddress(config.collateralAsset, parseInt(config.chainId));
    const debtAssetName = this.getAssetNameFromAddress(config.debtAsset, parseInt(config.chainId));

    let strategyDescription = '';
    switch (config.protectionType) {
      case '0':
        strategyDescription = `• Automatically deposit ${collateralAssetName} when health factor drops`;
        break;
      case '1':
        strategyDescription = `• Automatically repay debt using ${debtAssetName} when health factor drops`;
        break;
      case '2':
        const primaryStrategy = config.preferDebtRepayment ? 'debt repayment' : 'collateral deposit';
        const backupStrategy = config.preferDebtRepayment ? 'collateral deposit' : 'debt repayment';
        strategyDescription = `• Try ${primaryStrategy} first, then ${backupStrategy} if needed\n• Uses ${debtAssetName} for repayment and ${collateralAssetName} for collateral`;
        break;
    }

    return `🛡️ **Aave Liquidation Protection Ready!**

**📋 Your Configuration:**
🏦 **Strategy**: ${protectionTypeNames[config.protectionType as keyof typeof protectionTypeNames]}
📊 **Trigger Threshold**: ${config.healthFactorThreshold}
🎯 **Target Health Factor**: ${config.targetHealthFactor}
🌐 **Network**: ${networkName}
${config.currentHealthFactor ? `📈 **Current Health Factor**: ${config.currentHealthFactor}\n` : ''}
**🔧 Protection Logic:**
${strategyDescription}

**💸 Deployment Costs:**
🏗️ **Protection Contract**: ~0.03 ETH
🤖 **RSC Monitor**: ~0.05 KOPLI

**✨ Once deployed**, your protection will:
• Monitor your health factor 24/7 automatically
• Execute protection instantly when threshold is hit
• Prevent costly liquidation penalties
• Require no manual intervention

**⚠️ Requirements:**
• Keep sufficient ${collateralAssetName}${config.protectionType === '2' ? ` and ${debtAssetName}` : ''} balance in your wallet
• Approve the protection contract to spend your tokens
• Maintain funding for ongoing protection

**Ready to subscribe to your automated Aave protection?** 🚀`;
  }

  // Get Aave Assets for Network
  private getAaveAssets(chainId: number) {
    const assets = {
      11155111: [ // Sepolia
        { address: '0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5', symbol: 'LINK', name: 'Chainlink' },
        { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin' },
        { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin' },
        { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD' },
        { address: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', symbol: 'ETH', name: 'Ethereum' }
      ],
      1: [ // Ethereum Mainnet (when supported)
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'ETH', name: 'Ethereum' },
        { address: '0xA0b86a33E6417c86C4C8Aa5c7f8b7e5B2A6d4e7F', symbol: 'USDC', name: 'USD Coin' },
        // ... other mainnet assets
      ]
    };
    
    return assets[chainId as keyof typeof assets] || assets[11155111];
  }

  // Get Asset Name from Address
  private getAssetNameFromAddress(address: string, chainId: number): string {
    const assets = this.getAaveAssets(chainId);
    const asset = assets.find(a => a.address.toLowerCase() === address.toLowerCase());
    return asset ? asset.symbol : 'Unknown Asset';
  }

  // TOKEN EXTRACTION AND UTILITY METHODS

  // Helper methods for token extraction
  private extractToken(message: string): string | undefined {
    const tokenPattern = /\b(ETH|ETHEREUM|USDC|USDT|DAI|WBTC|AVAX|AVALANCHE|LINK)\b/gi;
    const match = message.match(tokenPattern);
    if (!match) return undefined;
    
    const upper = match[0].toUpperCase();
    if (upper === 'ETHEREUM') return 'ETH';
    if (upper === 'AVALANCHE') return 'AVAX';
    return upper;
  }

  private extractAllTokens(message: string): string[] {
    const tokenPattern = /\b(ETH|ETHEREUM|USDC|USDT|DAI|WBTC|AVAX|AVALANCHE|LINK)\b/gi;
    const matches = message.match(tokenPattern) || [];
    return [...new Set(matches.map(token => {
      const upper = token.toUpperCase();
      if (upper === 'ETHEREUM') return 'ETH';
      if (upper === 'AVALANCHE') return 'AVAX';
      return upper;
    }))];
  }

  private parseTokenRolesFromSentence(message: string, tokens: string[]): { sellToken?: string; buyToken?: string } {
    if (tokens.length < 2) return {};
    
    const lowerMessage = message.toLowerCase();
    console.log('Parsing token roles from sentence:', message);
    console.log('Available tokens:', tokens);
    
    const uniqueTokens = tokens.filter((token, index, arr) => arr.indexOf(token) === index);
    if (uniqueTokens.length < 2) return {};
    
    // Pattern 1: "sell [A] for [B]" or "sell [A] to [B]"
    const sellForPattern = /\b(?:sell|selling)\s+(\w+)\s+(?:for|to|into)\s+(\w+)\b/i;
    const sellForMatch = lowerMessage.match(sellForPattern);
    if (sellForMatch) {
      const potentialSell = sellForMatch[1].toUpperCase();
      const potentialBuy = sellForMatch[2].toUpperCase();
      
      const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
      const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
      
      if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
        console.log('Found sell-for pattern:', { sell: normalizedSell, buy: normalizedBuy });
        return { sellToken: normalizedSell, buyToken: normalizedBuy };
      }
    }
    
    // Pattern 2: "trade [A] for [B]" or "swap [A] for [B]"
    const tradeForPattern = /\b(?:trade|trading|swap|swapping)\s+(\w+)\s+(?:for|to|into)\s+(\w+)\b/i;
    const tradeForMatch = lowerMessage.match(tradeForPattern);
    if (tradeForMatch) {
      const potentialSell = tradeForMatch[1].toUpperCase();
      const potentialBuy = tradeForMatch[2].toUpperCase();
      
      const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
      const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
      
      if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
        console.log('Found trade-for pattern:', { sell: normalizedSell, buy: normalizedBuy });
        return { sellToken: normalizedSell, buyToken: normalizedBuy };
      }
    }
    
    console.log('No clear pattern found, tokens will be assigned based on context');
    return {};
  }

  // VALIDATION AND UTILITY METHODS

  private isConfirmingAction(message: string): boolean {
    const confirmationWords = [
      'yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right',
      'deploy', 'create', 'go ahead', 'proceed', 'continue', 'do it'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return confirmationWords.some(word => lowerMessage.includes(word));
  }

  private getTokenOptionsExcluding(excludeToken?: string) {
    const allTokens = [
      { value: 'ETH', label: '💎 Ethereum (ETH)' },
      { value: 'USDC', label: '💵 USD Coin (USDC) - Stablecoin' },
      { value: 'USDT', label: '💵 Tether (USDT) - Stablecoin' },
      { value: 'DAI', label: '💵 Dai (DAI) - Stablecoin' },
      { value: 'WBTC', label: '₿ Wrapped Bitcoin (WBTC)' }
    ];
    
    return allTokens.filter(token => token.value !== excludeToken);
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
    return (chainId === 1 || chainId === 43114) ? "REACT" : "KOPLI";
  }

  private getNetworkName(chainId: number): string {
    const networkNames: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Ethereum Sepolia',
      43114: 'Avalanche C-Chain'
    };
    return networkNames[chainId] || `Network ${chainId}`;
  }

  // HANDLE TOKEN ADDRESS INPUT

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
      
      if (conversation.intent === 'CREATE_STOP_ORDER') {
        return this.handleStopOrderFlow(conversation, { message } as MessageContext);
      } else {
        return this.handleAaveProtectionFlow(conversation, { message } as MessageContext);
      }
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

  // RESPONSE GENERATION METHODS

  // Generate help response for unclear messages
  private generateHelpResponse(context: MessageContext, conversation: ConversationState) {
    return {
      message: "🤖 **Hi! I'm Reactor AI.** I can help you with DeFi automation!\n\n**I can help you:**\n\n🛡️ **Create Stop Orders**\n• Automatically sell tokens when price drops\n• Protect your investments 24/7\n• Example: \"Create a stop order to protect my ETH\"\n\n🏦 **Create Aave Protection**\n• Guard against liquidation automatically\n• Monitor health factor 24/7\n• Example: \"Create Aave protection for my position\"\n\n📚 **Learn About REACTOR**\n• Understand Reactive Smart Contracts\n• Learn about our automations\n• Example: \"What is Reactor?\" or \"How do RSCs work?\"\n\n**What would you like to do?** 🚀",
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'awaiting_command',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' },
        { value: 'what automations are available', label: '🤖 View Automations' }
      ]
    };
  }

  private generateErrorResponse(error: any, conversation: ConversationState) {
    return {
      message: `❌ **Something went wrong!** ${'Please try again.'}\n\n**I can help you with:**\n• Creating stop orders\n• Setting up Aave protection\n• Learning about REACTOR\n\nWhat would you like to do? 🔄`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'error_recovery',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'what is reactor', label: '📚 Learn About REACTOR' }
      ]
    };
  }

  private getReactorKnowledgeFallback(message: string) {
    return {
      message: `📚 **I'm here to help with REACTOR!** I specialize in:\n\n**🤖 Automation Creation:**\n• Stop Orders - Protect investments from price drops\n• Aave Protection - Guard against liquidation\n\n**📖 Education:**\n• How REACTOR works\n• Reactive Smart Contracts (RSCs)\n• DeFi automation concepts\n• Platform features and capabilities\n\n**🚀 Coming Soon:**\n• Fee Collectors - Auto-harvest Uniswap V3 fees\n• Range Managers - Optimize LP positions\n\nWhat would you like to know about REACTOR? 🎯`,
      intent: 'ANSWER_REACTOR_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'knowledge_fallback',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'what is reactor', label: '📚 What is REACTOR?' },
        { value: 'tell me about rsc', label: '🧠 What are RSCs?' }
      ]
    };
  }

  // GEMINI API INTEGRATION

  private async callGeminiAPI(conversation: ConversationState, context: MessageContext): Promise<string> {
    const userContext = this.buildUserContext(conversation, context);
    const conversationHistory = this.formatConversationHistory(conversation);
    
    const prompt = `${this.systemPrompt}

CURRENT USER CONTEXT:
${userContext}

CONVERSATION HISTORY:
${conversationHistory}

USER MESSAGE: "${context.message}"

INSTRUCTIONS:
1. Focus only on REACTOR platform, RSCs, and our specific automations
2. Be helpful and educational about DeFi automation concepts
3. Use emojis and clear formatting
4. If asked about general DeFi topics not related to REACTOR, redirect to our platform capabilities
5. Include actionable next steps when appropriate

Respond as Reactor AI:`;

    try {
      const response = await fetch(`${this.geminiBaseUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, topK: 40, topP: 0.9, maxOutputTokens: 800
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
      
      const data = await response.json() as GeminiResponse;
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
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

    if (conversation.intent === 'CREATE_AAVE_PROTECTION') {
      contextStr += `- Creating Aave protection\n`;
      if (data.protectionType) contextStr += `- Protection type: ${data.protectionType}\n`;
      if (data.healthFactorThreshold) contextStr += `- Health factor threshold: ${data.healthFactorThreshold}\n`;
      if (data.targetHealthFactor) contextStr += `- Target health factor: ${data.targetHealthFactor}\n`;
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

  // UTILITY METHODS

  // Utility methods
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

  public cleanupOldConversations(maxAgeMs: number = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [id, conversation] of this.conversations) {
      if (now - conversation.lastUpdated > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }
}