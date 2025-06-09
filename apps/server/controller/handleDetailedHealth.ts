import { Request, Response } from 'express';
import { GeminiAIService } from '../services/GeminiAIService';
import { BlockchainService } from '../services/BlockchainService';

export const handleDetailedHealth = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check Gemini AI service
    const aiService = new GeminiAIService();
    const aiHealth = await aiService.checkDetailedHealth();
    
    // Check Blockchain service
    const blockchainService = new BlockchainService();
    const blockchainHealth = await blockchainService.checkHealth();
    
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    const isFullyHealthy = aiHealth.success && blockchainHealth.success;
    const isPartiallyHealthy = aiHealth.success || blockchainHealth.success;
    
    const status = isFullyHealthy ? 'healthy' : 
                  isPartiallyHealthy ? 'degraded' : 'unhealthy';
    
    res.json({
      success: true,
      status,
      services: {
        gemini: aiHealth.success ? 'healthy' : 'unhealthy',
        blockchain: blockchainHealth.success ? 'healthy' : 'unhealthy',
        server: 'healthy'
      },
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        gemini: aiHealth,
        blockchain: blockchainHealth
      }
    });
    
  } catch (error: any) {
    console.error('🔴 Backend: Detailed health check failed:', error);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message || 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
}; 