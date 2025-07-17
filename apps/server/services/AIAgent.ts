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
  intent: 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'CREATE_AAVE_PROTECTION' | 'UNKNOWN' | 'BLOCKCHAIN_QUERY';
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
    aavePositionData?: any;
    hasAavePosition?: boolean;
    userAaveAssets?: any[];
  };
  missingData: string[];
  confidence: number;
  nextStep: string;
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
  private maxConversationHistory = 6;

  // Enhanced system prompt
  private systemPrompt = `You are Reactor AI, an intelligent assistant for the REACTOR DeFi automation platform. You are knowledgeable, helpful, and educational.

ABOUT REACTOR PLATFORM:
REACTOR is a blockchain automation platform that makes DeFi automation accessible through Reactive Smart Contracts (RSCs). The platform bridges complex blockchain functionality with user-friendly interfaces, enabling automated interactions between smart contracts across different blockchain networks.

KEY CAPABILITIES:
1. **Educational Support**: Explain Reactor, RSCs, DeFi automation, technical concepts
2. **Stop Order Creation**: Guide users through creating automated sell orders
3. **Aave Liquidation Protection**: Help users protect their Aave positions from liquidation
4. **Blockchain Queries**: Check balances, find trading pairs, get prices
5. **Technical Guidance**: Help developers understand RSC development

BLOCKCHAIN QUERY HANDLING:
- When users ask for "my ETH balance" or "my balance", fetch their NATIVE currency balance (ETH on Ethereum/Sepolia, AVAX on Avalanche)
- Use predefined token addresses from BlockchainService - NEVER make up addresses
- If a user wants a token not in our predefined list, ASK for the token address
- Always use real blockchain data when available

SUPPORTED TOKENS:
- Ethereum/Sepolia: ETH (native), USDC, USDT, DAI, WBTC, LINK
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
    
    if (context.connectedWallet) conversation.collectedData.connectedWallet = context.connectedWallet;
    if (context.currentNetwork) conversation.collectedData.selectedNetwork = context.currentNetwork;

    conversation.conversationHistory.push({ role: 'user', content: context.message });

    try {
        console.log('Processing message:', context.message);
        console.log('Current step:', conversation.currentStep);

        // STEP 1: Handle potential custom token address input if we are asking for a token
        if (conversation.currentStep === 'tokenToSell' || conversation.currentStep === 'tokenToBuy') {
            const addressValidationResponse = await this.handleTokenAddressInput(context.message, conversation);
            if (addressValidationResponse) {
                return addressValidationResponse;
            }
        }

        // STEP 2: Classify intent and handle interruptions or new tasks
        const currentMessageIntent = this.classifyMessageIntent(context.message, conversation);
        console.log('Current message intent:', currentMessageIntent);

        const hasOngoingTask = this.hasOngoingPrimaryTask(conversation);
        if (this.isInterruptingIntent(currentMessageIntent) && hasOngoingTask) {
            return this.handleInterruptingIntent(context, conversation, currentMessageIntent);
        }
        
        // STEP 3: Proceed with the normal flow (new task or continuation)
        await this.extractAndUpdateEntities(context.message, conversation);
        console.log('After entity extraction:', conversation.collectedData);
        
        const primaryIntent = conversation.intent !== 'UNKNOWN' ? conversation.intent : currentMessageIntent;

        switch (primaryIntent) {
            case 'CREATE_STOP_ORDER':
                if (conversation.intent === 'UNKNOWN') conversation.intent = 'CREATE_STOP_ORDER';
                return this.handleStopOrderFlow(conversation, context);
            
            case 'CREATE_AAVE_PROTECTION':
                if (conversation.intent === 'UNKNOWN') conversation.intent = 'CREATE_AAVE_PROTECTION';
                return this.handleAaveProtectionFlow(conversation, context);
            
            case 'CHECK_BALANCE':
            case 'FIND_PAIR':
            case 'GET_PRICE':
            case 'BLOCKCHAIN_QUERY':
                const messageAnalysis = ConversationUtils.analyzeMessage(context.message, conversation.conversationHistory);
                const blockchainResponse = await this.handleEnhancedBlockchainQueries(context, conversation, messageAnalysis);
                if (blockchainResponse) {
                    conversation.conversationHistory.push({
                        role: 'assistant',
                        content: blockchainResponse.message
                    });
                    return blockchainResponse;
                }
                return this.generateFallbackResponse(context, conversation);

            case 'ANSWER_QUESTION':
                return await this.handleEnhancedEducationalQuestions(conversation, context);

            default:
                if (hasOngoingTask) {
                    return this.continueOngoingTask(conversation, context);
                }
                return this.generateFallbackResponse(context, conversation);
        }

    } catch (error: any) {
        console.error('AI Processing Error:', error);
        return this.generateErrorResponse(error, conversation);
    }
  }

  // NEW: Complete Aave Protection Flow Handler
  private async handleAaveProtectionFlow(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Handling Aave protection flow');
    console.log('Current data:', data);
    console.log('Current step:', conversation.currentStep);
    console.log('Message:', context.message);

    // Handle confirmation steps
    if (conversation.currentStep === 'final_aave_confirmation' && this.isConfirmingAction(context.message)) {
      try {
        const aaveConfig = await this.prepareAaveConfig(conversation);
        
        const response = {
          message: "🚀 **Perfect!** Redirecting you to deploy your Aave liquidation protection...\n\nYour configuration has been prepared and will be loaded automatically. You'll just need to sign the transactions! ✨",
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
        message: `🚧 **${networkName} - Coming Soon!**\n\nAave liquidation protection is currently available on **Sepolia Testnet** for testing purposes.\n\n**Ethereum Mainnet** and **Avalanche** support is coming soon!\n\n**Would you like to:**\n• Test on Sepolia first\n• Create a stop order instead\n• Learn more about when mainnet will be ready`,
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

    // Check Aave position if not already done
    if (data.hasAavePosition === undefined && conversation.currentStep !== 'checking_aave_position') {
      conversation.currentStep = 'checking_aave_position';
      
      try {
        const hasPosition = await this.checkAavePosition(conversation);
        
        if (!hasPosition) {
          const response = {
            message: "❌ **No Aave Position Found**\n\nI couldn't find an active Aave lending position for your wallet address.\n\n**To use liquidation protection, you need:**\n• An active Aave lending position\n• Some collateral supplied\n• Some debt borrowed\n\n**Next steps:**\n• Open an Aave position first\n• Create a stop order to protect other investments\n• Learn more about Aave lending",
            intent: 'CREATE_AAVE_PROTECTION' as const,
            needsUserInput: false,
            nextStep: 'no_aave_position',
            options: [
              { value: 'create stop order', label: '🛡️ Create Stop Order Instead' },
              { value: 'learn about aave', label: '📚 Learn About Aave' },
              { value: 'refresh position', label: '🔄 Check Position Again' }
            ]
          };
          
          this.addToHistory(conversation, 'assistant', response.message);
          return response;
        }

        // Position found, continue with flow
        data.hasAavePosition = true;
        conversation.currentStep = 'initial';
      } catch (error: any) {
        console.error('Error checking Aave position:', error);
        
        const response = {
          message: `❌ **Error Checking Aave Position**\n\n${error.message}\n\nPlease ensure:\n• You're connected to the correct network\n• Your wallet has an active Aave position\n• The network connection is stable\n\nWould you like to try again?`,
          intent: 'CREATE_AAVE_PROTECTION' as const,
          needsUserInput: true,
          inputType: 'confirmation' as const,
          nextStep: 'position_check_error',
          options: [
            { value: 'try again', label: '🔄 Try Again' },
            { value: 'create stop order', label: '🛡️ Create Stop Order Instead' }
          ]
        };
        
        this.addToHistory(conversation, 'assistant', response.message);
        return response;
      }
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

  // NEW: Identify Missing Aave Data Helper
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

  // NEW: Generate Aave-Specific Questions
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

  // NEW: Enhanced Entity Extraction for Aave Protection
  private async extractAndUpdateEntities(message: string, conversation: ConversationState) {
    console.log('Extracting entities from:', message);
    console.log('Current step:', conversation.currentStep);
    console.log('Current intent:', conversation.intent);

    // Handle Aave-specific entity extraction
    if (conversation.intent === 'CREATE_AAVE_PROTECTION') {
      this.extractAaveEntities(message, conversation);
      return;
    }

    // Existing stop order logic
    if (conversation.currentStep === 'initial') {
        this.extractInitialEntities(message, conversation);
        return;
    }

    this.extractFocusedEntity(message, conversation);
  }

  // NEW: Extract Aave-Specific Entities
  private extractAaveEntities(message: string, conversation: ConversationState) {
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
        // Check if it's an address
        const addressPattern = /0x[a-fA-F0-9]{40}/;
        const addressMatch = message.match(addressPattern);
        if (addressMatch) {
          collectedData[currentStep] = addressMatch[0];
        } else {
          // Check for token symbols
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

  // NEW: Prepare Final Aave Configuration
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
      throw new Error(`Failed to prepare Aave configuration: ${error.message}`);
    }
  }

  // NEW: Generate Aave Confirmation Message
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

**Ready to deploy your automated Aave protection?** 🚀`;
  }

  // NEW: Check if user has Aave position
  private async checkAavePosition(conversation: ConversationState): Promise<boolean> {
    const data = conversation.collectedData;
    
    // Mock implementation - in real version this would call Aave contract
    try {
      // Simulate checking Aave position
      console.log(`Checking Aave position for ${data.connectedWallet} on network ${data.selectedNetwork}`);
      
      // For demo purposes, return true if wallet is connected
      // In real implementation, this would:
      // 1. Call Aave lending pool getUserAccountData
      // 2. Check if user has any collateral or debt
      // 3. Store current health factor and position info
      
      if (data.connectedWallet && data.selectedNetwork) {
        // Fetch real Aave position data
        try {
          const position = await this.blockchainService.getAavePosition(
            data.connectedWallet,
            data.selectedNetwork
          );
          data.currentHealthFactor = position.healthFactor;
          data.userAaveAssets = position.userAssets;
          data.hasAavePosition = position.hasPosition;
        } catch (error) {
          console.error('Error fetching Aave position:', error);
          data.currentHealthFactor = undefined;
          data.userAaveAssets = [];
          data.hasAavePosition = false;
        }
        return data.hasAavePosition;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking Aave position:', error);
      return false;
    }
  }

  // NEW: Get Aave Assets for Network
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

  // NEW: Get Asset Name from Address
  private getAssetNameFromAddress(address: string, chainId: number): string {
    const assets = this.getAaveAssets(chainId);
    const asset = assets.find(a => a.address.toLowerCase() === address.toLowerCase());
    return asset ? asset.symbol : 'Unknown Asset';
  }

  // ... [Rest of existing methods remain unchanged - including all the stop order methods, blockchain query handlers, etc.]

  // Enhanced token address input handling 
  private async handleTokenAddressInput(message: string, conversation: ConversationState) {
    const addressPattern = /(0x[a-fA-F0-9]{40})/;
    const match = message.match(addressPattern);

    if (!match) {
        return null;
    }

    const tokenAddress = match[0];
    const networkId = conversation.collectedData.selectedNetwork;

    if (!networkId) {
        return { 
          message: "🌐 Please select a network before providing a custom token address.\n\nWhich network would you like to use?", 
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'network' as const,
          nextStep: 'network'
        };
    }

    console.log(`Detected address ${tokenAddress}. Validating on network ${networkId}...`);

    const validation = await this.blockchainService.validateTokenAddress(tokenAddress, networkId);

    if (validation.isValid && validation.tokenInfo) {
        const { symbol, name } = validation.tokenInfo;
        console.log(`Validation successful: ${symbol} (${name})`);

        if (!conversation.collectedData.customTokenAddresses) {
            conversation.collectedData.customTokenAddresses = {};
        }
        conversation.collectedData.customTokenAddresses[symbol] = tokenAddress;
        
        conversation.collectedData[conversation.currentStep as 'tokenToSell' | 'tokenToBuy'] = symbol;

        return this.handleStopOrderFlow(conversation, { message } as MessageContext);

    } else {
        console.log(`Validation failed: ${validation.error}`);
        
        const networkName = this.getNetworkName(networkId);
        const supportedTokens = this.blockchainService.getSupportedTokens(networkId);
        
        return {
            message: `❌ **Invalid Token Address for ${networkName}**\n\n**Address**: \`${tokenAddress}\`\n**Issue**: ${validation.error || 'This address does not appear to be a valid ERC-20 token contract.'}\n\n**Please verify:**\n• The contract address is correct\n• The token exists on **${networkName}** (not a different network)\n• It's a valid ERC-20 token contract\n• You copied the full address without typos\n\n**Alternative**: Use a supported token symbol instead:\n**${networkName} tokens**: ${supportedTokens.slice(0, 6).join(', ')}${supportedTokens.length > 6 ? '...' : ''}\n\n**What would you like to do?**`,
            intent: 'CREATE_STOP_ORDER' as const,
            needsUserInput: true,
            inputType: 'token' as const,
            nextStep: conversation.currentStep,
            options: [
              { value: 'try again', label: '🔄 Try a different address' },
              { value: 'use supported', label: '📋 Use supported tokens instead' }
            ]
        };
    }
  }

  // Aave Protection Intent Detection
  private isAaveProtectionIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    const aaveProtectionKeywords = [
      'aave protection', 'aave liquidation', 'liquidation protection',
      'protect my aave', 'protect aave position', 'aave liquidation protection',
      'health factor', 'liquidation', 'aave health factor', 'collateral deposit',
      'debt repayment', 'aave position', 'protect my loan', 'save my aave',
      'aave automation', 'prevent liquidation', 'avoid liquidation',
      'liquidation prevention', 'aave safety', 'protect lending position',
      'aave collateral', 'aave debt', 'health factor protection',
      'aave risk management', 'liquidation threshold', 'aave monitoring',
      'protect from liquidation', 'aave position protection', 'lending protection',
      'defi lending protection', 'automated aave protection', 'aave guardian',
      'collateral protection', 'debt protection', 'aave alert', 'aave monitor'
    ];
    
    return aaveProtectionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Enhanced stop order flow handling
  private async handleStopOrderFlow(conversation: ConversationState, context: MessageContext) {
    const data = conversation.collectedData;
    
    console.log('Handling stop order flow');
    console.log('Current data:', data);
    console.log('Current step:', conversation.currentStep);
    console.log('Message:', context.message);
    
    // Circuit breaker logic
    const messageContainsAddress = /0x[a-fA-F0-9]{40}/.test(context.message);
    const addressInMessage = context.message.match(/0x[a-fA-F0-9]{40}/)?.[0];
    
    if (messageContainsAddress && addressInMessage && data.customTokenAddresses) {
      const alreadyValidated = Object.values(data.customTokenAddresses).some(
        addr => addr.toLowerCase() === addressInMessage.toLowerCase()
      );
      
      if (alreadyValidated) {
        console.log('🔄 CIRCUIT BREAKER: Address already validated, forcing step progression');
        
        const tokenSymbol = Object.entries(data.customTokenAddresses).find(
          ([_, addr]) => addr.toLowerCase() === addressInMessage.toLowerCase()
        )?.[0];
        
        if (tokenSymbol) {
          if (conversation.currentStep === 'tokenToSell' && !data.tokenToSell) {
            data.tokenToSell = tokenSymbol;
          } else if (conversation.currentStep === 'tokenToBuy' && !data.tokenToBuy) {
            data.tokenToBuy = tokenSymbol;
          }
          
          conversation.currentStep = 'initial';
          console.log('✅ Forced step reset to break infinite loop');
        }
      }
    }
    
    if (conversation.currentStep === 'tokenToSell' && data.tokenToSell && 
        !context.message.toLowerCase().includes('yes') && 
        !context.message.toLowerCase().includes('no')) {
      console.log('🔄 CIRCUIT BREAKER: Already have tokenToSell, moving forward');
      conversation.currentStep = 'initial';
    }
    
    if (conversation.currentStep === 'tokenToBuy' && data.tokenToBuy &&
        !context.message.toLowerCase().includes('yes') && 
        !context.message.toLowerCase().includes('no')) {
      console.log('🔄 CIRCUIT BREAKER: Already have tokenToBuy, moving forward');
      conversation.currentStep = 'initial';
    }
    
    // Handle token address validation
    if ((conversation.currentStep === 'tokenToSell' || conversation.currentStep === 'tokenToBuy') &&
        !this.isConfirmingAction(context.message)) {
      
      const addressValidationResult: any = await this.handleTokenAddressInput(
        context.message,
        conversation
      );
      
      if (addressValidationResult) {
        return addressValidationResult;
      }
    }
    
    // Handle confirmation steps
    if (conversation.currentStep.endsWith('_confirmation')) {
      const baseStep = conversation.currentStep.replace('_confirmation', '') as 'tokenToSell' | 'tokenToBuy';
      
      if (this.isConfirmingAction(context.message)) {
        conversation.currentStep = 'initial';
        console.log(`User confirmed custom token for ${baseStep}`);
      } else {
        conversation.currentStep = baseStep;
        data[baseStep] = undefined;
        
        const response = {
          message: `No problem! Let's try again.\n\n${baseStep === 'tokenToSell' ? 'Which token would you like to protect?' : 'Which token should you receive when the stop order triggers?'}\n\nYou can provide:\n• A token symbol (ETH, USDC, etc.)\n• A contract address (0x...)`,
          intent: 'CREATE_STOP_ORDER' as const,
          needsUserInput: true,
          inputType: 'token' as const,
          nextStep: baseStep
        };
        
        conversation.conversationHistory.push({
          role: 'assistant',
          content: response.message
        });
        
        return response;
      }
    }
    
    // Handle liquidity confirmation
    if (conversation.currentStep === 'confirm_low_liquidity') {
      if (this.isConfirmingAction(context.message)) {
        console.log('User confirmed to proceed with low liquidity');
        conversation.currentStep = 'proceed_to_balance_check';
      } else {
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
        
        conversation.conversationHistory.push({
          role: 'assistant',
          content: response.message
        });
        
        return response;
      }
    }
    
    // Handle balance confirmation
    if (conversation.currentStep === 'confirm_insufficient_balance') {
      if (this.isConfirmingAction(context.message)) {
        console.log('User confirmed to proceed with insufficient balance');
        conversation.currentStep = 'proceed_to_final_confirmation';
      } else {
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
        
        conversation.conversationHistory.push({
          role: 'assistant',
          content: response.message
        });
        
        return response;
      }
    }
    
    // Handle final confirmation
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
    
    // Identify missing data
    const missingData = this.identifyMissingStopOrderData(conversation);
    console.log('Missing data:', missingData);
    
    if (missingData.length === 0) {
      // Fetch real blockchain data
      if (!data.userBalance || !data.pairAddress || !data.currentPrice) {
        console.log('📊 Fetching real blockchain data before validation...');
        await this.fetchRealBlockchainData(conversation);
      }
      
      // Run validation checks
      if (conversation.currentStep !== 'proceed_to_balance_check' && 
          conversation.currentStep !== 'proceed_to_final_confirmation') {
        
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
      }
      
      // Check balance
      if (conversation.currentStep !== 'proceed_to_final_confirmation') {
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

  // Helper methods for stop order flow
  private addToHistory(conversation: ConversationState, role: 'user' | 'assistant', content: string) {
    conversation.conversationHistory.push({ role, content });
    
    if (conversation.conversationHistory.length > this.maxConversationHistory) {
      conversation.conversationHistory = conversation.conversationHistory.slice(-this.maxConversationHistory);
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

  private getNetworkName(chainId: number): string {
    const networkNames: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Ethereum Sepolia',
      43114: 'Avalanche C-Chain'
    };
    return networkNames[chainId] || `Network ${chainId}`;
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

  // Fixed classifyMessageIntent method with proper priority ordering
  private classifyMessageIntent(message: string, conversation: ConversationState): string {
    const lowerMessage = message.toLowerCase().trim();
    
    console.log('Classifying intent for:', lowerMessage);

    // PRIORITY 1: PRIMARY ACTION INTENTS
    

    if (this.isAaveProtectionIntent(message)) {
      return 'CREATE_AAVE_PROTECTION';
    }

    if (this.isStopOrderIntent(message)) {
      return 'CREATE_STOP_ORDER';
    }

    if (lowerMessage.includes('fee collector') || lowerMessage.includes('collect fees') || lowerMessage.includes('harvest fees')) {
      return 'CREATE_FEE_COLLECTOR';
    }
    
    if (lowerMessage.includes('range manager') || lowerMessage.includes('manage range') || lowerMessage.includes('position management')) {
      return 'CREATE_RANGE_MANAGER';
    }

    // PRIORITY 2: EDUCATIONAL QUESTIONS
    if (this.isEducationalQuestion(lowerMessage) || 
        KnowledgeBaseHelper.isQuestionAboutAutomation(lowerMessage) ||
        KnowledgeBaseHelper.isAskingAboutCapabilities(lowerMessage) ||
        KnowledgeBaseHelper.isQuestionAboutReactiveNetwork(message) ||
        KnowledgeBaseHelper.isQuestionAboutCosts(message)) {
      return 'ANSWER_QUESTION';
    }

    // PRIORITY 3: BLOCKCHAIN QUERIES
    if (this.isBalanceQueryContextAware(lowerMessage)) {
      return 'CHECK_BALANCE';
    }
    
    if (this.isPairQueryContextAware(lowerMessage)) {
      return 'FIND_PAIR';
    }
    
    if (this.isPriceQueryContextAware(lowerMessage)) {
      return 'GET_PRICE';
    }
    
    if (this.isBlockchainQueryContextAware(lowerMessage)) {
      return 'BLOCKCHAIN_QUERY';
    }

    return 'UNKNOWN';
  }

  // Enhanced context-aware methods
  private isBalanceQueryContextAware(message: string): boolean {
    if (this.isStopOrderIntent(message) || 
        this.isAaveProtectionIntent(message) ||
        message.includes('fee collector') || 
        message.includes('range manager') ||
        message.includes('create') && (message.includes('order') || message.includes('automation'))) {
      return false;
    }
    
    const balanceKeywords = [
      'balance', 'how much', 'how many', 'my tokens', 'my eth', 'my usdc',  
      'my avax', 'check wallet', 'wallet balance', 'token balance'
    ];
    return balanceKeywords.some(keyword => message.includes(keyword));
  }

  private isPairQueryContextAware(message: string): boolean {
    if (this.isStopOrderIntent(message) || 
        this.isAaveProtectionIntent(message) ||
        message.includes('fee collector') || 
        message.includes('range manager') ||
        message.includes('create') && (message.includes('order') || message.includes('automation'))) {
      return false;
    }
    
    const pairKeywords = [
      'find pair', 'trading pair', 'liquidity pool', 'swap pair'
    ];
    return pairKeywords.some(keyword => message.includes(keyword)) &&
           !message.includes('explain') && !message.includes('what is');
  }

  private isPriceQueryContextAware(message: string): boolean {
    if (this.isStopOrderIntent(message) || 
        this.isAaveProtectionIntent(message) ||
        message.includes('fee collector') || 
        message.includes('range manager') ||
        message.includes('create') && (message.includes('order') || message.includes('automation'))) {
      return false;
    }
    
    const priceQueryKeywords = [
      'current price', 'what is the price', 'how much is', 'price of', 'value of',
      'what does', 'cost of', 'check price', 'get price', 'show price'
    ];
    
    return priceQueryKeywords.some(keyword => message.includes(keyword)) ||
           (message.includes('price') && 
            (message.startsWith('price') || 
             message.includes('?') || 
             message.includes('current') ||
             message.includes('today'))) &&
           !message.includes('drop') && 
           !message.includes('when') && 
           !message.includes('if') &&
           !message.includes('trigger') &&
           !message.includes('threshold');
  }

  private isBlockchainQueryContextAware(message: string): boolean {
    if (this.isStopOrderIntent(message) || 
        this.isAaveProtectionIntent(message) ||
        message.includes('fee collector') || 
        message.includes('range manager') ||
        message.includes('create') && (message.includes('order') || message.includes('automation'))) {
      return false;
    }
    
    return (message.includes('check my') && !message.includes('create')) ||  
           (message.includes('show me') && !message.includes('how to')) ||
           (message.includes('get') && (message.includes('data') || message.includes('info')) && 
            !message.includes('set up') && !message.includes('create'));
  }

  // Check if the intent is interrupting
  private isInterruptingIntent(intent: string): boolean {
    const interruptingIntents = [
      'CHECK_BALANCE',
      'FIND_PAIR',  
      'GET_PRICE',
      'BLOCKCHAIN_QUERY',
      'ANSWER_QUESTION'
    ];
    
    return interruptingIntents.includes(intent);
  }

  // Check if there's an ongoing primary task
  private hasOngoingPrimaryTask(conversation: ConversationState): boolean {
    const primaryTasks = ['CREATE_STOP_ORDER', 'CREATE_FEE_COLLECTOR', 'CREATE_RANGE_MANAGER', 'CREATE_AAVE_PROTECTION'];
    return primaryTasks.includes(conversation.intent) &&  
           conversation.currentStep !== 'initial' &&  
           conversation.currentStep !== 'completed';
  }

  // Handle interrupting intents during ongoing tasks
  private async handleInterruptingIntent(
    context: MessageContext,  
    conversation: ConversationState,  
    interruptingIntent: string
  ) {
    console.log('Processing interrupting intent:', interruptingIntent);
    
    let interruptionResponse;

    switch (interruptingIntent) {
      case 'CHECK_BALANCE':
      case 'FIND_PAIR':
      case 'GET_PRICE':
      case 'BLOCKCHAIN_QUERY':
        const messageAnalysis = ConversationUtils.analyzeMessage(context.message, conversation.conversationHistory);
        interruptionResponse = await this.handleEnhancedBlockchainQueries(context, conversation, messageAnalysis);
        break;
        
      case 'ANSWER_QUESTION':
        interruptionResponse = await this.handleEnhancedEducationalQuestions(conversation, context);
        break;
        
      default:
        interruptionResponse = this.generateFallbackResponse(context, conversation);
    }

    if (!interruptionResponse) {
      interruptionResponse = this.generateFallbackResponse(context, conversation);
    }

    const followUpPrompt = this.generateFollowUpPrompt(conversation);
    if (followUpPrompt) {
      interruptionResponse.message += `\n\n---\n\n${followUpPrompt}`;
      interruptionResponse.needsUserInput = true;
      
      if (!(interruptionResponse as any).options) {
        (interruptionResponse as any).options = [
          { value: 'continue', label: '✅ Continue with my task' },
          { value: 'restart', label: '🔄 Start over' }
        ];
      }
    }

    conversation.conversationHistory.push({
      role: 'assistant',
      content: interruptionResponse.message
    });

    return interruptionResponse;
  }

  // Generate follow-up prompt for ongoing tasks
  private generateFollowUpPrompt(conversation: ConversationState): string {
    const data = conversation.collectedData;
    
    switch (conversation.intent) {
      case 'CREATE_STOP_ORDER':
        return this.generateStopOrderFollowUp(conversation);
        
      case 'CREATE_AAVE_PROTECTION':
        return "🏦 **Back to your Aave protection setup** - should we continue configuring your automated liquidation protection?";
        
      case 'CREATE_FEE_COLLECTOR':
        return "💡 **Back to your fee collector setup** - should we continue configuring your automated fee collection?";
        
      case 'CREATE_RANGE_MANAGER':
        return "💡 **Back to your range manager setup** - should we continue configuring your position range optimization?";
        
      default:
        return "";
    }
  }

  // Generate specific follow-up for stop order
  private generateStopOrderFollowUp(conversation: ConversationState): string {
    const data = conversation.collectedData;
    const missingData = this.identifyMissingStopOrderData(conversation);
    
    if (missingData.length === 0) {
      return "💡 **Back to your stop order** - Your configuration looks complete! Ready to deploy your automated protection?";
    }

    const nextMissing = missingData[0];
    
    switch (nextMissing) {
      case 'tokenToSell':
        return "💡 **Back to your stop order** - Which token would you like to protect with automated selling?";
        
      case 'tokenToBuy':
        return `💡 **Back to your stop order** - You want to protect your ${data.tokenToSell}. Which token should you receive when it sells?`;
        
      case 'amount':
        return `💡 **Back to your stop order** - How much ${data.tokenToSell} would you like to protect?`;
        
      case 'dropPercentage':
        return "💡 **Back to your stop order** - At what percentage drop should the stop order trigger?";
        
      case 'network':
        return "💡 **Back to your stop order** - Which network would you like to use for your automation?";
        
      default:
        return "💡 **Back to your stop order** - Let's continue setting up your automated protection!";
    }
  }

  // Check if message is a task continuation
  private isTaskContinuation(message: string, conversation: ConversationState): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    const continuationWords = [
      'yes', 'no', 'ok', 'okay', 'sure', 'continue', 'next', 'proceed',
      'all', 'half', 'everything', 'custom'
    ];
    
    if (continuationWords.includes(lowerMessage)) {
      return true;
    }
    
    if (conversation.currentStep === 'dropPercentage' && /\d+/.test(message)) {
      return true;
    }
    
    if (conversation.currentStep === 'amount' && (/\d+/.test(message) || lowerMessage.includes('all') || lowerMessage.includes('half'))) {
      return true;
    }
    
    if ((conversation.currentStep === 'tokenToSell' || conversation.currentStep === 'tokenToBuy') &&  
        /\b(ETH|USDC|USDT|DAI|WBTC|AVAX)\b/i.test(message)) {
      return true;
    }
    
    return false;
  }

  // Continue with ongoing task
  private async continueOngoingTask(conversation: ConversationState, context: MessageContext) {
    console.log('Continuing ongoing task:', conversation.intent);
    
    switch (conversation.intent) {
      case 'CREATE_STOP_ORDER':
        await this.fetchRealBlockchainData(conversation);
        return await this.handleStopOrderFlow(conversation, context);
        
      case 'CREATE_AAVE_PROTECTION':
        return await this.handleAaveProtectionFlow(conversation, context);
        
      case 'CREATE_FEE_COLLECTOR':
        const feeCollectorInfo = KnowledgeBaseHelper.getAutomationInfo('FEE_COLLECTOR');
        return {
          message: `🚧 **Fee Collector Automation - Coming Soon!**\n\n**What it will do:**\n${feeCollectorInfo?.description}\n\n**Key Features:**\n${feeCollectorInfo?.features.map(f => `• ${f}`).join('\n')}\n\n**This will automatically harvest your Uniswap V3 fees and can even compound them back into your positions for maximum efficiency!**\n\nStay tuned for updates! In the meantime, would you like to create a stop order to protect your investments?`,
          intent: 'CREATE_FEE_COLLECTOR' as const,
          needsUserInput: false,
          nextStep: 'coming soon',
          options: [
            { value: 'create stop order', label: '🛡️ Create Stop Order Instead' },
            { value: 'notify me', label: '🔔 Notify Me When Ready' },
            { value: 'learn more', label: '📚 Learn More About RSCs' }
          ]
        };
        
      case 'CREATE_RANGE_MANAGER':
        const rangeManagerInfo = KnowledgeBaseHelper.getAutomationInfo('RANGE_MANAGER');
        return {
          message: `🚧 **Range Manager Automation - Coming Soon!**\n\n**What it will do:**\n${rangeManagerInfo?.description}\n\n**Key Features:**\n${rangeManagerInfo?.features.map(f => `• ${f}`).join('\n')}\n\n**This will automatically adjust your Uniswap V3 position ranges based on market conditions to maximize your fee earnings!**\n\nStay tuned for updates! In the meantime, would you like to create a stop order to protect your investments?`,
          intent: 'CREATE_RANGE_MANAGER' as const,
          needsUserInput: false,
          nextStep: 'coming soon',
          options: [
            { value: 'create stop order', label: '🛡️ Create Stop Order Instead' },
            { value: 'tell me about Reactive smart contracts', label: '📚 Learn More About RSCs' }
          ]
        };
        
      default:
        return this.generateFallbackResponse(context, conversation);
    }
  }

  // Helper methods for intent classification
  private isBalanceQuery(message: string): boolean {
    const balanceKeywords = [
      'balance', 'how much', 'how many', 'my tokens', 'my eth', 'my usdc',  
      'my avax', 'check wallet', 'wallet balance', 'token balance'
    ];
    return balanceKeywords.some(keyword => message.includes(keyword));
  }

  private isPairQuery(message: string): boolean {
    const pairKeywords = [
      'pair', 'find pair', 'trading pair', 'liquidity pool', 'swap pair'
    ];
    return pairKeywords.some(keyword => message.includes(keyword)) &&  
           !message.includes('explain') && !message.includes('what is');
  }

  private isPriceQuery(message: string): boolean {
    const priceKeywords = [
      'price', 'current price', 'how much is', 'cost of', 'value of', 'price of'
    ];
    return priceKeywords.some(keyword => message.includes(keyword));
  }

  private isBlockchainQuery(message: string): boolean {
    return message.includes('check my') ||  
           message.includes('show me') ||
           (message.includes('get') && (message.includes('data') || message.includes('info')));
  }

  private isEducationalQuestion(message: string): boolean {
    const questionKeywords = [
      'what is', 'how does', 'explain', 'tell me about', 'help me understand',
      'why', 'when', 'where', 'who'
    ];
    return questionKeywords.some(keyword => message.includes(keyword)) ||  
           message.includes('?') ||
           message.includes('learn about');
  }

  private extractInitialEntities(message: string, conversation: ConversationState) {
    const { collectedData } = conversation;
    const lowerMessage = message.toLowerCase();
    
    // Broad token extraction
    const tokens = this.extractAllTokens(message);
    if (tokens.length > 0) {
        const roles = this.parseTokenRolesFromSentence(lowerMessage, tokens);
        if (roles.sellToken) collectedData.tokenToSell = roles.sellToken;
        if (roles.buyToken) collectedData.tokenToBuy = roles.buyToken;
        // Fallback if roles are unclear
        if (!collectedData.tokenToSell) collectedData.tokenToSell = tokens[0];
        if (!collectedData.tokenToBuy && tokens.length > 1) collectedData.tokenToBuy = tokens[1];
    }

    // Broad percentage extraction
    const percentageMatch = lowerMessage.match(/\b(\d+(?:\.\d+)?)\s*%/);
    if (percentageMatch) {
        collectedData.dropPercentage = parseFloat(percentageMatch[1]);
    }

    // Broad amount extraction
    if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
        collectedData.amount = 'all';
    } else if (lowerMessage.includes('half')) {
        collectedData.amount = '50%';
    }
  }

  private extractFocusedEntity(message: string, conversation: ConversationState) {
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
                    console.log(`Set ${currentStep} (symbol): ${token}`);
                }
            }
            break;

        case 'amount':
            if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
                collectedData.amount = 'all';
                console.log('Set amount (focused): all');
            } else if (lowerMessage.includes('half') || lowerMessage.includes('50%')) {
                collectedData.amount = '50%';
                console.log('Set amount (focused): 50%');
            } else {
                const amountMatch = message.match(/\b(\d+(?:\.\d+)?)/);
                if (amountMatch) {
                    collectedData.amount = amountMatch[1];
                    console.log(`Set amount (focused): ${amountMatch[1]}`);
                }
            }
            break;

        case 'dropPercentage':
            const percentageMatch = message.match(/\b(\d+(?:\.\d+)?)/);
            if (percentageMatch) {
                collectedData.dropPercentage = parseFloat(percentageMatch[1]);
                console.log(`Set dropPercentage (focused): ${percentageMatch[1]}`);
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
            if(collectedData.selectedNetwork) {
              console.log(`Set network (focused): ${collectedData.selectedNetwork}`);
            }
            break;
    }
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
    
    // Pattern 3: "buy [B] with [A]" or "purchase [B] using [A]"
    const buyWithPattern = /\b(?:buy|buying|purchase|purchasing)\s+(\w+)\s+(?:with|using)\s+(\w+)\b/i;
    const buyWithMatch = lowerMessage.match(buyWithPattern);
    if (buyWithMatch) {
      const potentialBuy = buyWithMatch[1].toUpperCase();
      const potentialSell = buyWithMatch[2].toUpperCase();
      
      const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
      const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
      
      if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
        console.log('Found buy-with pattern:', { sell: normalizedSell, buy: normalizedBuy });
        return { sellToken: normalizedSell, buyToken: normalizedBuy };
      }
    }
    
    // Pattern 4: "convert [A] to [B]" or "exchange [A] for [B]"
    const convertToPattern = /\b(?:convert|converting|exchange|exchanging)\s+(\w+)\s+(?:to|for|into)\s+(\w+)\b/i;
    const convertToMatch = lowerMessage.match(convertToPattern);
    if (convertToMatch) {
      const potentialSell = convertToMatch[1].toUpperCase();
      const potentialBuy = convertToMatch[2].toUpperCase();
      
      const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
      const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
      
      if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
        console.log('Found convert-to pattern:', { sell: normalizedSell, buy: normalizedBuy });
        return { sellToken: normalizedSell, buyToken: normalizedBuy };
      }
    }
    
    // Pattern 5: Contextual patterns like "stop order for [A] to [B]" or "[A] to [B] stop order"
    const stopOrderPattern = /\b(?:stop\s+order|order)\s+(?:for|to\s+sell|to\s+trade)?\s*(\w+)\s+(?:to|for|into)\s+(\w+)\b/i;
    const stopOrderMatch = lowerMessage.match(stopOrderPattern);
    if (stopOrderMatch) {
      const potentialSell = stopOrderMatch[1].toUpperCase();
      const potentialBuy = stopOrderMatch[2].toUpperCase();
      
      const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
      const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
      
      if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
        console.log('Found stop-order pattern:', { sell: normalizedSell, buy: normalizedBuy });
        return { sellToken: normalizedSell, buyToken: normalizedBuy };
      }
    }
    
    // Pattern 6: "[A] for [B]" in stop order context
    if (lowerMessage.includes('stop') || lowerMessage.includes('protect') || lowerMessage.includes('sell')) {
      const tokenForPattern = /\b(\w+)\s+for\s+(\w+)\b/i;
      const tokenForMatch = lowerMessage.match(tokenForPattern);
      if (tokenForMatch) {
        const potentialSell = tokenForMatch[1].toUpperCase();
        const potentialBuy = tokenForMatch[2].toUpperCase();
        
        const normalizedSell = potentialSell === 'ETHEREUM' ? 'ETH' : (potentialSell === 'AVALANCHE' ? 'AVAX' : potentialSell);
        const normalizedBuy = potentialBuy === 'ETHEREUM' ? 'ETH' : (potentialBuy === 'AVALANCHE' ? 'AVAX' : potentialBuy);
        
        if (tokens.includes(normalizedSell) && tokens.includes(normalizedBuy)) {
          console.log('Found for pattern in stop context:', { sell: normalizedSell, buy: normalizedBuy });
          return { sellToken: normalizedSell, buyToken: normalizedBuy };
        }
      }
    }
    
    console.log('No clear pattern found, tokens will be assigned based on context');
    return {};
  }

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

  private isConfirmingAction(message: string): boolean {
    const confirmationWords = [
      'yes', 'yep', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right',
      'deploy', 'create', 'go ahead', 'proceed', 'continue', 'do it'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return confirmationWords.some(word => lowerMessage.includes(word));
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

  private async fetchRealBlockchainData(conversation: ConversationState) {
    const data = conversation.collectedData;
    
    try {
      // Fetch user balance first
      if (data.connectedWallet && data.tokenToSell && data.selectedNetwork && !data.userBalance) {
        try {
          console.log(`🏦 Fetching ${data.tokenToSell} balance for validation...`);
          const balance = await this.blockchainService.getTokenBalanceEnhanced(
            data.connectedWallet,
            data.tokenToSell,
            data.selectedNetwork,
            data.customTokenAddresses
          );
          data.userBalance = balance;
          console.log(`✅ Balance fetched: ${balance} ${data.tokenToSell}`);
        } catch (error) {
          console.error('❌ Error fetching user balance:', error);
          data.userBalance = '0';
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
          
          if (pairAddress) {
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
            } catch (priceError) {
              console.error('❌ Error fetching price:', priceError);
            }
          } else {
            console.error(`❌ No trading pair found for ${data.tokenToSell}/${data.tokenToBuy}`);
          }
        } catch (error) {
          console.error('❌ Error fetching pair data:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error in fetchRealBlockchainData:', error);
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

  private async handleEnhancedEducationalQuestions(conversation: ConversationState, context: MessageContext) {
    const lowerMessage = context.message.toLowerCase();

    // Check enhanced knowledge base search
    const knowledgeResult = KnowledgeBaseHelper.enhancedSearch(context.message);
    if (knowledgeResult) {
      return {
        message: knowledgeResult.answer,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: `knowledge_${knowledgeResult.source}`,
        options: this.generateRelatedTopicOptions(context.message)
      };
    }

    // Check for specific REACTOR automation questions
    if (KnowledgeBaseHelper.isQuestionAboutAutomation(lowerMessage)) {
      const automationAnswer = KnowledgeBaseHelper.getAutomationAnswer(lowerMessage);
      if (automationAnswer) {
        return {
          message: automationAnswer.answer,
          intent: 'ANSWER_QUESTION' as const,
          needsUserInput: false,
          nextStep: 'automation_explained',
          options: automationAnswer.relatedTopics.map(topic => ({
            value: topic.toLowerCase().replace(/\s+/g, '_'),
            label: topic
          }))
        };
      }
    }

    // Check for platform capabilities questions
    if (KnowledgeBaseHelper.isAskingAboutCapabilities(lowerMessage)) {
      return {
        message: KnowledgeBaseHelper.getHelpMenuResponse(),
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'capabilities_shown',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'what is reactor', label: '📚 Learn About REACTOR' },
          { value: 'check my balance', label: '💰 Check Balances' },
          { value: 'list of coming soon features', label: '🚀 Coming Soon Features' }
        ]
      };
    }

    // Check for Reactive Network questions
    if (KnowledgeBaseHelper.isQuestionAboutReactiveNetwork(context.message)) {
      const reactiveInfo = KnowledgeBaseHelper.getReactiveNetworkInfo();
      return {
        message: `**Reactive Network** is the blockchain that powers REACTOR's automation! 🌐\n\n**Key Facts:**\n• **Chain ID**: ${reactiveInfo.chainId}\n• **Currency**: ${reactiveInfo.currency}\n• **Purpose**: Monitors events 24/7 and triggers cross-chain automations\n• **Gas Token**: ${reactiveInfo.currency} (needed for RSC deployment)\n\n**How it works:**\nYour RSC lives on the Reactive Network, watching for events on other chains. When conditions are met, it sends callbacks to execute actions on destination chains.\n\n**Cost**: ~${reactiveInfo.gasPrice} ${reactiveInfo.currency} to deploy an RSC\n\n💡 Think of it as the "brain" that coordinates all your automations across different blockchains!`,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'reactive_network_explained',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'what are rscs', label: '🧠 Learn About RSCs' },
          { value: 'how to get react tokens', label: '💰 Get REACT Tokens' }
        ]
      };
    }

    // Check for cost/pricing questions
    if (KnowledgeBaseHelper.isQuestionAboutCosts(context.message)) {
      const stopOrderInfo = KnowledgeBaseHelper.getAutomationInfo('STOP_ORDER');
      return {
        message: `💰 **REACTOR Automation Costs**\n\n**Stop Orders:**\n${stopOrderInfo?.costEstimate || 'Contact support for pricing'}\n\n**Cost Breakdown:**\n• **Destination Contract**: Deployment on your chosen network (ETH/AVAX)\n• **RSC Contract**: Deployment on Reactive Network for monitoring\n• **One-time setup**: No recurring fees!\n\n**Network Costs Vary:**\n• Ethereum: Higher gas fees (~0.03 ETH)\n• Avalanche: Lower fees (~0.01 AVAX)\n• Testnets: Minimal costs for testing\n\n💡 **Pro Tip**: Once deployed, your automation runs forever with no additional fees!`,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'costs_explained',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' },
          { value: 'compare networks', label: '🌐 Compare Networks' },
          { value: 'calculate my costs', label: '🧮 Calculate My Costs' }
        ]
      };
    }

    // Try Gemini API for complex questions
    try {
      const aiResponse = await this.callGeminiAPI(conversation, context);
      return {
        message: aiResponse,
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'gemini_response',
        options: [
          { value: 'create stop order', label: '🛡️ Create Stop Order' }
        ]
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return this.getKnowledgeBaseFallback(context.message);
    }
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
        message: "💰 Which token balance would you like to check?\n\n**Supported tokens**: ETH, USDC, USDT, DAI, WBTC, LINK\n\n**Custom tokens**: Provide the contract address (0x...)\n\n**Example**: \"Check balance of 0x1234...\" or \"How much USDC do I have?\"",
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

  // Helper methods for stop order intent detection
  private isStopOrderIntent(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
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
        pausedStopOrderState: undefined,
        nextStep: ''
      });
    }
    console.log("conersationID:",conversationId)
    const conversation = this.conversations.get(conversationId)!;
    conversation.lastUpdated = Date.now();
    
    return conversation;
  }

  private generateFallbackResponse(context: MessageContext, conversation: ConversationState) {
    const lowerMessage = context.message.toLowerCase();
    
    // Check if this might be an automation question we should handle
    if (KnowledgeBaseHelper.isQuestionAboutAutomation(lowerMessage)) {
      const automationAnswer = KnowledgeBaseHelper.getAutomationAnswer(lowerMessage);
      if (automationAnswer) {
        return {
          message: automationAnswer.answer,
          intent: 'ANSWER_QUESTION' as const,
          needsUserInput: false,
          nextStep: 'automation_fallback'
        };
      }
    }
    
    // Check if asking about capabilities
    if (KnowledgeBaseHelper.isAskingAboutCapabilities(lowerMessage)) {
      return {
        message: KnowledgeBaseHelper.getHelpMenuResponse(),
        intent: 'ANSWER_QUESTION' as const,
        needsUserInput: false,
        nextStep: 'help_menu'
      };
    }
    
    // Default fallback with better guidance
    return {
      message: "🤔 I'm not quite sure how to help with that specific request, but I'm here to assist you with REACTOR's DeFi automation platform!\n\nI can help you:\n• **Learn** about Reactor and RSCs\n• **Create stop orders** to protect your investments  \n• **Set up Aave protection** to prevent liquidation\n• **Check balances** and find trading pairs\n• **Answer questions** about DeFi automation\n• **Explain coming soon features** like Fee Collectors and Range Managers\n\nWhat would you like to know? 🚀",
      intent: 'ANSWER_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'fallback_mode',
      options: [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'aave protection', label: '🏦 Aave Protection' },
        { value: 'learn about reactor', label: '📚 Learn About REACTOR' },
        { value: 'check my balance', label: '💰 Check My Balance' }
      ]
    };
  }

  private generateRelatedTopicOptions(message: string): Array<{value: string, label: string}> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('aave') || lowerMessage.includes('liquidation') || lowerMessage.includes('health factor')) {
      return [
        { value: 'create aave protection', label: '🏦 Create Aave Protection' },
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'tell me about health factor', label: '🔍 What is Health Factor?' },
        { value: 'tell me about liquidation', label: '⚠️ What is Liquidation?' }
      ];
    }
    
    if (lowerMessage.includes('fee collector')) {
      return [
        { value: 'tell me about range manager', label: '📊 Range Managers' },
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'tell me about uniswap v3', label: '🦄 Uniswap V3 Info' }
      ];
    }
    
    if (lowerMessage.includes('range manager')) {
      return [
        { value: 'fee collector', label: '🔧 Fee Collectors' },
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'tell me about uniswap v3', label: '🦄 Uniswap V3 Info' }
      ];
    }
    
    if (lowerMessage.includes('reactor') || lowerMessage.includes('platform')) {
      return [
        { value: 'create stop order', label: '🛡️ Create Stop Order' },
        { value: 'aave protection', label: '🏦 Aave Protection' },
        { value: 'tell me about reactive smart contracts', label: '🧠 Learn About RSCs' },
        { value: 'list of coming soon features', label: '🚀 Coming Soon Features' }
      ];
    }
    
    // Default options
    return [
      { value: 'create stop order', label: '🛡️ Create Stop Order' },
      { value: 'aave protection', label: '🏦 Aave Protection' },
      { value: 'tell me about working of Reactor', label: '📚 Learn More' }
    ];
  }

  private generateErrorResponse(error: any, conversation: ConversationState) {
    return {
      message: `❌ **Oops!** I encountered an issue processing your request.\n\n**Error**: ${error.message || 'Unknown error'}\n\nLet's try again! I can help you with:\n• Creating stop orders\n• Setting up Aave protection\n• Learning about Reactor\n• Checking token balances\n• Finding trading pairs\n\nWhat would you like to do? 🔄`,
      intent: 'ANSWER_QUESTION' as const,
      needsUserInput: false,
      nextStep: 'error_recovery'
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
1. If this is a question about Reactor, RSCs, DeFi automation, or technical concepts, provide a comprehensive, engaging, and educational response
2. Use emojis and clear formatting to make responses more engaging
3. Include practical examples when explaining concepts
4. If this relates to stop orders but isn't a creation request, explain thoroughly with examples
5. If this relates to Aave protection, explain liquidation protection concepts with examples
6. Be helpful, educational, and enthusiastic about the technology
7. Include actionable next steps when appropriate

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

    if (conversation.intent === 'CREATE_AAVE_PROTECTION') {
      contextStr += `- Creating Aave protection\n`;
      if (data.protectionType) contextStr += `- Protection type: ${data.protectionType}\n`;
      if (data.healthFactorThreshold) contextStr += `- Health factor threshold: ${data.healthFactorThreshold}\n`;
      if (data.targetHealthFactor) contextStr += `- Target health factor: ${data.targetHealthFactor}\n`;
      if (data.collateralAsset) contextStr += `- Collateral asset: ${data.collateralAsset}\n`;
      if (data.debtAsset) contextStr += `- Debt asset: ${data.debtAsset}\n`;
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

  private getKnowledgeBaseFallback(message: string) {
    return {
      message: `🤖 I'm here to help you with REACTOR's DeFi automation platform! I can assist you with:

**📚 Learning:**
• Understanding Reactive Smart Contracts (RSCs)
• How DeFi automation works
• REACTOR platform features and capabilities

**🛠️ Creating Automations:**
• **Stop Orders** - Protect investments from price drops ✅
• **Aave Protection** - Guard against liquidation ✅
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
• "Protect my Aave position"
• "Explain stop orders"

What would you like to know or do? 🚀`,
      intent: 'ANSWER_QUESTION',
      needsUserInput: false,
      nextStep: 'awaiting_query'
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

  // Add method to validate if BlockchainService has enhanced methods
  private validateEnhancedBlockchainService(): void {
    const requiredMethods = [
      'getTokenBalanceEnhanced',
      'findPairAddressEnhanced',  
      'getCurrentPriceEnhanced',
      'validateTokenAddress',
      'getTokenInfo',
      'isToken0Enhanced'
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
}