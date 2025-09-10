import { ChainConfig, Token } from '../types';

// ===== CHAIN CONFIGURATION =====
export const SUPPORTED_CHAINS: ChainConfig[] = [
  { 
    id: '11155111', 
    name: 'Ethereum Sepolia',
    dexName: 'Uniswap V2',
    routerAddress: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    factoryAddress: '0x7E0987E5b3a30e3f2828572Bb659A548460a3003',
    callbackAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    callbackProxyAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeCurrency: 'ETH',
    defaultFunding: '0.03',
    warningThreshold: 0.005,
    rscNetwork: {
      chainId: '5318007',
      name: 'Reactive Lasna',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'REACT',
      explorerUrl: 'https://lasna.reactscan.net',
      callbackProxyAddress: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
      systemContractAddress: '0x59F30360c984ee7A4a84F3Ba61930DD9e79784A4',
      warningThreshold: 0.001
    }
  }
];

export const POPULAR_TOKENS: Record<string, Token[]> = {
  '11155111': [
    { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ]
};

// ===== CONTRACT CONSTANTS =====
export const SYSTEM_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000fffFfF";

export const DEBT_AND_STATUS_ABI = [
  "function active() view returns (bool)",
  "function debt() view returns (uint256)"
];

export const SYSTEM_CONTRACT_ABI = [
  "function debts(address) view returns (uint256)",
  "function reserves(address) view returns (uint256)",
  "function depositTo(address contractAddress) payable"
];