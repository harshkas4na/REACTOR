import { Router } from 'express';
import handleAIAutomation from '../controller/handleAIAutomation';

const router = Router();

// Main endpoint for AI automation
router.post('/automate', handleAIAutomation);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'ai-automation' });
});

export default router; 