import { BlockchainService, EnhancedBlockchainService } from './BlockchainService';
import { ValidationService } from './ValidationService';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  intent: 'CREATE_STOP_ORDER' | 'UNKNOWN';
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

// Interface for the custom Stop Order Extraction Model
interface StopOrderParams {
    sell_coin: string | null;
    buy_coin: string | null;
    no_of_sell_coins: string | null;
    threshold: string | null;
}

export class AIAgent {
  private conversations = new Map<string, ConversationState>();
  private genAI: GoogleGenerativeAI;
  private blockchainService: EnhancedBlockchainService;
  private validationService: ValidationService;
  private geminiApiKey: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private maxConversationHistory = 6;

  // Revised system prompt focused heavily on Stop Order creation
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform.

YOUR CORE CAPABILITY:
1. **Create Stop Orders**: Your main goal is to guide users through creating automated sell orders (Stop Orders) to protect their investments. You must collect four key pieces of information: the token to sell, the token to buy, the amount to sell, and the percentage price drop that triggers the sale.

IMPORTANT LIMITATIONS:
- You ONLY focus on helping users create Stop Order automations.
- You do NOT provide general blockchain querying services (checking balances, transaction history, etc.) until the final confirmation step.
- You do NOT provide market data or price information outside of the automation setup.
- Politely decline requests for other automations like Aave Protection for now, stating they are "coming soon," and guide the user back to creating a Stop Order.

CONVERSATIONAL FLOW FOR STOP ORDERS:
1. When a user wants to create a stop order, acknowledge their request.
2. Extract any parameters you can from their initial message.
3. Ask for any missing information one question at a time until all four parameters (sell token, buy token, amount, and drop %) are collected.
4. Once all information is collected, confirm the details with the user before proceeding.

TONE: Conversational, helpful, and efficient. Your primary job is to make creating a stop order as easy as possible.`;

  constructor(blockchainService: EnhancedBlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';

    if (!this.geminiApiKey) {
        console.error("GEMINI_API_KEY is not set. The AI agent will not function correctly.");
    }
    this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
  }

  async processMessage(context: MessageContext) {
    const conversation = this.getOrCreateConversation(context.conversationId);
    
    if (context.connectedWallet) conversation.collectedData.connectedWallet = context.connectedWallet;
    if (context.currentNetwork) conversation.collectedData.selectedNetwork = context.currentNetwork;

    conversation.conversationHistory.push({ role: 'user', content: context.message });

    try {
      const intent = this.classifyMessageIntent(context.message, conversation);
      console.log(`Message classified with intent: ${intent}`);

      if (intent === 'CREATE_STOP_ORDER') {
        if (conversation.intent !== 'CREATE_STOP_ORDER') {
            this.resetConversationForNewIntent(conversation, 'CREATE_STOP_ORDER');
        }
        return await this.handleStopOrderFlow(conversation, context);
      } else {
        console.log("Handling as a general conversational query.");
        return await this.handleGeneralConversation(conversation, context);
      }

    } catch (error: any) {
      console.error('AI Processing Error:', error);
      return this.generateErrorResponse(error, conversation);
    }
  }

  /**
   * Simplified intent classification focusing on Stop Orders.
   */
  private classifyMessageIntent(message: string, conversation: ConversationState): 'CREATE_STOP_ORDER' | 'UNKNOWN' {
    if (conversation.intent === 'CREATE_STOP_ORDER') {
      return 'CREATE_STOP_ORDER';
    }
    if (this.isStopOrderCreationIntent(message.toLowerCase())) {
      return 'CREATE_STOP_ORDER';
    }
    return 'UNKNOWN';
  }
  
  /**
   * Detects stop order creation intent.
   */
  private isStopOrderCreationIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const stopOrderCreationKeywords = [
      'create stop order', 'make stop order', 'set up stop order', 'setup stop order',
      'create automation', 'protect my', 'sell when', 'sell if',
      'automatic sell', 'stop loss', 'price drop', 'create order',
      'automate sell', 'trigger sell', 'exit position',
      'protect investment', 'cut losses', 'emergency sell', 'stop order',
      'new stop order', 'build stop order', 'configure stop order'
    ];
    return stopOrderCreationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * This is the core function for the new custom model logic for Stop Orders.
   * It uses a specialized Gemini prompt to extract parameters reliably.
   */
  private async callStopOrderExtractionModel(message: string): Promise<Partial<StopOrderParams>> {
    const prompt = `
    Analyze the user's message to extract parameters for a cryptocurrency stop order.
    User message: "${message}"
    Extract the following four parameters:
    1. sell_coin: The cryptocurrency symbol the user wants to sell (e.g., "ETH", "USDC", "WBTC").
    2. buy_coin: The cryptocurrency symbol the user wants to receive (e.g., "USDC", "DAI").
    3. no_of_sell_coins: The quantity of the token to sell. Should be a number.
    4. threshold: The trigger condition, as a percentage number.
    Respond ONLY with a valid JSON object containing these keys. If a value cannot be found, set it to null.
    Example 1:
    User message: "Hi can you create a stop order to protect my tokenA for TokenB i want to sell 15 token A when stop-loss hits 15%"
    Your response:
    {
      "sell_coin": "TokenA",
      "buy_coin": "TokenB",
      "no_of_sell_coins": "15",
      "threshold": "15"
    }
    Example 2:
    User message: "protect my usdc and sell them for receiving usdt at 50% loss"
    Your response:
    {
      "sell_coin": "USDC",
      "buy_coin": "USDT",
      "no_of_sell_coins": null,
      "threshold": "50"
    }`;

    try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as StopOrderParams;
        }
        return {};
    } catch (error) {
        console.error("Error calling Stop Order Extraction Model:", error);
        return {};
    }
  }

  /**
   * Replaces the old `extractStopOrderEntities`. This function uses the new AI model
   * to extract parameters and updates the conversation state.
   */
  private async extractAndUpdateStopOrderParams(message: string, conversation: ConversationState) {
    console.log('Extracting stop order params with new model from:', message);
    const extractedParams = await this.callStopOrderExtractionModel(message);
    console.log('Extracted params:', extractedParams);

    const { collectedData } = conversation;

    if (extractedParams.sell_coin) collectedData.tokenToSell = extractedParams.sell_coin.toUpperCase();
    if (extractedParams.buy_coin) collectedData.tokenToBuy = extractedParams.buy_coin.toUpperCase();
    if (extractedParams.no_of_sell_coins) collectedData.amount = extractedParams.no_of_sell_coins;
    if (extractedParams.threshold) {
        const percentage = parseFloat(extractedParams.threshold);
        if (!isNaN(percentage)) collectedData.dropPercentage = percentage;
    }
  }

  /**
   * REFACTORED: This is the main conversational flow for creating a stop order.
   */
  private async handleStopOrderFlow(conversation: ConversationState, context: MessageContext) {
    await this.extractAndUpdateStopOrderParams(context.message, conversation);

    if (conversation.currentStep === 'final_confirmation') {
        if (this.isConfirmingAction(context.message)) {
            try {
                const automationConfig = await this.prepareFinalConfiguration(conversation);
                return {
                    message: "🚀 **Perfect!** Redirecting you to deploy your stop order...\n\nYour configuration has been prepared and will be loaded automatically. You'll just need to sign the transactions! ✨",
                    intent: 'CREATE_STOP_ORDER' as const,
                    needsUserInput: false,
                    automationConfig,
                    nextStep: 'deploy'
                };
            } catch (error: any) {
                return this.generateErrorResponse(error, conversation);
            }
        } else if (this.isRejectingAction(context.message)) {
            return this.handleStopOrderRejection(conversation);
        }
    }

    const missingData = this.identifyMissingStopOrderData(conversation);

    if (missingData.length === 0) {
        console.log("All data collected. Generating confirmation...");
        try {
            await this.fetchRealBlockchainDataWithSpecificErrors(conversation);
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
                options: [ { value: 'yes', label: '✅ Yes, Deploy It!' }, { value: 'no', label: '❌ No, Cancel' } ]
            };
            this.addToHistory(conversation, 'assistant', response.message);
            return response;
        } catch (error: any) {
            if (error instanceof BlockchainDataError) {
                return this.handleSpecificBlockchainError(error, conversation);
            }
            return this.generateErrorResponse(error, conversation);
        }
    }

    const nextMissing = missingData[0];
    conversation.currentStep = nextMissing;
    console.log(`Data is missing. Asking for: ${nextMissing}`);

    const response = this.generateQuestionForMissingData(conversation, nextMissing);
    this.addToHistory(conversation, 'assistant', response.message);
    return response;
  }
  
  /**
   * Handles general, non-stop-order conversation using Gemini.
   */
  private async handleGeneralConversation(conversation: ConversationState, context: MessageContext) {
    const generalPrompt = `You are Reactor AI, a helpful assistant for a DeFi platform. A user has sent the following message. Respond in a helpful and conversational manner. Keep the conversation focused on DeFi and blockchain topics. Your main function is to help users create "Stop Orders". If they ask about other features (like Aave Protection, price checks, balance checks), politely state that the feature is "coming soon" and gently guide them back to creating a Stop Order.

    Previous conversation history:
    ${this.formatConversationHistory(conversation)}

    User's message: "${context.message}"`;

    try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(generalPrompt);
        const text = result.response.text();
        const response = {
            message: text,
            intent: 'UNKNOWN' as const,
            needsUserInput: true,
            nextStep: 'general_conversation',
        };
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
    } catch (error) {
        console.error("Error in general conversation handler:", error);
        return this.generateErrorResponse(error, conversation);
    }
  }

  /**
   * Generates questions one-by-one.
   */
  private generateQuestionForMissingData(conversation: ConversationState, missingField: string) {
    const data = conversation.collectedData;
    let question = {
        message: "I need a bit more information.",
        intent: 'CREATE_STOP_ORDER' as const,
        needsUserInput: true,
        inputType: 'text',
        nextStep: missingField,
        options: [] as Array<{ value: string, label: string }>
    };

    switch (missingField) {
        case 'tokenToSell':
            question.message = "Great! Let's set up a stop order. Which token would you like to protect?";
            question.inputType = 'token';
            break;
        case 'tokenToBuy':
            question.message = `Okay, protecting **${data.tokenToSell}**. Which token should you receive when the order executes? (e.g., a stablecoin like USDC)`;
            question.inputType = 'token';
            break;
        case 'amount':
            question.message = `Got it. How much **${data.tokenToSell}** do you want to sell if the trigger hits? You can say "all" or a specific number.`;
            question.inputType = 'amount';
            question.options = [
                { value: 'all', label: 'All of my tokens' },
                { value: 'half', label: 'Half of my tokens' }
            ];
            break;
        case 'dropPercentage':
            question.message = `Last question: At what percentage price drop should I trigger the sale? (e.g., "10%")`;
            question.inputType = 'amount';
            question.options = [
                { value: '10', label: '10% Drop' },
                { value: '15', label: '15% Drop' },
                { value: '20', label: '20% Drop' },
            ];
            break;
        case 'network':
             question.message = "🌐 Which network is the token on?";
             question.inputType = 'network';
             question.options = [
                { value: '1', label: '🔷 Ethereum Mainnet' },
                { value: '43114', label: '🔺 Avalanche C-Chain' },
                { value: '11155111', label: '🧪 Sepolia Testnet' }
             ];
             break;
        default:
            question.message = "I'm not sure what to ask next. Could you clarify what you'd like to do?";
            break;
    }
    return question;
  }
  
  private resetConversationForNewIntent(conversation: ConversationState, newIntent: ConversationState['intent']) {
    console.log(`🔄 Resetting conversation from ${conversation.intent} to ${newIntent}`);
    const { connectedWallet, selectedNetwork } = conversation.collectedData;
    conversation.intent = newIntent;
    conversation.currentStep = 'initial';
    conversation.collectedData = { connectedWallet, selectedNetwork };
    conversation.confidence = 0;
    conversation.nextStep = '';
    conversation.conversationHistory.push({ role: 'assistant', content: `[SYSTEM: Conversation reset for ${newIntent}]` });
  }

  private isConfirmingAction(message: string): boolean {
    const confirmationWords = ['yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right', 'deploy', 'create', 'go ahead', 'proceed', 'continue', 'do it', 'confirm'];
    return confirmationWords.some(word => message.toLowerCase().trim().includes(word));
  }

  private isRejectingAction(message: string): boolean {
    const rejectionPhrases = ['no', 'nope', 'nah', 'cancel', 'abort', 'quit', 'exit', 'forget it', 'never mind', 'not now', 'don\'t want', 'not this'];
    return rejectionPhrases.some(phrase => message.toLowerCase().trim().includes(phrase));
  }
  
  private handleStopOrderRejection(conversation: ConversationState) {
    console.log('🚫 Handling stop order rejection');
    this.resetConversationForNewIntent(conversation, 'UNKNOWN');
    const response = {
        message: "No problem! I've cancelled the stop order setup. What would you like to do now?",
        intent: 'UNKNOWN' as const,
        needsUserInput: true,
        inputType: 'choice' as const,
        nextStep: 'after_rejection',
        options: [
            { value: 'create a new stop order', label: '🛡️ Create a New Stop Order' },
            { value: 'what is reactor', label: '📚 Learn about REACTOR' }
        ]
    };
    this.addToHistory(conversation, 'assistant', response.message);
    return response;
  }
  
  private identifyMissingStopOrderData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const { collectedData: data } = conversation;
    if (!data.selectedNetwork) missing.push('network');
    if (!data.tokenToSell) missing.push('tokenToSell');
    if (!data.tokenToBuy) missing.push('tokenToBuy');
    if (!data.amount) missing.push('amount');
    if (!data.dropPercentage) missing.push('dropPercentage');
    return missing;
  }

  private generateErrorResponse(error: any, conversation: ConversationState) {
    return {
      message: `❌ **Something went wrong!** Please try again.\n\nI can help you create a stop order to protect your tokens. Just say "create a stop order" to begin.`,
      intent: 'UNKNOWN' as const,
      needsUserInput: false,
      nextStep: 'error_recovery',
    };
  }

  private async fetchRealBlockchainDataWithSpecificErrors(conversation: ConversationState) {
    const data = conversation.collectedData;
    if (data.connectedWallet && data.tokenToSell && data.selectedNetwork && !data.userBalance) {
        try {
            console.log(`🏦 Fetching ${data.tokenToSell} balance...`);
            const balance = await this.blockchainService.getTokenBalanceEnhanced(data.connectedWallet, data.tokenToSell, data.selectedNetwork, data.customTokenAddresses);
            data.userBalance = balance;
            console.log(`✅ Balance fetched: ${balance} ${data.tokenToSell}`);
        } catch (error: any) {
            throw new BlockchainDataError('BALANCE_FETCH_FAILED', `Unable to fetch your ${data.tokenToSell} balance.`, { tokenToSell: data.tokenToSell, network: data.selectedNetwork });
        }
    }
    if (data.tokenToSell && data.tokenToBuy && data.selectedNetwork && !data.pairAddress) {
        try {
            console.log(`🔍 Finding trading pair ${data.tokenToSell}/${data.tokenToBuy}...`);
            const pairAddress = await this.blockchainService.findPairAddressEnhanced(data.tokenToSell, data.tokenToBuy, data.selectedNetwork, data.customTokenAddresses);
            if (!pairAddress) {
                throw new BlockchainDataError('PAIR_NOT_FOUND', `No trading pair found for ${data.tokenToSell}/${data.tokenToBuy} on ${this.getNetworkName(data.selectedNetwork!)}.`, { tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy, network: data.selectedNetwork });
            }
            data.pairAddress = pairAddress;
            console.log(`✅ Pair found: ${pairAddress}`);
            
            try {
                const currentPrice = await this.blockchainService.getCurrentPriceEnhanced(data.tokenToSell, data.tokenToBuy, data.selectedNetwork, data.customTokenAddresses);
                data.currentPrice = currentPrice;
                console.log(`✅ Current price: ${currentPrice}`);
                if (data.dropPercentage) {
                    data.targetPrice = currentPrice * (1 - data.dropPercentage / 100);
                    console.log(`✅ Target price: ${data.targetPrice}`);
                }
            } catch (priceError: any) {
                throw new BlockchainDataError('PRICE_FETCH_FAILED', `Found the pair but couldn't get the price.`, { pairAddress, tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy });
            }
        } catch (error: any) {
            if (error instanceof BlockchainDataError) throw error;
            throw new BlockchainDataError('NETWORK_ERROR', `Unable to access trading pair information due to network issues.`, { tokenToSell: data.tokenToSell, tokenToBuy: data.tokenToBuy, network: data.selectedNetwork });
        }
    }
  }

  private handleSpecificBlockchainError(error: BlockchainDataError, conversation: ConversationState) {
    const data = conversation.collectedData;
    let response = {
      message: `An error occurred: ${error.message}`,
      intent: 'CREATE_STOP_ORDER' as const,
      needsUserInput: true,
      inputType: 'choice' as const,
      nextStep: 'blockchain_error',
      options: [
        { value: 'try again', label: '🔄 Try Again' },
        { value: 'change token', label: '🪙 Change Token' },
        { value: 'cancel', label: '❌ Cancel' }
      ]
    };

    switch (error.type) {
      case 'BALANCE_FETCH_FAILED':
        response.message = `💰 **Unable to Check ${data.tokenToSell} Balance**\n\nThis might be due to network issues or an invalid token on this chain. What would you like to do?`;
        response.nextStep = 'balance_fetch_error';
        break;
      case 'PAIR_NOT_FOUND':
        response.message = `🔍 **Trading Pair Not Found**\n\nI couldn't find a direct trading pair for **${data.tokenToSell} / ${data.tokenToBuy}** on this network. Please try a different token.`;
        response.nextStep = 'pair_not_found_error';
        break;
      case 'PRICE_FETCH_FAILED':
        response.message = `📊 **Unable to Get Price**\n\nThe trading pair was found, but I couldn't fetch its price, possibly due to low liquidity. You can proceed, but it's risky.`;
        response.nextStep = 'price_fetch_error';
        response.options = [
            { value: 'proceed anyway', label: '⚠️ Proceed Anyway' },
            { value: 'change token', label: '🪙 Change Token' }
        ];
        break;
      case 'NETWORK_ERROR':
        response.message = `🌐 **Network Connectivity Issue**\n\nI'm having trouble connecting to the blockchain. This is usually temporary. Please try again in a moment.`;
        response.nextStep = 'network_error';
        break;
    }
    return response;
  }

  private async prepareFinalConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    if (!data.tokenToSell || !data.tokenToBuy || !data.selectedNetwork || !data.connectedWallet) {
        throw new Error('Missing required information for stop order');
    }
    let pairAddress = data.pairAddress || await this.blockchainService.findPairAddressEnhanced(data.tokenToSell, data.tokenToBuy, data.selectedNetwork, data.customTokenAddresses);
    if (!pairAddress) {
        throw new BlockchainDataError('PAIR_NOT_FOUND', `Trading pair ${data.tokenToSell}/${data.tokenToBuy} not found.`);
    }
    data.pairAddress = pairAddress;
    
    let currentPrice = data.currentPrice || await this.blockchainService.getCurrentPriceEnhanced(data.tokenToSell, data.tokenToBuy, data.selectedNetwork, data.customTokenAddresses);
    data.currentPrice = currentPrice;

    const dropPercentage = data.dropPercentage || 10;
    const thresholdPrice = currentPrice * (1 - dropPercentage / 100);
    const { coefficient, threshold } = this.calculateThresholdValues(currentPrice, thresholdPrice);
    
    const sellToken0 = await this.blockchainService.isToken0Enhanced(pairAddress, data.tokenToSell, data.selectedNetwork, data.customTokenAddresses);
    
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
        dropPercentage,
        currentPrice,
        targetPrice: thresholdPrice,
        userBalance: data.userBalance,
        customTokenAddresses: data.customTokenAddresses || {},
        deploymentReady: true
    };
  }

  private generateConfirmationMessage(conversation: ConversationState, config: any): string {
    const data = conversation.collectedData;
    const networkName = this.getNetworkName(parseInt(config.chainId));
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
🎯 **Trigger Price**: ~${config.targetPrice.toFixed(6)} ${config.tokenToBuy}/${config.tokenToSell}

**💸 Estimated Deployment Costs:**
🏗️ **Destination Contract**: ${config.destinationFunding} ${networkCurrency}
🤖 **RSC Monitor**: ${config.rscFunding} ${this.getRSCCurrency(parseInt(config.chainId))}

**Ready to deploy your automated protection?** 🚀`;
  }
  
  private calculateThresholdValues(currentPrice: number, targetPrice: number): { coefficient: number, threshold: number } {
    const coefficient = 1000;
    const ratio = targetPrice / currentPrice;
    return { coefficient, threshold: Math.floor(ratio * coefficient) };
  }

  private getDefaultFunding(chainId: number): string {
    const fundingMap: { [key: number]: string } = { 1: "0.03", 11155111: "0.03", 43114: "0.01" };
    return fundingMap[chainId] || "0.03";
  }

  private getNetworkCurrency(chainId: number): string {
    const currencies: { [key: number]: string } = { 1: "ETH", 11155111: "ETH", 43114: "AVAX" };
    return currencies[chainId] || "ETH";
  }

  private getRSCCurrency(chainId: number): string {
    return "REACT";
  }
  
  private getNetworkName(chainId: number): string {
    const networkNames: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Ethereum Sepolia',
      43114: 'Avalanche C-Chain'
    };
    return networkNames[chainId] || `Network ${chainId}`;
  }

  private formatConversationHistory(conversation: ConversationState): string {
    if (conversation.conversationHistory.length === 0) return 'No previous conversation';
    return conversation.conversationHistory
      .slice(-this.maxConversationHistory)
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
}