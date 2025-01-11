import express, { Request, Response } from 'express';
import { RSCFlowController, RSCFlowRequest } from '../controller/handleRSCMonitor';

const router = express.Router();

// Request validation middleware
const validateRequest = (req: Request, res: Response, next: express.NextFunction) => {
  const { originTxHash, rscAddress, targetEventSignature, originChainId, destinationChainId } = req.body;

  if (!originTxHash || !rscAddress || !targetEventSignature || !originChainId || !destinationChainId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  // Validate hex format for hashes and addresses
  const hexRegex = /^0x[0-9a-fA-F]+$/;
  if (!hexRegex.test(originTxHash) || !hexRegex.test(rscAddress) || !hexRegex.test(targetEventSignature)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid hex format for hash or address'
    });
  }

  // Validate chain IDs
  if (!Number.isInteger(originChainId) || !Number.isInteger(destinationChainId)) {
    return res.status(400).json({
      success: false,
      error: 'Chain IDs must be integers'
    });
  }

  next();
};

// Main handler for RSC monitoring
const handleRSCMonitor = async (req: Request, res: Response) => {
  try {
    const flowRequest: RSCFlowRequest = {
      originTxHash: req.body.originTxHash,
      rscAddress: req.body.rscAddress,
      targetEventSignature: req.body.targetEventSignature,
      originChainId: req.body.originChainId,
      destinationChainId: req.body.destinationChainId
    };

    const controller = new RSCFlowController(flowRequest);
    const flowStatus = await controller.trackFlow();

    return res.status(200).json({
      success: true,
      data: flowStatus
    });

  } catch (error: any) {
    console.error('RSC Monitor Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Route definition with validation
router.post('/', validateRequest, handleRSCMonitor);

export default router;