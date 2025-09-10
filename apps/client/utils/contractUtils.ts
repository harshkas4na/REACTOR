import { ethers } from 'ethers';
import { UserContractAddresses, SimpleContractStatus, ChainConfig } from '../types';
import { SYSTEM_CONTRACT_ABI, SYSTEM_CONTRACT_ADDRESS, DEBT_AND_STATUS_ABI } from '../config/chains';

// Contract ABIs - these would need to be imported from your existing data
// For now, I'll include minimal ABIs needed for the utility functions
export const REACTIVE_STOP_ORDER_ABI = [
  "function getDeployer() view returns (address)",
  "function createStopOrder(address,address,bool,uint256,uint256) returns (uint256)",
  "function coverDebt()"
];

export const CALLBACK_STOP_ORDER_ABI = [
  "function coverDebt()"
];

// ===== CONTRACT STATUS CHECKING =====
export const checkSimpleContractStatus = async (
  contracts: UserContractAddresses,
  chainConfig: ChainConfig
): Promise<SimpleContractStatus> => {
  try {
    const sepoliaProvider = new ethers.JsonRpcProvider(chainConfig.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
    const rscProvider = new ethers.JsonRpcProvider(chainConfig.rscNetwork.rpcUrl);
    
    // Create system contract instances for debt checking
    const sepoliaSystemContract = new ethers.Contract(
      chainConfig.callbackProxyAddress, // This is the callback proxy/system contract
      SYSTEM_CONTRACT_ABI, 
      sepoliaProvider
    );
    
    const rscSystemContract = new ethers.Contract(
      SYSTEM_CONTRACT_ADDRESS, // System contract on Reactive Network
      SYSTEM_CONTRACT_ABI, 
      rscProvider
    );

    // Get balances and debts correctly
    const [
      callbackBalance,
      rscBalance,
      callbackDebtWei,
      rscDebtWei
    ] = await Promise.all([
      // Get contract balances directly from providers
      sepoliaProvider.getBalance(contracts.callbackContract),
      rscProvider.getBalance(contracts.reactiveContract),
      
      // Get debts from system contracts (CORRECTED)
      sepoliaSystemContract.debts(contracts.callbackContract),
      rscSystemContract.debts(contracts.reactiveContract)
    ]);
    
    const callbackBalanceNum = parseFloat(ethers.formatEther(callbackBalance));
    const rscBalanceNum = parseFloat(ethers.formatEther(rscBalance));
    const callbackDebt = ethers.formatEther(callbackDebtWei);
    const rscDebt = ethers.formatEther(rscDebtWei);
    
    // Check if funding is needed (either has debt or balance is low)
    const needsFunding = 
      parseFloat(callbackDebt) > 0 || 
      parseFloat(rscDebt) > 0 || 
      callbackBalanceNum < chainConfig.warningThreshold || 
      rscBalanceNum < chainConfig.rscNetwork.warningThreshold;

    const isActive = !needsFunding;

    console.log('Contract status check:', {
      callback: { 
        balance: callbackBalanceNum, 
        debt: callbackDebt, 
      },
      rsc: { 
        balance: rscBalanceNum, 
        debt: rscDebt, 
      },
      isActive,
      needsFunding
    });
    
    return {
      callbackBalance: callbackBalanceNum,
      rscBalance: rscBalanceNum,
      callbackDebt,
      rscDebt,
      isActive,
      needsFunding,
      lastChecked: Date.now()
    };
  } catch (error) {
    console.error('Error checking contract status:', error);
    // Return safe defaults on error
    return {
      callbackBalance: 0,
      rscBalance: 0,
      callbackDebt: '0',
      rscDebt: '0',
      isActive: false, // Assume inactive on error
      needsFunding: true,
      lastChecked: Date.now()
    };
  }
};

// ===== CONTRACT VALIDATION =====
export const validateStoredContracts = async (
  contracts: UserContractAddresses,
  rscProvider: ethers.JsonRpcProvider,
  userAddress: string
): Promise<{ isValid: boolean; contractStatus: SimpleContractStatus | null }> => {
  try {
    const normalizedUserAddress = userAddress.toLowerCase().trim();
    const normalizedContractDeployer = contracts.deployer.toLowerCase().trim();
    
    if (normalizedUserAddress !== normalizedContractDeployer) {
      return { isValid: false, contractStatus: null };
    }
    
    const reactiveContract = new ethers.Contract(
      contracts.reactiveContract,
      REACTIVE_STOP_ORDER_ABI,
      rscProvider
    );
    
    try {
      const deployer = await reactiveContract.getDeployer();
      if (deployer.toLowerCase().trim() !== normalizedUserAddress) {
        return { isValid: false, contractStatus: null };
      }
    } catch (contractError) {
      return { isValid: false, contractStatus: null };
    }
    
    // Assuming SUPPORTED_CHAINS is imported from config
    const chainConfig = {
      id: contracts.chainId,
      warningThreshold: 0.005,
      rscNetwork: {
        warningThreshold: 0.001
      }
    } as ChainConfig;
    
    const contractStatus = await checkSimpleContractStatus(contracts, chainConfig);
    
    return { isValid: true, contractStatus };
  } catch (error) {
    return { isValid: false, contractStatus: null };
  }
};

// ===== NETWORK SWITCHING UTILITIES =====
export const switchNetwork = async (targetChainId: string): Promise<boolean> => {
  if (!window.ethereum) throw new Error('No wallet detected');
  const targetChainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const currentNetwork = await provider.getNetwork();
  if (currentNetwork.chainId.toString() === targetChainId) return true;

  try {
    await window.ethereum.request({ 
      method: 'wallet_switchEthereumChain', 
      params: [{ chainId: targetChainIdHex }] 
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      const chainConfig = targetChainId === '5318007' ? {
        chainId: targetChainIdHex, 
        chainName: 'Reactive Lasna',
        nativeCurrency: { name: 'REACT', symbol: 'REACT', decimals: 18 },
        rpcUrls: ['https://lasna-rpc.rnk.dev/'], 
        blockExplorerUrls: ['https://lasna.reactscan.net']
      } : null;
      
      if (chainConfig) {
        await window.ethereum.request({ 
          method: 'wallet_addEthereumChain', 
          params: [chainConfig] 
        });
      }
    } else { 
      throw switchError; 
    }
  }
  return true;
};

// ===== PRICE AND THRESHOLD CALCULATIONS =====
export const calculateThresholdFromPercentage = (
  percentage: string,
  selectedPair: any,
  sellToken0: boolean
): { threshold: string; currentPrice: string; stopPrice: string } | null => {
  if (!percentage || isNaN(parseFloat(percentage)) || !selectedPair) return null;
  
  const dropPercent = parseFloat(percentage);
  const coefficient = 1000;
  
  const reserve0 = parseFloat(selectedPair.reserve0);
  const reserve1 = parseFloat(selectedPair.reserve1);
  
  if (reserve0 <= 0 || reserve1 <= 0) {
    console.error('Invalid reserves for threshold calculation');
    return null;
  }

  const currentPrice = sellToken0 
    ? reserve1 / reserve0
    : reserve0 / reserve1;

  if (currentPrice <= 0 || !isFinite(currentPrice)) {
    console.error('Invalid current price calculated from reserves');
    return null;
  }

  const stopPrice = currentPrice * (1 - dropPercent / 100);
  
  if (stopPrice <= 0) {
    console.error('Invalid stop price calculated');
    return null;
  }
  
  const threshold = Math.floor(stopPrice * coefficient);
  
  console.log('Threshold calculation:', {
    currentPrice,
    dropPercent,
    stopPrice,
    coefficient,
    threshold
  });
  
  return {
    threshold: threshold.toString(),
    currentPrice: currentPrice.toString(),
    stopPrice: stopPrice.toString()
  };
};