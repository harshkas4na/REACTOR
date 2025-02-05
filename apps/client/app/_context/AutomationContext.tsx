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
  automations: Automation[];
  setAutomations: React.Dispatch<React.SetStateAction<Automation[]>>;
  triggerType: 'custom' | 'protocol' | 'blockchain';
  setTriggerType: React.Dispatch<React.SetStateAction<'custom' | 'protocol' | 'blockchain'>>;
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
  // Initialize with one empty automation
  const [automations, setAutomations] = useState<Automation[]>([{
    event: '',
    function: '',
    topic0: ''
  }]);
  
  const [triggerType, setTriggerType] = useState<'custom' | 'protocol' | 'blockchain'>('custom');
  const [reactiveContract, setReactiveContract] = useState('');
  const [isPausable, setIsPausable] = useState(true);
  const [OrgChainId, setOrgChainId] = useState('5318008'); // Set to Kopli chain ID
  const [DesChainId, setDesChainId] = useState('5318008');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isOriginVerified, setIsOriginVerified] = useState(false);
  const [isDestinationVerified, setIsDestinationVerified] = useState(false);

  // Add context value console log for debugging
  const contextValue = {
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
  };

 

  return (
    <AutomationContext.Provider value={contextValue}>
      {children}
    </AutomationContext.Provider>
  );
};