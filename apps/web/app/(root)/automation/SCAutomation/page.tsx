"use client";
import React, { useState } from 'react';
import AutomationForm from '@/components/automation/SCAutomation/AutomationForm';
import ContractDisplay from '@/components/automation/SCAutomation/ContractDispaly';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { useContractGeneration } from '../../../../hooks/automation/useContractGeneration';

export default function AutomationPage() {
  const [showContract, setShowContract] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [editedContract, setEditedContract] = useState('');

  const {
    OrgChainId,
    DesChainId,
    automations,
    reactiveContract,
    setReactiveContract,
    originAddress,
    destinationAddress,
    isPausable,
  } = useAutomationContext();

  const { generateContractTemplate, isLoading, error } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
      setEditedContract(contract);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateContractTemplate({
      automations,
      OrgChainId,
      DesChainId,
      originAddress,
      destinationAddress,
      isPausable,
    });
  };

  const handleSaveEditedContract = () => {
    setReactiveContract(editedContract);
    setEditingContract(false);
  };

  const handleContractChange = (value: string) => {
    setEditedContract(value);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-100 mb-8">
          Create Your Automation
        </h1>
        
        <AutomationForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />

        {reactiveContract && (
          <ContractDisplay
            reactiveContract={reactiveContract}
            editedContract={editedContract}
            showContract={showContract}
            editingContract={editingContract}
            onToggleShow={() => setShowContract(!showContract)}
            onEdit={() => setEditingContract(true)}
            onSave={handleSaveEditedContract}
            onCancelEdit={() => setEditingContract(false)}
            onContractChange={handleContractChange}
          />
        )}
      </div>
    </div>
  );
}