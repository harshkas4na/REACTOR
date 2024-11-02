"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { useWeb3 } from '@/app/_context/Web3Context';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'react-hot-toast';

interface DeploymentTabProps {
  reactiveTemplate: string;
}

export function DeploymentTab({ reactiveTemplate }: DeploymentTabProps) {
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [originChainId, setOriginChainId] = useState('');
  const [destinationChainId, setDestinationChainId] = useState('');
  const [editedTemplate, setEditedTemplate] = useState(reactiveTemplate);
  const [compiledContract, setCompiledContract] = useState<{ abi: any, bytecode: string } | null>(null);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTemplateVisible, setIsTemplateVisible] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);

  const { account, web3 } = useWeb3();

  const isFormFilled = originAddress && destinationAddress && originChainId && destinationChainId;

  const updateTemplate = async () => {
    setIsUpdatingTemplate(true);
    setIsTemplateUpdated(false);
    try {
      let updatedTemplate = editedTemplate;
      updatedTemplate = updatedTemplate.replace(/ORIGIN_CHAIN_ID = \d+/, `ORIGIN_CHAIN_ID = ${originChainId}`);
      updatedTemplate = updatedTemplate.replace(/DESTINATION_CHAIN_ID = \d+/, `DESTINATION_CHAIN_ID = ${destinationChainId}`);
      updatedTemplate = updatedTemplate.replace(/ORIGIN_CONTRACT = 0x[a-fA-F0-9]{40}/, `ORIGIN_CONTRACT = ${originAddress}`);
      updatedTemplate = updatedTemplate.replace(/DESTINATION_CONTRACT = 0x[a-fA-F0-9]{40}/, `DESTINATION_CONTRACT = ${destinationAddress}`);
      setEditedTemplate(updatedTemplate);
      setIsTemplateUpdated(true);
      toast.success('Template updated successfully!');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template. Please try again.');
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: editedTemplate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile contract');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing');
      }
      setCompiledContract({ abi, bytecode });
      toast.success('Contract compiled successfully!');
    } catch (error: any) {
      console.error('Error in compile:', error);
      setError(error.message);
      toast.error(`Compilation failed: ${error.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeploy = async () => {
    if (!web3 || !account || !compiledContract) {
      setError('Web3 or account not available, or contract not compiled');
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      const contract = new web3.eth.Contract(compiledContract.abi);
      const deployTransaction = contract.deploy({
        data: compiledContract.bytecode,
        arguments: []
      });

      const gasEstimate = await deployTransaction.estimateGas({ from: account });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`);
      }

      const deployedContract = await deployTransaction.send({
        from: account,
        gas: String(gasLimit),
        gasPrice: String(gasPrice),
      });

      setDeployedAddress(String(deployedContract.options.address));

      const code = await web3.eth.getCode(String(deployedContract.options.address));
      if (code === '0x' || code === '0x0') {
        throw new Error('Contract deployment failed - no code at contract address');
      }
      toast.success('Contract deployed successfully!');
    } catch (error: any) {
      console.error('Deployment error:', error);
      setError(`Failed to deploy contract: ${error.message}`);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const renderTemplate = () => {
    const lines = editedTemplate.split('\n');
    const visibleLines = lines.slice(0, 5).join('\n');
    const hiddenLines = lines.slice(5).join('\n');

    return (
      <>
        <pre className="whitespace-pre-wrap">{visibleLines}</pre>
        {isTemplateVisible && (
          <>
            <pre className="whitespace-pre-wrap mt-2">{hiddenLines}</pre>
          </>
        )}
        <Button
          onClick={() => setIsTemplateVisible(!isTemplateVisible)}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          {isTemplateVisible ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Hide Full Template
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Show Full Template
            </>
          )}
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="originAddress">Origin Contract Address</Label>
              <Input
                id="originAddress"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="0x..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="destinationAddress">Destination Contract Address</Label>
              <Input
                id="destinationAddress"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="originChainId">Origin Chain ID</Label>
              <Input
                id="originChainId"
                value={originChainId}
                onChange={(e) => setOriginChainId(e.target.value)}
                placeholder="e.g., 11155111"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="destinationChainId">Destination Chain ID</Label>
              <Input
                id="destinationChainId"
                value={destinationChainId}
                onChange={(e) => setDestinationChainId(e.target.value)}
                placeholder="e.g., 11155111"
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            onClick={updateTemplate} 
            className="mt-4" 
            disabled={!isFormFilled || isUpdatingTemplate}
          >
            {isUpdatingTemplate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Template...
              </>
            ) : isTemplateUpdated ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Template Updated
              </>
            ) : (
              'Update Template'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-2">Contract Template</h3>
          <div className="bg-gray-700 p-4 rounded-md">
            {renderTemplate()}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Button onClick={handleCompile} disabled={isCompiling || !isTemplateUpdated} className="w-full sm:w-auto">
          {isCompiling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Compile Contract
        </Button>
        {compiledContract && (
          <Button onClick={handleDeploy} disabled={isDeploying} className="w-full sm:w-auto">
            {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Deploy to KOPLI Network
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {deployedAddress && (
        <Alert>
          <AlertTitle>Deployment Successful</AlertTitle>
          <AlertDescription>
            Contract deployed at: {deployedAddress}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}