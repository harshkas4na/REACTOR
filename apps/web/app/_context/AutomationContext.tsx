// app/_context/AutomationContext.tsx

"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Automation {
  event: string;
  function: string;
  topic0: string;
  mapping?: {
    [key: string]: string;
  };
}

export interface AutomationContextType {
  // Automation Settings
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
  
  // Contract Types and Configuration
  triggerType: 'custom' | 'protocol' | 'blockchain';
  setTriggerType: React.Dispatch<React.SetStateAction<'custom' | 'protocol' | 'blockchain'>>;
  
  // Contract Details
  reactiveContract: string;
  setReactiveContract: React.Dispatch<React.SetStateAction<string>>;
  
  // Configuration Options
  isPausable: boolean;
  setIsPausable: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Chain Settings
  OrgChainId: string;
  setOrgChainId: React.Dispatch<React.SetStateAction<string>>;
  DesChainId: string;
  setDesChainId: React.Dispatch<React.SetStateAction<string>>;
  
  // Contract Addresses
  originAddress: string;
  setOriginAddress: React.Dispatch<React.SetStateAction<string>>;
  destinationAddress: string;
  setDestinationAddress: React.Dispatch<React.SetStateAction<string>>;
  
  // Contract Verification Status
  isOriginVerified: boolean;
  setIsOriginVerified: React.Dispatch<React.SetStateAction<boolean>>;
  isDestinationVerified: boolean;
  setIsDestinationVerified: React.Dispatch<React.SetStateAction<boolean>>;
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
  // Automation Management
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [triggerType, setTriggerType] = useState<'custom' | 'protocol' | 'blockchain'>('custom');
  const [reactiveContract, setReactiveContract] = useState('');
  
  // Configuration
  const [isPausable, setIsPausable] = useState(true);
  
  // Chain Settings
  const [OrgChainId, setOrgChainId] = useState('1');  // Default to Ethereum mainnet
  const [DesChainId, setDesChainId] = useState('1');
  
  // Contract Addresses
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  
  // Verification Status
  const [isOriginVerified, setIsOriginVerified] = useState(false);
  const [isDestinationVerified, setIsDestinationVerified] = useState(false);

  return (
    <AutomationContext.Provider
      value={{
        automations,
        setAutomations,
        triggerType,
        setTriggerType,
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
        isOriginVerified,
        setIsOriginVerified,
        isDestinationVerified,
        setIsDestinationVerified,
      }}
    >
      {children}
    </AutomationContext.Provider>
  );
};