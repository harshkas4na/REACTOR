import express, { Request, Response } from 'express';
import { ethers } from 'ethers';

const router = express.Router();

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface RSCValidationResponse {
  success: boolean;
  data: ValidationResult;
}

function validateRSC(sourceCode: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // 1. Check Interface Implementation
    if (!sourceCode.includes('AbstractReactive') && !sourceCode.includes('AbstractPausableReactive')) {
      result.errors.push('Contract must implement either AbstractReactive or AbstractPausableReactive');
      result.isValid = false;
    }

    // 2. Check Chain ID Definition
    const chainIdPattern = /constant\s+\w+_CHAIN_ID\s*=\s*\d+/;
    if (!chainIdPattern.test(sourceCode)) {
      result.errors.push('At least one chain ID must be defined as a constant');
      result.isValid = false;
    }

    // 3. Check Event Subscription
    // Look for both subscription in constructor and getPausableSubscriptions
    const hasSubscription = sourceCode.includes('service.subscribe(') || 
                          sourceCode.includes('getPausableSubscriptions');
    if (!hasSubscription) {
      result.errors.push('No event subscriptions found');
      result.isValid = false;
    }

    // 4. Check Event Topic Definition
    const topicPattern = /constant\s+\w+_TOPIC_\d+\s*=\s*0x[a-fA-F0-9]+/;
    if (!topicPattern.test(sourceCode)) {
      result.errors.push('No event topics defined');
      result.isValid = false;
    }

    // 5. Check React Function Implementation
    if (!sourceCode.includes('function react(')) {
      result.errors.push('React function not implemented');
      result.isValid = false;
    }

    // 6. Check Callback Emission
    if (!sourceCode.includes('emit Callback(')) {
      result.errors.push('No callback emissions found in react function');
      result.isValid = false;
    }

    // 7. Check Required Contract Addresses
    const contractAddressPattern = /constant\s+\w+_CONTRACT\s*=\s*0x[a-fA-F0-9]{40}/;
    if (!contractAddressPattern.test(sourceCode)) {
      result.errors.push('No contract addresses defined');
      result.isValid = false;
    }

    // 8. Check Gas Limit Definition
    const gasLimitPattern = /constant\s+CALLBACK_GAS_LIMIT\s*=\s*\d+/;
    if (!gasLimitPattern.test(sourceCode)) {
      result.errors.push('Callback gas limit not defined');
      result.isValid = false;
    }

    // 9. Check Constructor Implementation
    if (!sourceCode.includes('constructor()')) {
      result.errors.push('Constructor not implemented');
      result.isValid = false;
    }

    // 10. Check Receive Function
    if (!sourceCode.includes('receive() external payable')) {
      result.errors.push('Receive function not implemented');
      result.isValid = false;
    }

    // Additional Warnings
    
    // Check gas limit value
    const gasLimitMatch = sourceCode.match(/CALLBACK_GAS_LIMIT\s*=\s*(\d+)/);
    if (gasLimitMatch) {
      const gasLimit = parseInt(gasLimitMatch[1]);
      if (gasLimit < 100000 || gasLimit > 3000000) {
        result.warnings.push(`Gas limit ${gasLimit} is outside recommended range (100,000-3,000,000)`);
      }
    }

    // Check for vm variable setting
    if (!sourceCode.includes('vm = !')) {
      result.warnings.push('VM state not properly set in constructor');
    }

  } catch (error:any) {
    result.errors.push(`Validation error: ${error.message}`);
    result.isValid = false;
  }

  return result;
}

router.post('/', (req: Request, res: Response) => {
  try {
    const { sourceCode } = req.body;

    if (!sourceCode || typeof sourceCode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: sourceCode is required and must be a string'
      });
    }

    const validationResult = validateRSC(sourceCode);

    const response: RSCValidationResponse = {
      success: true,
      data: validationResult
    };

    return res.status(200).json(response);

  } catch (error:any) {
    return res.status(500).json({
      success: false,
      error: `Internal server error: ${error.message}`
    });
  }
});

export default router;