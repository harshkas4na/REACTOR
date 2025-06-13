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
      rpcUrl: 'https://sepolia.infura.io/v3/a4f144f3378f4e70821b6f28a428e429',
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

  private providers: { [chainId: number]: ethers.JsonRpcProvider } = {};

  // Updated token addresses with correct mappings
  private getTokenAddress(tokenSymbol: string, chainId: number): string | null {
    const tokenAddresses: { [key: string]: { [chainId: number]: string } } = {
      'ETH': {
        1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH Mainnet
        11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH Sepolia
        43114: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB' // WETH Avalanche
      },
      'USDC': {
        1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC Mainnet
        11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia
        43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' // USDC Avalanche
      },
      'USDT': {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Mainnet
        11155111: '0x6f14C02Fc1F78322cFd7d707aB90f18baD3B54f5', // USDT Sepolia
        43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' // USDT Avalanche
      },
      'DAI': {
        1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI Mainnet
        11155111: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // DAI Sepolia
        43114: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70' // DAI Avalanche
      },
      'WBTC': {
        1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC Mainnet
        43114: '0x50b7545627a5162F82A992c33b87aDc75187B218' // WBTC Avalanche
      }
    };

    const tokenSymbolUpper = tokenSymbol.toUpperCase();
    return tokenAddresses[tokenSymbolUpper]?.[chainId] || null;
  }

  constructor() {
    // Initialize providers with better error handling
    try {
      this.providers[1] = new ethers.JsonRpcProvider(
        process.env.ETH_MAINNET_RPC || 'https://ethereum.publicnode.com'
      );
      this.providers[43114] = new ethers.JsonRpcProvider(
        process.env.AVAX_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc'
      );
      this.providers[11155111] = new ethers.JsonRpcProvider(
        process.env.ETH_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/a4f144f3378f4e70821b6f28a428e429'
      );
    } catch (error) {
      console.error('Error initializing providers:', error);
    }
  }

  public getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return provider;
  }

  async getTokenBalance(walletAddress: string, tokenSymbol: string, chainId: number): Promise<string> {
    try {
      // Validate inputs
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      if (!tokenSymbol || typeof tokenSymbol !== 'string') {
        throw new Error('Invalid token symbol');
      }

      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol.toUpperCase()} not supported on chain ${chainId}`);
      }

      console.log(`Fetching balance for ${tokenSymbol} at ${tokenAddress} on chain ${chainId}`);

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Get balance and decimals concurrently
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      console.log(`Balance fetched: ${formattedBalance} ${tokenSymbol}`);
      
      return formattedBalance;
    } catch (error: any) {
      console.error('Error getting token balance:', error);
      throw new Error(`Failed to get ${tokenSymbol} balance: ${error.message}`);
    }
  }

  async findPairAddress(token0: string, token1: string, chainId: number): Promise<string | null> {
    try {
      // Validate inputs
      if (!token0 || !token1 || typeof token0 !== 'string' || typeof token1 !== 'string') {
        throw new Error('Invalid token symbols provided');
      }

      const provider = this.getProvider(chainId);
      const factoryAddress = this.chainConfigs[chainId]?.factoryAddress;
      
      if (!factoryAddress) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      
      const token0Address = this.getTokenAddress(token0.toUpperCase(), chainId);
      const token1Address = this.getTokenAddress(token1.toUpperCase(), chainId);
      
      if (!token0Address) {
        throw new Error(`Token ${token0.toUpperCase()} not supported on chain ${chainId}`);
      }
      
      if (!token1Address) {
        throw new Error(`Token ${token1.toUpperCase()} not supported on chain ${chainId}`);
      }

      console.log(`Finding pair for ${token0}/${token1} on chain ${chainId}`);
      console.log(`Token addresses: ${token0Address} / ${token1Address}`);

      const pairAddress = await factory.getPair(token0Address, token1Address);
      
      if (pairAddress === ethers.ZeroAddress) {
        console.log(`No pair found for ${token0}/${token1} on chain ${chainId}`);
        return null;
      }

      console.log(`Pair found: ${pairAddress}`);
      return pairAddress;
    } catch (error: any) {
      console.error('Error finding pair address:', error);
      throw new Error(`Failed to find ${token0}/${token1} pair: ${error.message}`);
    }
  }

  async getCurrentPrice(pairAddress: string, chainId: number): Promise<number> {
    try {
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address');
      }

      const provider = this.getProvider(chainId);
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      
      console.log(`Getting current price from pair: ${pairAddress}`);

      // Get reserves and token addresses
      const [reserves, token0Address, token1Address] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
        pair.token1()
      ]);

      const [reserves0, reserves1] = reserves;
      
      // Get decimals for both tokens
      const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
      const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);
      
      const [decimals0, decimals1] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals()
      ]);
      
      // Format reserves with proper decimals
      const reserve0 = Number(ethers.formatUnits(reserves0, decimals0));
      const reserve1 = Number(ethers.formatUnits(reserves1, decimals1));
      
      if (reserve0 === 0 || reserve1 === 0) {
        throw new Error('Insufficient liquidity in pair');
      }
      
      // Price of token1 in terms of token0
      const price = reserve1 / reserve0;
      
      console.log(`Current price: ${price} (reserve0: ${reserve0}, reserve1: ${reserve1})`);
      
      return price;
    } catch (error: any) {
      console.error('Error getting current price:', error);
      throw new Error(`Failed to get price: ${error.message}`);
    }
  }

  async isToken0(pairAddress: string, tokenSymbol: string, chainId: number): Promise<boolean> {
    try {
      if (!ethers.isAddress(pairAddress)) {
        throw new Error('Invalid pair address');
      }

      if (!tokenSymbol || typeof tokenSymbol !== 'string') {
        throw new Error('Invalid token symbol');
      }

      const provider = this.getProvider(chainId);
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const token0 = await pair.token0();
      const tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol.toUpperCase()} not supported on chain ${chainId}`);
      }
      
      // Convert both addresses to checksummed format for comparison
      const token0Checksummed = ethers.getAddress(token0);
      const tokenAddressChecksummed = ethers.getAddress(tokenAddress);
      
      const isToken0Result = token0Checksummed === tokenAddressChecksummed;
      
      console.log(`Token ${tokenSymbol} is token0: ${isToken0Result}`);
      console.log(`Token0: ${token0Checksummed}, TokenAddress: ${tokenAddressChecksummed}`);
      
      return isToken0Result;
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
    token0Address?: string;
    token1Address?: string;
    error?: string;
  }> {
    try {
      const pairAddress = await this.findPairAddress(token0Symbol, token1Symbol, chainId);
      
      if (!pairAddress) {
        console.log(`Pair ${token0Symbol}/${token1Symbol} does not exist on chain ${chainId}`);
        return { exists: false };
      }
      
      const provider = this.getProvider(chainId);
      const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      
      const [reserves, token0Address, token1Address] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.token1()
      ]);
      
      const [reserves0, reserves1] = reserves;
      
      // Check if pair has meaningful liquidity
      if (reserves0.toString() === '0' || reserves1.toString() === '0') {
        console.log(`Pair ${token0Symbol}/${token1Symbol} exists but has no liquidity`);
        return { exists: false };
      }
      
      const currentPrice = await this.getCurrentPrice(pairAddress, chainId);
      
      console.log(`Pair validation successful for ${token0Symbol}/${token1Symbol}`);
      
      return {
        exists: true,
        pairAddress,
        currentPrice,
        reserve0: ethers.formatUnits(reserves0, 18),
        reserve1: ethers.formatUnits(reserves1, 18),
        token0Address,
        token1Address
      };
    } catch (error: any) {
      console.error(`Error validating pair ${token0Symbol}/${token1Symbol}:`, error);
      return { 
        exists: false,
        // Include error info for debugging
        error: error.message 
      };
    }
  }

  async getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    try {
      if (tokenSymbol.toUpperCase() === 'ETH' || tokenSymbol.toUpperCase() === 'AVAX') {
        return 18; // Native tokens have 18 decimals
      }
      
      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      if (!tokenAddress) {
        throw new Error(`Token ${tokenSymbol.toUpperCase()} not supported on chain ${chainId}`);
      }
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        provider
      );
      
      const decimals = await tokenContract.decimals();
      console.log(`${tokenSymbol} decimals: ${decimals}`);
      
      return Number(decimals);
    } catch (error: any) {
      console.error(`Error fetching decimals for ${tokenSymbol}:`, error);
      return 18; // Default to 18 decimals
    }
  }

  async getTokenInfo(tokenSymbol: string, chainId: number): Promise<{
    address: string;
    symbol: string;
    decimals: number;
    name?: string;
  } | null> {
    try {
      const tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      if (!tokenAddress) {
        return null;
      }
      
      const provider = this.getProvider(chainId);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const [symbol, decimals, name] = await Promise.all([
        tokenContract.symbol().catch(() => tokenSymbol.toUpperCase()),
        tokenContract.decimals().catch(() => 18),
        tokenContract.name().catch(() => tokenSymbol.toUpperCase())
      ]);
      
      return {
        address: tokenAddress,
        symbol,
        decimals: Number(decimals),
        name
      };
    } catch (error: any) {
      console.error(`Error getting token info for ${tokenSymbol}:`, error);
      return null;
    }
  }

  getSupportedTokens(chainId: number): string[] {
    const tokensByChain: { [chainId: number]: string[] } = {
      1: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC'],
      11155111: ['ETH', 'USDC', 'USDT', 'DAI'],
      43114: ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC']
    };
    
    return tokensByChain[chainId] || [];
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
        destinationContractDeployment: '0.05 ' + (this.chainConfigs[chainId]?.nativeCurrency || 'ETH'),
        tokenApproval: '0.01 ' + (this.chainConfigs[chainId]?.nativeCurrency || 'ETH'),
        rscDeployment: '0.08 ' + (this.chainConfigs[chainId]?.nativeCurrency || 'ETH')
      };
    }
  }

  // New method to get comprehensive pair information
  async getPairInfo(token0Symbol: string, token1Symbol: string, chainId: number): Promise<{
    exists: boolean;
    pairAddress?: string;
    token0Info?: any;
    token1Info?: any;
    reserves?: { reserve0: string; reserve1: string };
    currentPrice?: number;
    priceImpact?: number;
  }> {
    try {
      const validation = await this.validatePairExists(token0Symbol, token1Symbol, chainId);
      
      if (!validation.exists || !validation.pairAddress) {
        return { exists: false };
      }
      
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(token0Symbol, chainId),
        this.getTokenInfo(token1Symbol, chainId)
      ]);
      
      return {
        exists: true,
        pairAddress: validation.pairAddress,
        token0Info,
        token1Info,
        reserves: {
          reserve0: validation.reserve0!,
          reserve1: validation.reserve1!
        },
        currentPrice: validation.currentPrice
      };
    } catch (error: any) {
      console.error(`Error getting pair info:`, error);
      return { exists: false };
    }
  }
}