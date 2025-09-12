import { ethers } from 'ethers';
import { Token } from '../types';
import { POPULAR_TOKENS } from '../config/chain';

// ===== TOKEN SERVICE CLASS =====
export class TokenService {
  private static cache = new Map<string, { data: Token[]; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check if we have cached data that's still valid
  private static getCachedTokens(cacheKey: string): Token[] | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // Cache the fetched tokens
  private static setCachedTokens(cacheKey: string, tokens: Token[]): void {
    this.cache.set(cacheKey, {
      data: tokens,
      timestamp: Date.now()
    });
  }

  // Main method to fetch all tokens for a user on a specific network
  static async fetchUserTokens(chainId: string, address: string): Promise<Token[]> {
    const cacheKey = `${chainId}-${address}`;
    
    // Check cache first
    const cachedTokens = this.getCachedTokens(cacheKey);
    if (cachedTokens) {
      return cachedTokens;
    }

    // Try Ethplorer API first, then fallback to popular tokens method
    const tokens = await this.fetchTokensFromEthplorer(chainId, address);
    
    this.setCachedTokens(cacheKey, tokens);
    return tokens;
  }

  // Fetch tokens using Ethplorer API
  private static async fetchTokensFromEthplorer(chainId: string, address: string): Promise<Token[]> {
    try {
      console.log('Fetching tokens from Ethplorer API for address:', address);
      
      // Determine the correct API endpoint based on chain
      let apiUrl: string;
      if (chainId === '11155111') { // Sepolia
        apiUrl = `https://sepolia-api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else if (chainId === '1') { // Mainnet
        apiUrl = `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`;
      } else {
        // For unsupported chains, fallback to popular tokens method
        console.log(`Ethplorer API not available for chain ${chainId}, using fallback method`);
        return this.fetchPopularTokensWithBalances(chainId, address);
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Ethplorer API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data) {
        throw new Error('Empty response from Ethplorer API');
      }

      // Parse the response and convert to our Token interface
      const tokens: Token[] = [];

      // Process ERC20 tokens from the API response
      if (data.tokens && Array.isArray(data.tokens)) {
        for (const tokenData of data.tokens) {
          try {
            const tokenInfo = tokenData.tokenInfo;
            if (!tokenInfo || !tokenInfo.address || !tokenInfo.symbol || !tokenInfo.name) {
              continue; // Skip invalid token data
            }

            const decimals = parseInt(tokenInfo.decimals) || 18;
            const rawBalance = tokenData.balance || tokenData.rawBalance || '0';
            
            // Convert balance from raw to decimal format
            let balance = '0';
            if (rawBalance && rawBalance !== '0') {
              try {
                const balanceWei = BigInt(rawBalance);
                balance = ethers.formatUnits(balanceWei, decimals);
                const balanceNumber = parseFloat(balance);
                balance = balanceNumber > 0 ? balanceNumber.toFixed(6) : '0';
              } catch (balanceError) {
                console.warn('Error parsing balance for token:', tokenInfo.symbol, balanceError);
                balance = '0';
              }
            }

            // Only include tokens with positive balance
            if (parseFloat(balance) > 0) {
              tokens.push({
                address: tokenInfo.address,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                decimals: decimals,
                balance: balance,
                logoURI: `https://tokens.1inch.io/${tokenInfo.address.toLowerCase()}.png`
              });
            }
          } catch (tokenError) {
            console.warn('Error processing token data:', tokenError, tokenData);
          }
        }
      }

      console.log(`Successfully fetched ${tokens.length} tokens with positive balance from Ethplorer`);
      
      // If we got tokens from Ethplorer, return them
      if (tokens.length > 0) {
        return tokens;
      }

      // If no tokens found via Ethplorer, fallback to popular tokens method
      console.log('No tokens found via Ethplorer, falling back to popular tokens method');
      return this.fetchPopularTokensWithBalances(chainId, address);

    } catch (error) {
      console.error('Error fetching tokens from Ethplorer API:', error);
      
      // Fallback to popular tokens method on any error
      console.log('Falling back to popular tokens method due to Ethplorer API error');
      return this.fetchPopularTokensWithBalances(chainId, address);
    }
  }

  // Enhanced fallback method for networks - Only ERC20 tokens
  private static async fetchPopularTokensWithBalances(chainId: string, address: string): Promise<Token[]> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return [];
    }

    try {
      console.log('Fetching balances for popular tokens as fallback method');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const popularTokens = POPULAR_TOKENS[chainId] || [];
      
      if (popularTokens.length === 0) {
        console.log(`No popular tokens defined for chain ${chainId}`);
        return [];
      }
      
      const tokensWithBalances = await Promise.all(
        popularTokens.map(async (token) => {
          try {
            const tokenContract = new ethers.Contract(
              token.address,
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const balanceWei = await tokenContract.balanceOf(address);
            const balance = ethers.formatUnits(balanceWei, token.decimals);
            const balanceNumber = parseFloat(balance);
            
            return {
              ...token,
              balance: balanceNumber > 0 ? balanceNumber.toFixed(6) : '0'
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return { ...token, balance: '0' };
          }
        })
      );

      // Filter only tokens with balance > 0
      const result = tokensWithBalances.filter(token => 
        parseFloat(token.balance || '0') > 0
      );

      console.log(`Found ${result.length} popular tokens with positive balance`);
      return result;
    } catch (error) {
      console.error('Error fetching popular tokens:', error);
      return [];
    }
  }

  // Fetch individual token information
  static async fetchTokenInfo(address: string, userAddress: string): Promise<Token | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tokenContract = new ethers.Contract(
        address,
        [
          'function symbol() view returns (string)',
          'function name() view returns (string)',
          'function decimals() view returns (uint8)',
          'function balanceOf(address) view returns (uint256)'
        ],
        provider
      );

      const [symbol, name, decimals, balanceWei] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
        tokenContract.balanceOf(userAddress)
      ]);

      const balance = ethers.formatUnits(balanceWei, decimals);
      const balanceNumber = parseFloat(balance);

      return {
        address,
        symbol,
        name,
        decimals,
        balance: balanceNumber > 0 ? balanceNumber.toFixed(6) : '0',
        logoURI: `https://tokens.1inch.io/${address.toLowerCase()}.png`
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  // Clear cache methods
  static clearCache(): void {
    this.cache.clear();
  }

  static clearCacheForUser(chainId: string, address: string): void {
    const cacheKey = `${chainId}-${address}`;
    this.cache.delete(cacheKey);
  }
}

// Helper function to format large numbers
export function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}