import { Request, Response } from 'express';

export const handleConversationReset = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
    }
    
    res.json({
      success: true,
      message: 'Conversation reset successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('🔴 Backend: Conversation reset failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset conversation',
      timestamp: new Date().toISOString()
    });
  }
}; 