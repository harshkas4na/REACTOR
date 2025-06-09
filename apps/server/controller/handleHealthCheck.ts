import { Request, Response } from 'express';
import { GeminiAIService } from '../services/GeminiAIService';

export const handleHealthCheck = async (req: Request, res: Response) => {
  try {
    const aiService = new GeminiAIService();
    const isHealthy = await aiService.checkHealth();

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('🔴 Backend: Health check failed:', error);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message || 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }
}; 