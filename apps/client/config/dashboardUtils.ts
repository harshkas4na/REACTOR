import { ethers } from 'ethers';
import { Token, UserContractAddresses, ChainConfig } from '../types/dashboard';
import { REACTIVE_STOP_ORDER_ABI, PAIR_ABI, TOKEN_ABI } from '../config/dashboard';

// ===== UTILITY FUNCTIONS =====
export const formatTokenBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
};

export const formatTimeAgo = (timestamp: number) => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  const days = Math.floor(diff / (60 * 60 * 24));
  const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((diff % (60 * 60)) / 60);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const getExplorerUrl = (
  address: string, 
  chainId: string, 
  type: 'address' | 'tx' = 'address', 
  connectedAccount?: string
): string => {
  const explorers: Record<string, string> = {
    '1': 'https://etherscan.io',
    '11155111': 'https://sepolia.etherscan.io',
    '5318007': 'https://lasna.reactscan.net',
  };
  
  const baseUrl = explorers[chainId];
  if (!baseUrl) return '#';

  // Special handling for Reactive network (Lasna)
  if (chainId === '5318007') {
    if (type === 'address' && connectedAccount) {
      // For contract addresses on Reactive network, use the RVM/contract format
      return `${baseUrl}/address/${connectedAccount}/contract/${address}`;
    }
    // For transactions or when no connected account, use standard format
    return `${baseUrl}/${type}/${address}`;
  }
  
  return `${baseUrl}/${type}/${address}`;
};

// ===== CONTRACT VALIDATION =====
export const validateStoredContracts = async (
  contracts: UserContractAddresses,
  rscProvider: ethers.JsonRpcProvider,
  sepoliaProvider: ethers.JsonRpcProvider,
  userAddress: string
): Promise<boolean> => {
  try {
    console.log('Validating stored contracts:', contracts);
    
    const reactiveContract = new ethers.Contract(
      contracts.reactiveContract,
      REACTIVE_STOP_ORDER_ABI,
      rscProvider
    );
    
    const deployer = await reactiveContract.getDeployer();
    
    if (deployer.toLowerCase() !== userAddress.toLowerCase()) {
      console.log('User is not the deployer of stored reactive contract');
      return false;
    }
    
    console.log('Contract validation successful');
    return true;
  } catch (error) {
    console.error('Contract validation failed:', error);
    return false;
  }
};

// ===== TOKEN AND PAIR DATA FETCHING =====
export const fetchTokenInfo = async (address: string, provider: ethers.JsonRpcProvider): Promise<Token> => {
  try {
    const tokenContract = new ethers.Contract(address, TOKEN_ABI, provider);
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.name(),
      tokenContract.decimals()
    ]);

    return {
      address,
      symbol,
      name,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.error('Error fetching token info for', address, ':', error);
    return {
      address,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18
    };
  }
};

export const getCurrentPairPrice = async (
  pairAddress: string, 
  sellToken0: boolean, 
  provider: ethers.JsonRpcProvider
): Promise<number> => {
  try {
    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
    const [reserve0, reserve1] = await pairContract.getReserves();
    
    if (reserve0 === BigInt(0) || reserve1 === BigInt(0)) return 0;

    const price = sellToken0 
      ? Number(reserve1) / Number(reserve0)
      : Number(reserve0) / Number(reserve1);

    return price;
  } catch (error) {
    console.error('Error fetching pair price:', error);
    return 0;
  }
};

export const calculateOrderMetrics = async (orderData: any, provider: ethers.JsonRpcProvider) => {
  try {
    const currentPrice = await getCurrentPairPrice(orderData.pair, orderData.token0, provider);
    const coefficient = Number(orderData.coefficient);
    const threshold = Number(orderData.threshold);
    const triggerPrice = threshold / coefficient;

    let dropPercentage = 0;
    if (currentPrice > 0 && triggerPrice > 0) {
      dropPercentage = ((currentPrice - triggerPrice) / currentPrice) * 100;
      dropPercentage = Math.max(0, Math.min(50, dropPercentage));
    }
   
    return {
      currentPrice: currentPrice.toFixed(6),
      triggerPrice: triggerPrice.toFixed(6),
      dropPercentage: Math.round(dropPercentage * 10) / 10
    };
  } catch (error) {
    console.error('Error calculating order metrics:', error);
    return {
      currentPrice: '0',
      triggerPrice: '0',
      dropPercentage: 0
    };
  }
};

// ===== NETWORK SWITCHING =====
export const switchNetwork = async (targetChainId: string) => {
  if (typeof window === 'undefined' || !window.ethereum) throw new Error('No wallet detected');

  try {
    const targetChainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainIdHex }],
    }); 
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added, need to add it first
      const chainConfig = targetChainId === '5318007' ? {
        chainId: `0x${parseInt(targetChainId).toString(16)}`,
        chainName: 'Reactive Lasna',
        nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
        rpcUrls: ['https://lasna-rpc.rnk.dev/'],
        blockExplorerUrls: ['https://lasna.reactscan.net'],
      } : null;

      if (chainConfig) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig],
        });
      }
    }
    throw error;
  }
};