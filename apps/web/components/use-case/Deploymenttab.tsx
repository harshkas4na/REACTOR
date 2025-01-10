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
import ContractInteraction from './ContractInteraction';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface DeploymentTabProps {
  reactiveTemplate: string;
  originContract: string;
  originABI: string;
  originBytecode: string;
  destinationContract: string;
  destinationABI: string;
  destinationBytecode: string;
  reactiveABI: string;
  reactiveBytecode: string;
}

export function DeploymentTab({ 
  reactiveTemplate, 
  originContract,
  originABI,
  originBytecode,
  destinationContract,
  destinationABI,
  destinationBytecode,
  reactiveABI,
  reactiveBytecode
}: DeploymentTabProps) {
  const [deployedAddresses, setDeployedAddresses] = useState({
    origin: '',
    destination: '',
    reactive: ''
  });
  const [constructorArgs, setConstructorArgs] = useState<{[key: string]: any}>({});
  const [isDeploying, setIsDeploying] = useState({
    origin: false,
    destination: false,
    reactive: false
  });
  const [showCode, setShowCode] = useState({
    origin: false,
    destination: false,
    reactive: false
  });
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [nativeTokenAmount, setNativeTokenAmount] = useState<{[key: string]: string}>({
    origin: '0.1',
    destination: '0.1',
    reactive: '0'
  });
  
  const { account, web3 } = useWeb3();
  const {originAddress, setOriginAddress, destinationAddress, setDestinationAddress} = useAutomationContext();

  const [deploymentMode, setDeploymentMode] = useState<{[key: string]: 'new' | 'existing'}>({
    origin: 'new',
    destination: 'new',
    reactive: 'new'
  });
  const [existingAddresses, setExistingAddresses] = useState({
    origin: '',
    destination: '',
    reactive: ''
  });

  // Check if origin and destination contracts are identical
  const areContractsIdentical = originContract === destinationContract && 
                               originABI === destinationABI && 
                               originBytecode === destinationBytecode;

  // Parse constructor arguments from ABI
  useEffect(() => {
    const parseConstructorArgs = (abi: any) => {
      const constructor = abi.find((item: any) => item.type === 'constructor');
      if (constructor && constructor.inputs) {
        return constructor.inputs.reduce((acc: any, input: any) => {
          acc[input.name] = '';
          return acc;
        }, {});
      }
      return {};
    };

    try {
      const originConstructorArgs = parseConstructorArgs(JSON.parse(originABI));
      const destinationConstructorArgs = !areContractsIdentical ? parseConstructorArgs(JSON.parse(destinationABI)) : {};
      const reactiveConstructorArgs = parseConstructorArgs(JSON.parse(reactiveABI));
      
      setConstructorArgs({
        origin: originConstructorArgs,
        destination: destinationConstructorArgs,
        reactive: reactiveConstructorArgs
      });
    } catch (error) {
      console.error('Error parsing constructor arguments:', error);
      setError('Failed to parse constructor arguments');
    }
  }, [originABI, destinationABI, reactiveABI, areContractsIdentical]);

  const handleNativeTokenAmountChange = (type: string, value: string) => {
    // Allow only numbers and decimals
    if (!/^\d*\.?\d*$/.test(value)) return;

    setNativeTokenAmount(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const validateNativeTokenAmount = (type: string) => {
    const amount = parseFloat(nativeTokenAmount[type]);
    const isDestination = type === 'destination' || (type === 'origin' && areContractsIdentical);
    
    if (isDestination && (isNaN(amount) || amount < 0.1)) {
      throw new Error(`Minimum 0.1 native tokens required for ${type} contract`);
    }
  };

  const handleDeploy = async (type: 'origin' | 'destination' | 'reactive') => {
    if (!web3 || !account) {
      setError("Please connect your wallet");
      return;
    }

    try {
      validateNativeTokenAmount(type);
    } catch (error: any) {
      toast.error(error.message);
      return;
    }

    setIsDeploying(prev => ({ ...prev, [type]: true }));
    setError(null);

    try {
      const chainId = await web3.eth.getChainId();
      
      // Check for Kopli network if deploying reactive contract
      if (type === 'reactive' && chainId !== BigInt(5318008)) {
        throw new Error('Reactive contract can only be deployed on the Kopli network');
      }

      // Select appropriate contract data based on type
      const contractData = {
        abi: type === 'reactive' ? JSON.parse(reactiveABI) :
             type === 'origin' ? JSON.parse(originABI) :
             JSON.parse(destinationABI),
        bytecode: type === 'reactive' ? reactiveBytecode :
                 type === 'origin' ? originBytecode :
                 destinationBytecode
      };

      const contract = new web3.eth.Contract(contractData.abi);
      const args = constructorArgs[type] ? Object.values(constructorArgs[type]) : [];

      const deploy = contract.deploy({
        data: contractData.bytecode,
        arguments: args
      });

      const deploymentValue = web3.utils.toWei(nativeTokenAmount[type], 'ether');

      const gasEstimate = await deploy.estimateGas({ 
        from: account,
        value: deploymentValue
      });
      const gasPrice = await web3.eth.getGasPrice();

      const deployedContract = await deploy.send({
        from: account,
        gas: BigInt(Math.ceil(Number(gasEstimate) * 1.2)) as any,
        gasPrice: BigInt(gasPrice) as any,
        value: deploymentValue
      });

      const contractAddress = deployedContract.options.address;
      setDeployedAddresses(prev => ({ ...prev, [type]: contractAddress }));

      // Update context if needed
      if (type === 'origin') setOriginAddress(contractAddress as string);
      if (type === 'destination') setDestinationAddress(contractAddress as string);

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} contract deployed successfully!`);
    } catch (error: any) {
      console.error(`${type} deployment error:`, error);
      setError(error.message);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(prev => ({ ...prev, [type]: false }));
    }
  };

  const renderConstructorInputs = (type: 'origin' | 'destination' | 'reactive') => {
    if (!constructorArgs[type] || Object.keys(constructorArgs[type]).length === 0) {
      return null;
    }

    const isDestination = type === 'destination' || (type === 'origin' && areContractsIdentical);

    return (
      <div className="space-y-4 mt-4">
        <h3 className="text-lg font-medium text-gray-200">Constructor Arguments</h3>
        {Object.entries(constructorArgs[type]).map(([name, value]) => (
          <div key={name}>
            <Label htmlFor={`${type}-${name}`} className="text-gray-300">{name}</Label>
            <Input
              id={`${type}-${name}`}
              value={value as string}
              onChange={(e) => setConstructorArgs(prev => ({
                ...prev,
                [type]: { ...prev[type], [name]: e.target.value }
              }))}
              className="mt-1 bg-gray-700 text-gray-200"
              placeholder={`Enter ${name}`}
            />
          </div>
        ))}

        {/* Native Token Amount Input */}
        {(isDestination && (<div>
          <Label htmlFor={`${type}-native-amount`} className="text-gray-300">
            Native Token Amount  <span className="text-yellow-500">(min 0.1)</span> 
          </Label>
          <Input
            id={`${type}-native-amount`}
            value={nativeTokenAmount[type]}
            onChange={(e) => handleNativeTokenAmountChange(type, e.target.value)}
            className="mt-1 bg-gray-700 text-gray-200"
            placeholder="Enter amount in ETH"
          />
        </div>))}
      </div>
    );
  };

  const renderAddressInput = (type: 'origin' | 'destination' | 'reactive') => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant={deploymentMode[type] === 'new' ? 'default' : 'outline'}
            onClick={() => setDeploymentMode(prev => ({ ...prev, [type]: 'new' }))}
            className="w-1/2"
          >
            Deploy New
          </Button>
          <Button
            variant={deploymentMode[type] === 'existing' ? 'default' : 'outline'}
            onClick={() => setDeploymentMode(prev => ({ ...prev, [type]: 'existing' }))}
            className="w-1/2"
          >
            Use Existing
          </Button>
        </div>

        {deploymentMode[type] === 'existing' && (
          <div>
            <Label htmlFor={`${type}-address`} className="text-gray-300">
              Contract Address
            </Label>
            <Input
              id={`${type}-address`}
              value={existingAddresses[type]}
              onChange={(e) => setExistingAddresses(prev => ({
                ...prev,
                [type]: e.target.value
              }))}
              placeholder="Enter deployed contract address"
              className="mt-1 bg-gray-700 text-gray-200"
            />
          </div>
        )}
      </div>
    );
  };

  const renderDeploymentOrInteraction = (type: 'origin' | 'destination' | 'reactive') => {
    const contractAddress = deploymentMode[type] === 'existing' 
      ? existingAddresses[type]
      : deployedAddresses[type];

    const isDestinationDeploy = type === 'destination' || (type === 'origin' && areContractsIdentical);

    if (!contractAddress && deploymentMode[type] === 'existing') {
      return (
        <Alert className="mt-4">
          <AlertTitle>Enter Contract Address</AlertTitle>
          <AlertDescription>
            Please enter the deployed contract address to interact with its functions.
          </AlertDescription>
        </Alert>
      );
    }

    if (contractAddress) {
      return (
        <div className="mt-4">
          <ContractInteraction
            abi={type === 'reactive' ? reactiveABI :
                 type === 'origin' ? originABI :
                 destinationABI}
            contractAddress={contractAddress}
            web3={web3}
            account={account}
          />
        </div>
      );
    }

    if (deploymentMode[type] === 'new') {
      return (
        <>
          {isDestinationDeploy && (
            <Alert className="mb-4 bg-yellow-900/20 border-yellow-500 mt-6">
              <AlertTitle className="text-yellow-500">Native Token Required</AlertTitle>
              <AlertDescription className="text-gray-300">
                This contract requires minimum 0.1 native tokens (e.g., 0.1 Sepolia ETH) for successful deployment and callback handling.
                You can increase this amount if needed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowCode(prev => ({ ...prev, [type]: !prev[type] }))}
              className="text-gray-300"
            >
              {showCode[type] ? 'Hide Code' : 'Show Code'}
            </Button>
          </div>

          {showCode[type] && (
            <div className="mt-4">
              <MonacoEditor
                height="300px"
                language="solidity"
                theme="vs-dark"
                value={type === 'reactive' ? reactiveTemplate :
                       type === 'origin' ? originContract :
                       destinationContract}
                options={{
                  readOnly: true,
                  minimap: { enabled: false }
                }}
              />
            </div>
          )}
          {renderConstructorInputs(type)}
          <Button
            onClick={() => handleDeploy(type)}
            disabled={isDeploying[type]}
            className="mt-4 bg-blue-500 hover:bg-blue-600 w-full"
          >
            {isDeploying[type] ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              'Deploy Contract'
            )}
          </Button>
        </>
      );
    }
  };

  const renderContractSection = (type: 'origin' | 'destination' | 'reactive') => (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gray-100">
          {type.charAt(0).toUpperCase() + type.slice(1)} Contract
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderAddressInput(type)}
        {renderDeploymentOrInteraction(type)}
      </CardContent>
      </Card>
  );

  return (
    <div className="space-y-6">
      {areContractsIdentical ? (
        <>
          <Alert className="bg-blue-900/20 border-blue-500">
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              Origin and Destination contracts are identical. You can deploy once and use the same address for both.
              Remember to include minimum 0.1 native tokens for deployment.
            </AlertDescription>
          </Alert>
          {renderContractSection('origin')}
        </>
      ) : (
        <>
          {renderContractSection('origin')}
          {renderContractSection('destination')}
        </>
      )}
      
      {renderContractSection('reactive')}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transactionHash && (
        <Alert className="bg-green-900/20 border-green-500">
          <AlertTitle className="text-green-400">Transaction Successful</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Transaction Hash:</p>
            <code className="block p-2 bg-gray-800 rounded border border-gray-700 text-green-400 font-mono break-all">
              {transactionHash}
            </code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}