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
  nativeDecimals: number;
}

export class BlockchainService {
  private chainConfigs: { [key: number]: ChainConfig } = {
    1: {
      id: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://ethereum.publicnode.com',
      factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // Uniswap V2
      nativeCurrency: 'ETH',
      nativeDecimals: 18
    },
    11155111: {
      id: 11155111,
      name: 'Ethereum Sepolia',
      rpcUrl: 'https://sepolia.infura.io/v3/a4f144f3378f4e70821b6f28a428e429',
      factoryAddress: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6', // Uniswap V2 on Sepolia
      nativeCurrency: 'ETH',
      nativeDecimals: 18
    },
    43114: {
      id: 43114,
      name: 'Avalanche C-Chain',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      factoryAddress: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88', // Pangolin
      nativeCurrency: 'AVAX',
      nativeDecimals: 18
    }
  };

  private providers: { [chainId: number]: ethers.JsonRpcProvider } = {};

  // Extended token addresses with more tokens and correct addresses
  private tokenAddresses: { [key: string]: { [chainId: number]: string } } = {
    // Wrapped native tokens
    'WETH': {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH Mainnet
      11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH Sepolia (verified)
      43114: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB' // WETH.e on Avalanche
    },
    'WAVAX': {
      43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' // WAVAX on Avalanche
    },
    // Stablecoins
    'USDC': {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC Mainnet
      11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC Sepolia (Circle official)
      43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' // Native USDC on Avalanche
    },
    'USDC.e': {
      43114: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664' // Bridged USDC on Avalanche
    },
    'USDT': {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT Mainnet
      11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // USDT Sepolia (custom)
      43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' // USDT on Avalanche
    },
    'USDT.e': {
      43114: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118' // Bridged USDT on Avalanche
    },
    'DAI': {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI Mainnet
      11155111: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // DAI Sepolia (custom)
      43114: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70' // DAI.e on Avalanche
    },
    // Bitcoin representations
    'WBTC': {
      1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC Mainnet
      43114: '0x50b7545627a5162F82A992c33b87aDc75187B218' // WBTC.e on Avalanche
    },
    'BTC.b': {
      43114: '0x152b9d0FdC40C096757F570A51E494bd4b943E50' // Bitcoin on Avalanche
    },
    // Additional DeFi tokens
    'LINK': {
      1: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Chainlink Mainnet
      43114: '0x5947BB275c521040051D82396192181b413227A3' // LINK.e on Avalanche
    },
    'AAVE': {
      1: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE Mainnet
      43114: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9' // AAVE.e on Avalanche
    },
    'UNI': {
      1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI Mainnet
    },
    'MKR': {
      1: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', // MKR Mainnet
    },
    'SNX': {
      1: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', // SNX Mainnet
    },
    'CRV': {
      1: '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV Mainnet
    },
    // Avalanche ecosystem tokens
    'PNG': {
      43114: '0x60781C2586D68229fde47564546784ab3fACA982' // Pangolin token
    },
    'JOE': {
      43114: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd' // TraderJoe token
    },
    'QI': {
      43114: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5' // BENQI token
    }
  };

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

  public getChainConfig(chainId: number): ChainConfig | null {
    return this.chainConfigs[chainId] || null;
  }

  // Get token address with fallback for native currency
  protected getTokenAddress(tokenSymbol: string, chainId: number): string | null {
    const tokenSymbolUpper = tokenSymbol.toUpperCase();
    
    // Check direct match first
    if (this.tokenAddresses[tokenSymbolUpper]?.[chainId]) {
      return this.tokenAddresses[tokenSymbolUpper][chainId];
    }
    
    // Handle wrapped native tokens
    const config = this.chainConfigs[chainId];
    if (config) {
      // ETH -> WETH mapping
      if (tokenSymbolUpper === 'ETH' && config.nativeCurrency === 'ETH') {
        return this.tokenAddresses['WETH']?.[chainId] || null;
      }
      // AVAX -> WAVAX mapping
      if (tokenSymbolUpper === 'AVAX' && config.nativeCurrency === 'AVAX') {
        return this.tokenAddresses['WAVAX']?.[chainId] || null;
      }
    }
    
    return null;
  }

  private isNativeToken(tokenSymbol: string, chainId: number): boolean {
    const config = this.chainConfigs[chainId];
    if (!config) return false;
    
    const tokenUpper = tokenSymbol.toUpperCase();
    return tokenUpper === config.nativeCurrency.toUpperCase();
  }

  async getNativeBalance(walletAddress: string, chainId: number): Promise<string> {
    try {
      // Validate inputs
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const provider = this.getProvider(chainId);
      const balance = await provider.getBalance(walletAddress);
      const formattedBalance = ethers.formatEther(balance);
      
      const config = this.chainConfigs[chainId];
      const nativeCurrency = config?.nativeCurrency || 'ETH';
      
      console.log(`Native ${nativeCurrency} balance fetched: ${formattedBalance}`);
      
      return formattedBalance;
    } catch (error: any) {
      console.error('Error getting native balance:', error);
      throw new Error(`Failed to get native balance: ${error.message}`);
    }
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

      const tokenSymbolUpper = tokenSymbol.toUpperCase();

      // Handle native tokens (ETH on Ethereum, AVAX on Avalanche)
      if (this.isNativeToken(tokenSymbolUpper, chainId)) {
        console.log(`Fetching native ${tokenSymbolUpper} balance on chain ${chainId}`);
        return await this.getNativeBalance(walletAddress, chainId);
      }

      // Handle ERC-20 tokens
      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbolUpper, chainId);
      
      if (!tokenAddress) {
        // Return a more helpful error message
        const supportedTokens = this.getSupportedTokens(chainId);
        throw new Error(
          `Token ${tokenSymbolUpper} not found on chain ${chainId}. ` +
          `Supported tokens: ${supportedTokens.join(', ')}. ` +
          `For other tokens, please provide the contract address.`
        );
      }

      console.log(`Fetching ERC-20 ${tokenSymbol} balance at ${tokenAddress} on chain ${chainId}`);

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Get balance and decimals concurrently
      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals()
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      console.log(`ERC-20 balance fetched: ${formattedBalance} ${tokenSymbol}`);
      
      return formattedBalance;
    } catch (error: any) {
      console.error('Error getting token balance:', error);
      throw new Error(`Failed to get ${tokenSymbol} balance: ${error.message}`);
    }
  }

  // New method to get balance using custom token address
  async getTokenBalanceByAddress(
    walletAddress: string, 
    tokenAddress: string, 
    chainId: number
  ): Promise<{ balance: string; symbol: string; decimals: number }> {
    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }
      
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const provider = this.getProvider(chainId);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      // Get token info and balance
      const [balance, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(walletAddress),
        tokenContract.decimals(),
        tokenContract.symbol().catch(() => 'UNKNOWN')
      ]);
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      console.log(`Custom token balance fetched: ${formattedBalance} ${symbol} at ${tokenAddress}`);
      
      return {
        balance: formattedBalance,
        symbol,
        decimals: Number(decimals)
      };
    } catch (error: any) {
      console.error('Error getting custom token balance:', error);
      throw new Error(`Failed to get token balance at ${tokenAddress}: ${error.message}`);
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
      
      // Get token addresses
      let token0Address = this.getTokenAddress(token0.toUpperCase(), chainId);
      let token1Address = this.getTokenAddress(token1.toUpperCase(), chainId);
      
      // Check if addresses are provided directly (for custom tokens)
      if (!token0Address && ethers.isAddress(token0)) {
        token0Address = token0;
      }
      if (!token1Address && ethers.isAddress(token1)) {
        token1Address = token1;
      }
      
      if (!token0Address) {
        throw new Error(`Token ${token0.toUpperCase()} not supported on chain ${chainId}. Please provide the contract address.`);
      }
      
      if (!token1Address) {
        throw new Error(`Token ${token1.toUpperCase()} not supported on chain ${chainId}. Please provide the contract address.`);
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
      
      // Price of token0 in terms of token1
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
      
      let tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      // Check if it's a custom address
      if (!tokenAddress && ethers.isAddress(tokenSymbol)) {
        tokenAddress = tokenSymbol;
      }
      
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
      
      // Get decimals for proper formatting
      const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
      const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);
      
      const [decimals0, decimals1] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals()
      ]);
      
      console.log(`Pair validation successful for ${token0Symbol}/${token1Symbol}`);
      
      return {
        exists: true,
        pairAddress,
        currentPrice,
        reserve0: ethers.formatUnits(reserves0, decimals0),
        reserve1: ethers.formatUnits(reserves1, decimals1),
        token0Address,
        token1Address
      };
    } catch (error: any) {
      console.error(`Error validating pair ${token0Symbol}/${token1Symbol}:`, error);
      return { 
        exists: false,
        error: error.message 
      };
    }
  }

  async getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    try {
      const config = this.chainConfigs[chainId];
      
      // Native tokens have 18 decimals
      if (this.isNativeToken(tokenSymbol, chainId)) {
        return config?.nativeDecimals || 18;
      }
      
      const provider = this.getProvider(chainId);
      let tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      // Check if it's a custom address
      if (!tokenAddress && ethers.isAddress(tokenSymbol)) {
        tokenAddress = tokenSymbol;
      }
      
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
      let tokenAddress = this.getTokenAddress(tokenSymbol.toUpperCase(), chainId);
      
      // Check if it's a custom address
      if (!tokenAddress && ethers.isAddress(tokenSymbol)) {
        tokenAddress = tokenSymbol;
      }
      
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
    const config = this.chainConfigs[chainId];
    if (!config) return [];
    
    // Get all tokens that have addresses for this chain
    const supportedTokens = new Set<string>();
    
    // Add native currency
    supportedTokens.add(config.nativeCurrency);
    
    // Add all tokens with addresses on this chain
    for (const [tokenSymbol, addresses] of Object.entries(this.tokenAddresses)) {
      if (addresses[chainId]) {
        supportedTokens.add(tokenSymbol);
      }
    }
    
    return Array.from(supportedTokens).sort();
  }

  getSupportedChains(): ChainConfig[] {
    return Object.values(this.chainConfigs);
  }

  isChainSupported(chainId: number): boolean {
    return chainId in this.chainConfigs;
  }

  // Helper method to register a custom token address (for runtime additions)
  registerCustomToken(tokenSymbol: string, tokenAddress: string, chainId: number): void {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    
    if (!this.isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    
    if (!this.tokenAddresses[tokenSymbol]) {
      this.tokenAddresses[tokenSymbol] = {};
    }
    
    this.tokenAddresses[tokenSymbol][chainId] = tokenAddress;
    console.log(`Registered custom token ${tokenSymbol} at ${tokenAddress} on chain ${chainId}`);
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

  // Get comprehensive pair information
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

// Enhanced BlockchainService with custom token support

export class EnhancedBlockchainService extends BlockchainService {
  private customTokenCache = new Map<string, any>();
  
  // Enhanced token balance method that handles custom addresses
  async getTokenBalanceEnhanced(
    walletAddress: string,
    tokenIdentifier: string, // Can be symbol or address
    chainId: number,
    customTokenAddresses?: { [symbol: string]: string }
  ): Promise<string> {
    try {
      // Check if it's an address
      if (ethers.isAddress(tokenIdentifier)) {
        const result = await this.getTokenBalanceByAddress(walletAddress, tokenIdentifier, chainId);
        return result.balance;
      }
      
      // Check if it's a custom token we have the address for
      if (customTokenAddresses && customTokenAddresses[(tokenIdentifier as string).toUpperCase()]) {
        const tokenAddress = customTokenAddresses[(tokenIdentifier as string).toUpperCase()];
        const result = await this.getTokenBalanceByAddress(walletAddress, tokenAddress, chainId);
        return result.balance;
      }
      
      // Fall back to predefined tokens
      return await this.getTokenBalance(walletAddress, tokenIdentifier, chainId);
      
    } catch (error: any) {
      console.error('Error getting token balance:', error);
      throw new Error(`Could not fetch ${tokenIdentifier} balance: ${error.message}`);
    }
  }
  
  
  // Get token information (symbol, name, decimals)
  async getTokenInfo(tokenAddress: string, chainId: number): Promise<{
    symbol: string;
    name: string;
    decimals: number;
    address: string;
  }> {
    const cacheKey = `${chainId}_${tokenAddress}`;
    
    // Check cache first
    if (this.customTokenCache.has(cacheKey)) {
      return this.customTokenCache.get(cacheKey);
    }
    
    try {
      const provider = this.getProvider(chainId);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)'
        ],
        provider
      );
      
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);
      
      const tokenInfo = {
        symbol,
        name,
        decimals: Number(decimals),
        address: tokenAddress
      };
      
      // Cache the result
      this.customTokenCache.set(cacheKey, tokenInfo);
      
      return tokenInfo;
    } catch (error: any) {
      throw new Error(`Invalid token contract at ${tokenAddress}: ${error.message}`);
    }
  }
  
  // Enhanced pair finding that works with custom tokens
  async findPairAddressEnhanced(
    token1: string, // Can be symbol or address
    token2: string, // Can be symbol or address
    chainId: number,
    customTokenAddresses?: { [symbol: string]: string }
  ): Promise<string | null> {
    try {
      // Resolve token addresses
      // if token is a address, return it
      let token1Address: string | null = null;
      let token2Address: string | null = null;
      if (ethers.isAddress(token1)) {
        token1Address = token1;
      }
      else {
        token1Address = await this.resolveTokenAddress(token1, chainId, customTokenAddresses);
      }
      if (ethers.isAddress(token2)) {
        token2Address = token2;
      }
      else {
        token2Address = await this.resolveTokenAddress(token2, chainId, customTokenAddresses);
      }
      
      if (!token1Address || !token2Address) {
        throw new Error('Could not resolve token addresses');
      }
      
      // Find pair using addresses
      return await this.findPairByAddresses(token1Address, token2Address, chainId);
      
    } catch (error: any) {
      console.error('Error finding pair:', error);
      return null;
    }
  }
  
  // Resolve token symbol/address to actual address
  private async resolveTokenAddress(
    tokenIdentifier: string,
    chainId: number,
    customTokenAddresses?: { [symbol: string]: string }
  ): Promise<string | null> {
    // If it's already an address, validate and return
    if (ethers.isAddress(tokenIdentifier)) {
      try {
        await this.getTokenInfo(tokenIdentifier, chainId);
        return tokenIdentifier;
      } catch {
        return null;
      }
    }
    
    // Check custom tokens first
    if (customTokenAddresses && customTokenAddresses[(tokenIdentifier as string).toUpperCase()]) {
      return customTokenAddresses[(tokenIdentifier as string).toUpperCase()];
    }
    
    // Check predefined tokens
    const predefinedAddress = this.getTokenAddress(tokenIdentifier as string, chainId);
    if (predefinedAddress) {
      return predefinedAddress;
    }
    
    return null;
  }
  
  // Find pair by token addresses
  private async findPairByAddresses(
    token1Address: string,
    token2Address: string,
    chainId: number
  ): Promise<string | null> {
    const config = this.getChainConfig(chainId);
    if (!config) return null;
    
    const provider = this.getProvider(chainId);
    const factoryContract = new ethers.Contract(
      config.factoryAddress,
      ['function getPair(address, address) view returns (address)'],
      provider
    );
    
    const pairAddress = await factoryContract.getPair(token1Address, token2Address);
    
    // Check if pair exists (not zero address)
    if (pairAddress === ethers.ZeroAddress) {
      return null;
    }
    
    return pairAddress;
  }
  
  // Enhanced current price with custom token support
  async getCurrentPriceEnhanced(
    token1: string,
    token2: string,
    chainId: number,
    customTokenAddresses?: { [symbol: string]: string }
  ): Promise<number> {
    const pairAddress = await this.findPairAddressEnhanced(
      token1, 
      token2, 
      chainId, 
      customTokenAddresses
    );
    
    if (!pairAddress) {
      throw new Error(`No trading pair found for ${token1}/${token2}`);
    }
    
    return await this.getCurrentPrice(pairAddress, chainId);
  }
  
  // Validate token address and get basic info
  async validateTokenAddress(address: string, chainId: number): Promise<{
    isValid: boolean;
    tokenInfo?: any;
    error?: string;
  }> {
    try {
      if (!ethers.isAddress(address)) {
        return { isValid: false, error: 'Invalid address format' };
      }
      
      const tokenInfo = await this.getTokenInfo(address, chainId);
      
      return {
        isValid: true,
        tokenInfo: {
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
          address: tokenInfo.address
        }
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Token validation failed'
      };
    }
  }
  
  // Clear custom token cache
  clearCustomTokenCache(): void {
    this.customTokenCache.clear();
  }
}