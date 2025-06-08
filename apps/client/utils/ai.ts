import { AIAutomationConfig } from '@/types/ai';

export class AIConfigManager {
  private static readonly STORAGE_KEY = 'ai_automation_config';
  private static readonly CONVERSATION_KEY = 'ai_conversation_id';

  /**
   * Store AI automation config in localStorage
   */
  static storeConfig(config: AIAutomationConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to store AI config:', error);
    }
  }

  /**
   * Retrieve and clear AI automation config from localStorage
   */
  static retrieveAndClearConfig(): AIAutomationConfig | null {
    try {
      const configString = localStorage.getItem(this.STORAGE_KEY);
      if (configString) {
        localStorage.removeItem(this.STORAGE_KEY);
        return JSON.parse(configString);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve AI config:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  /**
   * Check if there's a stored AI config
   */
  static hasStoredConfig(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
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
    'KOPLI': 5318008,
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
    5318008: 'Kopli Testnet',
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
   * Check if chain ID is supported
   */
  static isChainSupported(chainId: number): boolean {
    return Object.values(this.NETWORK_MAP).includes(chainId);
  }
}

export class MessageFormatter {
  /**
   * Format AI message content for display
   */
  static formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '<br>'); // Line breaks
  }

  /**
   * Extract automation parameters from AI message
   */
  static extractAutomationParams(message: string): {
    token?: string;
    percentage?: number;
    amount?: string;
  } {
    const params: any = {};

    // Extract tokens
    const tokenMatch = message.match(/\b(ETH|BTC|USDC|USDT|DAI|WBTC)\b/i);
    if (tokenMatch) {
      params.token = tokenMatch[1].toUpperCase();
    }

    // Extract percentage
    const percentageMatch = message.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentageMatch) {
      params.percentage = parseFloat(percentageMatch[1]);
    }

    // Extract amount
    const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI)/i);
    if (amountMatch) {
      params.amount = amountMatch[1];
    }

    return params;
  }

  /**
   * Generate confirmation message for automation config
   */
  static generateConfirmationMessage(config: AIAutomationConfig): string {
    const networkName = NetworkUtils.getNetworkNameFromChainId(parseInt(config.chainId));
    
    return `Perfect! Here's your stop order configuration:

💰 **Amount**: ${config.amount} ${config.tokenToSell || 'tokens'}
📉 **Trigger**: When price drops ${config.dropPercentage || 'X'}%
🔄 **Trade**: ${config.tokenToSell || 'Token'} → ${config.tokenToBuy || 'Token'}
🌐 **Network**: ${networkName}
💸 **Estimated Cost**: ${config.destinationFunding} ETH + ${config.rscFunding} REACT

Ready to deploy? This will require signing a few transactions.`;
  }
}

export class ValidationUtils {
  /**
   * Validate AI automation config
   */
  static validateConfig(config: AIAutomationConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.chainId) errors.push('Chain ID is required');
    if (!config.pairAddress) errors.push('Pair address is required');
    if (!config.clientAddress) errors.push('Client address is required');
    if (!config.coefficient) errors.push('Coefficient is required');
    if (!config.threshold) errors.push('Threshold is required');
    if (!config.amount) errors.push('Amount is required');
    if (!config.destinationFunding) errors.push('Destination funding is required');
    if (!config.rscFunding) errors.push('RSC funding is required');

    // Validate addresses
    if (config.pairAddress && !this.isValidAddress(config.pairAddress)) {
      errors.push('Invalid pair address');
    }
    if (config.clientAddress && !this.isValidAddress(config.clientAddress)) {
      errors.push('Invalid client address');
    }

    // Validate numeric values
    if (config.coefficient && isNaN(parseInt(config.coefficient))) {
      errors.push('Coefficient must be a number');
    }
    if (config.threshold && isNaN(parseInt(config.threshold))) {
      errors.push('Threshold must be a number');
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
}

export class AIAnalytics {
  /**
   * Track AI interaction events
   */
  static trackEvent(event: string, data?: any): void {
    // Implement analytics tracking here
    console.log(`AI Event: ${event}`, data);
    
    // Example: Send to analytics service
    // analytics.track(event, data);
  }

  /**
   * Track automation creation from AI
   */
  static trackAutomationCreated(config: AIAutomationConfig): void {
    this.trackEvent('ai_automation_created', {
      type: 'stop_order',
      network: config.chainId,
      amount: config.amount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track AI conversation started
   */
  static trackConversationStarted(): void {
    this.trackEvent('ai_conversation_started', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track AI message sent
   */
  static trackMessageSent(message: string, intent?: string): void {
    this.trackEvent('ai_message_sent', {
      messageLength: message.length,
      intent,
      timestamp: new Date().toISOString()
    });
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