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
  OrgChainId: string;
  setOrgChainId: React.Dispatch<React.SetStateAction<string>>;
  DesChainId: string;
  setDesChainId: React.Dispatch<React.SetStateAction<string>>;
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
  const [OrgChainId, setOrgChainId] = useState('11155111');
  const [DesChainId, setDesChainId] = useState('11155111');
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
        OrgChainId,
        setOrgChainId,
        DesChainId,
        setDesChainId,
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