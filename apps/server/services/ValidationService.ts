import { ethers } from 'ethers';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

export class ValidationService {
  
  validateWalletAddress(address: string): ValidationResult {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Address is required' };
      }
      
      if (!ethers.isAddress(address)) {
        return { isValid: false, error: 'Invalid Ethereum address format' };
      }
      
      // Convert to checksummed address
      const checksummedAddress = ethers.getAddress(address);
      
      return { 
        isValid: true, 
        sanitizedValue: checksummedAddress 
      };
    } catch (error) {
      return { isValid: false, error: 'Invalid address format' };
    }
  }

  validateTokenSymbol(symbol: string): ValidationResult {
    if (!symbol || typeof symbol !== 'string') {
      return { isValid: false, error: 'Token symbol is required' };
    }
    
    const cleanSymbol = symbol.trim().toUpperCase();
    
    if (cleanSymbol.length < 2 || cleanSymbol.length > 10) {
      return { isValid: false, error: 'Token symbol must be 2-10 characters' };
    }
    
    if (!/^[A-Z0-9]+$/.test(cleanSymbol)) {
      return { isValid: false, error: 'Token symbol can only contain letters and numbers' };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: cleanSymbol 
    };
  }

  validateAmount(amount: string, balance?: string): ValidationResult {
    if (!amount || typeof amount !== 'string') {
      return { isValid: false, error: 'Amount is required' };
    }
    
    const cleanAmount = amount.trim();
    
    // Handle percentage amounts
    if (cleanAmount.includes('%')) {
      const percentMatch = cleanAmount.match(/^(\d+(?:\.\d+)?)\s*%$/);
      if (!percentMatch) {
        return { isValid: false, error: 'Invalid percentage format. Use format like "50%"' };
      }
      
      const percentage = parseFloat(percentMatch[1]);
      if (percentage <= 0 || percentage > 100) {
        return { isValid: false, error: 'Percentage must be between 0 and 100' };
      }
      
      return { 
        isValid: true, 
        sanitizedValue: { type: 'percentage', value: percentage }
      };
    }
    
    // Handle "all" keyword
    if (cleanAmount.toLowerCase() === 'all') {
      return { 
        isValid: true, 
        sanitizedValue: { type: 'all', value: 'all' }
      };
    }
    
    // Handle numeric amounts
    const numericAmount = parseFloat(cleanAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return { isValid: false, error: 'Amount must be a positive number' };
    }
    
    // Check against balance if provided
    if (balance) {
      const balanceNum = parseFloat(balance);
      if (numericAmount > balanceNum) {
        return { 
          isValid: false, 
          error: `Amount (${numericAmount}) exceeds available balance (${balanceNum})` 
        };
      }
    }
    
    return { 
      isValid: true, 
      sanitizedValue: { type: 'fixed', value: numericAmount }
    };
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
    
    return { 
      isValid: true, 
      sanitizedValue: numericPercentage 
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
  }): { isValid: boolean; errors: string[]; sanitizedParams?: any } {
    const errors: string[] = [];
    const sanitizedParams: any = {};
    
    // Validate wallet address
    if (params.walletAddress) {
      const walletValidation = this.validateWalletAddress(params.walletAddress);
      if (!walletValidation.isValid) {
        errors.push(`Wallet: ${walletValidation.error}`);
      } else {
        sanitizedParams.walletAddress = walletValidation.sanitizedValue;
      }
    }
    
    // Validate token to sell
    if (params.tokenToSell) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToSell);
      if (!tokenValidation.isValid) {
        errors.push(`Token to sell: ${tokenValidation.error}`);
      } else {
        sanitizedParams.tokenToSell = tokenValidation.sanitizedValue;
      }
    }
    
    // Validate token to buy
    if (params.tokenToBuy) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToBuy);
      if (!tokenValidation.isValid) {
        errors.push(`Token to buy: ${tokenValidation.error}`);
      } else {
        sanitizedParams.tokenToBuy = tokenValidation.sanitizedValue;
      }
    }
    
    // Check if selling and buying same token
    if (params.tokenToSell && params.tokenToBuy && 
        params.tokenToSell.toUpperCase() === params.tokenToBuy.toUpperCase()) {
      errors.push('Cannot sell and buy the same token');
    }
    
    // Validate amount
    if (params.amount) {
      const amountValidation = this.validateAmount(params.amount, params.balance);
      if (!amountValidation.isValid) {
        errors.push(`Amount: ${amountValidation.error}`);
      } else {
        sanitizedParams.amount = amountValidation.sanitizedValue;
      }
    }
    
    // Validate drop percentage
    if (params.dropPercentage !== undefined) {
      const percentageValidation = this.validatePercentage(params.dropPercentage);
      if (!percentageValidation.isValid) {
        errors.push(`Drop percentage: ${percentageValidation.error}`);
      } else {
        sanitizedParams.dropPercentage = percentageValidation.sanitizedValue;
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
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedParams: errors.length === 0 ? sanitizedParams : undefined
    };
  }

  validateFundingAmount(amount: string, currency: string): ValidationResult {
    const amountValidation = this.validateAmount(amount);
    if (!amountValidation.isValid) {
      return amountValidation;
    }
    
    const numericAmount = amountValidation.sanitizedValue.value;
    
    // Set minimum funding requirements based on currency
    const minimumAmounts: { [currency: string]: number } = {
      'ETH': 0.001,
      'AVAX': 0.01,
      'REACT': 0.001,
      'KOPLI': 0.001
    };
    
    const minimum = minimumAmounts[currency.toUpperCase()] || 0.001;
    
    if (numericAmount < minimum) {
      return {
        isValid: false,
        error: `Minimum funding amount is ${minimum} ${currency}`
      };
    }
    
    // Set maximum reasonable amounts to prevent accidents
    const maximumAmounts: { [currency: string]: number } = {
      'ETH': 1.0,
      'AVAX': 10.0,
      'REACT': 1.0,
      'KOPLI': 1.0
    };
    
    const maximum = maximumAmounts[currency.toUpperCase()] || 1.0;
    
    if (numericAmount > maximum) {
      return {
        isValid: false,
        error: `Maximum recommended funding amount is ${maximum} ${currency}. Are you sure you want to use ${numericAmount} ${currency}?`
      };
    }
    
    return {
      isValid: true,
      sanitizedValue: numericAmount
    };
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
    
    // Basic sanitization - remove potentially harmful content
    const sanitizedMessage = cleanMessage
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    
    return {
      isValid: true,
      sanitizedValue: sanitizedMessage
    };
  }

  // Helper method to validate all required fields for stop order are present
  validateStopOrderCompletion(collectedData: any): { isComplete: boolean; missingFields: string[] } {
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
    
    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  }

  // Validate final automation configuration before deployment
  validateFinalConfiguration(config: any): ValidationResult {
    const required = [
      'chainId', 'pairAddress', 'sellToken0', 'clientAddress', 
      'coefficient', 'threshold', 'amount', 'destinationFunding', 'rscFunding'
    ];
    
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
    if (!walletValidation.isValid) {
      return { isValid: false, error: `Invalid client address: ${walletValidation.error}` };
    }
    
    const pairValidation = this.validateWalletAddress(config.pairAddress);
    if (!pairValidation.isValid) {
      return { isValid: false, error: `Invalid pair address: ${pairValidation.error}` };
    }
    
    // Validate coefficient and threshold are numbers
    if (isNaN(parseInt(config.coefficient)) || isNaN(parseInt(config.threshold))) {
      return { isValid: false, error: 'Coefficient and threshold must be valid numbers' };
    }
    
    return { isValid: true };
  }
} 