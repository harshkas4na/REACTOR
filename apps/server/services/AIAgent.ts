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
  private blockchainService: BlockchainService;
  private validationService: ValidationService;
  private geminiApiKey: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Enhanced knowledge base and system prompts
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform. 

ABOUT REACTOR:
- REACTOR creates Reactive Smart Contracts (RSCs) that automatically execute DeFi actions
- RSCs monitor blockchain events and trigger actions without manual intervention
- Main automation types: Stop Orders, Fee Collectors, Range Managers

STOP ORDERS:
- Automatically sell tokens when price drops below a threshold
- Protects investments from market crashes
- Requires: token to sell, token to buy, amount, drop percentage, network
- Works 24/7 without manual monitoring
- Costs small gas fees + REACT tokens for RSC operation

YOUR ROLE:
1. Help users create stop orders through natural conversation
2. Extract key information: token to sell, amount, drop percentage, target token, network
3. Validate that trading pairs exist and have liquidity
4. Guide users step-by-step without overwhelming them
5. Answer questions about DeFi automation and RSCs

CONVERSATION STYLE:
- Be conversational and helpful, not robotic
- Ask for one piece of information at a time
- Provide clear options when possible
- Explain why information is needed
- Use emojis sparingly but effectively
- Don't repeat information unnecessarily

IMPORTANT TECHNICAL DETAILS:
- Networks supported: Ethereum, Avalanche, Sepolia testnet
- We can auto-detect user's connected network but should confirm
- Must verify trading pairs exist with sufficient liquidity
- Amount can be specific number, percentage of holdings, or "all"
- Drop percentage is how much price drop triggers the sale
- We handle all technical details (pair addresses, coefficients, etc.)

When a user wants to create a stop order, collect information in this order:
1. Confirm intent and network
2. What token to protect/sell
3. How much of that token
4. What token to sell it for
5. At what percentage drop to trigger
6. Final confirmation with summary

Be intelligent about extracting information from user messages. If they say "sell my ETH if it drops 10%", you can extract token=ETH and percentage=10%.`;

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
      // Call Gemini API for intelligent response
      const aiResponse = await this.callGeminiAPI(conversation, context);
      
      // Extract structured data from AI response
      const structuredResponse = await this.extractStructuredData(aiResponse, conversation);
      
      // Add AI response to history
      conversation.conversationHistory.push({
        role: 'assistant',
        content: structuredResponse.message
      });

      return structuredResponse;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.fallbackResponse(context, conversation);
    }
  }

  private async callGeminiAPI(conversation: ConversationState, context: MessageContext): Promise<string> {
    // Prepare context for Gemini
    const userContext = this.buildUserContext(conversation, context);
    const conversationHistory = this.formatConversationHistory(conversation);
    
    const prompt = `${this.systemPrompt}

CURRENT USER CONTEXT:
${userContext}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER MESSAGE: "${context.message}"

INSTRUCTIONS:
1. Analyze the user's message in context of creating a stop order
2. Determine what information we still need
3. Respond naturally and helpfully
4. If ready for final configuration, respond with "READY_FOR_DEPLOYMENT" at the start
5. If extracting new information, include it in your response naturally

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

  private buildUserContext(conversation: ConversationState, context: MessageContext): string {
    const data = conversation.collectedData;
    let contextStr = '';
    
    if (context.connectedWallet) {
      contextStr += `- Wallet: ${context.connectedWallet}\n`;
    } else {
      contextStr += `- Wallet: Not connected\n`;
    }
    
    if (context.currentNetwork) {
      const networkName = this.getNetworkName(context.currentNetwork);
      contextStr += `- Current Network: ${networkName} (ID: ${context.currentNetwork})\n`;
    }
    
    if (data.tokenToSell) contextStr += `- Token to sell: ${data.tokenToSell}\n`;
    if (data.tokenToBuy) contextStr += `- Token to buy: ${data.tokenToBuy}\n`;
    if (data.amount) contextStr += `- Amount: ${data.amount}\n`;
    if (data.dropPercentage) contextStr += `- Drop percentage: ${data.dropPercentage}%\n`;
    if (data.selectedNetwork) contextStr += `- Selected network: ${this.getNetworkName(data.selectedNetwork)}\n`;
    
    return contextStr || '- No previous context';
  }

  private formatConversationHistory(conversation: ConversationState): string {
    if (conversation.conversationHistory.length === 0) {
      return 'No previous conversation';
    }
    
    return conversation.conversationHistory
      .slice(-6) // Last 6 messages to keep context manageable
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  private async extractStructuredData(aiResponse: string, conversation: ConversationState) {
    // Check if ready for deployment
    const isReadyForDeployment = aiResponse.startsWith('READY_FOR_DEPLOYMENT');
    
    if (isReadyForDeployment) {
      // Remove the flag from the response
      const cleanResponse = aiResponse.replace('READY_FOR_DEPLOYMENT', '').trim();
      
      // Prepare final configuration
      const automationConfig = await this.prepareFinalConfiguration(conversation);
      
      return {
        message: cleanResponse,
        intent: 'CREATE_STOP_ORDER',
        needsUserInput: true,
        inputType: 'confirmation' as const,
        automationConfig,
        nextStep: 'final_confirmation'
      };
    }

    // Extract entities from AI response using regex patterns
    await this.extractEntitiesFromResponse(aiResponse, conversation);
    
    // Determine what we still need
    const missingData = this.identifyMissingStopOrderData(conversation);
    conversation.missingData = missingData;
    
    // Generate appropriate options based on missing data
    const options = await this.generateOptionsForMissingData(conversation, missingData[0]);
    
    return {
      message: aiResponse,
      intent: conversation.intent || 'CREATE_STOP_ORDER',
      needsUserInput: missingData.length > 0,
      inputType: this.getInputTypeForMissingData(missingData[0]),
      options,
      collectedData: conversation.collectedData,
      nextStep: missingData[0] || 'complete'
    };
  }

  private async extractEntitiesFromResponse(response: string, conversation: ConversationState) {
    const lowerResponse = response.toLowerCase();
    const data = conversation.collectedData;
    
    // Extract token mentions
    const tokens = ['eth', 'btc', 'usdc', 'usdt', 'dai', 'wbtc'];
    tokens.forEach(token => {
      if (lowerResponse.includes(token) && !data.tokenToSell) {
        data.tokenToSell = token.toUpperCase();
      }
    });
    
    // Extract percentages
    const percentMatch = response.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch && !data.dropPercentage) {
      data.dropPercentage = parseFloat(percentMatch[1]);
    }
    
    // Extract amounts
    const amountPatterns = [
      /(\d+(?:\.\d+)?)\s*(eth|usdc|usdt|dai)/i,
      /all\s+of\s+it/i,
      /all\s+my/i,
      /everything/i,
      /half/i,
      /50%/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = response.match(pattern);
      if (match && !data.amount) {
        if (match[0].toLowerCase().includes('all') || match[0].toLowerCase().includes('everything')) {
          data.amount = 'all';
        } else if (match[0].toLowerCase().includes('half') || match[0].includes('50%')) {
          data.amount = '50%';
        } else if (match[1]) {
          data.amount = match[1];
        }
        break;
      }
    }
  }

  private identifyMissingStopOrderData(conversation: ConversationState): string[] {
    const missing: string[] = [];
    const data = conversation.collectedData;
    
    if (!data.connectedWallet) missing.push('wallet');
    if (!data.selectedNetwork) missing.push('network');
    if (!data.tokenToSell) missing.push('tokenToSell');
    if (!data.amount) missing.push('amount');
    if (!data.tokenToBuy) missing.push('tokenToBuy');
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
        if (data.connectedWallet && data.tokenToSell) {
          try {
            const balance = await this.blockchainService.getTokenBalance(
              data.connectedWallet,
              data.tokenToSell,
              data.selectedNetwork || 1
            );
            return [
              { value: 'all', label: `All of it (${balance} ${data.tokenToSell})` },
              { value: '50%', label: `Half (${parseFloat(balance) / 2} ${data.tokenToSell})` },
              { value: 'custom', label: 'Custom amount' }
            ];
          } catch (error) {
            return [
              { value: 'all', label: 'All of my tokens' },
              { value: '50%', label: 'Half of my tokens' },
              { value: 'custom', label: 'Custom amount' }
            ];
          }
        }
        return [];
      
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

  private async prepareFinalConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    try {
      // Find and validate pair
      const pairAddress = await this.blockchainService.findPairAddress(
        data.tokenToSell!,
        data.tokenToBuy!,
        data.selectedNetwork!
      );
      
      if (!pairAddress) {
        throw new Error(`Trading pair ${data.tokenToSell}/${data.tokenToBuy} not found`);
      }
      
      // Get current price and calculate threshold
      const currentPrice = await this.blockchainService.getCurrentPrice(pairAddress, data.selectedNetwork!);
      const thresholdPrice = currentPrice * (1 - data.dropPercentage! / 100);
      const { coefficient, threshold } = this.calculateThresholdValues(currentPrice, thresholdPrice);
      
      return {
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
    } catch (error: any) {
      throw new Error(`Failed to prepare configuration: ${error.message}`);
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

  private fallbackResponse(context: MessageContext, conversation: ConversationState) {
    return {
      message: "I'm having trouble connecting to my AI services right now. Let me help you with a basic flow. What token would you like to protect with a stop order?",
      intent: 'CREATE_STOP_ORDER' as const,
      needsUserInput: true,
      inputType: 'token' as const,
      options: [
        { value: 'ETH', label: 'Ethereum (ETH)' },
        { value: 'USDC', label: 'USD Coin (USDC)' },
        { value: 'USDT', label: 'Tether (USDT)' }
      ],
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
        conversationHistory: []
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