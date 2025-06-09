import { ethers } from 'ethers';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
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
    const supportedTokens = ['ETH', 'USDC', 'USDT', 'DAI'];
    return supportedTokens.includes(symbol.toUpperCase());
  }

  validateAmount(amount: string): boolean {
    if (amount === 'all' || amount === '50%') {
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
      if (!walletValidation) {
        errors.push(`Wallet: Invalid address`);
      } else {
        sanitizedParams.walletAddress = params.walletAddress;
      }
    }
    
    // Validate token to sell
    if (params.tokenToSell) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToSell);
      if (!tokenValidation) {
        errors.push(`Token to sell: Invalid token symbol`);
      } else {
        sanitizedParams.tokenToSell = params.tokenToSell;
      }
    }
    
    // Validate token to buy
    if (params.tokenToBuy) {
      const tokenValidation = this.validateTokenSymbol(params.tokenToBuy);
      if (!tokenValidation) {
        errors.push(`Token to buy: Invalid token symbol`);
      } else {
        sanitizedParams.tokenToBuy = params.tokenToBuy;
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
        errors.push(`Amount: Invalid amount format`);
      } else {
        sanitizedParams.amount = params.amount;
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

  validateFundingAmount(amount: string): boolean {
    try {
      const num = parseFloat(amount);
      return !isNaN(num) && num >= 0;
    } catch {
      return false;
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
    
    return { isValid: true };
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

  validateAutomationConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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

    if (!config.destinationFunding || !this.validateFundingAmount(config.destinationFunding)) {
      errors.push('Invalid destination funding amount');
    }

    if (!config.rscFunding || !this.validateFundingAmount(config.rscFunding)) {
      errors.push('Invalid RSC funding amount');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 