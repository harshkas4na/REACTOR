import { BlockchainService } from './BlockchainService';
import { ValidationService } from './ValidationService';

export interface MessageContext {
  message: string;
  conversationId: string;
  connectedWallet?: string;
  currentNetwork?: number;
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
  };
  missingData: string[];
  confidence: number;
  lastUpdated: number;
}

export class AIAgent {
  private conversations = new Map<string, ConversationState>();
  private blockchainService: BlockchainService;
  private validationService: ValidationService;

  // Knowledge base for educational responses
  private knowledgeBase = {
    'stop orders': {
      explanation: 'Stop orders automatically sell your tokens when the price drops below a certain threshold, protecting you from further losses. Think of it as an automated safety net for your investments.',
      examples: ['Sell ETH if it drops 10%', 'Protect my USDC position if it loses its peg'],
      docLink: 'https://docs.reactor.network/stop-orders'
    },
    'reactive smart contracts': {
      explanation: 'Reactive Smart Contracts (RSCs) are automated blockchain programs that watch for specific events and execute actions automatically. They work 24/7 without manual intervention.',
      examples: ['Monitor price changes', 'Collect fees automatically', 'Rebalance positions'],
      docLink: 'https://dev.reactive.network/'
    },
    'fee collectors': {
      explanation: 'Fee Collectors automatically harvest trading fees from your Uniswap V3 positions and send them to your wallet. No more manual fee collection!',
      examples: ['Collect fees from ETH/USDC position', 'Harvest all V3 position fees'],
      docLink: 'https://docs.reactor.network/fee-collectors'
    }
  };

  constructor(blockchainService: BlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
  }

  async processMessage(context: MessageContext) {
    const conversation = this.getOrCreateConversation(context.conversationId);
    
    // Update wallet info if provided
    if (context.connectedWallet) {
      conversation.collectedData.connectedWallet = context.connectedWallet;
    }

    // Determine intent if not already set
    if (conversation.intent === 'UNKNOWN') {
      conversation.intent = this.classifyIntent(context.message);
      conversation.confidence = this.calculateConfidence(context.message, conversation.intent);
    }

    // Process based on intent
    switch (conversation.intent) {
      case 'CREATE_STOP_ORDER':
        return await this.handleStopOrderCreation(context, conversation);
      
      case 'CREATE_FEE_COLLECTOR':
        return await this.handleFeeCollectorCreation(context, conversation);
      
      case 'CREATE_RANGE_MANAGER':
        return await this.handleRangeManagerCreation(context, conversation);
      
      case 'ANSWER_QUESTION':
        return await this.handleQuestionAnswer(context, conversation);
      
      default:
        return this.handleUnknownIntent(context);
    }
  }

  private classifyIntent(message: string): ConversationState['intent'] {
    const lowerMessage = message.toLowerCase();
    
    // Stop order keywords
    if (lowerMessage.includes('stop order') || 
        lowerMessage.includes('stop loss') || 
        lowerMessage.includes('sell') && (lowerMessage.includes('drop') || lowerMessage.includes('falls'))) {
      return 'CREATE_STOP_ORDER';
    }
    
    // Fee collector keywords
    if (lowerMessage.includes('fee') && (lowerMessage.includes('collect') || lowerMessage.includes('harvest'))) {
      return 'CREATE_FEE_COLLECTOR';
    }
    
    // Range manager keywords
    if (lowerMessage.includes('range') && (lowerMessage.includes('manage') || lowerMessage.includes('adjust'))) {
      return 'CREATE_RANGE_MANAGER';
    }
    
    // Question keywords
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('explain')) {
      return 'ANSWER_QUESTION';
    }
    
    return 'UNKNOWN';
  }

  private calculateConfidence(message: string, intent: ConversationState['intent']): number {
    // Simple confidence calculation - can be enhanced with ML models
    const lowerMessage = message.toLowerCase();
    let confidence = 0.5; // Base confidence
    
    switch (intent) {
      case 'CREATE_STOP_ORDER':
        if (lowerMessage.includes('stop order')) confidence += 0.4;
        if (lowerMessage.includes('sell') && lowerMessage.includes('drop')) confidence += 0.3;
        if (lowerMessage.includes('%')) confidence += 0.2;
        break;
      // Add other cases...
    }
    
    return Math.min(confidence, 1.0);
  }

  private async handleStopOrderCreation(context: MessageContext, conversation: ConversationState) {
    // Extract entities from the message
    this.extractStopOrderEntities(context.message, conversation);
    
    // Determine what we still need
    const missingData = this.identifyMissingStopOrderData(conversation);
    conversation.missingData = missingData;
    
    if (missingData.length === 0) {
      // All data collected, prepare final configuration
      return await this.prepareStopOrderConfiguration(conversation);
    } else {
      // Ask for missing data
      return await this.requestMissingStopOrderData(conversation, missingData[0]);
    }
  }

  private extractStopOrderEntities(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase();
    
    // Extract token to sell
    const sellTokens = ['eth', 'btc', 'usdc', 'usdt', 'dai'];
    for (const token of sellTokens) {
      if (lowerMessage.includes(token)) {
        conversation.collectedData.tokenToSell = token.toUpperCase();
        break;
      }
    }
    
    // Extract percentage
    const percentageMatch = message.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentageMatch) {
      conversation.collectedData.dropPercentage = parseFloat(percentageMatch[1]);
    }
    
    // Extract amount patterns
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*eth/i,
      /(\d+(?:\.\d+)?)\s*usdc/i,
      /all\s+my/i,
      /half/i,
      /50%/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[0].toLowerCase().includes('all')) {
          conversation.collectedData.amount = 'all';
        } else if (match[0].toLowerCase().includes('half') || match[0].includes('50%')) {
          conversation.collectedData.amount = '50%';
        } else if (match[1]) {
          conversation.collectedData.amount = match[1];
        }
        break;
      }
    }
  }

  private identifyMissingStopOrderData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const data = conversation.collectedData;
    
    if (!data.connectedWallet) missing.push('wallet');
    if (!data.tokenToSell) missing.push('tokenToSell');
    if (!data.tokenToBuy) missing.push('tokenToBuy');
    if (!data.amount) missing.push('amount');
    if (!data.dropPercentage) missing.push('dropPercentage');
    if (!data.selectedNetwork) missing.push('network');
    
    return missing;
  }

  private async requestMissingStopOrderData(conversation: ConversationState, missingField: string) {
    const data = conversation.collectedData;
    
    switch (missingField) {
      case 'wallet':
        return {
          message: "I need to know your wallet address to check balances and create the stop order. Please connect your wallet first.",
          intent: conversation.intent,
          needsUserInput: false,
          nextStep: 'connect_wallet'
        };
      
      case 'tokenToSell':
        return {
          message: "Which token would you like to protect with a stop order?",
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'token' as const,
          options: [
            { value: 'ETH', label: 'Ethereum (ETH)' },
            { value: 'USDC', label: 'USD Coin (USDC)' },
            { value: 'USDT', label: 'Tether (USDT)' },
            { value: 'DAI', label: 'Dai (DAI)' }
          ],
          nextStep: 'collect_token_to_sell'
        };
      
      case 'tokenToBuy':
        return {
          message: `Got it! You want to protect your ${data.tokenToSell}. What token should I sell it for when the stop order triggers?`,
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'token' as const,
          options: this.getTokenToBuyOptions(data.tokenToSell || ''),
          nextStep: 'collect_token_to_buy'
        };
      
      case 'amount':
        if (!data.connectedWallet || !data.tokenToSell) {
          return {
            message: "I need your wallet connected and token selected before asking about amounts.",
            intent: conversation.intent,
            needsUserInput: false,
            nextStep: 'prerequisites_missing'
          };
        }
        
        // Get balance and suggest options
        const balance = await this.blockchainService.getTokenBalance(
          data.connectedWallet,
          data.tokenToSell,
          data.selectedNetwork || 1
        );
        
        return {
          message: `How much ${data.tokenToSell} would you like to protect? You currently have ${balance} ${data.tokenToSell}.`,
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'amount' as const,
          options: [
            { value: 'all', label: `All of it (${balance} ${data.tokenToSell})` },
            { value: '50%', label: `Half (${parseFloat(balance) / 2} ${data.tokenToSell})` },
            { value: 'custom', label: 'Custom amount' }
          ],
          nextStep: 'collect_amount'
        };
      
      case 'dropPercentage':
        return {
          message: "At what percentage drop should the stop order trigger?",
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'amount' as const,
          options: [
            { value: '5', label: '5% drop' },
            { value: '10', label: '10% drop' },
            { value: '15', label: '15% drop' },
            { value: '20', label: '20% drop' },
            { value: 'custom', label: 'Custom percentage' }
          ],
          nextStep: 'collect_drop_percentage'
        };
      
      case 'network':
        return {
          message: "Which blockchain network should I use for your stop order?",
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'network' as const,
          options: [
            { value: '1', label: 'Ethereum Mainnet (recommended)' },
            { value: '43114', label: 'Avalanche C-Chain' },
            { value: '11155111', label: 'Sepolia Testnet' }
          ],
          nextStep: 'collect_network'
        };
      
      default:
        return {
          message: "I need some additional information to continue.",
          intent: conversation.intent,
          needsUserInput: false,
          nextStep: 'unknown_missing_data'
        };
    }
  }

  private getTokenToBuyOptions(tokenToSell: string) {
    const allTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
    return allTokens
      .filter(token => token !== tokenToSell)
      .map(token => ({ value: token, label: token }));
  }

  private async prepareStopOrderConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    try {
      // Validate pair exists
      const pairAddress = await this.blockchainService.findPairAddress(
        data.tokenToSell!,
        data.tokenToBuy!,
        data.selectedNetwork!
      );
      
      if (!pairAddress) {
        return {
          message: `Sorry, I couldn't find a ${data.tokenToSell}/${data.tokenToBuy} pair on the selected network. Would you like to try a different token pair or network?`,
          intent: conversation.intent,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'pair_not_found'
        };
      }
      
      // Calculate threshold values
      const currentPrice = await this.blockchainService.getCurrentPrice(pairAddress, data.selectedNetwork!);
      const thresholdPrice = currentPrice * (1 - data.dropPercentage! / 100);
      const { coefficient, threshold } = this.calculateThresholdValues(currentPrice, thresholdPrice);
      
      // Prepare final configuration
      const automationConfig = {
        chainId: data.selectedNetwork!.toString(),
        pairAddress,
        sellToken0: await this.blockchainService.isToken0(pairAddress, data.tokenToSell!, data.selectedNetwork!),
        clientAddress: data.connectedWallet!,
        coefficient: coefficient.toString(),
        threshold: threshold.toString(),
        amount: data.amount!,
        destinationFunding: this.getDefaultFunding(data.selectedNetwork!),
        rscFunding: "0.05"
      };
      
      // Final confirmation message
      const confirmationMessage = `Perfect! Here's your stop order configuration:

💰 **Amount**: ${data.amount} ${data.tokenToSell}
📉 **Trigger**: When ${data.tokenToSell} drops ${data.dropPercentage}% (to ~$${thresholdPrice.toFixed(2)})
🔄 **Trade**: ${data.tokenToSell} → ${data.tokenToBuy}
🌐 **Network**: ${this.getNetworkName(data.selectedNetwork!)}
💸 **Estimated Cost**: ${automationConfig.destinationFunding} ${this.getNativeCurrency(data.selectedNetwork!)} + 0.05 ${this.getRSCCurrency(data.selectedNetwork!)}

This will protect your ${data.tokenToSell} by automatically selling when the price drops to your threshold. The automation runs 24/7 until triggered.

Ready to deploy? This will require signing a few transactions.`;
      
      return {
        message: confirmationMessage,
        intent: conversation.intent,
        needsUserInput: true,
        inputType: 'confirmation' as const,
        options: [
          { value: 'yes', label: 'Yes, deploy my stop order' },
          { value: 'no', label: 'Cancel' },
          { value: 'edit', label: 'Edit parameters' }
        ],
        automationConfig,
        nextStep: 'final_confirmation'
      };
      
    } catch (error: any) {
      return {
        message: `I encountered an error preparing your stop order: ${error.message}. Would you like to try again?`,
        intent: conversation.intent,
        needsUserInput: false,
        nextStep: 'error_occurred'
      };
    }
  }

  private calculateThresholdValues(currentPrice: number, targetPrice: number): { coefficient: number, threshold: number } {
    const coefficient = 1000;
    const ratio = targetPrice / currentPrice;
    const threshold = Math.floor(ratio * coefficient);
    
    return { coefficient, threshold };
  }

  private getDefaultFunding(chainId: number): string {
    const fundingMap: { [key: number]: string } = {
      1: "0.03",      // Ethereum
      11155111: "0.03", // Sepolia
      43114: "0.01"   // Avalanche
    };
    return fundingMap[chainId] || "0.03";
  }

  private getNetworkName(chainId: number): string {
    const networkNames: { [key: number]: string } = {
      1: "Ethereum Mainnet",
      11155111: "Ethereum Sepolia",
      43114: "Avalanche C-Chain"
    };
    return networkNames[chainId] || `Chain ${chainId}`;
  }

  private getNativeCurrency(chainId: number): string {
    return chainId === 43114 ? "AVAX" : "ETH";
  }

  private getRSCCurrency(chainId: number): string {
    // Production chains use REACT, testnets use KOPLI
    return (chainId === 1 || chainId === 43114) ? "REACT" : "KOPLI";
  }

  private async handleQuestionAnswer(context: MessageContext, conversation: ConversationState) {
    const lowerMessage = context.message.toLowerCase();
    
    // Search knowledge base
    for (const [topic, info] of Object.entries(this.knowledgeBase)) {
      if (lowerMessage.includes(topic) || lowerMessage.includes(topic.replace(' ', ''))) {
        return {
          message: `**${topic.charAt(0).toUpperCase() + topic.slice(1)}**\n\n${info.explanation}\n\n**Examples:**\n${info.examples.map(ex => `• ${ex}`).join('\n')}\n\n📚 [Learn more](${info.docLink})\n\nWould you like me to help you create one of these automations?`,
          intent: conversation.intent,
          needsUserInput: false,
          nextStep: 'educational_response'
        };
      }
    }
    
    // Fallback response
    return {
      message: "I can help you with creating stop orders, fee collectors, range managers, or answer questions about reactive smart contracts. What would you like to know?",
      intent: conversation.intent,
      needsUserInput: false,
      nextStep: 'general_help'
    };
  }

  private handleUnknownIntent(context: MessageContext) {
    return {
      message: "I'm Reactor AI! I can help you:\n\n🛡️ **Create Stop Orders** - Protect your tokens from price drops\n💰 **Set up Fee Collectors** - Automatically harvest Uniswap V3 fees\n📊 **Manage Position Ranges** - Keep your V3 positions optimized\n❓ **Answer Questions** - Learn about DeFi automation\n\nWhat would you like to do?",
      intent: 'UNKNOWN' as const,
      needsUserInput: false,
      nextStep: 'initial_greeting'
    };
  }

  private async handleFeeCollectorCreation(context: MessageContext, conversation: ConversationState) {
    // Similar implementation for fee collectors
    return {
      message: "Fee collector creation is coming soon! For now, I can help you create stop orders.",
      intent: conversation.intent,
      needsUserInput: false,
      nextStep: 'feature_not_ready'
    };
  }

  private async handleRangeManagerCreation(context: MessageContext, conversation: ConversationState) {
    // Similar implementation for range managers
    return {
      message: "Range manager creation is coming soon! For now, I can help you create stop orders.",
      intent: conversation.intent,
      needsUserInput: false,
      nextStep: 'feature_not_ready'
    };
  }

  private getOrCreateConversation(conversationId: string): ConversationState {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        intent: 'UNKNOWN',
        currentStep: 'initial',
        collectedData: {},
        missingData: [],
        confidence: 0,
        lastUpdated: Date.now()
      });
    }
    
    const conversation = this.conversations.get(conversationId)!;
    conversation.lastUpdated = Date.now();
    
    return conversation;
  }

  // Clean up old conversations periodically
  public cleanupOldConversations(maxAgeMs: number = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    for (const [id, conversation] of this.conversations) {
      if (now - conversation.lastUpdated > maxAgeMs) {
        this.conversations.delete(id);
      }
    }
  }
} 