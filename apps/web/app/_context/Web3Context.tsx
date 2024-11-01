"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import Web3 from 'web3';
import { Contract, ContractAbi } from 'web3';

// Define a base contract interface that extends the Contract type


interface Web3ContextType {
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  account: string;
  setAccount: (account: string) => void;
  web3: Web3 | null;
  setWeb3: (web3: Web3 | null) => void;
 
}

// Create the context with a default value matching the type
const Web3Context = createContext<Web3ContextType | undefined>(undefined);

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [account, setAccount] = useState<string>('');
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
 


  

  const value: Web3ContextType = {
    selectedNetwork,
    setSelectedNetwork,
    account,
    web3,
    setWeb3,
    setAccount,
    
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