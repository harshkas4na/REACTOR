import { Request, Response } from 'express';

export const handleHealthCheck = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
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