"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Download } from 'lucide-react';
import { useWeb3 } from '@/app/_context/Web3Context';
import { toast } from 'react-hot-toast';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface DeploymentTabProps {
  reactiveTemplate: string;
}

export function DeploymentTab({ reactiveTemplate }: DeploymentTabProps) {
  const [originChainId, setOriginChainId] = useState('');
  const [destinationChainId, setDestinationChainId] = useState('');
  const [displayTemplate, setDisplayTemplate] = useState(reactiveTemplate);
  const [compilationTemplate, setCompilationTemplate] = useState(reactiveTemplate);
  const [compiledContract, setCompiledContract] = useState<{ abi: any, bytecode: string } | null>(null);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTemplateVisible, setIsTemplateVisible] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { account, web3 } = useWeb3();
  const {originAddress, setOriginAddress, destinationAddress, setDestinationAddress} = useAutomationContext();

  const isFormFilled = originAddress && destinationAddress && originChainId && destinationChainId;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(displayTemplate);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyError('Failed to copy. Please try again.');
    }
  };

  const openInRemix = () => {
    setIsLoading(true);
    const base64Template = btoa(displayTemplate);
    const remixUrl = `https://remix.ethereum.org/?#code=${base64Template}`;
    window.open(remixUrl, '_blank');
    setIsLoading(false);
  };

  const downloadTemplate = () => {
    setIsLoading(true);
    const blob = new Blob([displayTemplate], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ReactiveSmartContract.sol';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setIsLoading(false);
  };

  const extractContractPart = (template: string) => {
    const startMarker = "contract ReactiveContract is IReactive, AbstractReactive {";
    const endMarker = "    function react(";
    const startIndex = template.indexOf(startMarker);
    const endIndex = template.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      return "Contract part not found";
    }
    
    return template.slice(startIndex, endIndex).trim();
  };

  const updateTemplate = async () => {
    setIsUpdatingTemplate(true);
    setIsTemplateUpdated(false);
    try {
      // Update compilation template with actual values
      let updatedCompilationTemplate = reactiveTemplate;
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/ORIGIN_CHAIN_ID = \d+/, `ORIGIN_CHAIN_ID = ${originChainId}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/DESTINATION_CHAIN_ID = \d+/, `DESTINATION_CHAIN_ID = ${destinationChainId}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/ORIGIN_CONTRACT = 0x[a-fA-F0-9]{40}/, `ORIGIN_CONTRACT = ${originAddress}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/DESTINATION_CONTRACT = 0x[a-fA-F0-9]{40}/, `DESTINATION_CONTRACT = ${destinationAddress}`);
      setCompilationTemplate(updatedCompilationTemplate);
      
      // Extract and set the display template
      const extractedPart = extractContractPart(updatedCompilationTemplate);
      setDisplayTemplate(extractedPart);
      
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
        body: JSON.stringify({ sourceCode: compilationTemplate }),
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
        data: compiledContract.bytecode
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
        gasPrice: String(gasPrice)
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
                <Check className="mr-2 h-4 w-4" />
                Template Updated
              </>
            ) : (
              'Update Template'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        <CardHeader className="bg-gray-900 py-4">
          <CardTitle className="flex justify-between items-center text-gray-100">
            <span className="text-xl font-bold">RSC Template</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-gray-300 hover:text-gray-100 transition-colors"
                aria-label={copied ? "Copied" : "Copy to clipboard"}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTemplateVisible(!isTemplateVisible)}
                className="text-gray-300 hover:text-gray-100 transition-colors"
              >
                {isTemplateVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {isTemplateVisible && (
          <CardContent className="p-0">
            {copyError && (
              <Alert variant="destructive" className="m-4">
                <AlertDescription>{copyError}</AlertDescription>
              </Alert>
            )}
            <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[500px]">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {displayTemplate}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2 m-4">
              <Button 
                onClick={openInRemix} 
                variant="outline" 
                className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Open in Remix IDE
              </Button>
              <Button 
                onClick={downloadTemplate} 
                variant="outline" 
                className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download .sol File
              </Button>
            </div>
          </CardContent>
        )}
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