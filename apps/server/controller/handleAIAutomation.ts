import { Request, Response } from "express";
import { AIAgent } from "../services/AIAgent";
import { BlockchainService } from "../services/BlockchainService";
import { ValidationService } from "../services/ValidationService";

export interface AIAutomationRequest {
  message: string;
  conversationId?: string;
  connectedWallet?: string;
  currentNetwork?: number;
}

export interface AIAutomationResponse {
  success: boolean;
  data?: {
    message: string;
    intent: string;
    needsUserInput: boolean;
    inputType?: 'amount' | 'token' | 'network' | 'confirmation';
    options?: any[];
    collectedData?: any;
    nextStep?: string;
    automationConfig?: any; // Final config for frontend execution
  };
  error?: string;
}

export default async function handleAIAutomation(req: Request, res: Response) {
  try {
    const { message, conversationId, connectedWallet, currentNetwork }: AIAutomationRequest = req.body;

    // Validate request
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Initialize services
    const blockchainService = new BlockchainService();
    const validationService = new ValidationService();
    const aiAgent = new AIAgent(blockchainService, validationService);

    // Process the message
    const result = await aiAgent.processMessage({
      message,
      conversationId: conversationId || generateConversationId(),
      connectedWallet,
      currentNetwork
    });

    const response: AIAutomationResponse = {
      success: true,
      data: result
    };

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('AI Automation Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

function generateConversationId(): string {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 