import { ethers } from "ethers";

// utils/aave-helpers.ts
export const getProtectionTypeLabel = (type: string): string => {
    const types: { [key: string]: string } = {
      '0': 'Collateral Deposit Only',
      '1': 'Debt Repayment Only',
      '2': 'Combined Protection'
    };
    return types[type] || 'Unknown';
  };
  
  export const getHealthFactorStatus = (healthFactor: string): {
    color: string;
    bg: string;
    status: string;
  } => {
    const hf = parseFloat(healthFactor);
    
    if (hf > 1.5) {
      return {
        color: 'text-green-400',
        bg: 'bg-green-900/20 border-green-500/30',
        status: 'Healthy'
      };
    } else if (hf > 1.2) {
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-900/20 border-amber-500/30',
        status: 'At Risk'
      };
    } else {
      return {
        color: 'text-red-400',
        bg: 'bg-red-900/20 border-red-500/30',
        status: 'Critical'
      };
    }
  };
  
  export const validateAaveConfig = (config: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Required fields
    if (!config.chainId) errors.push('Chain ID is required');
    if (!config.userAddress) errors.push('User address is required');
    if (!config.protectionType) errors.push('Protection type is required');
    if (!config.healthFactorThreshold) errors.push('Health factor threshold is required');
    if (!config.targetHealthFactor) errors.push('Target health factor is required');
    
    // Address validation
    if (config.userAddress && !ethers.isAddress(config.userAddress)) {
      errors.push('Invalid user address');
    }
    
    // Numeric validation
    if (config.healthFactorThreshold && isNaN(parseFloat(config.healthFactorThreshold))) {
      errors.push('Health factor threshold must be a number');
    }
    
    if (config.targetHealthFactor && isNaN(parseFloat(config.targetHealthFactor))) {
      errors.push('Target health factor must be a number');
    }
    
    // Logic validation
    if (config.healthFactorThreshold && config.targetHealthFactor) {
      const threshold = parseFloat(config.healthFactorThreshold);
      const target = parseFloat(config.targetHealthFactor);
      
      if (threshold <= 1.0) {
        errors.push('Health factor threshold must be greater than 1.0');
      }
      
      if (target <= threshold) {
        errors.push('Target health factor must be higher than threshold');
      }
    }
    
    // Asset validation based on protection type
    if (config.protectionType === '0' || config.protectionType === '2') {
      if (!config.collateralAsset) {
        errors.push('Collateral asset is required for this protection type');
      }
    }
    
    if (config.protectionType === '1' || config.protectionType === '2') {
      if (!config.debtAsset) {
        errors.push('Debt asset is required for this protection type');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };