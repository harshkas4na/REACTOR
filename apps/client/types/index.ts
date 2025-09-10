// ===== SHARED TYPES =====

export interface ChainConfig {
    id: string;
    name: string;
    dexName: string;
    routerAddress: string;
    factoryAddress: string;
    callbackAddress: string;
    callbackProxyAddress: string;
    rpcUrl?: string;
    nativeCurrency: string;
    defaultFunding: string;
    warningThreshold: number;
    isComingSoon?: boolean;
    rscNetwork: {
      chainId: string;
      name: string;
      rpcUrl: string;
      currencySymbol: string;
      explorerUrl: string;
      callbackProxyAddress: string;
      systemContractAddress: string;
      warningThreshold: number;
    };
  }
  
  export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    balance?: string;
  }
  
  export interface TradingPair {
    token0: Token;
    token1: Token;
    pairAddress: string;
    reserve0: string;
    reserve1: string;
    currentPrice: number;
  }
  
  export interface StopOrderFormData {
    chainId: string;
    selectedPair: TradingPair | null;
    sellToken: Token | null;
    buyToken: Token | null;
    sellToken0: boolean;
    clientAddress: string;
    coefficient: string;
    threshold: string;
    amount: string;
    destinationFunding: string;
    rscFunding: string;
    dropPercentage: string;
    currentPrice: string;
    stopPrice: string;
  }
  
  export interface UserContractAddresses {
    reactiveContract: string;
    callbackContract: string;
    deployedAt: number;
    chainId: string;
    deployer: string;
  }
  
  export interface SimpleContractStatus {
    callbackBalance: number;
    rscBalance: number;
    callbackDebt: string;
    rscDebt: string;
    isActive: boolean;
    needsFunding: boolean;
    lastChecked: number;
  }
  
  export type DeploymentStep = 
    | 'idle' 
    | 'checking-contracts' 
    | 'checking-approval' 
    | 'approving' 
    | 'switching-rsc' 
    | 'funding-rsc' 
    | 'deploying-callback' 
    | 'deploying-reactive' 
    | 'creating-order' 
    | 'complete' 
    | 'storing-contracts';