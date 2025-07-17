// utils/ai-extensions.ts
import { AaveProtectionConfig, StopOrderConfig } from '../types/aave';
import { validateAaveConfig } from './aave-helper';

export class AIConfigExtensions {
  static isAaveConfig(config: any): config is AaveProtectionConfig {
    return config && 
           typeof config === 'object' &&
           'protectionType' in config &&
           'healthFactorThreshold' in config &&
           'targetHealthFactor' in config;
  }

  static isStopOrderConfig(config: any): config is StopOrderConfig {
    return config && 
           typeof config === 'object' &&
           'pairAddress' in config &&
           'coefficient' in config &&
           'threshold' in config;
  }

  static getConfigType(config: any): 'aave_protection' | 'stop_order' | 'unknown' {
    if (this.isAaveConfig(config)) return 'aave_protection';
    if (this.isStopOrderConfig(config)) return 'stop_order';
    return 'unknown';
  }

  static validateConfig(config: any): { isValid: boolean; errors: string[]; type: string } {
    const type = this.getConfigType(config);
    
    switch (type) {
      case 'aave_protection':
        const aaveValidation = validateAaveConfig(config);
        return { ...aaveValidation, type };
      
      case 'stop_order':
        // Add stop order validation logic here
        return { isValid: true, errors: [], type };
      
      default:
        return { isValid: false, errors: ['Unknown configuration type'], type };
    }
  }
}