'use client';

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
  // Original fields
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
  
  // New fields for callback sender and event/function selection
  callbackSender: string;
  setCallbackSender: React.Dispatch<React.SetStateAction<string>>;
  originEvents: any[];
  setOriginEvents: React.Dispatch<React.SetStateAction<any[]>>;
  selectedEvent: any;
  setSelectedEvent: React.Dispatch<React.SetStateAction<any>>;
  destinationFunctions: any[];
  setDestinationFunctions: React.Dispatch<React.SetStateAction<any[]>>;
  selectedFunction: any;
  setSelectedFunction: React.Dispatch<React.SetStateAction<any>>;
  resetState: () => void;
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
  
  // Original state fields
  const [triggerType, setTriggerType] = useState<'custom' | 'protocol' | 'blockchain'>('custom');
  const [reactiveContract, setReactiveContract] = useState('');
  const [isPausable, setIsPausable] = useState(true);
  const [OrgChainId, setOrgChainId] = useState('5318007'); // Set to Lasna chain ID
  const [DesChainId, setDesChainId] = useState('5318007');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isOriginVerified, setIsOriginVerified] = useState(false);
  const [isDestinationVerified, setIsDestinationVerified] = useState(false);

  // New state fields for callback sender and event/function selection
  const [callbackSender, setCallbackSender] = useState('');
  const [originEvents, setOriginEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [destinationFunctions, setDestinationFunctions] = useState<any[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<any>(null);

  // Reset function for new fields
  const resetState = () => {
    // Reset only new state, leave original state intact
    setCallbackSender('');
    setOriginEvents([]);
    setSelectedEvent(null);
    setDestinationFunctions([]);
    setSelectedFunction(null);
  };

  // Combined context value
  const contextValue = {
    // Original fields
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
    
    // New fields
    callbackSender,
    setCallbackSender,
    originEvents,
    setOriginEvents,
    selectedEvent,
    setSelectedEvent,
    destinationFunctions,
    setDestinationFunctions,
    selectedFunction,
    setSelectedFunction,
    resetState,
  };

  return (
    <AutomationContext.Provider value={contextValue}>
      {children}
    </AutomationContext.Provider>
  );
};