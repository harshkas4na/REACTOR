import { Request, Response } from 'express';
import { z } from 'zod';
import { AIAgent } from '../services/AIAgent';
import { BlockchainService, EnhancedBlockchainService } from '../services/BlockchainService';
import { ValidationService } from '../services/ValidationService';
// import { ConversationUtils } from '../services/ConversationUtils';

// Request validation schema
const aiAutomationRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
  connectedWallet: z.string().optional(),
  currentNetwork: z.number().optional()
});

// Response types
export interface AIAutomationResponse {
  message: string;
  intent: 'CREATE_STOP_ORDER' | 'ANSWER_QUESTION' | 'CREATE_FEE_COLLECTOR' | 'CREATE_RANGE_MANAGER' | 'BLOCKCHAIN_QUERY' | 'UNKNOWN';
  needsUserInput: boolean;
  inputType?: 'amount' | 'token' | 'network' | 'confirmation';
  options?: Array<{ value: string; label: string }>;
  automationConfig?: any;
  nextStep?: string;
  collectedData?: any;
  metadata?: any; // For storing additional context
}

// Singleton instances
let aiAgent: AIAgent;
let blockchainService: EnhancedBlockchainService;
let validationService: ValidationService;

// Initialize services
function initializeServices() {
  if (!blockchainService) {
    blockchainService = new EnhancedBlockchainService();
  }
  if (!validationService) {
    validationService = new ValidationService();
  }
  if (!aiAgent && blockchainService && validationService) {
    aiAgent = new AIAgent(blockchainService, validationService);
  }
}

export async function handleAIAutomation(req: Request, res: Response) {
  try {
    // Initialize services if not already done
    initializeServices();
    
    // Validate request
    const validationResult = aiAutomationRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      });
    }
    
    const { message, conversationId, connectedWallet, currentNetwork } = validationResult.data;
    
    // Generate conversation ID if not provided
    const convId = conversationId || generateConversationId();
    
    // Validate message content
    const messageValidation = validationService.validateConversationMessage(message);
    if (!messageValidation.isValid) {
      return res.status(400).json({
        error: messageValidation.error,
        warnings: messageValidation.warnings
      });
    }
    
    console.log(`Processing AI automation request: ${convId}`);
    console.log(`Message: ${message}`);
    console.log(`Wallet: ${connectedWallet || 'Not connected'}`);
    console.log(`Network: ${currentNetwork || 'Not selected'}`);
    
    // Process message through AI agent
    const response = await aiAgent.processMessage({
      message: messageValidation.sanitizedValue || message,
      conversationId: convId,
      connectedWallet,
      currentNetwork
    });
    
    // Add conversation ID to response
    const enhancedResponse = {
      ...response,
      conversationId: convId
    };
    
    // Log response for debugging
    console.log(`AI Response:`, {
      intent: enhancedResponse.intent,
      needsInput: enhancedResponse.needsUserInput,
      nextStep: enhancedResponse.nextStep
    });
    
    res.json(enhancedResponse);
    
  } catch (error: any) {
    console.error('AI Automation Error:', error);
    
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error.message || 'An unexpected error occurred',
      conversationId: req.body.conversationId || generateConversationId()
    });
  }
}

// Health check endpoint
export async function handleAIHealth(req: Request, res: Response) {
  try {
    initializeServices();
    
    // Check if services are initialized
    const health = {
      status: 'healthy',
      services: {
        aiAgent: !!aiAgent,
        blockchainService: !!blockchainService,
        validationService: !!validationService
      },
      conversationCount: aiAgent ? aiAgent.getConversationCount() : 0,
      timestamp: new Date().toISOString()
    };
    
    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

// Get supported features
export async function handleAIFeatures(req: Request, res: Response) {
  try {
    initializeServices();
    
    const features = {
      automations: [
        {
          type: 'STOP_ORDER',
          name: 'Stop Orders',
          description: 'Automatically sell tokens when price drops',
          status: 'active',
          supportedNetworks: [1, 11155111, 43114]
        },
        {
          type: 'FEE_COLLECTOR',
          name: 'Fee Collectors',
          description: 'Auto-collect Uniswap V3 fees',
          status: 'coming_soon',
          supportedNetworks: [1, 43114]
        },
        {
          type: 'RANGE_MANAGER',
          name: 'Range Managers',
          description: 'Optimize Uniswap V3 ranges',
          status: 'coming_soon',
          supportedNetworks: [1, 43114]
        }
      ],
      capabilities: [
        'Natural language processing',
        'Multi-chain support',
        'Real-time blockchain data',
        'Conversation memory',
        'Educational responses'
      ],
      supportedTokens: {
        1: blockchainService.getSupportedTokens(1),
        11155111: blockchainService.getSupportedTokens(11155111),
        43114: blockchainService.getSupportedTokens(43114)
      }
    };
    
    res.json(features);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get features',
      message: error.message
    });
  }
}

// Clear conversation endpoint
export async function handleClearConversation(req: Request, res: Response) {
  try {
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required'
      });
    }
    
    // In a real implementation, you might want to clear specific conversation
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Conversation cleared',
      conversationId
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to clear conversation',
      message: error.message
    });
  }
}

// Utility function to generate conversation ID
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Cleanup old conversations periodically
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    if (aiAgent) {
      aiAgent.cleanupOldConversations();
      console.log('Cleaned up old AI conversations');
    }
  }, 30 * 60 * 1000); // Every 30 minutes
}

// Export handler functions
export default {
  handleAIAutomation,
  handleAIHealth,
  handleAIFeatures,
  handleClearConversation
};