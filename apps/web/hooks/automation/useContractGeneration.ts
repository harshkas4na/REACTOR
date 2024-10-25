import { useState } from 'react';
import { generateContract } from '../../services/automation/ContractService';
import { AutomationType } from '../../types/Automation';

interface UseContractGenerationProps {
  onSuccess: (contract: string) => void;
}

export function useContractGeneration({ onSuccess }: UseContractGenerationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateContractTemplate = async (params: {
    automations: AutomationType[];
    chainId: string;
    originAddress: string;
    destinationAddress: string;
    isPausable: boolean;
  }) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await generateContract(params);
      onSuccess(data.reactiveSmartContractTemplate);
    } catch (err) {
      setError('An error occurred while generating the contract. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateContractTemplate,
    isLoading,
    error,
  };
}