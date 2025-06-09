import { ethers } from 'ethers';

// Import ABIs
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 amount)',
  'event Approval(address indexed owner, address indexed spender, uint256 amount)'
];

const PAIR_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function price0CumulativeLast() view returns (uint256)',
  'function price1CumulativeLast() view returns (uint256)',
  'function kLast() view returns (uint256)',
  'function mint(address to) returns (uint256 liquidity)',
  'function burn(address to) returns (uint256 amount0, uint256 amount1)',
  'function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)',
  'function sync()',
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1)',
  'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)',
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  'event Sync(uint112 reserve0, uint112 reserve1)'
];

const FACTORY_ABI = [
  'function feeTo() view returns (address)',
  'function feeToSetter() view returns (address)',
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
  'function allPairs(uint256) view returns (address pair)',
  'function allPairsLength() view returns (uint256)',
  'function createPair(address tokenA, address tokenB) returns (address pair)',
  'function setFeeTo(address)',
  'function setFeeToSetter(address)',
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)'
];

interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  factoryAddress: string;
  nativeCurrency: string;
}

export class BlockchainService {
  private chainConfigs: { [key: number]: ChainConfig } = {
    1: {
      id: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://ethereum.publicnode.com',
      factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      nativeCurrency: 'ETH'
    },
    11155111: {
      id: 11155111,
      name: 'Ethereum Sepolia',
      rpcUrl: 'https://rpc.sepolia.org',
      factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
      nativeCurrency: 'ETH'
    },
    43114: {
      id: 43114,
      name: 'Avalanche C-Chain',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
      nativeCurrency: 'AVAX'
    }
  };

  private tokenAddresses: { [chainId: number]: { [symbol: string]: string } } = {
    1: { // Ethereum Mainnet
      'ETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      'USDC': '0xA0b86a33E6441c476c4b51C93fd0e603F0E07d4E',
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    },
    11155111: { // Sepolia
      'ETH': '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
      'USDC': '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
      'USDT': '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
      'DAI': '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357'
    },
    43114: { // Avalanche
      'ETH': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', // WETH
      'USDC': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      'USDT': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      'DAI': '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
    }
  };

  private providers: { [chainId: number]: ethers.JsonRpcProvider } = {};
  private factoryAddresses: { [chainId: number]: string } = {
    1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Ethereum Mainnet
    43114: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88', // Avalanche
    11155111: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' // Sepolia
  };

  constructor() {
    // Initialize providers
    this.providers[1] = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC || 'https://ethereum.publicnode.com');
    this.providers[43114] = new ethers.JsonRpcProvider(process.env.AVAX_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc');
    this.providers[11155111] = new ethers.JsonRpcProvider(process.env.ETH_SEPOLIA_RPC || 'https://rpc.sepolia.org');
  }

  public getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return provider;
  }

  private getTokenAddress(tokenSymbol: string, chainId: number): string | null {
    const tokenAddresses: { [key: string]: { [chainId: number]: string } } = {
      'ETH': {
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9' // WETH Sepolia
      },
      'USDC': {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
      },
      'USDT': {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        11155111: '0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5'
      },
      'DAI': {
        1: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        43114: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
        11155111: '0x68194a729C2450ad26072b3D33ADaCbcef39D574'
      }
    };

    return tokenAddresses[tokenSymbol]?.[chainId] || null;
  }

  async getTokenBalance(walletAddress: string, tokenSymbol: string, chainId: number): Promise<string> {
    try {
      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbol, chainId);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(walletAddress);
      
      return ethers.formatUnits(balance, await tokenContract.decimals());
    } catch (error: any) {
      console.error('Error getting token balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  async findPairAddress(token0: string, token1: string, chainId: number): Promise<string | null> {
    try {
      const provider = this.getProvider(chainId);
      const factoryAddress = this.factoryAddresses[chainId];
      
      if (!factoryAddress) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const token0Address = this.getTokenAddress(token0, chainId);
      const token1Address = this.getTokenAddress(token1, chainId);
      
      if (!token0Address || !token1Address) {
        throw new Error('Invalid token addresses');
      }

      const pairAddress = await factory.getPair(token0Address, token1Address);
      
      if (pairAddress === ethers.ZeroAddress) {
        return null;
      }

      return pairAddress;
    } catch (error: any) {
      console.error('Error finding pair address:', error);
      throw new Error(`Failed to find pair: ${error.message}`);
    }
  }

  async getCurrentPrice(pairAddress: string, chainId: number): Promise<number> {
    try {
      const provider = this.getProvider(chainId);
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      
      const [reserves0, reserves1] = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
      const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
      
      const decimals0 = await token0Contract.decimals();
      const decimals1 = await token1Contract.decimals();
      
      const reserve0 = Number(ethers.formatUnits(reserves0, decimals0));
      const reserve1 = Number(ethers.formatUnits(reserves1, decimals1));
      
      return reserve1 / reserve0;
    } catch (error: any) {
      console.error('Error getting current price:', error);
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  async isToken0(pairAddress: string, tokenSymbol: string, chainId: number): Promise<boolean> {
    try {
      const provider = this.getProvider(chainId);
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const token0 = await pair.token0();
      const tokenAddress = this.getTokenAddress(tokenSymbol, chainId);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
      }
      
      // Convert both addresses to lowercase for comparison
      const token0Lower = token0.toLowerCase();
      const tokenAddressLower = tokenAddress.toLowerCase();
      
      return token0Lower === tokenAddressLower;
    } catch (error: any) {
      console.error('Error checking token0:', error);
      throw new Error(`Failed to check token0: ${error.message}`);
    }
  }

  async validatePairExists(token0Symbol: string, token1Symbol: string, chainId: number): Promise<{
    exists: boolean;
    pairAddress?: string;
    currentPrice?: number;
    reserve0?: string;
    reserve1?: string;
  }> {
    try {
      const pairAddress = await this.findPairAddress(token0Symbol, token1Symbol, chainId);
      
      if (!pairAddress) {
        return { exists: false };
      }
      
      const provider = this.getProvider(chainId);
      const pairContract = new ethers.Contract(
        pairAddress,
        ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
        provider
      );
      
      const reserves = await pairContract.getReserves();
      const currentPrice = Number(reserves.reserve1) / Number(reserves.reserve0);
      
      return {
        exists: true,
        pairAddress,
        currentPrice,
        reserve0: ethers.formatUnits(reserves.reserve0, 18),
        reserve1: ethers.formatUnits(reserves.reserve1, 18)
      };
    } catch (error: any) {
      console.error(`Error validating pair:`, error);
      return { exists: false };
    }
  }

  async getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    try {
      if (tokenSymbol.toUpperCase() === 'ETH' || tokenSymbol.toUpperCase() === 'AVAX') {
        return 18; // Native tokens have 18 decimals
      }
      
      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbol, chainId);
      
      const tokenContract = new ethers.Contract(
        tokenAddress as string,
        ['function decimals() view returns (uint8)'],
        provider
      );
      
      return await tokenContract.decimals();
    } catch (error: any) {
      console.error(`Error fetching decimals for ${tokenSymbol}:`, error);
      return 18; // Default to 18 decimals
    }
  }

  getSupportedTokens(chainId: number): string[] {
    const chainTokens = this.tokenAddresses[chainId];
    return chainTokens ? Object.keys(chainTokens) : [];
  }

  getSupportedChains(): ChainConfig[] {
    return Object.values(this.chainConfigs);
  }

  isChainSupported(chainId: number): boolean {
    return chainId in this.chainConfigs;
  }

  getChainConfig(chainId: number): ChainConfig | null {
    return this.chainConfigs[chainId] || null;
  }

  // Helper method to convert percentage to basis points for threshold calculation
  convertPercentageToBasisPoints(percentage: number): number {
    return Math.floor((100 - percentage) * 10); // For drops, we want (100 - drop%)
  }

  // Helper method to estimate gas costs for transactions
  async estimateGasCosts(chainId: number): Promise<{
    destinationContractDeployment: string;
    tokenApproval: string;
    rscDeployment: string;
  }> {
    try {
      const provider = this.getProvider(chainId);
      const gasPrice = await provider.getFeeData();
      const config = this.chainConfigs[chainId];
      
      // Rough estimates based on contract complexity
      const estimatedGas = {
        destinationContractDeployment: 800000n, // ~800k gas
        tokenApproval: 50000n,                  // ~50k gas
        rscDeployment: 1200000n                 // ~1.2M gas
      };
      
      const estimates: any = {};
      
      for (const [operation, gas] of Object.entries(estimatedGas)) {
        const cost = gas * (gasPrice.gasPrice || 20000000000n); // Fallback to 20 gwei
        estimates[operation] = ethers.formatEther(cost) + ' ' + config.nativeCurrency;
      }
      
      return estimates;
    } catch (error: any) {
      console.error(`Error estimating gas costs:`, error);
      // Return fallback estimates
      return {
        destinationContractDeployment: '0.05 ' + this.chainConfigs[chainId]?.nativeCurrency || 'ETH',
        tokenApproval: '0.01 ' + this.chainConfigs[chainId]?.nativeCurrency || 'ETH',
        rscDeployment: '0.08 ' + this.chainConfigs[chainId]?.nativeCurrency || 'ETH'
      };
    }
  }
} 