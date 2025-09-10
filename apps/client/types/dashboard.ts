// ===== DASHBOARD SPECIFIC TYPES =====

export enum OrderStatus {
    Active = 0,
    Cancelled = 1,
    Executed = 2,
    Failed = 3
  }
  
  export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance?: string;
  }
  
  export interface StopOrder {
    id: number;
    pair: string;
    client: string;
    token0: boolean;
    coefficient: string;
    threshold: string;
    status: OrderStatus;
    triggered: boolean;
    createdAt: number;
    updatedAt: number;
    // Derived fields
    tokenSell?: Token;
    tokenBuy?: Token;
    amount?: string;
    currentPrice?: string;
    dropPercentage?: number;
    triggerPrice?: string;
    contractAddress?: string;
  }
  
  export interface ContractBalances {
    callbackBalance: string;
    rscBalance: string;
    isLoading: boolean;
    lastUpdated: number;
  }
  
  export interface UserContractAddresses {
    reactiveContract: string;
    callbackContract: string;
    deployedAt: number;
    chainId: string;
    deployer: string;
  }
  
  export interface ChainConfig {
    id: string;
    name: string;
    dexName: string;
    routerAddress: string;
    factoryAddress: string;
    callbackAddress: string;
    rpcUrl?: string;
    nativeCurrency: string;
    defaultFunding: string;
    isComingSoon?: boolean;
    rscNetwork: {
      chainId: string;
      name: string;
      rpcUrl: string;
      currencySymbol: string;
      explorerUrl: string;
      callbackProxyAddress: string;
      systemContractAddress: string;
    };
  }