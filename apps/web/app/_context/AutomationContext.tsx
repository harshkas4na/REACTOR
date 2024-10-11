"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Automation {
  event: string;
  function: string;
  topic0: string;
}

interface AutomationContextType {
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
  reactiveContract: string;
  setReactiveContract: React.Dispatch<React.SetStateAction<string>>;
  isPausable: boolean;
  setIsPausable: React.Dispatch<React.SetStateAction<boolean>>;
  chainId: string;
  setChainId: React.Dispatch<React.SetStateAction<string>>;
  originAddress: string;
  setOriginAddress: React.Dispatch<React.SetStateAction<string>>;
  destinationAddress: string;
  setDestinationAddress: React.Dispatch<React.SetStateAction<string>>;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export const useAutomationContext = () => {
  const context = useContext(AutomationContext);
  if (context === undefined) {
    throw new Error('useAutomationContext must be used within an AutomationProvider');
  }
  return context;
};

export const AutomationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [automations, setAutomations] = useState<Automation[]>([{ event: '', function: '', topic0: '' }]);
  const [reactiveContract, setReactiveContract] = useState('');
  const [isPausable, setIsPausable] = useState(true);
  const [chainId, setChainId] = useState('11155111');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  return (
    <AutomationContext.Provider
      value={{
        automations,
        setAutomations,
        reactiveContract,
        setReactiveContract,
        isPausable,
        setIsPausable,
        chainId,
        setChainId,
        originAddress,
        setOriginAddress,
        destinationAddress,
        setDestinationAddress,
      }}
    >
      {children}
    </AutomationContext.Provider>
  );
};