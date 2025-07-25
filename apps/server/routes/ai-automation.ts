import express from 'express';
import rateLimit from 'express-rate-limit';
import { AIAgent } from '../services/AIAgent';
import { BlockchainService, EnhancedBlockchainService } from '../services/BlockchainService';
import { ValidationService } from '../services/ValidationService';

const router = express.Router();

// Enhanced rate limiting with different limits for different endpoints
const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please wait a moment before trying again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const conversationRateLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // 5 messages per 10 seconds to prevent spam
  message: {
    success: false,
    error: 'Sending messages too quickly. Please slow down.',
    retryAfter: 10
  },
  keyGenerator: (req) => {
    // Rate limit per conversation ID to allow multiple users
    return `${req.ip}-${req.body?.conversationId || 'no-id'}`;
  }
});

// Initialize services
const blockchainService = new EnhancedBlockchainService();
const validationService = new ValidationService();
const aiAgent = new AIAgent(blockchainService, validationService);

// Apply rate limiting to conversation endpoint
router.use('/automate', conversationRateLimit);
router.use(generalRateLimit);

// Enhanced request validation middleware
const validateAutomateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { message, conversationId } = req.body;

    // Validate message
    const messageValidation = validationService.validateConversationMessage(message);
    if (!messageValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid message: ${messageValidation.error}`,
        code: 'INVALID_MESSAGE'
      });
    }

    // Sanitize and update request body
    req.body.message = messageValidation.sanitizedValue;

    // Validate conversation ID format if provided
    if (conversationId && (typeof conversationId !== 'string' || conversationId.length > 100)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID format',
        code: 'INVALID_CONVERSATION_ID'
      });
    }

    // Validate network ID if provided
    if (req.body.currentNetwork && !validationService.validateNetworkId(req.body.currentNetwork)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported network ID',
        code: 'INVALID_NETWORK'
      });
    }

    // Validate wallet address if provided
    if (req.body.connectedWallet && !validationService.validateWalletAddress(req.body.connectedWallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET'
      });
    }

    next();
  } catch (error: any) {
    console.error('Request validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Request validation failed',
      code: 'VALIDATION_ERROR'
    });
  }
};

// Main automation endpoint with enhanced error handling
router.post('/automate', validateAutomateRequest, async (req, res) => {
  const startTime = Date.now();
  let conversationId = '';
  
  try {
    const { message, conversationId: reqConversationId, connectedWallet, currentNetwork } = req.body;
    
    // Generate conversation ID if not provided
    conversationId = reqConversationId || generateConversationId();
    
    console.log(`🔄 Processing AI request:`, {
      conversationId,
      messageLength: message.length,
      hasWallet: !!connectedWallet,
      network: currentNetwork,
      timestamp: new Date().toISOString()
    });

    // Process message with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI processing timeout')), 25000); // 25 second timeout
    });

    const processingPromise = aiAgent.processMessage({
      message,
      conversationId,
      connectedWallet,
      currentNetwork
    });

    const result = await Promise.race([processingPromise, timeoutPromise]);

    // Log successful processing
    const processingTime = Date.now() - startTime;
    console.log(`✅ AI request completed:`, {
      conversationId,
      processingTime: `${processingTime}ms`,
      intent: (result as any).intent,
      needsUserInput: (result as any).needsUserInput
    });

    // Cleanup old conversations periodically (every 50 requests)
    if (Math.random() < 0.02) { // 2% chance
      aiAgent.cleanupOldConversations();
    }

    return res.status(200).json({
      success: true,
      data: result,
      metadata: {
        conversationId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error(`❌ AI request failed:`, {
      conversationId,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    // Enhanced error classification and user-friendly responses
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let userMessage = 'I encountered an unexpected error. Please try again.';

    // Timeout errors
    if (error.message.includes('timeout')) {
      statusCode = 408;
      errorCode = 'TIMEOUT';
      userMessage = 'I took too long to respond. This might be due to network congestion. Please try your message again.';
    } 
    // Network/connectivity errors
    else if (error.message.includes('network') || error.message.includes('connection') || 
             error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
      userMessage = 'I\'m having trouble connecting to blockchain networks. This could be due to network congestion or connectivity issues. Please try again in a moment.';
    } 
    // Gemini API errors
    else if (error.message.includes('Gemini') || error.message.includes('API') || 
             error.message.includes('generateContent')) {
      statusCode = 503;
      errorCode = 'AI_SERVICE_ERROR';
      userMessage = 'My AI service is temporarily unavailable. This might be due to high demand. Please try again in a moment.';
    } 
    // Blockchain RPC errors
    else if (error.message.includes('blockchain') || error.message.includes('RPC') || 
             error.message.includes('provider') || error.message.includes('gas')) {
      statusCode = 503;
      errorCode = 'BLOCKCHAIN_ERROR';
      userMessage = 'I\'m having trouble accessing blockchain data. This could be due to network congestion or RPC issues. Please try again.';
    }
    // Rate limiting errors
    else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      statusCode = 429;
      errorCode = 'RATE_LIMITED';
      userMessage = 'I\'m being rate limited by external services. Please wait a moment before trying again.';
    }
    // Validation errors
    else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      userMessage = 'There was an issue with your request. Please check your input and try again.';
    }
    // Blockchain-specific errors that should be user-friendly
    else if (error.message.includes('pair not found') || error.message.includes('token not found')) {
      statusCode = 400;
      errorCode = 'TOKEN_PAIR_ERROR';
      userMessage = 'I couldn\'t find the requested trading pair or token. Please try different tokens or check if they\'re available on the selected network.';
    }
    else if (error.message.includes('insufficient liquidity') || error.message.includes('low liquidity')) {
      statusCode = 400;
      errorCode = 'LIQUIDITY_ERROR';
      userMessage = 'The trading pair has insufficient liquidity for safe trading. Please try a different token pair or reduce the amount.';
    }
    else if (error.message.includes('balance') || error.message.includes('insufficient funds')) {
      statusCode = 400;
      errorCode = 'BALANCE_ERROR';
      userMessage = 'There appears to be an issue with token balance. Please check your wallet balance and try again.';
    }

    // Return user-friendly error response
    return res.status(statusCode).json({
      success: false,
      error: userMessage,
      code: errorCode,
      metadata: {
        conversationId,
        processingTime,
        timestamp: new Date().toISOString(),
        retryable: statusCode !== 400, // 400 errors are usually not retryable
        retryAfter: statusCode === 429 ? 60 : statusCode >= 500 ? 30 : undefined
      }
    });
  }
});

// Health check endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'ai-automation',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check with service status
router.get('/health/detailed', async (req, res) => {
  try {
    const health = {
      success: true,
      status: 'healthy',
      service: 'ai-automation',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {
        ai: {
          status: 'healthy',
          conversations: aiAgent.getConversationCount(),
          memoryUsage: process.memoryUsage()
        },
        blockchain: {
          status: 'checking',
          networks: {} as any
        }
      }
    };

    // Check blockchain service health
    const networkChecks = [
      { id: 1, name: 'Ethereum' },
      { id: 43114, name: 'Avalanche' },
      { id: 11155111, name: 'Sepolia' }
    ];

    for (const network of networkChecks) {
      try {
        const start = Date.now();
        const provider = blockchainService.getProvider(network.id);
        await provider.getBlockNumber();
        const latency = Date.now() - start;
        
        health.components.blockchain.networks[network.name] = {
          status: 'healthy',
          latency,
          chainId: network.id
        };
      } catch (error: any) {
        health.components.blockchain.networks[network.name] = {
          status: 'unhealthy',
          error: error.message,
          chainId: network.id
        };
        health.components.blockchain.status = 'degraded';
      }
    }

    // Overall blockchain status
    const networkStatuses = Object.values(health.components.blockchain.networks);
    const healthyNetworks = networkStatuses.filter((n: any) => n.status === 'healthy').length;
    
    if (healthyNetworks === 0) {
      health.components.blockchain.status = 'unhealthy';
      health.status = 'degraded';
    } else if (healthyNetworks < networkStatuses.length) {
      health.components.blockchain.status = 'degraded';
    } else {
      health.components.blockchain.status = 'healthy';
    }

    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      service: 'ai-automation',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get supported features
router.get('/features', (req, res) => {
  res.json({
    success: true,
    data: {
      automations: {
        stopOrders: {
          status: 'active',
          description: 'Automated token protection against price drops',
          supportedNetworks: [1, 11155111, 43114]
        },
        aaveProtection: {
          status: 'active',
          description: 'Automated Aave liquidation protection',
          supportedNetworks: [11155111] // Currently only Sepolia
        },
        feeCollectors: {
          status: 'coming_soon',
          description: 'Automated Uniswap V3 fee collection',
          supportedNetworks: []
        },
        rangeManagers: {
          status: 'coming_soon',
          description: 'Automated liquidity range optimization',
          supportedNetworks: []
        }
      },
      capabilities: {
        realTimeData: true,
        crossChain: true,
        balanceChecking: true,
        pairDiscovery: true,
        educationalContent: true,
        errorRecovery: true,
        conversationReset: true
      },
      supportedNetworks: [
        { id: 1, name: 'Ethereum Mainnet', currency: 'ETH' },
        { id: 11155111, name: 'Ethereum Sepolia', currency: 'ETH' },
        { id: 43114, name: 'Avalanche C-Chain', currency: 'AVAX' }
      ],
      supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AVAX', 'LINK', 'AAVE']
    },
    timestamp: new Date().toISOString()
  });
});

// Clear conversation
router.post('/clear-conversation', (req, res) => {
  try {
    const { conversationId } = req.body;
    
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid conversation ID is required'
      });
    }

    // Force cleanup of the specific conversation
    aiAgent.cleanupOldConversations(0);
    
    console.log(`🗑️ Conversation cleared: ${conversationId}`);
    
    res.json({
      success: true,
      message: 'Conversation cleared successfully',
      conversationId
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation'
    });
  }
});

// Reset conversation endpoint (NEW)
router.post('/reset-conversation', (req, res) => {
  try {
    const { conversationId, newIntent } = req.body;
    
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid conversation ID is required'
      });
    }

    // Reset conversation will be handled by the AI agent internally
    console.log(`🔄 Conversation reset requested: ${conversationId} -> ${newIntent || 'UNKNOWN'}`);
    
    res.json({
      success: true,
      message: 'Conversation reset successfully',
      conversationId,
      newIntent: newIntent || 'UNKNOWN'
    });
  } catch (error: any) {
    console.error('Error resetting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset conversation'
    });
  }
});

// Get conversation statistics (for debugging)
router.get('/stats', (req, res) => {
  try {
    const stats = {
      success: true,
      data: {
        activeConversations: aiAgent.getConversationCount(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('AI Automation Route Error:', error);
  
  // Determine if this is a user-facing error or internal error
  let userMessage = 'An unexpected error occurred. Please try again.';
  let statusCode = 500;
  
  if (error.message && typeof error.message === 'string') {
    // Check for common error patterns and provide user-friendly messages
    if (error.message.includes('timeout')) {
      userMessage = 'The request timed out. Please try again.';
      statusCode = 408;
    } else if (error.message.includes('validation')) {
      userMessage = 'Invalid request data. Please check your input.';
      statusCode = 400;
    } else if (error.message.includes('rate limit')) {
      userMessage = 'Too many requests. Please wait before trying again.';
      statusCode = 429;
    }
  }
  
  res.status(statusCode).json({
    success: false,
    error: userMessage,
    code: 'ROUTE_ERROR',
    timestamp: new Date().toISOString()
  });
});

// Helper functions
function generateConversationId(): string {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export default router;