import { AIAutomationConfig } from '@/types/ai';

export class AIConfigManager {
  private static readonly STORAGE_KEY = 'ai_automation_config';
  private static readonly CONVERSATION_KEY = 'ai_conversation_id';
  private static readonly BACKUP_KEY = 'ai_automation_config_backup';

  /**
   * Store AI automation config in localStorage with validation
   */
  static storeConfig(config: AIAutomationConfig): boolean {
    try {
      // Validate config before storing
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        console.error('Invalid config provided to store:', validation.errors);
        return false;
      }

      // Create a backup of existing config
      const existingConfig = localStorage.getItem(this.STORAGE_KEY);
      if (existingConfig) {
        localStorage.setItem(this.BACKUP_KEY, existingConfig);
      }

      // Store the new config
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      console.log('AI config stored successfully:', config);
      return true;
    } catch (error) {
      console.error('Failed to store AI config:', error);
      return false;
    }
  }

  /**
   * Retrieve and clear AI automation config from localStorage
   */
  static retrieveAndClearConfig(): AIAutomationConfig | null {
    try {
      const configString = localStorage.getItem(this.STORAGE_KEY);
      if (configString) {
        // Clear the config immediately to prevent reuse
        localStorage.removeItem(this.STORAGE_KEY);
        
        const config = JSON.parse(configString) as AIAutomationConfig;
        
        // Validate the retrieved config
        const validation = this.validateConfig(config);
        if (!validation.isValid) {
          console.error('Retrieved invalid config:', validation.errors);
          return null;
        }
        
        console.log('AI config retrieved successfully:', config);
        return config;
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve AI config:', error);
      // Clear corrupted data
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  /**
   * Peek at stored config without clearing it
   */
  static peekConfig(): AIAutomationConfig | null {
    try {
      const configString = localStorage.getItem(this.STORAGE_KEY);
      if (configString) {
        return JSON.parse(configString) as AIAutomationConfig;
      }
      return null;
    } catch (error) {
      console.error('Failed to peek AI config:', error);
      return null;
    }
  }

  /**
   * Check if there's a stored AI config
   */
  static hasStoredConfig(): boolean {
    try {
      const configString = localStorage.getItem(this.STORAGE_KEY);
      return configString !== null && configString.trim() !== '';
    } catch (error) {
      return false;
    }
  }

  /**
   * Restore config from backup
   */
  static restoreFromBackup(): AIAutomationConfig | null {
    try {
      const backupString = localStorage.getItem(this.BACKUP_KEY);
      if (backupString) {
        const config = JSON.parse(backupString) as AIAutomationConfig;
        localStorage.setItem(this.STORAGE_KEY, backupString);
        localStorage.removeItem(this.BACKUP_KEY);
        return config;
      }
      return null;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  /**
   * Clear all stored configs
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem(this.CONVERSATION_KEY);
    } catch (error) {
      console.error('Failed to clear AI configs:', error);
    }
  }

  /**
   * Validate AI automation config
   */
  static validateConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config) {
      errors.push('Config is null or undefined');
      return { isValid: false, errors };
    }

    // Required fields validation
    const requiredFields = [
      'chainId', 'pairAddress', 'clientAddress', 'coefficient', 
      'threshold', 'amount', 'destinationFunding', 'rscFunding'
    ];

    for (const field of requiredFields) {
      if (!config[field] && config[field] !== false && config[field] !== 0) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate sellToken0 specifically (can be false)
    if (config.sellToken0 === undefined || config.sellToken0 === null) {
      errors.push('sellToken0 must be defined');
    }

    // Validate addresses
    if (config.pairAddress && !this.isValidAddress(config.pairAddress)) {
      errors.push('Invalid pair address format');
    }
    if (config.clientAddress && !this.isValidAddress(config.clientAddress)) {
      errors.push('Invalid client address format');
    }

    // Validate numeric values
    if (config.coefficient && (isNaN(parseInt(config.coefficient)) || parseInt(config.coefficient) <= 0)) {
      errors.push('Coefficient must be a positive number');
    }
    if (config.threshold && (isNaN(parseInt(config.threshold)) || parseInt(config.threshold) <= 0)) {
      errors.push('Threshold must be a positive number');
    }

    // Validate amounts
    if (config.amount && 
        config.amount !== 'all' && 
        config.amount !== '50%' && 
        (isNaN(parseFloat(config.amount)) || parseFloat(config.amount) <= 0)) {
      errors.push('Amount must be "all", "50%", or a positive number');
    }

    if (config.destinationFunding && 
        (isNaN(parseFloat(config.destinationFunding)) || parseFloat(config.destinationFunding) <= 0)) {
      errors.push('Destination funding must be a positive number');
    }

    if (config.rscFunding && 
        (isNaN(parseFloat(config.rscFunding)) || parseFloat(config.rscFunding) <= 0)) {
      errors.push('RSC funding must be a positive number');
    }

    // Validate chain ID
    const supportedChains = ['1', '11155111', '43114'];
    if (config.chainId && !supportedChains.includes(config.chainId.toString())) {
      errors.push(`Unsupported chain ID: ${config.chainId}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if string is valid Ethereum address
   */
  private static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Store conversation ID
   */
  static storeConversationId(id: string): void {
    try {
      localStorage.setItem(this.CONVERSATION_KEY, id);
    } catch (error) {
      console.error('Failed to store conversation ID:', error);
    }
  }

  /**
   * Retrieve conversation ID
   */
  static getConversationId(): string | null {
    try {
      return localStorage.getItem(this.CONVERSATION_KEY);
    } catch (error) {
      console.error('Failed to retrieve conversation ID:', error);
      return null;
    }
  }

  /**
   * Clear conversation ID
   */
  static clearConversationId(): void {
    try {
      localStorage.removeItem(this.CONVERSATION_KEY);
    } catch (error) {
      console.error('Failed to clear conversation ID:', error);
    }
  }
}

export class NetworkUtils {
  private static readonly NETWORK_MAP: { [key: string]: number } = {
    'ETHEREUM': 1,
    'SEPOLIA': 11155111,
    'AVALANCHE': 43114,
    'Lasna': 5318007,
    'REACT': 1597,
    'ARBITRUM': 42161,
    'MANTA': 169,
    'BASE': 8453,
    'BSC': 56,
    'POLYGON': 137,
    'POLYGON_ZKEVM': 1101,
    'OPBNB': 204
  };

  private static readonly CHAIN_ID_TO_NAME: { [key: number]: string } = {
    1: 'Ethereum Mainnet',
    11155111: 'Ethereum Sepolia',
    43114: 'Avalanche C-Chain',
    5318007: 'Lasna Testnet',
    1597: 'Reactive Mainnet',
    42161: 'Arbitrum One',
    169: 'Manta Pacific',
    8453: 'Base Chain',
    56: 'Binance Smart Chain',
    137: 'Polygon PoS',
    1101: 'Polygon zkEVM',
    204: 'opBNB Mainnet'
  };

  /**
   * Convert network name to chain ID
   */
  static getChainIdFromNetwork(network: string): number {
    return this.NETWORK_MAP[network.toUpperCase()] || 1;
  }

  /**
   * Convert chain ID to network name
   */
  static getNetworkNameFromChainId(chainId: number): string {
    return this.CHAIN_ID_TO_NAME[chainId] || `Chain ${chainId}`;
  }

  /**
   * Get network key from chain ID
   */
  static getNetworkKeyFromChainId(chainId: number): string {
    return Object.keys(this.NETWORK_MAP).find(
      key => this.NETWORK_MAP[key] === chainId
    ) || 'ETHEREUM';
  }

  /**
   * Check if chain ID is supported for stop orders
   */
  static isChainSupported(chainId: number): boolean {
    const supportedChains = [1, 11155111, 43114]; // Stop order supported chains
    return supportedChains.includes(chainId);
  }

  /**
   * Get RSC network for given source chain
   */
  static getRSCNetwork(sourceChainId: number): { chainId: number; name: string; currency: string } {
    // Production chains use Reactive Mainnet
    if (sourceChainId === 1 || sourceChainId === 43114) {
      return {
        chainId: 1597,
        name: 'Reactive Mainnet',
        currency: 'REACT'
      };
    } 
    // Testnets use Lasna
    else {
      return {
        chainId: 5318007,
        name: 'Lasna Testnet',
        currency: 'Lasna'
      };
    }
  }
}

export class MessageFormatter {
  /**
   * Format AI message content for display with enhanced markdown support
   */
  static formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">$1</code>') // Inline code
      .replace(/\n/g, '<br>'); // Line breaks
  }

  /**
   * Extract automation parameters from AI message with enhanced patterns
   */
  static extractAutomationParams(message: string): {
    token?: string;
    percentage?: number;
    amount?: string;
    tokenPair?: { sell: string; buy: string };
  } {
    const params: any = {};

    // Extract token pairs
    const pairPattern = /(\w+)\s*(?:\/|to|for)\s*(\w+)/i;
    const pairMatch = message.match(pairPattern);
    if (pairMatch) {
      params.tokenPair = { sell: pairMatch[1].toUpperCase(), buy: pairMatch[2].toUpperCase() };
    }

    // Extract single tokens
    const tokenMatch = message.match(/\b(ETH|BTC|USDC|USDT|DAI|WBTC|AVAX)\b/i);
    if (tokenMatch) {
      params.token = tokenMatch[1].toUpperCase();
    }

    // Extract percentage with multiple patterns
    const percentagePatterns = [
      /(\d+(?:\.\d+)?)\s*%/,
      /(\d+(?:\.\d+)?)\s*percent/i,
      /drop\s*(?:of|by)?\s*(\d+(?:\.\d+)?)/i
    ];
    
    for (const pattern of percentagePatterns) {
      const match = message.match(pattern);
      if (match) {
        params.percentage = parseFloat(match[1]);
        break;
      }
    }

    // Extract amount with enhanced patterns
    const amountPatterns = [
      { pattern: /all/i, value: 'all' },
      { pattern: /everything/i, value: 'all' },
      { pattern: /half/i, value: '50%' },
      { pattern: /(\d+(?:\.\d+)?)\s*(?:tokens?|\w+)?/i, value: 'number' }
    ];

    for (const { pattern, value } of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (value === 'number') {
          params.amount = match[1];
        } else {
          params.amount = value;
        }
        break;
      }
    }

    return params;
  }

  /**
   * Generate confirmation message for automation config
   */
  static generateConfirmationMessage(config: AIAutomationConfig): string {
    const networkName = NetworkUtils.getNetworkNameFromChainId(parseInt(config.chainId));
    const rscNetwork = NetworkUtils.getRSCNetwork(parseInt(config.chainId));
    
    return `🎯 **Perfect! Here's your stop order configuration:**

**💰 Protection Details:**
• **Amount**: ${config.amount === 'all' ? 'All' : config.amount} ${config.tokenToSell || 'tokens'}
• **Trigger**: ${config.dropPercentage || 'X'}% price drop
• **Trade**: ${config.tokenToSell || 'Token'} → ${config.tokenToBuy || 'Token'}
• **Network**: ${networkName}

**💸 Costs:**
• **Deployment**: ${config.destinationFunding} ${networkName.includes('Avalanche') ? 'AVAX' : 'ETH'}
• **Monitoring**: ${config.rscFunding} ${rscNetwork.currency}

**🚀 Ready to deploy?** This will create your 24/7 automated protection!`;
  }
}

export class ValidationUtils {
  /**
   * Enhanced validation for AI automation config with detailed feedback
   */
  static validateConfig(config: AIAutomationConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push('Configuration is missing');
      return { isValid: false, errors, warnings };
    }

    // Validate required fields
    if (!config.chainId) errors.push('Chain ID is required');
    if (!config.pairAddress) errors.push('Pair address is required');
    if (!config.clientAddress) errors.push('Client address is required');
    if (!config.coefficient) errors.push('Coefficient is required');
    if (!config.threshold) errors.push('Threshold is required');
    if (!config.amount) errors.push('Amount is required');
    if (!config.destinationFunding) errors.push('Destination funding is required');
    if (!config.rscFunding) errors.push('RSC funding is required');

    // Validate sellToken0 (can be false)
    if (config.sellToken0 === undefined || config.sellToken0 === null) {
      errors.push('Token sell direction must be specified');
    }

    // Validate addresses with detailed feedback
    if (config.pairAddress && !this.isValidAddress(config.pairAddress)) {
      errors.push('Pair address format is invalid (must be 0x followed by 40 hex characters)');
    }
    if (config.clientAddress && !this.isValidAddress(config.clientAddress)) {
      errors.push('Client address format is invalid (must be 0x followed by 40 hex characters)');
    }

    // Validate numeric values with range checks
    if (config.coefficient) {
      const coeff = parseInt(config.coefficient);
      if (isNaN(coeff)) {
        errors.push('Coefficient must be a number');
      } else if (coeff <= 0) {
        errors.push('Coefficient must be positive');
      } else if (coeff !== 1000) {
        warnings.push('Coefficient is not the standard 1000 - this may cause unexpected behavior');
      }
    }

    if (config.threshold) {
      const thresh = parseInt(config.threshold);
      if (isNaN(thresh)) {
        errors.push('Threshold must be a number');
      } else if (thresh <= 0) {
        errors.push('Threshold must be positive');
      } else if (thresh >= 1000) {
        warnings.push('Threshold is very high - this may not trigger as expected');
      }
    }

    // Validate funding amounts
    if (config.destinationFunding) {
      const funding = parseFloat(config.destinationFunding);
      if (isNaN(funding)) {
        errors.push('Destination funding must be a number');
      } else if (funding <= 0) {
        errors.push('Destination funding must be positive');
      } else if (funding < 0.01) {
        warnings.push('Destination funding is very low - deployment may fail');
      } else if (funding > 1) {
        warnings.push('Destination funding is very high - consider reducing costs');
      }
    }

    if (config.rscFunding) {
      const funding = parseFloat(config.rscFunding);
      if (isNaN(funding)) {
        errors.push('RSC funding must be a number');
      } else if (funding <= 0) {
        errors.push('RSC funding must be positive');
      } else if (funding < 0.01) {
        warnings.push('RSC funding is very low - monitoring may stop early');
      }
    }

    // Validate amount
    if (config.amount && 
        config.amount !== 'all' && 
        config.amount !== '50%' && 
        (isNaN(parseFloat(config.amount)) || parseFloat(config.amount) <= 0)) {
      errors.push('Amount must be "all", "50%", or a positive number');
    }

    // Validate chain support
    if (config.chainId && !NetworkUtils.isChainSupported(parseInt(config.chainId))) {
      errors.push(`Chain ${config.chainId} is not supported for stop orders`);
    }

    // Cross-validation
    if (config.tokenToSell && config.tokenToBuy && config.tokenToSell === config.tokenToBuy) {
      errors.push('Cannot sell and buy the same token');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if string is valid Ethereum address
   */
  private static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate form data for UI consistency
   */
  static validateFormData(formData: any): { isValid: boolean; missingFields: string[] } {
    const requiredFields = [
      'chainId', 'pairAddress', 'clientAddress', 
      'threshold', 'amount', 'destinationFunding', 'rscFunding'
    ];

    const missingFields = requiredFields.filter(field => 
      !formData[field] && formData[field] !== false && formData[field] !== 0
    );

    // Add sellToken0 validation
    if (formData.sellToken0 === undefined || formData.sellToken0 === null) {
      missingFields.push('sellToken0');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}

export class AIAnalytics {
  /**
   * Track AI interaction events with enhanced data
   */
  static trackEvent(event: string, data?: any): void {
    try {
      const eventData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...data
      };
      
      console.log(`AI Event: ${event}`, eventData);
      
      // Store recent events for debugging
      const recentEvents = JSON.parse(localStorage.getItem('ai_recent_events') || '[]');
      recentEvents.push({ event, data: eventData });
      
      // Keep only last 10 events
      if (recentEvents.length > 10) {
        recentEvents.shift();
      }
      
      localStorage.setItem('ai_recent_events', JSON.stringify(recentEvents));
      
      // Example: Send to analytics service
      // analytics.track(event, eventData);
    } catch (error) {
      console.error('Failed to track AI event:', error);
    }
  }

  /**
   * Track automation creation with validation status
   */
  static trackAutomationCreated(config: AIAutomationConfig, validationResult?: any): void {
    this.trackEvent('ai_automation_created', {
      type: 'stop_order',
      network: config.chainId,
      networkName: NetworkUtils.getNetworkNameFromChainId(parseInt(config.chainId)),
      amount: config.amount,
      dropPercentage: config.dropPercentage,
      tokenPair: `${config.tokenToSell}/${config.tokenToBuy}`,
      isValid: validationResult?.isValid,
      hasWarnings: validationResult?.warnings?.length > 0,
      deploymentReady: config.deploymentReady
    });
  }

  /**
   * Track configuration loading success/failure
   */
  static trackConfigLoaded(success: boolean, config?: any, errors?: string[]): void {
    this.trackEvent('ai_config_loaded', {
      success,
      hasConfig: !!config,
      errorCount: errors?.length || 0,
      errors: errors?.slice(0, 3), // Only first 3 errors for privacy
      networkId: config?.chainId
    });
  }

  /**
   * Track form validation issues
   */
  static trackFormValidation(isValid: boolean, missingFields?: string[], errors?: string[]): void {
    this.trackEvent('ai_form_validation', {
      isValid,
      missingFieldCount: missingFields?.length || 0,
      missingFields: missingFields?.slice(0, 5), // Limit for privacy
      errorCount: errors?.length || 0
    });
  }

  /**
   * Get recent events for debugging
   */
  static getRecentEvents(): any[] {
    try {
      return JSON.parse(localStorage.getItem('ai_recent_events') || '[]');
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Clear analytics data
   */
  static clearAnalytics(): void {
    try {
      localStorage.removeItem('ai_recent_events');
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }
}

// Export all utilities as a single object for easy importing
export const AIUtils = {
  ConfigManager: AIConfigManager,
  NetworkUtils,
  MessageFormatter,
  ValidationUtils,
  Analytics: AIAnalytics
};