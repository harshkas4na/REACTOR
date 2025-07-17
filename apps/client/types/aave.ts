export interface AaveProtectionConfig {
    chainId: string;
    userAddress: string;
    protectionType: string;
    healthFactorThreshold: string;
    targetHealthFactor: string;
    collateralAsset: string;
    debtAsset: string;
    preferDebtRepayment: boolean;
    deploymentReady: boolean;
    currentHealthFactor?: string;
    hasAavePosition?: boolean;
    userAaveAssets?: any[];
  }
  
  export interface StopOrderConfig {
    chainId: string;
    pairAddress: string;
    sellToken0: boolean;
    clientAddress: string;
    coefficient: string;
    threshold: string;
    amount: string;
    destinationFunding: string;
    rscFunding: string;
    tokenToSell?: string;
    tokenToBuy?: string;
    dropPercentage?: number;
    currentPrice?: number;
    targetPrice?: number;
    userBalance?: string;
    customTokenAddresses?: { [symbol: string]: string };
    deploymentReady: boolean;
  }