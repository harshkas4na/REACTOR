import { BlockchainService, EnhancedBlockchainService } from './BlockchainService';
import { ValidationService } from './ValidationService';
import { ConversationUtils, MessageAnalysis } from './ConversationUtils';
import { KnowledgeBaseHelper } from './KnowledgeBaseHelper';
import { ethers } from 'ethers';

export interface MessageContext {
  message: string;
  conversationId: string;
  connectedWallet?: string;
  currentNetwork?: number;
}

export interface ConversationState {
  intent: 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'UNKNOWN' | 'BLOCKCHAIN_QUERY';
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
    customTokenAddresses?: { [symbol: string]: string }; // For custom tokens
  };
  missingData: string[];
  confidence: number;
  lastUpdated: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  lastResponse?: string;
  pausedStopOrderState?: {
    step: string;
    data: any;
    timestamp: number;
  };
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
  private blockchainService: EnhancedBlockchainService;
  private validationService: ValidationService;
  private geminiApiKey: string;
  private geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // Enhanced system prompt
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform. You are knowledgeable, helpful, and educational.

ABOUT REACTOR PLATFORM:
REACTOR is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs). The platform bridges complex blockchain functionality with user-friendly interfaces, enabling automated interactions between smart contracts across different blockchain networks.

KEY CAPABILITIES:
1. **Educational Support**: Explain Reactor, RSCs, DeFi automation, technical concepts
2. **Stop Order Creation**: Guide users through creating automated sell orders
3. **Blockchain Queries**: Check balances, find trading pairs, get prices
4. **Technical Guidance**: Help developers understand RSC development

BLOCKCHAIN QUERY HANDLING:
- When users ask for "my ETH balance" or "my balance", fetch their NATIVE currency balance (ETH on Ethereum/Sepolia, AVAX on Avalanche)
- Use predefined token addresses from BlockchainService - NEVER make up addresses
- If a user wants a token not in our predefined list, ASK for the token address
- Always use real blockchain data when available

SUPPORTED TOKENS:
- Ethereum/Sepolia: ETH (native), USDC, USDT, DAI, WBTC
- Avalanche: AVAX (native), ETH, USDC, USDT, DAI, WBTC
- For unsupported tokens, ask user for the contract address

CONVERSATION INTELLIGENCE:
- Extract ALL relevant information from user messages efficiently
- Use ConversationUtils to analyze messages properly
- Use KnowledgeBaseHelper for platform-specific information
- Determine when to fetch real blockchain data vs provide educational content
- Handle interruptions gracefully
- Be conversational but informative`;

  constructor(blockchainService: EnhancedBlockchainService, validationService: ValidationService) {
    this.blockchainService = blockchainService;
    this.validationService = validationService;
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
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
      
      // Analyze message using ConversationUtils
      const messageAnalysis = ConversationUtils.analyzeMessage(
        context.message, 
        conversation.conversationHistory
      );
      
      console.log('Message analysis:', messageAnalysis);

      // Use enhanced context-aware intent detection
      const contextualIntent = ConversationUtils.determineIntentWithContext(
        context.message,
        conversation.conversationHistory,
        conversation.collectedData
      );
      
      console.log('Contextual intent determined:', contextualIntent);
      
      // Update conversation intent if we got a better detection
      if (contextualIntent !== 'UNKNOWN' && contextualIntent !== messageAnalysis.intent) {
        console.log(`Intent upgraded from ${messageAnalysis.intent} to ${contextualIntent}`);
        console.log(`Intent upgraded from ${messageAnalysis.intent} to ${contextualIntent}`);
        messageAnalysis.intent = contextualIntent as any;
      } else if (conversation.intent === 'UNKNOWN') {
        conversation.intent = contextualIntent as any;
      }

      // Check if this needs blockchain data (using contextual intent)
      if (this.requiresBlockchainData(context.message, messageAnalysis) || 
          ['CHECK_BALANCE', 'FIND_PAIR', 'GET_PRICE'].includes(contextualIntent)) {
        conversation.intent = 'BLOCKCHAIN_QUERY';
        const blockchainResponse = await this.handleEnhancedBlockchainQueries(context, conversation, messageAnalysis);
        if (blockchainResponse) {
          conversation.conversationHistory.push({
            role: 'assistant',
            content: blockchainResponse.message
          });
          conversation.lastResponse = blockchainResponse.message;
          return blockchainResponse;
        }
      }

      // Check for interruption during stop order creation (improved detection)
      if (conversation.intent === 'CREATE_STOP_ORDER' && 
          contextualIntent !== 'CREATE_STOP_ORDER' && 
          contextualIntent !== 'UNKNOWN') {
        const interruptionResponse = await this.handleInterruption(context, conversation);
        if (interruptionResponse) {
          conversation.conversationHistory.push({
            role: 'assistant',
            content: interruptionResponse.message
          });
          return interruptionResponse;
        }
      }

      // Extract entities using both custom extraction and ConversationUtils
      await this.enhancedEntityExtraction(context.message, conversation, messageAnalysis);
      
      console.log('After entity extraction:', conversation.collectedData);

      // Handle stop order creation (using contextual intent)
      if (conversation.intent === 'CREATE_STOP_ORDER' || contextualIntent === 'CREATE_STOP_ORDER') {
        conversation.intent = 'CREATE_STOP_ORDER';
        
        // Fetch real blockchain data if we have enough info
        await this.fetchRealBlockchainData(conversation);
        
        // Generate smart stop order response
        const stopOrderResponse = await this.generateSmartStopOrderResponse(conversation, context);
        
        if (stopOrderResponse.message !== conversation.lastResponse) {
          conversation.conversationHistory.push({
            role: 'assistant',
            content: stopOrderResponse.message
          });
          conversation.lastResponse = stopOrderResponse.message;
          return stopOrderResponse;
        }
      }

      // Handle educational/knowledge questions using KnowledgeBaseHelper
      const knowledgeResponse = await this.handleEnhancedEducationalQuestions(conversation, context);
      if (knowledgeResponse.message !== conversation.lastResponse) {
        conversation.conversationHistory.push({
          role: 'assistant',
          content: knowledgeResponse.message
        });
        conversation.lastResponse = knowledgeResponse.message;
        return knowledgeResponse;
      }

      // Fallback
      return this.generateFallbackResponse(context, conversation);

    } catch (error: any) {
      console.error('AI Processing Error:', error);
      return this.generateErrorResponse(error, conversation);
    }
  }

  private requiresBlockchainData(message: string, analysis: MessageAnalysis): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Direct blockchain query indicators
    const blockchainKeywords = [
      'balance', 'how much', 'how many',
      'pair', 'trading pair', 'find pair',
      'current price', 'price of',
      'my eth', 'my avax', 'my tokens'
    ];
    
    // Check if message contains blockchain keywords
    const hasBlockchainKeyword = blockchainKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check if entities suggest blockchain query
    const hasRelevantEntities = analysis.entities.tokens.length > 0 && 
                               (lowerMessage.includes('balance') || lowerMessage.includes('how much'));
    
    return hasBlockchainKeyword || hasRelevantEntities || analysis.intent === 'CHECK_BALANCE' || analysis.intent === 'FIND_PAIR';
  }

  private async handleEnhancedBlockchainQueries(
    context: MessageContext, 
    conversation: ConversationState,
    analysis: MessageAnalysis
  ) {
    const lowerMessage = context.message.toLowerCase();
    const data = conversation.collectedData;
    console.log("data", data);
    console.log("analysis", analysis);
    
    // Handle balance queries
    if (lowerMessage.includes('balance') || lowerMessage.includes('how much') || lowerMessage.includes('how many') || lowerMessage.includes('my balance') || lowerMessage.includes('my eth') || lowerMessage.includes('my avax') || analysis.intent === 'CHECK_BALANCE' || analysis.intent === 'BLOCKCHAIN_QUERY' || analysis.intent === 'ASK_QUESTION') {
      return await this.handleBalanceQuery(context, conversation, analysis);
    }
    
    // Handle pair queries
    if (lowerMessage.includes('pair') && !lowerMessage.includes('explain') || lowerMessage.includes('find pair') || lowerMessage.includes('trading pair') || lowerMessage.includes('liquidity pair') || lowerMessage.includes('swap pair') || analysis.intent === 'FIND_PAIR' || analysis.intent === 'BLOCKCHAIN_QUERY' || analysis.intent === 'ASK_QUESTION') {
      return await this.handlePairQuery(context, conversation, analysis);
    }
    
    // Handle price queries
    if (lowerMessage.includes('price') && (lowerMessage.includes('current') || lowerMessage.includes('what is')) || analysis.intent === 'GET_PRICE' || analysis.intent === 'BLOCKCHAIN_QUERY' || analysis.intent === 'ASK_QUESTION') {
      return await this.handlePriceQuery(context, conversation, analysis);  
    }
    
    return null;
  }

  // Enhanced balance query handler with custom token support
  private async handleBalanceQuery(
    context: MessageContext, 
    conversation: ConversationState,
    analysis: MessageAnalysis
  ) {
    const data = conversation.collectedData;
    
    if (!data.connectedWallet) {
      return {
        message: "🔗 Please connect your wallet first so I can check your balances!",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'wallet_needed'
      };
    }
    
    if (!data.selectedNetwork) {
      return {
        message: "🌐 Which network would you like to check your balance on?\n\n• Ethereum Mainnet\n• Avalanche C-Chain\n• Sepolia Testnet",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'network_selection'
      };
    }
    
    // Enhanced token detection - check for addresses in the message
    let tokenToCheck: string | null = null;
    let isCustomToken = false;
    
    // 1. Check if user provided a token address directly
    const addressPattern = /0x[a-fA-F0-9]{40}/;
    const addressMatch = context.message.match(addressPattern);
    
    if (addressMatch) {
      tokenToCheck = addressMatch[0];
      isCustomToken = true;
      console.log('Found token address in message:', tokenToCheck);
    }
    // 2. Check if user is asking for native currency
    else if (context.message.includes('my eth') || context.message.includes('my avax') || 
        (context.message.includes('my balance') && !analysis.entities.tokens.length)) {
      const networkConfig = this.blockchainService.getChainConfig(data.selectedNetwork);
      tokenToCheck = networkConfig?.nativeCurrency || 'ETH';
    }
    // 3. Check extracted tokens from analysis
    else if (analysis.entities.tokens.length > 0) {
      tokenToCheck = analysis.entities.tokens[0];
    }
    
    if (!tokenToCheck) {
      return {
        message: "💰 Which token balance would you like to check?\n\n**Supported tokens**: ETH, USDC, USDT, DAI, WBTC\n\n**Custom tokens**: Provide the contract address (0x...)\n\n**Example**: \"Check balance of 0x1234...\" or \"How much USDC do I have?\"",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: true,
        inputType: 'token' as const,
        nextStep: 'token_selection'
      };
    }
    
    try {
      let balance: string;
      let tokenSymbol: string = tokenToCheck;
      let tokenInfo: any = null;
      
      if (isCustomToken) {
        // Handle custom token address
        console.log('Processing custom token address:', tokenToCheck);
        
        // Validate the token address first
        const validation = await this.blockchainService.validateTokenAddress(tokenToCheck, data.selectedNetwork);
        
        if (!validation.isValid) {
          return {
            message: `❌ **Invalid Token Address**\n\n${validation.error}\n\nPlease provide a valid ERC-20 token contract address.`,
            intent: 'BLOCKCHAIN_QUERY' as const,
            needsUserInput: false,
            nextStep: 'invalid_token_address'
          };
        }
        
        tokenInfo = validation.tokenInfo;
        tokenSymbol = tokenInfo.symbol;
        
        // Store custom token for future use
        if (!data.customTokenAddresses) {
          data.customTokenAddresses = {};
        }
        data.customTokenAddresses[tokenSymbol] = tokenToCheck;
        
        // Get balance using enhanced service
        balance = await this.blockchainService.getTokenBalanceEnhanced(
          data.connectedWallet,
          tokenToCheck,
          data.selectedNetwork,
          data.customTokenAddresses
        );
      } else {
        // Handle predefined token or check if it's in custom tokens
        const supportedTokens = this.blockchainService.getSupportedTokens(data.selectedNetwork);
        const networkConfig = this.blockchainService.getChainConfig(data.selectedNetwork);
        const nativeCurrency = networkConfig?.nativeCurrency || 'ETH';
        
        // Add native currency to supported tokens
        if (!supportedTokens.includes(nativeCurrency)) {
          supportedTokens.push(nativeCurrency);
        }
        
        if (!supportedTokens.includes(tokenToCheck.toUpperCase()) && 
            tokenToCheck.toUpperCase() !== nativeCurrency.toUpperCase()) {
          
          // Check if we have this token in custom addresses
          if (data.customTokenAddresses && data.customTokenAddresses[tokenToCheck.toUpperCase()]) {
            balance = await this.blockchainService.getTokenBalanceEnhanced(
              data.connectedWallet,
              data.customTokenAddresses[tokenToCheck.toUpperCase()],
              data.selectedNetwork,
              data.customTokenAddresses
            );
          } else {
            // Ask for custom token address
            return {
              message: `❓ **${tokenToCheck}** is not in our predefined token list.\n\nPlease provide the contract address for ${tokenToCheck} on ${this.getNetworkName(data.selectedNetwork)}:\n\n**Example**: 0x1234567890abcdef1234567890abcdef12345678`,
              intent: 'BLOCKCHAIN_QUERY' as const,
              needsUserInput: true,
              inputType: 'token' as const,
              nextStep: 'custom_token_address',
              metadata: { tokenSymbol: tokenToCheck }
            };
          }
        } else {
          // Use enhanced service for predefined tokens
          balance = await this.blockchainService.getTokenBalanceEnhanced(
            data.connectedWallet,
            tokenToCheck,
            data.selectedNetwork,
            data.customTokenAddresses
          );
        }
      }
      
      console.log(`Balance fetched: ${balance} ${tokenSymbol}`);
      
      // Store the balance for future use
      if (tokenSymbol === data.tokenToSell) {
        data.userBalance = balance;
      }
      
      const networkName = this.getNetworkName(data.selectedNetwork);
      
      // Enhanced response with token info for custom tokens
      let responseMessage = `💰 **Your ${tokenSymbol} Balance**\n\n**Amount**: ${balance} ${tokenSymbol}\n**Network**: ${networkName}\n**Wallet**: \`${data.connectedWallet.slice(0, 6)}...${data.connectedWallet.slice(-4)}\``;
      
      if (tokenInfo) {
        responseMessage += `\n**Token**: ${tokenInfo.name} (${tokenInfo.symbol})\n**Contract**: \`${tokenInfo.address.slice(0, 8)}...${tokenInfo.address.slice(-6)}\``;
      }
      
      responseMessage += `\n\n${parseFloat(balance) > 0 ? '✅ You have funds available!' : '❌ No balance found'}`;
      
      if (data.tokenToSell === tokenSymbol) {
        responseMessage += '\n\n💡 Perfect! This is the token you want to protect with a stop order.';
      }
      
      return {
        message: responseMessage,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'balance_provided'
      };
      
    } catch (error: any) {
      console.error('Error fetching balance:', error);
      return {
        message: `❌ **Error Fetching Balance**\n\n${error.message}\n\n**Please check:**\n• Your wallet is connected\n• You're on the correct network\n• The token contract is valid\n• The token exists on this network\n\nWould you like to try a different token?`,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'balance_error'
      };
    }
  }

  // Enhanced entity extraction with address detection
  private async enhancedEntityExtraction(
    message: string, 
    conversation: ConversationState,
    analysis: MessageAnalysis
  ) {
    const lowerMessage = message.toLowerCase();
    const data = conversation.collectedData;

    console.log('Enhanced entity extraction with analysis:', analysis);

    // 1. Extract token addresses first
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = message.match(addressPattern) || [];
    
    if (addresses.length > 0) {
      console.log('Found token addresses in message:', addresses);
      
      // Validate and store custom token addresses
      for (const address of addresses) {
        try {
          if (data.selectedNetwork) {
            const validation = await this.blockchainService.validateTokenAddress(address, data.selectedNetwork);
            if (validation.isValid && validation.tokenInfo) {
              if (!data.customTokenAddresses) {
                data.customTokenAddresses = {};
              }
              data.customTokenAddresses[validation.tokenInfo.symbol] = address;
              console.log(`Auto-stored custom token: ${validation.tokenInfo.symbol} = ${address}`);
              
              // If we don't have tokens set yet, use this one
              if (!data.tokenToSell && lowerMessage.includes('sell')) {
                data.tokenToSell = validation.tokenInfo.symbol;
              } else if (!data.tokenToBuy && (lowerMessage.includes('for') || lowerMessage.includes('to'))) {
                data.tokenToBuy = validation.tokenInfo.symbol;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to validate token address:', address, error);
        }
      }
    }

    // 2. Handle custom token address responses in conversation flow
    if (conversation.currentStep === 'custom_token_address' && ethers.isAddress(message.trim())) {
      const lastMessage = conversation.conversationHistory[conversation.conversationHistory.length - 2];
      const metadata = this.extractMetadataFromMessage(lastMessage?.content);
      
      if (metadata?.tokenSymbol) {
        try {
          const validation = await this.blockchainService.validateTokenAddress(message.trim(), data.selectedNetwork!);
          if (validation.isValid && validation.tokenInfo) {
            if (!data.customTokenAddresses) {
              data.customTokenAddresses = {};
            }
            data.customTokenAddresses[metadata.tokenSymbol] = message.trim();
            console.log(`Stored custom token address for ${metadata.tokenSymbol}: ${message.trim()}`);
            
            // Continue with balance query using the custom token
            return;
          }
        } catch (error) {
          console.error('Error validating custom token address:', error);
        }
      }
    }

    // 3. Use ConversationUtils analysis for standard tokens
    if (analysis.entities.tokens.length > 0) {
      if (!data.tokenToSell && analysis.entities.tokens[0]) {
        data.tokenToSell = analysis.entities.tokens[0];
      }
      if (!data.tokenToBuy && analysis.entities.tokens[1]) {
        data.tokenToBuy = analysis.entities.tokens[1];
      }
    }

    // 4. Use percentage from analysis
    if (analysis.entities.percentages.length > 0 && !data.dropPercentage) {
      data.dropPercentage = analysis.entities.percentages[0];
    }

    // 5. Use amounts from analysis
    if (analysis.entities.amounts.length > 0 && !data.amount) {
      const amount = analysis.entities.amounts[0];
      if (amount.toLowerCase().includes('all') || amount.toLowerCase().includes('everything')) {
        data.amount = 'all';
      } else if (amount.toLowerCase().includes('half')) {
        data.amount = '50%';
      } else {
        data.amount = amount.replace(/[^\d.]/g, ''); // Extract numeric value
      }
    }

    console.log('Enhanced extraction complete:', data);
  }

  // Helper method to extract metadata from AI messages
  private extractMetadataFromMessage(content: string): any {
    // This is a simple implementation - you might want to make it more robust
    const metadataMatch = content?.match(/Please provide the contract address for (\w+)/);
    if (metadataMatch) {
      return { tokenSymbol: metadataMatch[1] };
    }
    return null;
  }

  // Enhanced pair query with custom token support
  private async handlePairQuery(
    context: MessageContext, 
    conversation: ConversationState,
    analysis: MessageAnalysis
  ) {
    const data = conversation.collectedData;
    
    if (!data.selectedNetwork) {
      return {
        message: "🌐 Which network would you like to find the trading pair on?\n\n• Ethereum Mainnet\n• Avalanche C-Chain\n• Sepolia Testnet",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'network_selection_for_pair'
      };
    }
    
    // Enhanced token extraction including addresses
    let tokens: string[] = [];
    
    // Check for token addresses in message
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = context.message.match(addressPattern) || [];
    
    if (addresses.length >= 2) {
      tokens = addresses.slice(0, 2);
    } else if (addresses.length === 1) {
      tokens.push(addresses[0]);
      // Try to get the second token from analysis
      if (analysis.entities.tokens.length > 0) {
        tokens.push(analysis.entities.tokens[0]);
      }
    } else {
      // Use tokens from analysis
      tokens = analysis.entities.tokens.slice(0, 2);
    }
    
    if (tokens.length < 2) {
      return {
        message: "🔄 I need two tokens to find a trading pair.\n\nPlease specify both tokens, for example:\n• \"Find ETH/USDC pair\"\n• \"0x1234.../USDT pair\"\n• \"Trading pair for 0x1234... and 0x5678...\"",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: true,
        inputType: 'token' as const,
        nextStep: 'pair_tokens_needed'
      };
    }
    
    const token1 = tokens[0];
    const token2 = tokens[1];

    try {
      // Use enhanced pair finding with custom token support
      const pairAddress = await this.blockchainService.findPairAddressEnhanced(
        token1, 
        token2, 
        data.selectedNetwork,
        data.customTokenAddresses
      );
      
      if (!pairAddress) {
        return {
          message: `❌ **Pair Not Found**\n\nI couldn't find a ${token1}/${token2} trading pair on ${this.getNetworkName(data.selectedNetwork)}.\n\n**Possible reasons:**\n• The pair doesn't exist on this DEX\n• Insufficient liquidity\n• One or both tokens aren't supported on this network\n• Invalid token addresses\n\n**Try:**\n• Popular pairs like ETH/USDC or ETH/USDT\n• Different network\n• Verifying token addresses are correct`,
          intent: 'BLOCKCHAIN_QUERY' as const,
          needsUserInput: false,
          nextStep: 'pair_not_found'
        };
      }
      
      // Get current price using enhanced service
      const currentPrice = await this.blockchainService.getCurrentPriceEnhanced(
        token1,
        token2,
        data.selectedNetwork,
        data.customTokenAddresses
      );
      
      const networkName = this.getNetworkName(data.selectedNetwork);
      const dexName = KnowledgeBaseHelper.getNetworkDEX(data.selectedNetwork);
      
      // Get token symbols for display
      let token1Symbol = token1;
      let token2Symbol = token2;
      
      // If they're addresses, try to get symbols
      if (ethers.isAddress(token1)) {
        try {
          const tokenInfo = await this.blockchainService.getTokenInfo(token1, data.selectedNetwork);
          token1Symbol = tokenInfo.symbol;
        } catch (error) {
          console.warn('Could not get token1 symbol');
        }
      }
      
      if (ethers.isAddress(token2)) {
        try {
          const tokenInfo = await this.blockchainService.getTokenInfo(token2, data.selectedNetwork);
          token2Symbol = tokenInfo.symbol;
        } catch (error) {
          console.warn('Could not get token2 symbol');
        }
      }
      
      return {
        message: `✅ **${token1Symbol}/${token2Symbol} Trading Pair Found!**\n\n**Network**: ${networkName}\n**DEX**: ${dexName}\n**Pair Address**: \`${pairAddress}\`\n**Current Price**: ${currentPrice.toFixed(6)} ${token2Symbol}/${token1Symbol}\n\n${ethers.isAddress(token1) ? `**Token 1**: \`${token1.slice(0, 8)}...${token1.slice(-6)}\`\n` : ''}${ethers.isAddress(token2) ? `**Token 2**: \`${token2.slice(0, 8)}...${token2.slice(-6)}\`\n` : ''}\n💡 Ready to create a stop order for this pair?`,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'pair_found',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'check another pair', label: '🔍 Check Another Pair' }
        ]
      };
    } catch (error: any) {
      console.error('Error finding pair:', error);
      return {
        message: `❌ **Error Finding Pair**\n\n${error.message}\n\nPlease verify:\n• Both tokens are supported on ${this.getNetworkName(data.selectedNetwork)}\n• Token addresses are valid ERC-20 contracts\n• You're checking the correct network\n• The DEX has this trading pair`,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'pair_error'
      };
    }
  }

  // Enhanced fetch real blockchain data with custom token support
  private async fetchRealBlockchainData(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    try {
      // Fetch token balance if we have wallet and token (including custom tokens)
      if (data.connectedWallet && data.tokenToSell && data.selectedNetwork && !data.userBalance) {
        try {
          console.log(`Fetching balance for ${data.tokenToSell}...`);
          const balance = await this.blockchainService.getTokenBalanceEnhanced(
            data.connectedWallet,
            data.tokenToSell,
            data.selectedNetwork,
            data.customTokenAddresses
          );
          data.userBalance = balance;
          console.log(`Balance fetched: ${balance} ${data.tokenToSell}`);
        } catch (error) {
          console.error('Error fetching token balance:', error);
        }
      }

      // Fetch pair address and price if we have both tokens (enhanced with custom token support)
      if (data.tokenToSell && data.tokenToBuy && data.selectedNetwork && !data.pairAddress) {
        try {
          console.log(`Finding pair for ${data.tokenToSell}/${data.tokenToBuy}...`);
          const pairAddress = await this.blockchainService.findPairAddressEnhanced(
            data.tokenToSell,
            data.tokenToBuy,
            data.selectedNetwork,
            data.customTokenAddresses
          );
          
          if (pairAddress) {
            data.pairAddress = pairAddress;
            console.log(`Pair found: ${pairAddress}`);
            
            // Get current price using enhanced service
            try {
              const currentPrice = await this.blockchainService.getCurrentPriceEnhanced(
                data.tokenToSell,
                data.tokenToBuy,
                data.selectedNetwork,
                data.customTokenAddresses
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

  // Enhanced configuration preparation with custom token support
  private async prepareFinalConfiguration(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    if (!data.tokenToSell || !data.tokenToBuy || !data.selectedNetwork || !data.connectedWallet) {
      throw new Error('Missing required information for stop order');
    }

    try {
      let pairAddress = data.pairAddress;
      if (!pairAddress) {
        // Use enhanced pair finding
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
        // Use enhanced price fetching
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
      
      // Use token order detection
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
        customTokenAddresses: data.customTokenAddresses || {},
        deploymentReady: true
      };
    } catch (error: any) {
      console.error('Error preparing final configuration:', error);
      throw new Error(`Failed to prepare configuration: ${error.message}`);
    }
  }

  // Add method to validate if BlockchainService has enhanced methods
  private validateEnhancedBlockchainService(): void {
    const requiredMethods = [
      'getTokenBalanceEnhanced',
      'findPairAddressEnhanced', 
      'getCurrentPriceEnhanced',
      'validateTokenAddress',
      'getTokenInfo'
    ];
    
    for (const method of requiredMethods) {
      if (typeof (this.blockchainService as any)[method] !== 'function') {
        throw new Error(`BlockchainService is missing enhanced method: ${method}`);
      }
    }
    
    console.log('✅ Enhanced BlockchainService validation passed');
  }

  // Initialize and validate enhanced blockchain service
  public async initialize(): Promise<void> {
    try {
      this.validateEnhancedBlockchainService();
      console.log('🚀 Enhanced AIAgent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced AIAgent:', error);
      throw error;
    }
  }

  private async handlePriceQuery(
    context: MessageContext, 
    conversation: ConversationState,
    analysis: MessageAnalysis
  ) {
    const data = conversation.collectedData;
    
    if (!data.selectedNetwork) {
      return {
        message: "🌐 Which network would you like to check the price on?\n\n• Ethereum Mainnet\n• Avalanche C-Chain\n• Sepolia Testnet",
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: true,
        inputType: 'network' as const,
        nextStep: 'network_selection_for_price'
      };
    }
    
    if (analysis.entities.tokens.length < 2) {
      // If we have one token and it's in context, try to use it
      if (analysis.entities.tokens.length === 1 && (data.tokenToSell || data.tokenToBuy)) {
        const token1 = analysis.entities.tokens[0];
        const token2 = data.tokenToSell === token1 ? data.tokenToBuy : data.tokenToSell;
        
        if (token2) {
          analysis.entities.tokens.push(token2);
        }
      } else {
        return {
          message: "💱 I need to know which token pair to check the price for.\n\nPlease specify:\n• \"Price of ETH in USDC\"\n• \"Current ETH/USDT price\"\n• \"How much is 1 AVAX in USDC\"",
          intent: 'BLOCKCHAIN_QUERY' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'price_tokens_needed'
        };
      }
    }
    
    const token1 = analysis.entities.tokens[0];
    const token2 = analysis.entities.tokens[1];
    
    try {
      const pairAddress = await this.blockchainService.findPairAddress(token1, token2, data.selectedNetwork);
      
      if (!pairAddress) {
        return {
          message: `❌ No ${token1}/${token2} trading pair found on ${this.getNetworkName(data.selectedNetwork)}.\n\nTry checking a different pair or network.`,
          intent: 'BLOCKCHAIN_QUERY' as const,
          needsUserInput: false,
          nextStep: 'price_pair_not_found'
        };
      }
      
      const currentPrice = await this.blockchainService.getCurrentPrice(pairAddress, data.selectedNetwork);
      const networkName = this.getNetworkName(data.selectedNetwork);
      const dexName = KnowledgeBaseHelper.getNetworkDEX(data.selectedNetwork);
      
      return {
        message: `💱 **Current Price: ${token1}/${token2}**\n\n**Price**: 1 ${token1} = ${currentPrice.toFixed(6)} ${token2}\n**Network**: ${networkName}\n**DEX**: ${dexName}\n**Pair**: \`${pairAddress.slice(0, 8)}...${pairAddress.slice(-6)}\`\n\n💡 This is the live price from the ${dexName} liquidity pool.`,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'price_provided'
      };
    } catch (error: any) {
      console.error('Error fetching price:', error);
      return {
        message: `❌ **Error Fetching Price**\n\n${error.message}\n\nPlease try:\n• Different token pair\n• Checking if the pair exists\n• Another network`,
        intent: 'BLOCKCHAIN_QUERY' as const,
        needsUserInput: false,
        nextStep: 'price_error'
      };
    }
  }

  

  private async handleEnhancedEducationalQuestions(conversation: ConversationState, context: MessageContext) {
    const lowerMessage = context.message.toLowerCase();

    // First check KnowledgeBaseHelper for FAQ
    const faqResult = KnowledgeBaseHelper.searchFAQ(context.message);
    if (faqResult) {
      return {
        message: faqResult.answer,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'faq_answered',
        options: faqResult.relatedTopics.map(topic => ({
          value: topic.toLowerCase(),
          label: topic
        }))
      };
    }

    // Check for platform-specific questions
    if (KnowledgeBaseHelper.isQuestionAboutReactiveNetwork(context.message)) {
      const reactiveInfo = KnowledgeBaseHelper.getReactiveNetworkInfo();
      return {
        message: `**Reactive Network** is the blockchain that powers REACTOR's automation! 🌐\n\n**Key Facts:**\n• **Chain ID**: ${reactiveInfo.chainId}\n• **Currency**: ${reactiveInfo.currency}\n• **Purpose**: Monitors events 24/7 and triggers cross-chain automations\n• **Gas Token**: ${reactiveInfo.currency} (needed for RSC deployment)\n\n**How it works:**\nYour RSC lives on the Reactive Network, watching for events on other chains. When conditions are met, it sends callbacks to execute actions on destination chains.\n\n**Cost**: ~${reactiveInfo.gasPrice} ${reactiveInfo.currency} to deploy an RSC\n\n💡 Think of it as the "brain" that coordinates all your automations across different blockchains!`,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'reactive_network_explained'
      };
    }

    if (KnowledgeBaseHelper.isQuestionAboutCosts(context.message)) {
      const stopOrderInfo = KnowledgeBaseHelper.getAutomationInfo('STOP_ORDER');
      return {
        message: `💰 **REACTOR Automation Costs**\n\n**Stop Orders:**\n${stopOrderInfo?.costEstimate || 'Contact support for pricing'}\n\n**Cost Breakdown:**\n• **Destination Contract**: Deployment on your chosen network (ETH/AVAX)\n• **RSC Contract**: Deployment on Reactive Network for monitoring\n• **One-time setup**: No recurring fees!\n\n**Network Costs Vary:**\n• Ethereum: Higher gas fees (~0.03 ETH)\n• Avalanche: Lower fees (~0.01 AVAX)\n• Testnets: Minimal costs for testing\n\n💡 **Pro Tip**: Once deployed, your automation runs forever with no additional fees!`,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'costs_explained'
      };
    }

    // Try enhanced Gemini response
    try {
      const aiResponse = await this.callGeminiAPI(conversation, context);
      return {
        message: aiResponse,
        intent: this.determineIntentFromMessage(context.message),
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.getKnowledgeBaseFallback(context.message);
    }
  }

  // Add these missing methods from the original implementation...
  private isStopOrderIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced stop order keywords based on ConversationUtils patterns
    const stopOrderKeywords = [
      'stop order', 'create stop order', 'protect', 'sell when', 'sell if',
      'automatic sell', 'stop loss', 'price drop', 'create order',
      'sell my', 'protect my', 'automate', 'automation', 'limit order',
      'set up protection', 'automate sell', 'trigger sell', 'sell if price drops',
      'liquidate when', 'exit position', 'risk management', 'price alert',
      'conditional sell', 'stop trading', 'protect my position', 'secure profits',
      'cut losses', 'emergency sell', 'reactive contract', 'smart contract automation',
      'defi automation'
    ];
    
    return stopOrderKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private getNetworkName(chainId: number): string {
    return KnowledgeBaseHelper.getNetworkName(chainId);
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
        lastResponse: undefined,
        pausedStopOrderState: undefined
      });
    }
    
    const conversation = this.conversations.get(conversationId)!;
    conversation.lastUpdated = Date.now();
    
    // Check if conversation needs intervention
    const intervention = ConversationUtils.needsIntervention(conversation.conversationHistory);
    if (intervention.needsIntervention) {
      console.warn(`Conversation needs intervention: ${intervention.reason}`);
      // Could implement automatic reset or summary here
    }
    
    return conversation;
  }

  private async handleInterruption(context: MessageContext, conversation: ConversationState) {
    console.log('Handling interruption during stop order creation');
    
    // Save current stop order state
    if (!conversation.pausedStopOrderState) {
      conversation.pausedStopOrderState = {
        step: conversation.currentStep,
        data: { ...conversation.collectedData },
        timestamp: Date.now()
      };
    }

    // Check if it's a clarification question about the stop order process
    const lowerMessage = context.message.toLowerCase();
    if (lowerMessage.includes('what') || lowerMessage.includes('why') || lowerMessage.includes('how') || 
        lowerMessage.includes('explain') || lowerMessage.includes('mean')) {
      
      // Handle clarification questions
      if (lowerMessage.includes('pair address') || lowerMessage.includes('pair')) {
        return {
          message: `A **pair address** is the smart contract address where two tokens (like ETH and USDC) are traded on a DEX.\n\n• It's like the "location" of the trading pool\n• Contains reserves of both tokens\n• Enables price discovery and swapping\n• Required for our stop order to monitor prices\n\nFor your stop order, I need this address to monitor ${conversation.collectedData.tokenToSell || 'your token'} prices. Would you like me to help find the pair address, or do you have it?`,
          intent: 'ANSWER_QUESTION',
          needsUserInput: true,
          nextStep: 'resume_stop_order'
        };
      }

      if (lowerMessage.includes('threshold') || lowerMessage.includes('coefficient')) {
        return {
          message: `**Threshold and coefficient** work together to set your trigger price:\n\n• **Coefficient**: Usually 1000 (a scaling factor)\n• **Threshold**: The actual trigger level\n\n**Example**: To sell when price drops 10%:\n• Current price ratio: 1.0\n• Target ratio: 0.9 (90% of current)\n• Coefficient: 1000\n• Threshold: 900 (0.9 × 1000)\n\nDon't worry - I calculate these automatically from your drop percentage! Ready to continue with your stop order?`,
          intent: 'ANSWER_QUESTION',
          needsUserInput: true,
          nextStep: 'resume_stop_order'
        };
      }

      if (lowerMessage.includes('funding') || lowerMessage.includes('cost')) {
        return {
          message: `**Stop order costs** cover deployment and execution:\n\n**Destination Contract**: ${this.getDefaultFunding(conversation.collectedData.selectedNetwork || 11155111)} ${this.getNetworkCurrency(conversation.collectedData.selectedNetwork || 11155111)}\n• Pays for the actual token swap when triggered\n\n**RSC Contract**: 0.05 ${this.getRSCCurrency(conversation.collectedData.selectedNetwork || 11155111)}\n• Monitors prices 24/7 on the Reactive Network\n\nThese are one-time setup costs. Once deployed, your stop order works automatically! Continue setting up your order?`,
          intent: 'ANSWER_QUESTION',
          needsUserInput: true,
          nextStep: 'resume_stop_order'
        };
      }
    }

    // Handle general questions during stop order creation
    const educationalResponse = await this.handleEducationalQuestions(conversation, context);
    
    // Add resume prompt
    educationalResponse.message += `\n\n---\n\n💡 **Ready to continue?** I was helping you set up a stop order for ${conversation.collectedData.tokenToSell || 'your tokens'}. Shall we continue where we left off?`;
    educationalResponse.options = [
      { value: 'yes continue', label: '✅ Yes, continue stop order' },
      { value: 'start over', label: '🔄 Start over' },
      { value: 'cancel', label: '❌ Cancel stop order' }
    ];
    educationalResponse.needsUserInput = true;

    return educationalResponse;
  }

  private async handleEducationalQuestions(conversation: ConversationState, context: MessageContext) {
    const lowerMessage = context.message.toLowerCase();

    // Handle resumption from interruption
    if (conversation.pausedStopOrderState && 
        (lowerMessage.includes('continue') || lowerMessage.includes('yes'))) {
      console.log('Resuming stop order creation from interruption');
      
      // Restore paused state
      const pausedState = conversation.pausedStopOrderState;
      conversation.collectedData = { ...conversation.collectedData, ...pausedState.data };
      conversation.currentStep = pausedState.step;
      conversation.intent = 'CREATE_STOP_ORDER';
      conversation.pausedStopOrderState = undefined;
      
      // Continue with stop order flow
      return await this.generateSmartStopOrderResponse(conversation, context);
    }

    // Enhanced knowledge base responses
    if (lowerMessage.includes('reactor') || lowerMessage.includes('what is reactor')) {
      return {
        message: `**REACTOR** is a blockchain automation platform that revolutionizes DeFi through Reactive Smart Contracts! 🚀

**🌟 What Makes Reactor Special:**
• **Event-Driven**: Contracts that watch and react automatically
• **Cross-Chain**: Seamless automation across multiple networks
• **24/7 Operation**: Never miss an opportunity or protection trigger
• **User-Friendly**: Complex automation made simple

**🛠️ Main Automations:**
• **Stop Orders**: Protect investments from price drops ✅
• **Fee Collectors**: Auto-harvest Uniswap V3 fees (coming soon)
• **Range Managers**: Optimize LP ranges (coming soon)

**💡 Real Example:**
"Sell my 5 ETH if price drops 10%" → Reactor monitors 24/7 and automatically executes when ETH drops 10%, protecting you from further losses!

**🔗 Supported Networks:**
Ethereum, Avalanche, Sepolia testnet

Ready to create your first automation? Just say "create a stop order" and I'll guide you through it! 🎯`,
        intent: 'ANSWER_QUESTION',
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    }

    if (lowerMessage.includes('rsc') || lowerMessage.includes('reactive smart contract')) {
      return {
        message: `**Reactive Smart Contracts (RSCs)** are the breakthrough technology powering REACTOR! 🧠⚡

**🔄 How RSCs Work:**
1. **Subscribe to Events**: Monitor specific blockchain events (like price changes)
2. **Autonomous Detection**: Continuously watch for trigger conditions
3. **Cross-Chain Execution**: Send automated callbacks to destination chains
4. **Automatic Action**: Execute programmed responses without human intervention

**🆚 Traditional vs Reactive Contracts:**
**Traditional**: User → Contract (manual calls)
**Reactive**: Event → Contract → Action (autonomous)

**⚡ Key Capabilities:**
• **Event-Driven Architecture**: React to any blockchain event
• **Cross-Chain Operations**: Monitor Chain A, execute on Chain B
• **24/7 Monitoring**: Never sleep, never miss a trigger
• **Gas Efficient**: Optimized for minimal costs

**🏗️ Technical Architecture:**
• **Event Listeners**: Filter and capture relevant events
• **Processing Engine**: Analyze events against conditions
• **Callback System**: Trigger actions on destination chains

**🎯 Perfect For:**
• Automated trading (stop orders, take profits)
• Portfolio rebalancing
• Fee collection
• Risk management
• Complex DeFi strategies

Want to see RSCs in action? Create a stop order and watch the magic happen! ✨`,
        intent: 'ANSWER_QUESTION',
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    }

    if (lowerMessage.includes('stop order') && !this.isStopOrderIntent(context.message)) {
      return {
        message: `**Stop Orders** are your automated protection against market downturns! 🛡️📉

**🎯 What They Do:**
Automatically sell your tokens when the price drops to a level you set, protecting you from bigger losses.

**💡 How It Works:**
1. **Set Your Protection**: Choose tokens and drop percentage
2. **24/7 Monitoring**: RSC watches prices continuously  
3. **Instant Execution**: Automatic sale when threshold is hit
4. **Sleep Peacefully**: No need to watch charts constantly!

**📊 Example Scenarios:**
• "Sell my 10 ETH if it drops 15%" → Protects against bear markets
• "Sell my AVAX if it falls 20%" → Limits maximum loss
• "Protect my DeFi portfolio" → Multiple stop orders

**🌐 Supported Trading:**
• **Ethereum**: Uniswap V2 pairs (ETH, USDC, USDT, DAI)
• **Avalanche**: Pangolin pairs (ETH, USDC, USDT, DAI)  
• **Sepolia**: Testing environment

**💰 Setup Costs:**
• Destination contract: ~0.03 ETH/AVAX
• RSC monitoring: ~0.05 REACT/KOPLI
• One-time setup, lifetime protection!

**🚀 Want to create one?** Just tell me:
• Which token to protect
• How much to protect  
• What drop percentage triggers the sale

Ready to get started? 🎯`,
        intent: 'ANSWER_QUESTION',
        needsUserInput: false,
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'how much does it cost', label: '💰 Learn About Costs' },
          { value: 'how does it work technically', label: '🔧 Technical Details' }
        ],
        nextStep: 'stop_order_explained'
      };
    }

    // Try Gemini API for complex questions
    try {
      const aiResponse = await this.callGeminiAPI(conversation, context);
      
      // Enhance the response if it's about Reactor topics
      const enhancedResponse = this.enhanceGeminiResponse(aiResponse, lowerMessage);
      
      return {
        message: enhancedResponse,
        intent: this.determineIntentFromMessage(context.message),
        needsUserInput: false,
        nextStep: 'knowledge_provided'
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.getKnowledgeBaseFallback(context.message);
    }
  }

  private enhanceGeminiResponse(response: string, query: string): string {
    // Add practical suggestions based on query type
    if (query.includes('fee') || query.includes('cost')) {
      response += `\n\n💡 **Pro Tip**: REACTOR stop orders have transparent, one-time costs with no ongoing fees once deployed!`;
    }
    
    if (query.includes('safe') || query.includes('secure')) {
      response += `\n\n🔒 **Security**: REACTOR uses battle-tested smart contracts and RSCs are audited for security.`;
    }
    
    if (query.includes('profit') || query.includes('money')) {
      response += `\n\n📈 **Use Case**: Many users combine stop orders with take-profit strategies for complete portfolio protection.`;
    }

    return response;
  }

  private async comprehensiveEntityExtraction(message: string, conversation: ConversationState) {
    const lowerMessage = message.toLowerCase();
    const data = conversation.collectedData;

    console.log('Starting comprehensive entity extraction for:', message);

    // Handle resumption commands
    if (conversation.pausedStopOrderState && (lowerMessage.includes('continue') || lowerMessage.includes('yes'))) {
      return; // Let the main flow handle this
    }

    // Extract stop order intent
    if (this.isStopOrderIntent(message)) {
      conversation.intent = 'CREATE_STOP_ORDER';
    }

    // Enhanced token extraction with multiple patterns
    const tokenExtractionPatterns = [
      /sell\s+(\w+)\s+(?:for|to|with|into)\s+(\w+)/i,
      /(\w+)\s+(?:and|\/|\-|to)\s+(\w+)/i,
      /sell\s+(?:all\s+(?:of\s+)?(?:my\s+)?)?(\w+).*?(?:give\s+me|for|to|into)\s+(\w+)/i,
      /protect\s+(?:my\s+)?(\w+).*?(?:for|to|into)\s+(\w+)/i,
      /sell\s+(?:my\s+)?(\w+)/i,
      /protect\s+(?:my\s+)?(\w+)/i,
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
        if (tokensFound.length >= 2) break;
      }
    }

    // Remove duplicates and assign tokens
    tokensFound = [...new Set(tokensFound)];
    
    if (tokensFound.length >= 2) {
      if (lowerMessage.includes('sell') || lowerMessage.includes('protect')) {
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[1];
      } else {
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[1];
      }
    } else if (tokensFound.length === 1) {
      if (lowerMessage.includes('sell') || lowerMessage.includes('protect')) {
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
      } else if (lowerMessage.includes('for') || lowerMessage.includes('to') || lowerMessage.includes('into')) {
        if (!data.tokenToBuy) data.tokenToBuy = tokensFound[0];
      } else {
        if (!data.tokenToSell) data.tokenToSell = tokensFound[0];
      }
    }

    // Extract percentage drops
    const percentagePatterns = [
      /(?:drops?|falls?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s+drop/i,
      /price\s+drops?\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i,
      /when.*?(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*percent/i
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

    // Handle contextual references
    if ((lowerMessage.includes('all of them') || lowerMessage.includes('all')) && !data.amount) {
      data.amount = 'all';
    }

    console.log('Final extracted data:', {
      tokenToSell: data.tokenToSell,
      tokenToBuy: data.tokenToBuy,
      amount: data.amount,
      dropPercentage: data.dropPercentage
    });
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
            message: `💰 You currently have **${balance} ${tokenSymbol}** in your wallet.\n\n${data.tokenToSell === tokenSymbol ? 'Perfect! This is the token you want to protect with a stop order.' : 'Got it! This information might be useful for creating automations.'}`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'balance_provided'
          };
        } catch (error: any) {
          console.error('Error fetching balance:', error);
          return {
            message: `❌ I couldn't fetch your ${tokenSymbol} balance. Error: ${error.message}\n\n**Please check:**\n• Your wallet is connected\n• You're on the correct network\n• The token exists in your wallet`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'balance_error'
          };
        }
      }
    }
    
    // Handle pair queries
    if (lowerMessage.includes('pair') && !lowerMessage.includes('explain')) {
      const tokenMatches = message.match(/\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX)\b/gi);
      
      if (tokenMatches && tokenMatches.length >= 2 && data.selectedNetwork) {
        const token1 = tokenMatches[0].toUpperCase();
        const token2 = tokenMatches[1].toUpperCase();
        
        try {
          const pairAddress = await this.blockchainService.findPairAddress(
            token1,
            token2,
            data.selectedNetwork
          );
          
          if (pairAddress) {
            data.pairAddress = pairAddress;
            data.tokenToSell = token1;
            data.tokenToBuy = token2;
            
            try {
              const currentPrice = await this.blockchainService.getCurrentPrice(
                pairAddress,
                data.selectedNetwork
              );
              data.currentPrice = currentPrice;
              
              const networkName = this.getNetworkName(data.selectedNetwork);
              
              return {
                message: `✅ **Pair Found!**\n\n**${token1}/${token2}** trading pair on ${networkName}:\n📍 **Address**: \`${pairAddress}\`\n💵 **Current Price**: ${currentPrice.toFixed(6)} ${token2}/${token1}\n\nReady to create a stop order for this pair? 🎯`,
                intent: 'ANSWER_QUESTION',
                needsUserInput: false,
                nextStep: 'pair_found'
              };
            } catch (priceError) {
              return {
                message: `✅ **Pair Found!**\n\n**${token1}/${token2}** trading pair:\n📍 **Address**: \`${pairAddress}\`\n\n*(Could not fetch current price)*\n\nReady to create a stop order for this pair? 🎯`,
                intent: 'ANSWER_QUESTION',
                needsUserInput: false,
                nextStep: 'pair_found'
              };
            }
          } else {
            return {
              message: `❌ **Pair Not Found**\n\nI couldn't find a ${token1}/${token2} trading pair on ${this.getNetworkName(data.selectedNetwork || 11155111)}.\n\n**This could mean:**\n• The pair doesn't exist on this DEX\n• There's insufficient liquidity\n• One of the tokens isn't supported\n\n**Try:**\n• Different token combinations\n• Another network\n• Popular pairs like ETH/USDC`,
              intent: 'ANSWER_QUESTION',
              needsUserInput: false,
              nextStep: 'pair_not_found'
            };
          }
        } catch (error: any) {
          console.error('Error finding pair:', error);
          return {
            message: `❌ **Error Finding Pair**\n\nI encountered an error: ${error.message}\n\nPlease try again or verify the tokens are supported on this network.`,
            intent: 'ANSWER_QUESTION',
            needsUserInput: false,
            nextStep: 'pair_error'
          };
        }
      }
    }
    
    return null;
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
          message: `❌ **Configuration Error**\n\n${error.message}\n\nLet's fix this step by step. What would you like to adjust?`,
          intent: 'CREATE_STOP_ORDER',
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: 'error_recovery'
        };
      }
    }
    
    // We need more information - ask for the FIRST missing piece
    const nextMissing = missingData[0];
    console.log('Next missing field:', nextMissing);
    
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
    
    switch (missingField) {
      case 'wallet':
        return "🔗 I need you to **connect your wallet** first to create a stop order. Please connect your wallet and try again!";
      
      case 'network':
        return "🌐 Which **network** would you like to use for your stop order?\n\n• **Ethereum Mainnet** - Production environment\n• **Avalanche C-Chain** - Lower fees\n• **Sepolia Testnet** - For testing";
      
      case 'tokenToSell':
        return "🪙 Which **token** would you like to protect with a stop order?\n\nPopular options: ETH, USDC, USDT, DAI";
      
      case 'tokenToBuy':
        if (data.tokenToSell) {
          return `🔄 Great! You want to sell **${data.tokenToSell}**.\n\nWhich token should I **convert it to** when the price drops?\n\n💡 *USDC and USDT are popular choices for preserving value*`;
        }
        return "🔄 Which **token** should you receive when the stop order triggers?\n\nStablecoins like USDC or USDT are popular for protecting value.";
      
      case 'amount':
        if (data.userBalance && data.tokenToSell) {
          return `💰 Perfect! I can see you have **${data.userBalance} ${data.tokenToSell}** in your wallet.\n\nHow much would you like to **protect** with this stop order?`;
        }
        if (data.tokenToSell) {
          return `💰 How much **${data.tokenToSell}** would you like to protect?\n\n💡 *You can protect all, half, or a specific amount*`;
        }
        return "💰 How much would you like to **protect** with this stop order?";
      
      case 'dropPercentage':
        return `📉 At what **percentage drop** should I trigger the sale?\n\n💡 *Common choices: 5% (conservative), 10% (balanced), 15% (aggressive)*\n\nFor example: "10%" means sell when price drops 10% from current level.`;
      
      default:
        return "🤔 I need a bit more information to set up your stop order perfectly.";
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
          { value: 'ETH', label: '💎 Ethereum (ETH)' },
          { value: 'USDC', label: '💵 USD Coin (USDC)' },
          { value: 'USDT', label: '💵 Tether (USDT)' },
          { value: 'DAI', label: '💵 Dai (DAI)' }
        ];
      
      case 'tokenToBuy':
        const allTokens = ['ETH', 'USDC', 'USDT', 'DAI'];
        return allTokens
          .filter(token => token !== data.tokenToSell)
          .map(token => ({ 
            value: token, 
            label: `${token === 'ETH' ? '💎' : '💵'} ${token}${
              ['USDC', 'USDT', 'DAI'].includes(token) ? ' (Stablecoin)' : ''
            }` 
          }));
      
      case 'amount':
        if (data.userBalance && data.tokenToSell) {
          const balance = parseFloat(data.userBalance);
          return [
            { value: 'all', label: `🎯 All (${data.userBalance} ${data.tokenToSell})` },
            { value: '50%', label: `⚖️ Half (${(balance / 2).toFixed(4)} ${data.tokenToSell})` },
            { value: 'custom', label: '✏️ Custom amount' }
          ];
        }
        return [
          { value: 'all', label: '🎯 All of my tokens' },
          { value: '50%', label: '⚖️ Half of my tokens' },
          { value: 'custom', label: '✏️ Custom amount' }
        ];
      
      case 'dropPercentage':
        return [
          { value: '5', label: '🔒 5% drop (Conservative)' },
          { value: '10', label: '⚖️ 10% drop (Balanced)' },
          { value: '15', label: '🎯 15% drop (Aggressive)' },
          { value: '20', label: '🚀 20% drop (High Risk)' }
        ];
      
      case 'network':
        return [
          { value: '1', label: '🔷 Ethereum Mainnet' },
          { value: '43114', label: '🔺 Avalanche C-Chain' },
          { value: '11155111', label: '🧪 Sepolia Testnet' }
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

  // Helper methods
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
    // Production chains use REACT, testnets use KOPLI
    return (chainId === 1 || chainId === 43114) ? "REACT" : "KOPLI";
  }

  private isValidToken(token: string): boolean {
    const validTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AVAX'];
    return validTokens.includes(token.toUpperCase());
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
1. If this is a question about Reactor, RSCs, DeFi automation, or technical concepts, provide a comprehensive, engaging, and educational response
2. Use emojis and clear formatting to make responses more engaging
3. Include practical examples when explaining concepts
4. If this relates to stop orders but isn't a creation request, explain thoroughly with examples
5. Be helpful, educational, and enthusiastic about the technology
6. Include actionable next steps when appropriate

Respond as Reactor AI:`;

    try {
      const response = await fetch(`${this.geminiBaseUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7, topK: 40, topP: 0.9, maxOutputTokens: 1000
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
    
    if (conversation.intent === 'CREATE_STOP_ORDER') {
      contextStr += `- Creating stop order\n`;
      if (data.tokenToSell) contextStr += `- Token to sell: ${data.tokenToSell}\n`;
      if (data.tokenToBuy) contextStr += `- Token to buy: ${data.tokenToBuy}\n`;
      if (data.amount) contextStr += `- Amount: ${data.amount}\n`;
      if (data.dropPercentage) contextStr += `- Drop percentage: ${data.dropPercentage}%\n`;
      if (data.userBalance) contextStr += `- Current balance: ${data.userBalance} ${data.tokenToSell}\n`;
    }
    
    if (conversation.pausedStopOrderState) {
      contextStr += `- Has paused stop order creation\n`;
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

  private determineIntentFromMessage(message: string): 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'UNKNOWN' {
    const lowerMessage = message.toLowerCase();
    
    if (this.isStopOrderIntent(message)) {
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
    return {
      message: `🤖 I'm here to help you with REACTOR's DeFi automation platform! I can assist you with:

**📚 Learning:**
• Understanding Reactive Smart Contracts (RSCs)
• How DeFi automation works
• REACTOR platform features and capabilities

**🛠️ Creating Automations:**
• **Stop Orders** - Protect investments from price drops ✅
• **Fee Collectors** - Auto-harvest fees (coming soon)
• **Range Managers** - Optimize LP ranges (coming soon)

**🔍 Blockchain Queries:**
• Check token balances: "How much ETH do I have?"
• Find trading pairs: "Find ETH/USDC pair"
• Get current prices and market data

**💡 Popular Questions:**
• "What is Reactor?" 
• "How do RSCs work?"
• "Create a stop order for my ETH"
• "Explain stop orders"

What would you like to know or do? 🚀`,
      intent: 'ANSWER_QUESTION',
      needsUserInput: false,
      nextStep: 'awaiting_query'
    };
  }

  private generateFallbackResponse(context: MessageContext, conversation: ConversationState) {
    return {
      message: "🤔 I'm not quite sure how to help with that specific request, but I'm here to assist you with REACTOR's DeFi automation platform!\n\nI can help you:\n• **Learn** about Reactor and RSCs\n• **Create stop orders** to protect your investments\n• **Check balances** and find trading pairs\n• **Answer questions** about DeFi automation\n\nWhat would you like to know? 🚀",
      intent: 'ANSWER_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'fallback_mode'
    };
  }

  private generateErrorResponse(error: any, conversation: ConversationState) {
    return {
      message: `❌ **Oops!** I encountered an issue processing your request.\n\n**Error**: ${error.message || 'Unknown error'}\n\nLet's try again! I can help you with:\n• Creating stop orders\n• Learning about Reactor\n• Checking token balances\n• Finding trading pairs\n\nWhat would you like to do? 🔄`,
      intent: 'ANSWER_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'error_recovery'
    };
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