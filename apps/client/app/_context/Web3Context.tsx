"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import Web3 from 'web3';
import { useEffect } from 'react';
import { Contract, ContractAbi } from 'web3';

// Define a base contract interface that extends the Contract type


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
}

interface SupportedNetworks {
  [key: string]: NetworkConfig;
}

const SUPPORTED_NETWORKS: SupportedNetworks = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'
  },
  KOPLI: {
    chainId: 5318008,
    name: 'Kopli',
    rpcUrl: 'https://kopli-rpc.rkt.ink'
  }
};

 

export function Web3Provider({ children }: Web3ProviderProps) {
  const [account, setAccount] = useState<string>('');
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
 
  const connectWallet = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        setAccount(accounts[0])
        const web3Instance = new Web3(window.ethereum)
        const chainId = await web3Instance.eth.getChainId()
        setSelectedNetwork(getCurrentNetworkKey(Number(chainId)))
        setWeb3(web3Instance)
      }
    } catch (err: any) {
      console.error('Error connecting wallet:', err)
      setError(err?.message || 'Failed to connect wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const switchNetwork = async (networkName: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    try {
      setIsLoading(true)
      const network = SUPPORTED_NETWORKS[networkName.toUpperCase()]
      if (!network) throw new Error('Unsupported network')

      const chainIdHex = `0x${network.chainId.toString(16)}`
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        })
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
            }],
          })
        } else {
          throw switchError
        }
      }

      setSelectedNetwork(networkName)
      const web3Instance = new Web3(window.ethereum)
      setWeb3(web3Instance)
    } catch (err: any) {
      console.error('Error switching network:', err)
      setError(err?.message || 'Failed to switch network')
    } finally {
      setIsLoading(false)
    }
  }

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