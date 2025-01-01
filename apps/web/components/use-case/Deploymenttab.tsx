"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ChevronDown, ChevronUp, Copy, Check, ExternalLink, Download, ArrowDown } from 'lucide-react';
import { useWeb3 } from '@/app/_context/Web3Context';
import { toast } from 'react-hot-toast';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ContractDisplayProps {
  title: string;
  description: string;
  code: string;
  onCopy: () => void;
  deploymentSteps: string[];
}

const ContractDisplay: React.FC<ContractDisplayProps> = ({
  title,
  description,
  code,
  onCopy,
  deploymentSteps
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-100">{title}</CardTitle>
        <CardDescription className="text-gray-300">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 z-10"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
            <div className={`bg-gray-900 rounded-md p-4 transition-all duration-200 ${isExpanded ? 'max-h-[500px]' : 'max-h-[200px]'} overflow-auto`}>
              <MonacoEditor
                height={isExpanded ? "400px" : "150px"}
                language="solidity"
                theme="vs-dark"
                value={code}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false
                }}
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {isCopied ? 'Copied!' : 'Copy Code'}
            </Button>
            <Link href="/smart-contract-deployer">
              <Button variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Deploy Contract
              </Button>
            </Link>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="deployment">
              <AccordionTrigger className="text-gray-200">
                Deployment Steps
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-gray-300">
                  {deploymentSteps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                        {index + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

interface DeploymentTabProps {
  reactiveTemplate: string;
  originContract: string;
  destinationContract: string;
}

export function DeploymentTab({ 
  reactiveTemplate, 
  originContract, 
  destinationContract 
}: DeploymentTabProps) {
  const [originChainId, setOriginChainId] = useState('');
  const [destinationChainId, setDestinationChainId] = useState('');
  const [displayTemplate, setDisplayTemplate] = useState(reactiveTemplate);
  const [compilationTemplate, setCompilationTemplate] = useState(reactiveTemplate);
  const [compiledContract, setCompiledContract] = useState<{ abi: any, bytecode: string } | null>(null);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTemplateVisible, setIsTemplateVisible] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash,setTransactionHash] = useState('');

  const { account, web3 } = useWeb3();
  const {originAddress, setOriginAddress, destinationAddress, setDestinationAddress} = useAutomationContext();

  const isFormFilled = originAddress && destinationAddress && originChainId && destinationChainId;

  const deploymentSteps = {
    origin: [
      "Copy the Origin contract code using the button above",
      "Navigate to the Smart Contract Deployer page",
      "Paste the contract code and configure deployment settings",
      "Deploy the contract and save the deployed address",
      "Return here and input the deployed address in the form above"
    ],
    destination: [
      "Ensure you have enough native tokens for callbacks (min. 0.1)",
      "Copy the Destination contract code",
      "Deploy using the Smart Contract Deployer",
      "Verify the implementation of AbstractCallback interface",
      "Input the deployed address in the configuration above"
    ]
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Code copied to clipboard!');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyError('Failed to copy. Please try again.');
      toast.error('Failed to copy code. Please try again.');
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
      let updatedCompilationTemplate = reactiveTemplate;
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/ORIGIN_CHAIN_ID = \d+/, `ORIGIN_CHAIN_ID = ${originChainId}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/DESTINATION_CHAIN_ID = \d+/, `DESTINATION_CHAIN_ID = ${destinationChainId}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/ORIGIN_CONTRACT = 0x[a-fA-F0-9]{40}/, `ORIGIN_CONTRACT = ${originAddress}`);
      updatedCompilationTemplate = updatedCompilationTemplate.replace(/DESTINATION_CONTRACT = 0x[a-fA-F0-9]{40}/, `DESTINATION_CONTRACT = ${destinationAddress}`);
      setCompilationTemplate(updatedCompilationTemplate);
      
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
      setError("Missing deployment configuration");
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      const contract = new web3.eth.Contract(compiledContract.abi);
      const chainId = Number(await web3.eth.getChainId());
      
      if (chainId !== 5318008) {
        throw new Error('Deployment is only allowed on the Kopli network');
      }

      const deploy = contract.deploy({
        data: compiledContract.bytecode,
        arguments: []
      });

      const gasEstimate = Number(await deploy.estimateGas({ from: account }));
      const gasPrice = await web3.eth.getGasPrice();

      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(Math.ceil(gasEstimate * 1.2)),
          gasPrice: String(gasPrice)
        })
        .on('transactionHash', (hash: string) => {
          setTransactionHash(hash);
          
          toast.success(
            <div className="flex flex-col space-y-2">
              <p>Transaction Submitted</p>
              <a 
                href={`https://kopli.reactscan.net/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                View on Explorer ↗
              </a>
            </div>
          );
        })
        .on('error', (error: any) => reject(error))
        .then(resolve);
      });

      if (deployedContract) {
        const contractAddress = (deployedContract as any).options.address;
        setDeployedAddress(contractAddress);
        toast.success(
          <div className="flex flex-col space-y-2">
            <p>Contract Deployed Successfully!</p>
            <p className="text-sm">Address: {contractAddress}</p>
            <a 
              href={`https://kopli.reactscan.net/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              View Contract on Explorer ↗
            </a>
          </div>
        );
      }

    } catch (error: any) {
      console.error('Deployment error:', error);
      setError(error.message);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
    
}
return (
  <div className="space-y-8">
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="setup">Initial Setup</TabsTrigger>
        <TabsTrigger value="contracts">Contract Details</TabsTrigger>
        <TabsTrigger value="deployment">Deploy RSC</TabsTrigger>
      </TabsList>

      <TabsContent value="setup">
        <Card>
          <CardHeader>
            <CardTitle>Configuration Setup</CardTitle>
            <CardDescription>
              Enter the deployed addresses and chain IDs for your contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              className="mt-6 w-full"
              disabled={!isFormFilled || isUpdatingTemplate}
            >
              {isUpdatingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Template...
                </>
              ) : (
                <>
                  {isTemplateUpdated ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : null}
                  {isTemplateUpdated ? 'Template Updated' : 'Update Template'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contracts" className="space-y-6">
        <ContractDisplay
          title="Origin Contract"
          description="This contract initiates the automation process by emitting events that trigger your Reactive Smart Contract."
          code={originContract}
          onCopy={() => copyToClipboard(originContract)}
          deploymentSteps={deploymentSteps.origin}
        />
        
        <div className="flex justify-center">
          <ArrowDown className="text-gray-500 h-8 w-8" />
        </div>

        <ContractDisplay
          title="Destination Contract"
          description="This contract receives and processes the automation instructions from your Reactive Smart Contract."
          code={destinationContract}
          onCopy={() => copyToClipboard(destinationContract)}
          deploymentSteps={deploymentSteps.destination}
        />
      </TabsContent>

      <TabsContent value="deployment">
        <Card className="bg-gray-800 border-gray-700 overflow-hidden">
          <CardHeader className="bg-gray-900 py-4">
            <CardTitle className="flex justify-between items-center text-gray-100">
              <span className="text-xl font-bold">RSC Template</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(displayTemplate)}
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
                <MonacoEditor
                  height="400px"
                  language="solidity"
                  theme="vs-dark"
                  value={displayTemplate}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false
                  }}
                />
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

        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
          <Button 
            onClick={handleCompile} 
            disabled={isCompiling || !isTemplateUpdated} 
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
          >
            {isCompiling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compiling...
              </>
            ) : (
              'Compile Contract'
            )}
          </Button>
          {compiledContract && (
            <Button 
              onClick={handleDeploy} 
              disabled={isDeploying} 
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                'Deploy to KOPLI Network'
              )}
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>

    {error && (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}

{deployedAddress && (
  <Alert className="bg-gray-800 border-green-500 mt-6">
    <AlertTitle className="text-xl font-semibold text-green-400 mb-4">
      Deployment Successful 🎉
    </AlertTitle>
    <AlertDescription className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col p-3 bg-gray-900 rounded-lg">
          <span className="text-sm text-gray-400">Contract Address</span>
          <code className="font-mono text-green-400 break-all">
            {deployedAddress}
          </code>
        </div>
        
        <div className="flex flex-col p-3 bg-gray-900 rounded-lg">
          <span className="text-sm text-gray-400">Transaction Hash</span>
          <code className="font-mono text-green-400 break-all">
            {transactionHash}
          </code>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Link
          href={`https://kopli.reactscan.net/tx/${transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button className="bg-green-500 hover:bg-green-600 text-white transition-all duration-200 flex items-center space-x-2">
            <span>View on Kopli Scan</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </AlertDescription>
  </Alert>
)}
  </div>
);

};