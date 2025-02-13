import { ethers } from 'ethers';

interface RSCValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface RSCCheckConfig {
  minGasLimit: number;
  maxGasLimit: number;
  requiredInterfaces: string[];
}

export class RSCChecker {
  private config: RSCCheckConfig;

  constructor(config?: Partial<RSCCheckConfig>) {
    this.config = {
      minGasLimit: 100000,
      maxGasLimit: 3000000,
      requiredInterfaces: ['AbstractReactive', 'AbstractPausableReactive'],
      ...config
    };
  }

  public validateRSC(sourceCode: string): RSCValidationResult {
    const result: RSCValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check interface implementation
    if (!this.checkInterfaceImplementation(sourceCode)) {
      result.errors.push('Contract must implement AbstractReactive or AbstractPausableReactive');
      result.isValid = false;
    }

    // Check core functions
    if (!this.checkCoreFunctions(sourceCode)) {
      result.errors.push('Missing required core functions');
      result.isValid = false;
    }

    // Check event subscriptions
    const subscriptionCheck = this.checkEventSubscriptions(sourceCode);
    if (!subscriptionCheck.valid) {
      result.errors.push(subscriptionCheck.error as string);
      result.isValid = false;
    }

    // Check chain configuration
    const chainCheck = this.checkChainConfiguration(sourceCode);
    if (!chainCheck.valid) {
      result.errors.push(chainCheck.error as string);
      result.isValid = false;
    }

    // Check callback implementation
    const callbackCheck = this.checkCallbackImplementation(sourceCode);
    if (!callbackCheck.valid) {
      result.errors.push(callbackCheck.error as string);
      result.isValid = false;
    }

    // Check contract addresses
    if (!this.validateContractAddresses(sourceCode)) {
      result.errors.push('Invalid contract addresses defined');
      result.isValid = false;
    }

    // Check gas limits
    const gasCheck = this.checkGasLimits(sourceCode);
    if (!gasCheck.valid) {
      result.warnings.push(gasCheck.warning as string);
    }

    return result;
  }

  private checkInterfaceImplementation(sourceCode: string): boolean {
    return this.config.requiredInterfaces.some(
      (interface2) => sourceCode.includes(`contract`) && 
                  sourceCode.includes(`is ${interface2}`)
    );
  }

  private checkCoreFunctions(sourceCode: string): boolean {
    const requiredFunctions = [
      'react(',
      'receive() external payable',
    ];

    return requiredFunctions.every(func => sourceCode.includes(func));
  }

  private checkEventSubscriptions(sourceCode: string): { valid: boolean; error?: string } {
    // Check for at least one subscription
    if (!sourceCode.includes('service.subscribe(')) {
      return { valid: false, error: 'No event subscriptions found' };
    }

    // Check topic format
    const topicRegex = /0x[0-9a-fA-F]{64}/;
    const topics = sourceCode.match(/EVENT_\d+_TOPIC_\d+\s*=\s*(0x[0-9a-fA-F]+)/g);
    
    if (!topics || !topics.every(topic => topicRegex.test(topic))) {
      return { valid: false, error: 'Invalid event topic format' };
    }

    return { valid: true };
  }

  private checkChainConfiguration(sourceCode: string): { valid: boolean; error?: string } {
    const chainIdRegex = /CHAIN_ID\s*=\s*(\d+)/g;
    const chainIds = sourceCode.match(chainIdRegex);

    if (!chainIds) {
      return { valid: false, error: 'No chain IDs defined' };
    }

    return { valid: true };
  }

  private checkCallbackImplementation(sourceCode: string): { valid: boolean; error?: string } {
    if (!sourceCode.includes('emit Callback(')) {
      return { valid: false, error: 'No callback emissions found' };
    }

    if (!sourceCode.includes('abi.encodeWithSignature(')) {
      return { valid: false, error: 'Callback payload not properly encoded' };
    }

    return { valid: true };
  }

  private validateContractAddresses(sourceCode: string): boolean {
    const addressRegex = /0x[0-9a-fA-F]{40}/;
    const addresses = [
      ...sourceCode.matchAll(/ORIGIN_CONTRACT\s*=\s*(0x[0-9a-fA-F]{40})/g),
      ...sourceCode.matchAll(/DESTINATION_CONTRACT\s*=\s*(0x[0-9a-fA-F]{40})/g)
    ];

    return addresses.length > 0 && 
           addresses.every(match => addressRegex.test(match[1]));
  }

  private checkGasLimits(sourceCode: string): { valid: boolean; warning?: string } {
    const gasLimitMatch = sourceCode.match(/CALLBACK_GAS_LIMIT\s*=\s*(\d+)/);
    
    if (gasLimitMatch) {
      const gasLimit = parseInt(gasLimitMatch[1]);
      if (gasLimit < this.config.minGasLimit || gasLimit > this.config.maxGasLimit) {
        return {
          valid: false,
          warning: `Gas limit ${gasLimit} is outside recommended range (${this.config.minGasLimit}-${this.config.maxGasLimit})`
        };
      }
    }

    return { valid: true };
  }
}