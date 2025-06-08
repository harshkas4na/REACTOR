import { ethers } from 'ethers';

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

  private getProvider(chainId: number): ethers.JsonRpcProvider {
    if (!this.providers[chainId]) {
      const config = this.chainConfigs[chainId];
      if (!config) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }
      this.providers[chainId] = new ethers.JsonRpcProvider(config.rpcUrl);
    }
    return this.providers[chainId];
  }

  private getTokenAddress(symbol: string, chainId: number): string {
    const chainTokens = this.tokenAddresses[chainId];
    if (!chainTokens || !chainTokens[symbol.toUpperCase()]) {
      throw new Error(`Token ${symbol} not supported on chain ${chainId}`);
    }
    return chainTokens[symbol.toUpperCase()];
  }

  async getTokenBalance(walletAddress: string, tokenSymbol: string, chainId: number): Promise<string> {
    try {
      const provider = this.getProvider(chainId);
      
      if (tokenSymbol.toUpperCase() === 'ETH' || tokenSymbol.toUpperCase() === 'AVAX') {
        // Native token balance
        const balance = await provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
      } else {
        // ERC20 token balance
        const tokenAddress = this.getTokenAddress(tokenSymbol, chainId);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
          provider
        );
        
        const [balance, decimals] = await Promise.all([
          tokenContract.balanceOf(walletAddress),
          tokenContract.decimals()
        ]);
        
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error: any) {
      console.error(`Error fetching balance for ${tokenSymbol}:`, error);
      throw new Error(`Failed to fetch ${tokenSymbol} balance: ${error.message}`);
    }
  }

  async findPairAddress(token0Symbol: string, token1Symbol: string, chainId: number): Promise<string | null> {
    try {
      const provider = this.getProvider(chainId);
      const config = this.chainConfigs[chainId];
      
      const token0Address = this.getTokenAddress(token0Symbol, chainId);
      const token1Address = this.getTokenAddress(token1Symbol, chainId);
      
      // Uniswap V2 Factory interface
      const factoryContract = new ethers.Contract(
        config.factoryAddress,
        ['function getPair(address tokenA, address tokenB) view returns (address pair)'],
        provider
      );
      
      const pairAddress = await factoryContract.getPair(token0Address, token1Address);
      
      // Check if pair exists (address(0) means no pair)
      if (pairAddress === ethers.ZeroAddress) {
        return null;
      }
      
      // Verify the pair has liquidity
      const pairContract = new ethers.Contract(
        pairAddress,
        ['function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
        provider
      );
      
      const reserves = await pairContract.getReserves();
      if (reserves.reserve0 === 0n && reserves.reserve1 === 0n) {
        return null; // No liquidity
      }
      
      return pairAddress;
    } catch (error: any) {
      console.error(`Error finding pair ${token0Symbol}/${token1Symbol}:`, error);
      return null;
    }
  }

  async getCurrentPrice(pairAddress: string, chainId: number): Promise<number> {
    try {
      const provider = this.getProvider(chainId);
      
      const pairContract = new ethers.Contract(
        pairAddress,
        [
          'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
          'function token0() view returns (address)',
          'function token1() view returns (address)'
        ],
        provider
      );
      
      const reserves = await pairContract.getReserves();
      
      // Calculate price as reserve1/reserve0 (token1 per token0)
      const price = Number(reserves.reserve1) / Number(reserves.reserve0);
      
      return price;
    } catch (error: any) {
      console.error(`Error fetching price for pair ${pairAddress}:`, error);
      throw new Error(`Failed to fetch current price: ${error.message}`);
    }
  }

  async isToken0(pairAddress: string, tokenSymbol: string, chainId: number): Promise<boolean> {
    try {
      const provider = this.getProvider(chainId);
      const tokenAddress = this.getTokenAddress(tokenSymbol, chainId);
      
      const pairContract = new ethers.Contract(
        pairAddress,
        ['function token0() view returns (address)'],
        provider
      );
      
      const token0Address = await pairContract.token0();
      return token0Address.toLowerCase() === tokenAddress.toLowerCase();
    } catch (error: any) {
      console.error(`Error checking token0 status:`, error);
      throw new Error(`Failed to determine token order: ${error.message}`);
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
        tokenAddress,
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