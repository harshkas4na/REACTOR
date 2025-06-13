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
    userBalance?: string;
    currentPrice?: number;
    targetPrice?: number;
  };
  missingData: string[];
  confidence: number;
  lastUpdated: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastResponse?: string; // Track last response to avoid duplicates
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
  private blockchainService: BlockchainService;
  private validationService: ValidationService;
  private geminiApiKey: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Enhanced system prompt with comprehensive knowledge base
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform. 

ABOUT REACTOR PLATFORM:
REACTOR is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs). The platform bridges complex blockchain functionality with user-friendly interfaces, enabling automated interactions between smart contracts across different blockchain networks.

REACTIVE SMART CONTRACTS (RSCs):
RSCs represent a paradigm shift in blockchain technology through:
- **Event-Driven Architecture**: Contracts autonomously monitor and react to blockchain events without requiring direct user intervention
- **Inversion-of-Control (IoC)**: Instead of users calling contracts, contracts observe events and act automatically
- **Cross-Chain Operations**: Monitor events on one chain and execute functions on another chain seamlessly
- **24/7 Monitoring**: Continuous operation without manual intervention
- **Gas-Efficient**: Optimized for minimal gas consumption in cross-chain operations

YOUR ROLE:
1. **Answer Questions**: Provide detailed explanations about Reactor, RSCs, DeFi automation, and technical concepts
2. **Help Create Automations**: Guide users through creating stop orders with intelligent entity extraction
3. **Educational Support**: Explain complex blockchain concepts in understandable terms
4. **Context Awareness**: Remember conversation history and avoid repeating questions

CONVERSATION INTELLIGENCE:
- Extract ALL relevant information from user messages in one pass
- Use context from previous messages
- Don't ask for information already provided
- If user says "all of them" or "all", use their previously mentioned token amount
- If user mentions percentages and tokens in one sentence, extract both
- Move efficiently through the flow without redundant questions

STOP ORDER CREATION FLOW:
1. Extract as much info as possible from the first message
2. Only ask for truly missing information
3. Use context from previous conversation
4. Provide clear, non-repetitive responses`;

  constructor(blockchainService: BlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
    this.geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyCDzON2jSa6JRPKyjdMrDEzg0O5xFDrCWg';
  }

  async processMessage(context: MessageContext) {
    const conversation = this.getOrCreateConversation(context.conversationId);
    
    // Update context
    if (context.connectedWallet) {
      conversation.collectedData.connectedWallet = context.connectedWallet;
    }
    if (context.currentNetwork) {
      conversation.collectedData.selectedNetwork = context.currentNetwork;
    }

    // Add user message to history
    conversation.conversationHistory.push({
      role: 'user',
      content: context.message
    });

    try {
      console.log('Processing message:', context.message);
      console.log('Current conversation data:', conversation.collectedData);

      // FIRST: Extract ALL entities from the message comprehensively
      await this.comprehensiveEntityExtraction(context.message, conversation);
      
      console.log('After entity extraction:', conversation.collectedData);

      // SECOND: Check if it's a direct blockchain query
      const blockchainResponse = await this.handleBlockchainQueries(context.message, conversation);
      if (blockchainResponse) {
        conversation.conversationHistory.push({
          role: 'assistant',
          content: blockchainResponse.message
        });
        conversation.lastResponse = blockchainResponse.message;
        return blockchainResponse;
      }

      // THIRD: Handle stop order creation with smart context awareness
      if (conversation.intent === 'CREATE_STOP_ORDER' || this.isStopOrderIntent(context.message)) {
        conversation.intent = 'CREATE_STOP_ORDER';
        
        // Fetch real blockchain data if we have enough info
        await this.fetchRealBlockchainData(conversation);
        
        // Generate smart stop order response
        const stopOrderResponse = await this.generateSmartStopOrderResponse(conversation, context);
        
        // Avoid duplicate responses
        if (stopOrderResponse.message !== conversation.lastResponse) {
          conversation.conversationHistory.push({
            role: 'assistant',
            content: stopOrderResponse.message
          });
          conversation.lastResponse = stopOrderResponse.message;
          return stopOrderResponse;
        }
      }

      // FOURTH: Handle general knowledge questions
      const knowledgeResponse = await this.handleKnowledgeQuestions(conversation, context);
      if (knowledgeResponse.message !== conversation.lastResponse) {
        conversation.conversationHistory.push({
          role: 'assistant',
          content: knowledgeResponse.message
        });
        conversation.lastResponse = knowledgeResponse.message;
        return knowledgeResponse;
      }

      // If we reach here, return a fallback to avoid infinite loops
      return this.fallbackResponse(context, conversation);

    } catch (error: any) {
      console.error('AI Processing Error:', error);
      return this.fallbackResponse(context, conversation);
    }
  }

  private async comprehensiveEntityExtraction(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase();
    const data = conversation.collectedData;

    console.log('Starting comprehensive entity extraction for:', message);

    // Extract stop order intent
    if (lowerMessage.includes('stop order') || 
        lowerMessage.includes('protect') || 
        (lowerMessage.includes('sell') && (lowerMessage.includes('drop') || lowerMessage.includes('when'))) ||
        lowerMessage.includes('create') && (lowerMessage.includes('automation') || lowerMessage.includes('order'))) {
      conversation.intent = 'CREATE_STOP_ORDER';
    }

    // Enhanced token extraction with multiple patterns
    const tokenExtractionPatterns = [
      // "sell USDC for DAI"
      /sell\s+(\w+)\s+(?:for|to|with)\s+(\w+)/i,
      // "USDC and DAI" or "USDC/DAI"
      /(\w+)\s+(?:and|\/|\-)\s+(\w+)/i,
      // "sell all of my USDC when... give me DAI"
      /sell\s+(?:all\s+(?:of\s+)?(?:my\s+)?)?(\w+).*?(?:give\s+me|for|to)\s+(\w+)/i,
      // "sell my USDC"
      /sell\s+(?:my\s+)?(\w+)/i,
      // "protect my ETH"
      /protect\s+(?:my\s+)?(\w+)/i,
      // Simple token mentions
      /\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX)\b/gi
    ];

    let tokensFound: string[] = [];
    
    for (const pattern of tokenExtractionPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        for (let i = 1; i < matches.length; i++) {
          if (matches[i] && this.isValidToken(matches[i])) {
            tokensFound.push(matches[i].toUpperCase());
          }
        }
        if (tokensFound.length >= 2) break; // We have both tokens
      }
    }

    // Remove duplicates and assign tokens
    tokensFound = [...new Set(tokensFound)];
    
    if (tokensFound.length >= 2) {
      // If we have 2+ tokens, try to determine which is sell and which is buy
      if (lowerMessage.includes('sell') || lowerMessage.includes('protect')) {
        // First token mentioned in context of selling is usually the sell token
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[1];
      } else {
        // Use order of mention
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[1];
      }
    } else if (tokensFound.length === 1) {
      // Single token - determine if it's sell or buy based on context
      if (lowerMessage.includes('sell') || lowerMessage.includes('protect')) {
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
      } else if (lowerMessage.includes('for') || lowerMessage.includes('to') || lowerMessage.includes('give me')) {
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[0];
      } else {
        // Default to sell token if unclear
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
      }
    }

    // Extract percentage drops with multiple patterns
    const percentagePatterns = [
      /(?:drops?|falls?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+drop/i,
      /price\s+drops?\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /when.*?(\d+(?:\.\d+)?)\s*%/i
    ];

    for (const pattern of percentagePatterns) {
      const match = message.match(pattern);
      if (match && !data.dropPercentage) {
        data.dropPercentage = parseFloat(match[1]);
        console.log('Extracted drop percentage:', data.dropPercentage);
        break;
      }
    }

    // Enhanced amount extraction
    const amountPatterns = [
      { pattern: /(?:sell\s+)?all\s+(?:of\s+)?(?:my\s+)?(?:them|it|\w+)?/i, value: 'all' },
      { pattern: /everything/i, value: 'all' },
      { pattern: /(?:sell\s+)?half\s+(?:of\s+)?(?:my\s+)?(?:them|it|\w+)?/i, value: '50%' },
      { pattern: /(\d+(?:\.\d+)?)\s*(?:tokens?|\w+)?/i, value: 'custom' }
    ];

    for (const { pattern, value } of amountPatterns) {
      const match = message.match(pattern);
      if (match && !data.amount) {
        if (value === 'custom') {
          data.amount = match[1];
        } else {
          data.amount = value;
        }
        console.log('Extracted amount:', data.amount);
        break;
      }
    }

    // Use context from previous conversation
    if (lowerMessage.includes('all of them') || lowerMessage.includes('all') && !data.amount) {
      // Look for previous balance information
      const lastMessages = conversation.conversationHistory.slice(-3);
      for (const msg of lastMessages) {
        if (msg.content.includes('have') && msg.content.includes(data.tokenToSell || '')) {
          data.amount = 'all';
          console.log('Using context: amount = all');
          break;
        }
      }
    }

    console.log('Final extracted data:', {
      tokenToSell: data.tokenToSell,
      tokenToBuy: data.tokenToBuy,
      amount: data.amount,
      dropPercentage: data.dropPercentage
    });
  }

  private isStopOrderIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('stop order') || 
           lowerMessage.includes('protect') || 
           (lowerMessage.includes('sell') && (lowerMessage.includes('drop') || lowerMessage.includes('when'))) ||
           (lowerMessage.includes('create') && lowerMessage.includes('order'));
  }

  private async generateSmartStopOrderResponse(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Generating smart stop order response with data:', data);
    
    // Check what we're missing
    const missingData = this.identifyMissingStopOrderData(conversation);
    console.log('Missing data:', missingData);
    
    if (missingData.length === 0) {
      // We have everything - generate final confirmation
      try {
        const automationConfig = await this.prepareFinalConfiguration(conversation);
        const confirmationMessage = this.generateConfirmationMessage(conversation, automationConfig);
        
        return {
          message: confirmationMessage,
          intent: 'CREATE_STOP_ORDER',
          needsUserInput: true,
          inputType: 'confirmation' as const,
          automationConfig,
          nextStep: 'final_confirmation'
        };
      } catch (error: any) {
        return {
          message: `❌ **Configuration Error**\n${error.message}\n\nWould you like to try again with different parameters?`,
          intent: 'CREATE_STOP_ORDER',
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'error_recovery'
        };
      }
    }
    
    // We need more information - ask for the FIRST missing piece only
    const nextMissing = missingData[0];
    console.log('Next missing field:', nextMissing);
    
    // Generate contextual message
    const responseMessage = this.generateContextualRequestMessage(conversation, nextMissing, context.message);
    const options = await this.generateOptionsForMissingData(conversation, nextMissing);
    
    return {
      message: responseMessage,
      intent: 'CREATE_STOP_ORDER',
      needsUserInput: true,
      inputType: this.getInputTypeForMissingData(nextMissing),
      options,
      collectedData: data,
      nextStep: nextMissing
    };
  }

  private generateContextualRequestMessage(conversation: ConversationState, missingField: string, userMessage: string): string {
    const data = conversation.collectedData;
    
    // Generate smarter, more contextual messages
    switch (missingField) {
      case 'wallet':
        return "I need you to connect your wallet first to create a stop order. Please connect your wallet and try again.";
      
      case 'network':
        return "Which network would you like to use for your stop order?";
      
      case 'tokenToSell':
        return "Which token would you like to protect with a stop order?";
      
      case 'tokenToBuy':
        if (data.tokenToSell) {
          return `Great! You want to sell ${data.tokenToSell}. Which token should I sell it for when the price drops?`;
        }
        return "Which token should you receive when the stop order triggers?";
      
      case 'amount':
        if (data.userBalance && data.tokenToSell) {
          return `Perfect! I can see you have **${data.userBalance} ${data.tokenToSell}** in your wallet.\n\nHow much would you like to protect?`;
        }
        if (data.tokenToSell) {
          return `How much ${data.tokenToSell} would you like to protect?`;
        }
        return "How much would you like to protect?";
      
      case 'dropPercentage':
        return `At what percentage drop should I trigger the sale? For example, if you want to sell when the price drops 10%, I'll automatically execute the trade.`;
      
      default:
        return "I need a bit more information to set up your stop order.";
    }
  }

  private async handleBlockchainQueries(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase();
    const data = conversation.collectedData;
    
    // Handle balance queries
    if (lowerMessage.includes('how many') || lowerMessage.includes('balance') || lowerMessage.includes('have currently')) {
      const tokenMatch = message.match(/\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX)\b/i);
      
      if (tokenMatch && data.connectedWallet && data.selectedNetwork) {
        const tokenSymbol = tokenMatch[1].toUpperCase();
        
        try {
          console.log(`Fetching ${tokenSymbol} balance for ${data.connectedWallet} on network ${data.selectedNetwork}`);
          
          const balance = await this.blockchainService.getTokenBalance(
            data.connectedWallet,
            tokenSymbol,
            data.selectedNetwork
          );
          
          console.log(`Balance fetched: ${balance} ${tokenSymbol}`);
          
          // Store the balance for future use
          if (tokenSymbol === data.tokenToSell) {
            data.userBalance = balance;
          }
          
          return {
            message: `You currently have **${balance} ${tokenSymbol}** in your wallet.`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'balance_provided'
          };
        } catch (error: any) {
          console.error('Error fetching balance:', error);
          return {
            message: `I couldn't fetch your ${tokenSymbol} balance. Error: ${error.message}\n\nPlease make sure:\n• Your wallet is connected\n• You're on the correct network\n• The token exists in your wallet`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'balance_error'
          };
        }
      }
    }
    
    // Handle pair address queries
    if (lowerMessage.includes('pair') || lowerMessage.includes('find a pair')) {
      const tokenMatches = message.match(/\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX)\b/gi);
      
      if (tokenMatches && tokenMatches.length >= 2 && data.selectedNetwork) {
        const token1 = tokenMatches[0].toUpperCase();
        const token2 = tokenMatches[1].toUpperCase();
        
        try {
          console.log(`Finding pair for ${token1}/${token2} on network ${data.selectedNetwork}`);
          
          const pairAddress = await this.blockchainService.findPairAddress(
            token1,
            token2,
            data.selectedNetwork
          );
          
          if (pairAddress) {
            console.log(`Pair found: ${pairAddress}`);
            
            // Store pair info for future use
            data.pairAddress = pairAddress;
            data.tokenToSell = token1;
            data.tokenToBuy = token2;
            
            // Get current price
            try {
              const currentPrice = await this.blockchainService.getCurrentPrice(
                pairAddress,
                data.selectedNetwork
              );
              data.currentPrice = currentPrice;
              
              const networkName = this.getNetworkName(data.selectedNetwork);
              
              return {
                message: `✅ **Pair Found!**\n\n**${token1}/${token2}** trading pair on ${networkName}:\n📍 **Address**: \`${pairAddress}\`\n💵 **Current Price**: ${currentPrice.toFixed(6)} ${token2}/${token1}\n\nWould you like to create a stop order for this pair?`,
                intent: 'ANSWER_QUESTION',
                needsUserInput: false,
                nextStep: 'pair_found'
              };
            } catch (priceError) {
              return {
                message: `✅ **Pair Found!**\n\n**${token1}/${token2}** trading pair:\n📍 **Address**: \`${pairAddress}\`\n\n*(Could not fetch current price)*\n\nWould you like to create a stop order for this pair?`,
                intent: 'ANSWER_QUESTION',
                needsUserInput: false,
                nextStep: 'pair_found'
              };
            }
          } else {
            return {
              message: `❌ **Pair Not Found**\n\nI couldn't find a ${token1}/${token2} trading pair on ${this.getNetworkName(data.selectedNetwork || 11155111)}.\n\nThis could mean:\n• The pair doesn't exist on this DEX\n• There's no liquidity for this pair\n• One of the tokens isn't supported\n\nTry a different token pair or network.`,
              intent: 'ANSWER_QUESTION',
              needsUserInput: false,
              nextStep: 'pair_not_found'
            };
          }
        } catch (error: any) {
          console.error('Error finding pair:', error);
          return {
            message: `❌ **Error Finding Pair**\n\nI encountered an error while searching for the ${token1}/${token2} pair: ${error.message}\n\nPlease try again or check if the tokens are supported on this network.`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'pair_error'
          };
        }
      }
    }
    
    return null; // No blockchain query handled
  }

  private async fetchRealBlockchainData(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    try {
      // Fetch token balance if we have wallet and token
      if (data.connectedWallet && data.tokenToSell && data.selectedNetwork && !data.userBalance) {
        try {
          console.log(`Fetching balance for ${data.tokenToSell}...`);
          const balance = await this.blockchainService.getTokenBalance(
            data.connectedWallet,
            data.tokenToSell,
            data.selectedNetwork
          );
          data.userBalance = balance;
          console.log(`Balance fetched: ${balance} ${data.tokenToSell}`);
        } catch (error) {
          console.error('Error fetching token balance:', error);
        }
      }

      // Fetch pair address and price if we have both tokens
      if (data.tokenToSell && data.tokenToBuy && data.selectedNetwork && !data.pairAddress) {
        try {
          console.log(`Finding pair for ${data.tokenToSell}/${data.tokenToBuy}...`);
          const pairAddress = await this.blockchainService.findPairAddress(
            data.tokenToSell,
            data.tokenToBuy,
            data.selectedNetwork
          );
          
          if (pairAddress) {
            data.pairAddress = pairAddress;
            console.log(`Pair found: ${pairAddress}`);
            
            // Get current price
            try {
              const currentPrice = await this.blockchainService.getCurrentPrice(
                pairAddress,
                data.selectedNetwork
              );
              data.currentPrice = currentPrice;
              console.log(`Current price: ${currentPrice}`);
              
              // Calculate target price if we have drop percentage
              if (data.dropPercentage) {
                data.targetPrice = currentPrice * (1 - data.dropPercentage / 100);
                console.log(`Target price: ${data.targetPrice}`);
              }
            } catch (priceError) {
              console.error('Error fetching price:', priceError);
            }
          }
        } catch (error) {
          console.error('Error fetching pair data:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    }
  }

  private identifyMissingStopOrderData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const data = conversation.collectedData;
    
    if (!data.connectedWallet) missing.push('wallet');
    if (!data.selectedNetwork) missing.push('network');
    if (!data.tokenToSell) missing.push('tokenToSell');
    if (!data.tokenToBuy) missing.push('tokenToBuy');
    if (!data.amount) missing.push('amount');
    if (!data.dropPercentage) missing.push('dropPercentage');
    
    return missing;
  }

  private async generateOptionsForMissingData(conversation: ConversationState, missingField: string) {
    const data = conversation.collectedData;
    
    switch (missingField) {
      case 'tokenToSell':
        return [
          { value: 'ETH', label: 'Ethereum (ETH)' },
          { value: 'USDC', label: 'USD Coin (USDC)' },
          { value: 'USDT', label: 'Tether (USDT)' },
          { value: 'DAI', label: 'Dai (DAI)' }
        ];
      
      case 'tokenToBuy':
        const allTokens = ['ETH', 'USDC', 'USDT', 'DAI'];
        return allTokens
          .filter(token => token !== data.tokenToSell)
          .map(token => ({ value: token, label: token }));
      
      case 'amount':
        if (data.userBalance && data.tokenToSell) {
          const balance = parseFloat(data.userBalance);
          return [
            { value: 'all', label: `All (${data.userBalance} ${data.tokenToSell})` },
            { value: '50%', label: `Half (${(balance / 2).toFixed(4)} ${data.tokenToSell})` },
            { value: 'custom', label: 'Custom amount' }
          ];
        }
        return [
          { value: 'all', label: 'All of my tokens' },
          { value: '50%', label: 'Half of my tokens' },
          { value: 'custom', label: 'Custom amount' }
        ];
      
      case 'dropPercentage':
        return [
          { value: '5', label: '5% drop' },
          { value: '10', label: '10% drop' },
          { value: '15', label: '15% drop' },
          { value: '20', label: '20% drop' }
        ];
      
      case 'network':
        return [
          { value: '1', label: 'Ethereum Mainnet' },
          { value: '43114', label: 'Avalanche C-Chain' },
          { value: '11155111', label: 'Sepolia Testnet' }
        ];
      
      default:
        return [];
    }
  }

  private getInputTypeForMissingData(missingField: string): 'amount' | 'token' | 'network' | 'confirmation' | undefined {
    const typeMap: { [key: string]: 'amount' | 'token' | 'network' | 'confirmation' } = {
      'tokenToSell': 'token',
      'tokenToBuy': 'token',
      'amount': 'amount',
      'dropPercentage': 'amount',
      'network': 'network'
    };
    return typeMap[missingField];
  }

  // Keep all the existing helper methods for knowledge questions, final configuration, etc.
  private async handleKnowledgeQuestions(conversation: ConversationState, context: MessageContext) {
    try {
      // Call Gemini API for knowledge-based questions
      const aiResponse = await this.callGeminiAPI(conversation, context);
      
      // Determine intent from the response
      const intent = this.determineIntentFromMessage(context.message);
      if (intent !== 'ANSWER_QUESTION') {
        conversation.intent = intent;
      }
      
      return {
        message: aiResponse,
        intent: intent,
        needsUserInput: intent === 'CREATE_STOP_ORDER',
        nextStep: intent === 'CREATE_STOP_ORDER' ? 'start_stop_order' : 'knowledge_provided'
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.getKnowledgeBaseFallback(context.message);
    }
  }

  private determineIntentFromMessage(message: string): 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'UNKNOWN' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('stop order') || 
        lowerMessage.includes('protect') || 
        (lowerMessage.includes('sell') && lowerMessage.includes('drop'))) {
      return 'CREATE_STOP_ORDER';
    }
    
    if (lowerMessage.includes('fee collector') || lowerMessage.includes('collect fees')) {
      return 'CREATE_FEE_COLLECTOR';
    }
    
    if (lowerMessage.includes('range manager') || lowerMessage.includes('manage range')) {
      return 'CREATE_RANGE_MANAGER';
    }
    
    return 'ANSWER_QUESTION';
  }

  private getKnowledgeBaseFallback(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Reactor-specific questions
    if (lowerMessage.includes('reactor') || lowerMessage.includes('what is reactor')) {
      return {
        message: `**REACTOR** is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs).

**Key Features:**
🔄 **Event-Driven Automation**: Contracts that automatically respond to blockchain events
🌐 **Cross-Chain Operations**: Seamless automation across multiple networks
⚡ **24/7 Monitoring**: Continuous operation without manual intervention
🛡️ **User-Friendly**: Makes complex DeFi automation accessible to everyone

**Main Automation Types:**
• **Stop Orders**: Protect your investments from price drops
• **Fee Collectors**: Automatically collect Uniswap V3 fees
• **Range Managers**: Optimize liquidity position ranges

Would you like to know more about any specific feature or create an automation?`,
        intent: 'ANSWER_QUESTION',
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    }
    
    // RSC-specific questions
    if (lowerMessage.includes('rsc') || lowerMessage.includes('reactive smart contract')) {
      return {
        message: `**Reactive Smart Contracts (RSCs)** are the core innovation behind REACTOR's automation capabilities.

**How RSCs Work:**
🎯 **Event-Driven**: Monitor blockchain events and react automatically
🔄 **Inversion of Control**: Contracts observe and act, rather than being called
🌉 **Cross-Chain**: Monitor events on one chain, execute on another
⚡ **Autonomous**: No manual intervention required

**Technical Capabilities:**
• **Autonomous Monitoring**: Watch for specific events across different contracts
• **Self-Triggered Execution**: Automatically execute functions when conditions are met
• **Chain-Agnostic**: Operate across multiple blockchain networks
• **Gas Efficient**: Optimized for minimal gas consumption

**Real-World Example:**
A stop order RSC monitors ETH/USDC price and automatically sells your ETH when it drops 10%, protecting you from further losses - all without you having to watch the market 24/7.

Want to create your first automation?`,
        intent: 'ANSWER_QUESTION',
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    }
    
    // Default fallback
    return {
      message: `I'm here to help you with REACTOR's DeFi automation platform! I can assist you with:

**📚 Learning:**
• Understanding Reactive Smart Contracts (RSCs)
• How DeFi automation works
• REACTOR platform features

**🛠️ Creating Automations:**
• Stop Orders (protect investments from price drops)
• Fee Collectors (coming soon)
• Range Managers (coming soon)

**🔍 Blockchain Queries:**
• Check token balances
• Find trading pair addresses
• Get current prices

**💡 Examples:**
• "What is a Reactive Smart Contract?"
• "Create a stop order for my ETH"
• "How many USDC do I have?"
• "Tell me about stop orders"

What would you like to know or do?`,
      intent: 'ANSWER_QUESTION',
      needsUserInput: false,
      nextStep: 'awaiting_query'
    };
  }

  private async callGeminiAPI(conversation: ConversationState, context: MessageContext): Promise<string> {
    const userContext = this.buildUserContext(conversation, context);
    const conversationHistory = this.formatConversationHistory(conversation);
    
    const prompt = `${this.systemPrompt}

CURRENT USER CONTEXT:
${userContext}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER MESSAGE: "${context.message}"

INSTRUCTIONS:
1. If this is a question about Reactor, RSCs, DeFi automation, or technical concepts, provide a comprehensive educational response
2. If this is about creating a stop order, guide the user and set intent to CREATE_STOP_ORDER
3. If this is about blockchain data (balances, prices), that should be handled separately
4. Be helpful, educational, and engaging
5. Use examples and clear explanations

Respond as Reactor AI:`;

    try {
      const response = await fetch(`${this.geminiBaseUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 1000,
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

  // Keep all the existing helper methods...
  private buildUserContext(conversation: ConversationState, context: MessageContext): string {
    const data = conversation.collectedData;
    let contextStr = '';
    
    if (context.connectedWallet) {
      contextStr += `- Wallet: ${context.connectedWallet}\n`;
    } else {
      contextStr += `- Wallet: Not connected\n`;
    }
    
    if (context.currentNetwork) {
      contextStr += `- Network: ${this.getNetworkName(context.currentNetwork)} (ID: ${context.currentNetwork})\n`;
    }
    
    if (data.tokenToSell) {
      contextStr += `- Token to sell: ${data.tokenToSell}\n`;
      if (data.userBalance) {
        contextStr += `- Current ${data.tokenToSell} balance: ${data.userBalance}\n`;
      }
    }
    
    if (data.tokenToBuy) contextStr += `- Token to buy: ${data.tokenToBuy}\n`;
    if (data.amount) contextStr += `- Amount: ${data.amount}\n`;
    if (data.dropPercentage) contextStr += `- Drop percentage: ${data.dropPercentage}%\n`;
    if (data.pairAddress) contextStr += `- Trading pair address: ${data.pairAddress}\n`;
    if (data.currentPrice) contextStr += `- Current price: ${data.currentPrice.toFixed(6)}\n`;
    if (data.targetPrice) contextStr += `- Target trigger price: ${data.targetPrice.toFixed(6)}\n`;
    
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

  // Keep all the existing final configuration methods...
  private async prepareFinalConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    if (!data.tokenToSell || !data.tokenToBuy || !data.selectedNetwork || !data.connectedWallet) {
      throw new Error('Missing required information for stop order');
    }

    try {
      let pairAddress = data.pairAddress;
      if (!pairAddress) {
        const foundPairAddress = await this.blockchainService.findPairAddress(
          data.tokenToSell,
          data.tokenToBuy,
          data.selectedNetwork
        );
        pairAddress = foundPairAddress || ''
        
        if (!pairAddress) {
          throw new Error(`Trading pair ${data.tokenToSell}/${data.tokenToBuy} not found on ${this.getNetworkName(data.selectedNetwork)}`);
        }
        data.pairAddress = pairAddress;
      }
      
      let currentPrice = data.currentPrice;
      if (!currentPrice) {
        currentPrice = await this.blockchainService.getCurrentPrice(pairAddress, data.selectedNetwork);
        data.currentPrice = currentPrice;
      }
      
      const dropPercentage = data.dropPercentage || 10;
      const thresholdPrice = currentPrice * (1 - dropPercentage / 100);
      const { coefficient, threshold } = this.calculateThresholdValues(currentPrice, thresholdPrice);
      
      const sellToken0 = await this.blockchainService.isToken0(
        pairAddress, 
        data.tokenToSell, 
        data.selectedNetwork
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
    
    return `✅ **Stop Order Ready for Deployment**

**Your Configuration:**
💰 **Amount**: ${config.amount === 'all' ? 'All' : config.amount} ${config.tokenToSell}${data.userBalance ? ` (Balance: ${data.userBalance})` : ''}
📉 **Trigger**: ${config.dropPercentage}% price drop
🔄 **Trade**: ${config.tokenToSell} → ${config.tokenToBuy}
🌐 **Network**: ${networkName}

**Market Data:**
📊 **Trading Pair**: \`${config.pairAddress}\`
💵 **Current Price**: ${config.currentPrice.toFixed(6)} ${config.tokenToBuy}/${config.tokenToSell}
🎯 **Trigger Price**: ${config.targetPrice.toFixed(6)} ${config.tokenToBuy}/${config.tokenToSell}

**Costs:**
💸 **Destination Contract**: ${config.destinationFunding} ${networkName.includes('Avalanche') ? 'AVAX' : 'ETH'}
🤖 **RSC Contract**: ${config.rscFunding} ${parseInt(config.chainId) === 1 || parseInt(config.chainId) === 43114 ? 'REACT' : 'KOPLI'}

**Ready to deploy?** This will create your automated stop order that monitors prices 24/7.`;
  }

  private calculateThresholdValues(currentPrice: number, targetPrice: number): { coefficient: number, threshold: number } {
    const coefficient = 1000;
    const ratio = targetPrice / currentPrice;
    const threshold = Math.floor(ratio * coefficient);
    return { coefficient, threshold };
  }

  private getDefaultFunding(chainId: number): string {
    const fundingMap: { [key: number]: string } = {
      1: "0.03",
      11155111: "0.03",
      43114: "0.01"
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

  private isValidToken(token: string): boolean {
    const validTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AVAX'];
    return validTokens.includes(token.toUpperCase());
  }

  private fallbackResponse(context: MessageContext, conversation: ConversationState) {
    return {
      message: "I'm having trouble processing your request right now. I can help you with:\n\n• Learning about Reactor and RSCs\n• Creating stop orders\n• Checking token balances\n• Finding pair addresses\n\nWhat would you like to know?",
      intent: 'ANSWER_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'fallback_mode'
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
        lastUpdated: Date.now(),
        conversationHistory: [],
        lastResponse: undefined
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

  public getConversationCount(): number {
    return this.conversations.size;
  }
}