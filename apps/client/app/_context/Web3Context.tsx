"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import Web3 from 'web3';
import { useEffect } from 'react';

interface Web3ContextType {
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  account: string;
  setAccount: (account: string) => void;
  web3: Web3 | null;
  setWeb3: (web3: Web3 | null) => void;
  isLoading: boolean;
  error: string | null;
  connectWallet:()=> Promise<void>;
  switchNetwork:(networkName: string)=> Promise<void>; 
  isMobileDevice: boolean;
  openMetaMaskApp: () => void;
}

// Create the context with a default value matching the type
const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  hasCallback: Boolean;
  isDestination: Boolean;
  callbackProxy?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls?: string[];
}

interface SupportedNetworks {
  [key: string]: NetworkConfig;
}

export const SUPPORTED_NETWORKS: SupportedNetworks = {
  // Testnets
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    blockExplorerUrls: ['https://sepolia.etherscan.io/']
  },
  LASNA: { // Changed from "Lasna" to "LASNA"
    chainId: 5318007,
    name: 'Reactive Lasna',
    rpcUrl: 'https://lasna-rpc.rnk.dev/',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0x0000000000000000000000000000000000fffFfF',
    nativeCurrency: {
      name: 'REACT',
      symbol: 'REACT',
      decimals: 18
    },
    blockExplorerUrls: ['https://lasna.reactscan.net/']
  },

  // Mainnets
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    hasCallback: true,
    isDestination: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://etherscan.io/']
  },
  REACT: {
    chainId: 1597,
    name: 'Reactive Mainnet',
    rpcUrl: 'https://mainnet-rpc.rnk.dev/',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0x0000000000000000000000000000000000fffFfF',
    nativeCurrency: {
      name: 'Reactive Token',
      symbol: 'REACT',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.reactive.network/']
  },
  AVALANCHE: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0x76DdEc79A96e5bf05565dA4016C6B027a87Dd8F0',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    blockExplorerUrls: ['https://snowtrace.io/']
  },
  ARBITRUM: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    hasCallback: true,
    isDestination: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://arbiscan.io/']
  },
  MANTA: {
    chainId: 169,
    name: 'Manta Pacific',
    rpcUrl: 'https://pacific-rpc.manta.network/http',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://pacific-explorer.manta.network/']
  },
  BASE: {
    chainId: 8453,
    name: 'Base Chain',
    rpcUrl: 'https://base-rpc.publicnode.com',
    hasCallback: true,
    isDestination: true,
    callbackProxy: '0x4730c58FDA9d78f60c987039aEaB7d261aAd942E',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://basescan.org/']
  },
  BSC: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    hasCallback: true,
    isDestination: false,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrls: ['https://bscscan.com/']
  },
  POLYGON: {
    chainId: 137,
    name: 'Polygon PoS',
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    hasCallback: true,
    isDestination: false,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://polygonscan.com/']
  },
  POLYGON_ZKEVM: {
    chainId: 1101,
    name: 'Polygon zkEVM',
    rpcUrl: 'https://zkevm-rpc.com',
    hasCallback: false,
    isDestination: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://zkevm.polygonscan.com/']
  },
  OPBNB: {
    chainId: 204,
    name: 'opBNB Mainnet',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    hasCallback: false,
    isDestination: false,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    blockExplorerUrls: ['https://opbnbscan.com/']
  }
};

export function Web3Provider({ children }: Web3ProviderProps) {
  const [account, setAccount] = useState<string>('');
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

   // Detect if user is on mobile device
   useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
  }, []);

  // Function to open MetaMask app
  const openMetaMaskApp = () => {
    const metamaskAppDeepLink = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}`;
    window.location.href = metamaskAppDeepLink;
  };
 
  const connectWallet = async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if MetaMask is available
      if (!window.ethereum) {
        if (isMobileDevice) {
          // If on mobile and no MetaMask in browser, prompt to open/install MetaMask app
          const shouldOpenApp = window.confirm(
            'Would you like to open this page in the MetaMask app? If you don\'t have MetaMask installed, you\'ll be redirected to the app store.'
          );
          if (shouldOpenApp) {
            openMetaMaskApp();
          }
          return;
        } else {
          // If on desktop and no MetaMask, show install prompt
          setError('Please install MetaMask to connect your wallet');
          window.open('https://metamask.io/download/', '_blank');
          return;
        }
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const web3Instance = new Web3(window.ethereum);
        const chainId = await web3Instance.eth.getChainId();
        setSelectedNetwork(getCurrentNetworkKey(Number(chainId)));
        setWeb3(web3Instance);
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const switchNetwork = async (networkName: string): Promise<void> => {
    if (typeof window === 'undefined') return;

    if (!window.ethereum) {
      if (isMobileDevice) {
        const shouldOpenApp = window.confirm(
          'Would you like to open MetaMask app to switch networks?'
        );
        if (shouldOpenApp) {
          openMetaMaskApp();
        }
        return;
      } else {
        setError('Please install MetaMask to switch networks');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const network = SUPPORTED_NETWORKS[networkName.toUpperCase()];
      if (!network) {
        throw new Error(`Unsupported network: ${networkName}`);
      }

      const chainIdHex = `0x${network.chainId.toString(16)}`;
      
      try {
        // First try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        console.log('Switch error:', switchError);
        
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            // Add the network to MetaMask
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: network.nativeCurrency,
                blockExplorerUrls: network.blockExplorerUrls || []
              }],
            });
          } catch (addError: any) {
            console.error('Error adding network:', addError);
            throw new Error(`Failed to add network ${network.name}: ${addError.message}`);
          }
        } else {
          throw switchError;
        }
      }

      setSelectedNetwork(networkName.toUpperCase());
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
      
    } catch (err: any) {
      console.error('Error switching network:', err);
      setError(err?.message || 'Failed to switch network');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentNetworkKey = (currentChainId: number): string => {
    return Object.keys(SUPPORTED_NETWORKS).find(
      key => SUPPORTED_NETWORKS[key].chainId === currentChainId
    ) || ''
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3Instance = new Web3(window.ethereum)
      setWeb3(web3Instance)

      web3Instance.eth.getChainId().then((currentChainId) => {
        const networkKey = getCurrentNetworkKey(Number(currentChainId))
        setSelectedNetwork(networkKey)
      })

      web3Instance.eth.getAccounts().then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
      })

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
        } else {
          setAccount('')
        }
      }

      const handleChainChanged = (newChainId: string) => {
        const chainIdDecimal = parseInt(newChainId, 16)
        const networkKey = getCurrentNetworkKey(chainIdDecimal)
        setSelectedNetwork(networkKey)
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])
  
  const value: Web3ContextType = {
    selectedNetwork,
    setSelectedNetwork,
    account,
    web3,
    setWeb3,
    setAccount,
    isLoading,
    error,
    connectWallet,
    switchNetwork,
    isMobileDevice,
    openMetaMaskApp
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

// Custom hook to use the Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}