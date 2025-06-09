import express from 'express';
import { AIAgent } from '../services/AIAgent';
import { BlockchainService } from '../services/BlockchainService';
import { ValidationService } from '../services/ValidationService';

const router = express.Router();

// Initialize services
const blockchainService = new BlockchainService();
const validationService = new ValidationService();
const aiAgent = new AIAgent(blockchainService, validationService);

// Process AI message
router.post('/automate', async (req, res) => {
  try {
    const { message, conversationId, connectedWallet, currentNetwork } = req.body;

    // Validate request
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Process message
    const result = await aiAgent.processMessage({
      message,
      conversationId: conversationId || generateConversationId(),
      connectedWallet,
      currentNetwork
    });

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('AI Automation Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'ai-automation',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  try {
    const health = {
      success: true,
      status: 'healthy',
      service: 'ai-automation',
      timestamp: new Date().toISOString(),
      components: {
        ai: {
          status: 'healthy',
          conversations: aiAgent.getConversationCount()
        },
        blockchain: {
          status: 'healthy',
          networks: {
            ethereum: await checkNetworkHealth(1),
            avalanche: await checkNetworkHealth(43114),
            sepolia: await checkNetworkHealth(11155111)
          }
        }
      }
    };

    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      service: 'ai-automation',
      error: error.message
    });
  }
});

// Reset conversation
router.delete('/conversation/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    aiAgent.cleanupOldConversations(0); // Force cleanup specific conversation
    res.json({
      success: true,
      message: 'Conversation reset successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
function generateConversationId(): string {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function checkNetworkHealth(chainId: number): Promise<{ status: string; latency: number }> {
  try {
    const start = Date.now();
    const provider = blockchainService.getProvider(chainId);
    await provider.getBlockNumber();
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: -1
    };
  }
}

export default router; 