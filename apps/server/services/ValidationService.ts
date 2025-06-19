import { ethers } from 'ethers';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
  warnings?: string[];
}

export interface ConversationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
  confidence: number;
}

export class ValidationService {
  
  validateWalletAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  validateTokenSymbol(symbol: string): boolean {
    const supportedTokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AVAX'];
    return supportedTokens.includes(symbol.toUpperCase());
  }

  validateAmount(amount: string): boolean {
    if (amount === 'all' || amount === '50%' || amount.includes('%')) {
      return true;
    }
    
    try {
      const num = parseFloat(amount);
      return !isNaN(num) && num > 0;
    } catch {
      return false;
    }
  }

  validatePercentage(percentage: string | number): ValidationResult {
    let numericPercentage: number;
    
    if (typeof percentage === 'string') {
      const cleanPercentage = percentage.trim().replace('%', '');
      numericPercentage = parseFloat(cleanPercentage);
    } else {
      numericPercentage = percentage;
    }
    
    if (isNaN(numericPercentage)) {
      return { isValid: false, error: 'Percentage must be a valid number' };
    }
    
    if (numericPercentage <= 0 || numericPercentage > 100) {
      return { isValid: false, error: 'Percentage must be between 0 and 100' };
    }
    
    // Add warnings for extreme values
    const warnings: string[] = [];
    if (numericPercentage < 1) {
      warnings.push('Very small percentage - consider if this is intentional');
    } else if (numericPercentage > 50) {
      warnings.push('Large percentage drop - high risk of triggering');
    }
    
    return { 
      isValid: true, 
      sanitizedValue: numericPercentage,
      warnings
    };
  }

  validateChainId(chainId: string | number): ValidationResult {
    let numericChainId: number;
    
    if (typeof chainId === 'string') {
      numericChainId = parseInt(chainId);
    } else {
      numericChainId = chainId;
    }
    
    if (isNaN(numericChainId) || numericChainId <= 0) {
      return { isValid: false, error: 'Chain ID must be a positive number' };
    }
    
    // Check if it's a supported chain
    const supportedChains = [1, 11155111, 43114]; // Ethereum, Sepolia, Avalanche
    if (!supportedChains.includes(numericChainId)) {
      return { 
        isValid: false, 
        error: `Chain ID ${numericChainId} is not supported. Supported chains: ${supportedChains.join(', ')}` 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: numericChainId 
    };
  }

  validateStopOrderParameters(params: {
    walletAddress?: string;
    tokenToSell?: string;
    tokenToBuy?: string;
    amount?: string;
    dropPercentage?: number;
    chainId?: number;
    balance?: string;
  }): { isValid: boolean; errors: string[]; warnings: string[]; sanitizedParams?: any } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedParams: any = {};
    
    // Validate wallet address
    if (params.walletAddress) {
      const walletValidation = this.validateWalletAddress(params.walletAddress);
      if (!walletValidation) {
        errors.push(`Invalid wallet address format`);
      } else {
        sanitizedParams.walletAddress = params.walletAddress;
      }
    }
    
    // Validate token to sell
    if (params.tokenToSell) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToSell);
      if (!tokenValidation) {
        errors.push(`Token to sell "${params.tokenToSell}" is not supported`);
      } else {
        sanitizedParams.tokenToSell = params.tokenToSell.toUpperCase();
      }
    }
    
    // Validate token to buy
    if (params.tokenToBuy) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToBuy);
      if (!tokenValidation) {
        errors.push(`Token to buy "${params.tokenToBuy}" is not supported`);
      } else {
        sanitizedParams.tokenToBuy = params.tokenToBuy.toUpperCase();
      }
    }
    
    // Check if selling and buying same token
    if (params.tokenToSell && params.tokenToBuy && 
        params.tokenToSell.toUpperCase() === params.tokenToBuy.toUpperCase()) {
      errors.push('Cannot sell and buy the same token');
    }
    
    // Validate amount
    if (params.amount) {
      const amountValidation = this.validateAmount(params.amount);
      if (!amountValidation) {
        errors.push(`Invalid amount format: "${params.amount}"`);
      } else {
        sanitizedParams.amount = params.amount;
        
        // Add warnings for amounts
        if (params.amount === 'all') {
          warnings.push('Using all tokens - ensure you want to risk your entire balance');
        }
      }
    }
    
    // Validate drop percentage
    if (params.dropPercentage !== undefined) {
      const percentageValidation = this.validatePercentage(params.dropPercentage);
      if (!percentageValidation.isValid) {
        errors.push(`Drop percentage: ${percentageValidation.error}`);
      } else {
        sanitizedParams.dropPercentage = percentageValidation.sanitizedValue;
        if (percentageValidation.warnings) {
          warnings.push(...percentageValidation.warnings);
        }
      }
    }
    
    // Validate chain ID
    if (params.chainId !== undefined) {
      const chainValidation = this.validateChainId(params.chainId);
      if (!chainValidation.isValid) {
        errors.push(`Chain: ${chainValidation.error}`);
      } else {
        sanitizedParams.chainId = chainValidation.sanitizedValue;
      }
    }
    
    // Validate balance if provided
    if (params.balance) {
      try {
        const balance = parseFloat(params.balance);
        if (isNaN(balance) || balance < 0) {
          warnings.push('Invalid balance format - this may affect amount validation');
        } else if (balance === 0) {
          warnings.push('Zero balance detected - cannot create stop order');
        } else if (balance < 0.001) {
          warnings.push('Very low balance - may not be enough for gas fees');
        }
        sanitizedParams.balance = params.balance;
      } catch {
        warnings.push('Could not parse balance information');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedParams: errors.length === 0 ? sanitizedParams : undefined
    };
  }

  validateFundingAmount(amount: string): ValidationResult {
    try {
      const num = parseFloat(amount);
      
      if (isNaN(num)) {
        return { isValid: false, error: 'Funding amount must be a valid number' };
      }
      
      if (num < 0) {
        return { isValid: false, error: 'Funding amount cannot be negative' };
      }
      
      if (num === 0) {
        return { isValid: false, error: 'Funding amount must be greater than zero' };
      }
      
      // Add warnings for extreme values
      const warnings: string[] = [];
      if (num < 0.001) {
        warnings.push('Very low funding amount - may not cover gas costs');
      } else if (num > 1) {
        warnings.push('High funding amount - ensure this is intentional');
      }
      
      return { 
        isValid: true, 
        sanitizedValue: num.toString(),
        warnings
      };
    } catch {
      return { isValid: false, error: 'Invalid funding amount format' };
    }
  }

  validateConversationMessage(message: string): ValidationResult {
    if (!message || typeof message !== 'string') {
      return { isValid: false, error: 'Message is required' };
    }
    
    const cleanMessage = message.trim();
    
    if (cleanMessage.length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (cleanMessage.length > 1000) {
      return { isValid: false, error: 'Message too long (max 1000 characters)' };
    }
    
    // Check for potentially harmful patterns
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ];
    
    let sanitizedMessage = cleanMessage;
    const warnings: string[] = [];
    
    for (const pattern of harmfulPatterns) {
      if (pattern.test(sanitizedMessage)) {
        sanitizedMessage = sanitizedMessage.replace(pattern, '');
        warnings.push('Potentially harmful content removed from message');
      }
    }
    
    // Check for excessive special characters (possible spam/attack)
    const specialCharCount = (sanitizedMessage.match(/[^a-zA-Z0-9\s\.\,\!\?\-]/g) || []).length;
    if (specialCharCount > sanitizedMessage.length * 0.3) {
      warnings.push('Message contains many special characters');
    }
    
    // Check for repetitive content (possible spam)
    const words = sanitizedMessage.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size < words.length * 0.5) {
      warnings.push('Message appears repetitive');
    }
    
    return {
      isValid: true,
      sanitizedValue: sanitizedMessage,
      warnings
    };
  }

  // Enhanced conversation validation for better flow control
  validateConversationState(collectedData: any, processedInputs: Set<string>): ConversationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedData: any = {};
    let confidence = 0;
    
    // Required fields for stop order
    const requiredFields = [
      'connectedWallet',
      'tokenToSell', 
      'tokenToBuy',
      'amount',
      'dropPercentage',
      'selectedNetwork'
    ];
    
    let completedFields = 0;
    
    for (const field of requiredFields) {
      if (collectedData[field] !== undefined && collectedData[field] !== null) {
        completedFields++;
        
        // Validate each field
        switch (field) {
          case 'connectedWallet':
            if (!this.validateWalletAddress(collectedData[field])) {
              errors.push('Invalid wallet address');
            } else {
              sanitizedData[field] = collectedData[field];
            }
            break;
            
          case 'tokenToSell':
          case 'tokenToBuy':
            if (!this.validateTokenSymbol(collectedData[field])) {
              errors.push(`Invalid token: ${collectedData[field]}`);
            } else {
              sanitizedData[field] = collectedData[field].toUpperCase();
            }
            break;
            
          case 'amount':
            if (!this.validateAmount(collectedData[field])) {
              errors.push(`Invalid amount: ${collectedData[field]}`);
            } else {
              sanitizedData[field] = collectedData[field];
            }
            break;
            
          case 'dropPercentage':
            const percentValidation = this.validatePercentage(collectedData[field]);
            if (!percentValidation.isValid) {
              errors.push(`Invalid drop percentage: ${percentValidation.error}`);
            } else {
              sanitizedData[field] = percentValidation.sanitizedValue;
              if (percentValidation.warnings) {
                warnings.push(...percentValidation.warnings);
              }
            }
            break;
            
          case 'selectedNetwork':
            const chainValidation = this.validateChainId(collectedData[field]);
            if (!chainValidation.isValid) {
              errors.push(`Invalid network: ${chainValidation.error}`);
            } else {
              sanitizedData[field] = chainValidation.sanitizedValue;
            }
            break;
            
          default:
            sanitizedData[field] = collectedData[field];
        }
      }
    }
    
    // Calculate confidence based on completion and validation
    confidence = (completedFields / requiredFields.length) * 100;
    
    // Reduce confidence for errors
    if (errors.length > 0) {
      confidence = Math.max(0, confidence - (errors.length * 20));
    }
    
    // Add contextual warnings
    if (completedFields > 0 && completedFields < requiredFields.length) {
      const missingFields = requiredFields.filter(field => 
        !collectedData[field] && !processedInputs.has(`asked_${field}`)
      );
      
      if (missingFields.length > 0) {
        warnings.push(`Missing: ${missingFields.join(', ')}`);
      }
    }
    
    // Check for conflicting data
    if (sanitizedData.tokenToSell && sanitizedData.tokenToBuy && 
        sanitizedData.tokenToSell === sanitizedData.tokenToBuy) {
      errors.push('Cannot trade a token for itself');
      confidence = Math.max(0, confidence - 30);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
      confidence
    };
  }

  // Helper method to validate all required fields for stop order are present
  validateStopOrderCompletion(collectedData: any): { isComplete: boolean; missingFields: string[]; confidence: number } {
    const requiredFields = [
      'connectedWallet',
      'tokenToSell', 
      'tokenToBuy',
      'amount',
      'dropPercentage',
      'selectedNetwork'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !collectedData[field] || collectedData[field] === undefined
    );
    
    const completedFields = requiredFields.length - missingFields.length;
    const confidence = (completedFields / requiredFields.length) * 100;
    
    return {
      isComplete: missingFields.length === 0,
      missingFields,
      confidence
    };
  }

  // Validate final automation configuration before deployment
  validateFinalConfiguration(config: any): ValidationResult {
    const required = [
      'chainId', 'pairAddress', 'sellToken0', 'clientAddress', 
      'coefficient', 'threshold', 'amount', 'destinationFunding', 'rscFunding'
    ];
    
    const warnings: string[] = [];
    
    for (const field of required) {
      if (!config[field] && config[field] !== false) { // sellToken0 can be false
        return {
          isValid: false,
          error: `Missing required field: ${field}`
        };
      }
    }
    
    // Validate specific fields
    const walletValidation = this.validateWalletAddress(config.clientAddress);
    if (!walletValidation) {
      return { isValid: false, error: `Invalid client address` };
    }
    
    const pairValidation = this.validateWalletAddress(config.pairAddress);
    if (!pairValidation) {
      return { isValid: false, error: `Invalid pair address` };
    }
    
    // Validate coefficient and threshold are numbers
    if (isNaN(parseInt(config.coefficient)) || isNaN(parseInt(config.threshold))) {
      return { isValid: false, error: 'Coefficient and threshold must be valid numbers' };
    }
    
    // Validate funding amounts
    const destFundingValidation = this.validateFundingAmount(config.destinationFunding);
    if (!destFundingValidation.isValid) {
      return { isValid: false, error: `Invalid destination funding: ${destFundingValidation.error}` };
    }
    
    const rscFundingValidation = this.validateFundingAmount(config.rscFunding);
    if (!rscFundingValidation.isValid) {
      return { isValid: false, error: `Invalid RSC funding: ${rscFundingValidation.error}` };
    }
    
    // Add warnings for funding amounts
    if (destFundingValidation.warnings) {
      warnings.push(...destFundingValidation.warnings.map(w => `Destination funding: ${w}`));
    }
    if (rscFundingValidation.warnings) {
      warnings.push(...rscFundingValidation.warnings.map(w => `RSC funding: ${w}`));
    }
    
    // Validate threshold makes sense (not too extreme)
    const coefficient = parseInt(config.coefficient);
    const threshold = parseInt(config.threshold);
    
    if (threshold <= 0 || threshold >= coefficient) {
      warnings.push('Threshold value seems extreme - please verify configuration');
    }
    
    return { 
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  validateNetworkId(chainId: number): boolean {
    const supportedNetworks = [1, 43114, 11155111]; // Ethereum, Avalanche, Sepolia
    return supportedNetworks.includes(chainId);
  }

  validateDropPercentage(percentage: number): boolean {
    return percentage > 0 && percentage <= 100;
  }

  validatePairAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  validateAutomationConfig(config: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.chainId || !this.validateNetworkId(Number(config.chainId))) {
      errors.push('Invalid chain ID');
    }

    if (!config.pairAddress || !this.validatePairAddress(config.pairAddress)) {
      errors.push('Invalid pair address');
    }

    if (typeof config.sellToken0 !== 'boolean') {
      errors.push('Invalid sellToken0 flag');
    }

    if (!config.clientAddress || !this.validateWalletAddress(config.clientAddress)) {
      errors.push('Invalid client address');
    }

    if (!config.coefficient || isNaN(Number(config.coefficient))) {
      errors.push('Invalid coefficient');
    }

    if (!config.threshold || isNaN(Number(config.threshold))) {
      errors.push('Invalid threshold');
    }

    if (!config.amount || !this.validateAmount(config.amount)) {
      errors.push('Invalid amount');
    }

    const destFundingValidation = this.validateFundingAmount(config.destinationFunding);
    if (!destFundingValidation.isValid) {
      errors.push(`Invalid destination funding: ${destFundingValidation.error}`);
    } else if (destFundingValidation.warnings) {
      warnings.push(...destFundingValidation.warnings);
    }

    const rscFundingValidation = this.validateFundingAmount(config.rscFunding);
    if (!rscFundingValidation.isValid) {
      errors.push(`Invalid RSC funding: ${rscFundingValidation.error}`);
    } else if (rscFundingValidation.warnings) {
      warnings.push(...rscFundingValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Utility method to check if user input suggests they already provided information
  detectRepeatQuestion(message: string, collectedData: any): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check if user is confirming already provided information
    const confirmationPatterns = [
      /yes,?\s*(that\'?s?\s*)?(correct|right|good)/,
      /^(yes|yep|yeah|yup)$/,
      /i\s*(already\s*)?(told|said|mentioned)/,
      /like\s*i\s*said/
    ];
    
    for (const pattern of confirmationPatterns) {
      if (pattern.test(lowerMessage)) {
        return true;
      }
    }
    
    // Check if they're repeating information they already provided
    if (collectedData.tokenToSell && lowerMessage.includes(collectedData.tokenToSell.toLowerCase())) {
      return true;
    }
    
    if (collectedData.tokenToBuy && lowerMessage.includes(collectedData.tokenToBuy.toLowerCase())) {
      return true;
    }
    
    if (collectedData.amount && lowerMessage.includes(collectedData.amount.toString())) {
      return true;
    }
    
    return false;
  }

  // Method to extract confidence level from user message
  extractConfidenceFromMessage(message: string): number {
    const lowerMessage = message.toLowerCase();
    
    // High confidence indicators
    if (/\b(definitely|absolutely|certainly|sure|yes)\b/.test(lowerMessage)) {
      return 90;
    }
    
    // Medium confidence indicators
    if (/\b(probably|likely|think|maybe)\b/.test(lowerMessage)) {
      return 60;
    }
    
    // Low confidence indicators
    if (/\b(not sure|dunno|don\'t know|unclear)\b/.test(lowerMessage)) {
      return 30;
    }
    
    // Default confidence
    return 70;
  }
}