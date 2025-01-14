"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { useWeb3 } from '@/app/_context/Web3Context';
import { toast } from 'react-hot-toast';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import dynamic from 'next/dynamic';
import ContractInteraction from './ContractInteraction';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface DeploymentResult {
  address: string;
  transactionHash: string;
}

interface DeploymentInfo {
  origin: DeploymentResult | null;
  destination: DeploymentResult | null;
  reactive: DeploymentResult | null;
  helpers: Record<string, DeploymentResult | null>;
}

interface HelperContract {
  name: string;
  contract: string;
  abi?: string;
  bytecode?: string;
}

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
  helperContracts?: HelperContract[];
}

export default function DeploymentTab({ 
  reactiveTemplate, 
  originContract,
  originABI,
  originBytecode,
  destinationContract,
  destinationABI,
  destinationBytecode,
  reactiveABI,
  reactiveBytecode,
  helperContracts = []
}: DeploymentTabProps) {
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    origin: null,
    destination: null,
    reactive: null,
    helpers: {}
  });

  const [deployedAddresses, setDeployedAddresses] = useState<{
    origin: string;
    destination: string;
    reactive: string;
    helpers: Record<string, string>;
  }>({
    origin: '',
    destination: '',
    reactive: '',
    helpers: {}
  });

  const [constructorArgs, setConstructorArgs] = useState<{
    origin: Record<string, string>;
    destination: Record<string, string>;
    reactive: Record<string, string>;
    helpers: Record<string, Record<string, string>>;
  }>({
    origin: {},
    destination: {},
    reactive: {},
    helpers: {}
  });

  const [isDeploying, setIsDeploying] = useState({
    origin: false,
    destination: false,
    reactive: false,
    helpers: {} as Record<string, boolean>
  });

  const [showCode, setShowCode] = useState({
    origin: false,
    destination: false,
    reactive: false,
    helpers: {} as Record<string, boolean>
  });

  const [deploymentMode, setDeploymentMode] = useState<Record<string, 'new' | 'existing'>>({
    origin: 'new',
    destination: 'new',
    reactive: 'new'
  });

  const [existingAddresses, setExistingAddresses] = useState({
    origin: '',
    destination: '',
    reactive: '',
    helpers: {} as Record<string, string>
  });

  const [error, setError] = useState<string | null>(null);
  const [nativeTokenAmount, setNativeTokenAmount] = useState({
    origin: '0.1',
    destination: '0.1',
    reactive: '0',
    helpers: {} as Record<string, string>
  });

  const { account, web3 } = useWeb3();
  const { setOriginAddress, setDestinationAddress } = useAutomationContext();

  const areContractsIdentical = originContract === destinationContract && 
                               originABI === destinationABI && 
                               originBytecode === destinationBytecode;

  useEffect(() => {
    const parseConstructorArgs = (abi: string): Record<string, string> => {
      try {
        const parsedABI = JSON.parse(abi);
        const constructor = parsedABI.find((item: any) => item.type === 'constructor');
        if (constructor?.inputs) {
          return Object.fromEntries(
            constructor.inputs.map((input: any) => [input.name, ''])
          );
        }
      } catch (err) {
        console.error('Error parsing ABI:', err);
      }
      return {};
    };

    setConstructorArgs({
      origin: parseConstructorArgs(originABI),
      destination: !areContractsIdentical ? parseConstructorArgs(destinationABI) : {},
      reactive: parseConstructorArgs(reactiveABI),
      helpers: {}
    });

    // Initialize deployment modes for helper contracts
    const helperModes = Object.fromEntries(
      helperContracts.map(helper => [helper.name, 'new'])
    );
    setDeploymentMode((prev:any) => ({ ...prev, ...helperModes })); 
  }, [originABI, destinationABI, reactiveABI, areContractsIdentical, helperContracts]);

  const handleConstructorArgChange = (
    type: string, 
    name: string, 
    value: string
  ) => {
    if (type.startsWith('helper_')) {
      const helperName = type.replace('helper_', '');
      setConstructorArgs(prev => ({
        ...prev,
        helpers: {
          ...prev.helpers,
          [helperName]: {
            ...prev.helpers[helperName],
            [name]: value
          }
        }
      }));
    } else {
      setConstructorArgs((prev:any) => ({
        ...prev,
        [type]: {
          ...prev[type],
          [name]: value
        }
      }));
    }
  };

  const handleExistingAddressChange = (type: string, value: string) => {
    if (type.startsWith('helper_')) {
      setExistingAddresses((prev:any) => ({
        ...prev,
        helpers: {
          ...prev.helpers,
          [type]: value
        }
      }));
    } else {
      setExistingAddresses((prev:any) => ({
        ...prev,
        [type]: value
      }));
    }
  };

  const handleNativeTokenAmountChange = (type: string, value: string) => {
    if (!/^\d*\.?\d*$/.test(value)) return;

    if (type.startsWith('helper_')) {
      setNativeTokenAmount((prev:any) => ({
        ...prev,
        helpers: { ...prev.helpers, [type]: value }
      }));
    } else {
      setNativeTokenAmount((prev:any)  => ({ ...prev, [type]: value }));
    }
  };

  const validateNativeTokenAmount = (type: string) => {
    let amount;
    if (type.startsWith('helper_')) {
      amount = parseFloat(nativeTokenAmount.helpers[type] || '0');
    } else {
      amount = parseFloat(nativeTokenAmount[type as keyof typeof nativeTokenAmount] as string);
    }

    const isDestination = type === 'destination' || (type === 'origin' && areContractsIdentical);
    if (isDestination && (isNaN(amount) || amount < 0.1)) {
      throw new Error(`Minimum 0.1 native tokens required for ${type} contract`);
    }
  };

  const handleDeploy = async (type: string) => {
    if (!web3 || !account) {
      setError("Please connect your wallet");
      return;
    }

    try {
      validateNativeTokenAmount(type);
      setIsDeploying((prev:any)=> ({
        ...prev,
        [type]: true
      }));
      setError(null);

      const chainId = await web3.eth.getChainId();
      
      if (type === 'reactive' && chainId !== BigInt(5318008)) {
        throw new Error('Reactive contract can only be deployed on the Kopli network');
      }

      let contractData;
      let constructorParameters;
      let deploymentValue;

      if (type.startsWith('helper_')) {
        const helperContract = helperContracts.find(h => type === `helper_${h.name}`);
        if (!helperContract || !helperContract.abi || !helperContract.bytecode) {
          throw new Error('Helper contract data not found');
        }
        contractData = {
          abi: JSON.parse(helperContract.abi),
          bytecode: helperContract.bytecode
        };
        constructorParameters = Object.values(constructorArgs.helpers[helperContract.name] || {});
        deploymentValue = web3.utils.toWei(nativeTokenAmount.helpers[type] || '0', 'ether');
      } else {
        contractData = {
          abi: JSON.parse(
            type === 'reactive' ? reactiveABI :
            type === 'origin' ? originABI :
            destinationABI
          ),
          bytecode: type === 'reactive' ? reactiveBytecode :
                   type === 'origin' ? originBytecode :
                   destinationBytecode
        };
        constructorParameters = Object.values(constructorArgs[type as keyof typeof constructorArgs]);
        deploymentValue = web3.utils.toWei(nativeTokenAmount[type as keyof typeof nativeTokenAmount] as string, 'ether');
      }

      const contract = new web3.eth.Contract(contractData.abi);
      const deploy = contract.deploy({
        data: contractData.bytecode,
        arguments: constructorParameters
      });

      const gasEstimate = await deploy.estimateGas({ 
        from: account,
        value: deploymentValue
      });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice) + BigInt(deploymentValue);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`);
      }

      let transactionHash = '';

      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
          value: deploymentValue
        })
        .on('transactionHash', (hash: string | Uint8Array) => {
          console.log('Transaction Hash:', hash);
          transactionHash = hash.toString();
          
          if (type.startsWith('helper_')) {
            setDeploymentInfo((prev:any) => ({
              ...prev,
              helpers: {
                ...prev.helpers,
                [type]: { address: 'Deploying...', transactionHash: hash }
              }
            }));
          } else {
            setDeploymentInfo(prev => ({
              ...prev,
              [type]: { address: 'Deploying...', transactionHash: hash }
            }));
          }
        })
        .on('error', (error: any) => {
          reject(error);
        })
        .then(resolve);
      });

      if (deployedContract) {
        const contractAddress = (deployedContract as any).options.address;
        
        if (type.startsWith('helper_')) {
          setDeploymentInfo(prev => ({
            ...prev,
            helpers: {
              ...prev.helpers,
              [type]: { address: contractAddress, transactionHash }
            }
          }));
          setDeployedAddresses(prev => ({
            ...prev,
            helpers: { ...prev.helpers, [type]: contractAddress }
          }));
        } else {
          setDeploymentInfo(prev => ({
            ...prev,
            [type]: { address: contractAddress, transactionHash }
          }));
          setDeployedAddresses(prev => ({ ...prev, [type]: contractAddress }));
          if (type === 'origin') setOriginAddress(contractAddress);
          if (type === 'destination') setDestinationAddress(contractAddress);
        }

        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} contract deployed successfully!`);
        
        return {
          transactionHash,
          contractAddress
        };
      }
    } catch (error: any) {
      console.error(`${type} deployment error:`, error);
      setError(error.message);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(prev => ({
        ...prev,
        [type]: false
      }));
    }
  };

  const renderDeploymentInfo = (type: string) => {
    const info = type.startsWith('helper_') 
      ? deploymentInfo.helpers[type]
      : deploymentInfo[type as keyof Omit<DeploymentInfo, 'helpers'>];

    if (!info) return null;

    return (
      <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
        <h4 className="text-lg font-medium text-gray-200 mb-2">Deployment Details</h4>
        <div className="space-y-2">
          <div>
            <Label className="text-gray-300">Contract Address</Label>
            <div className="flex items-center gap-2">
              <Input
                value={info.address}
                readOnly
                className="mt-1 bg-gray-700 text-gray-200 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(info.address)}
                className="whitespace-nowrap"
              >
                Copy
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Transaction Hash</Label>
            <div className="flex items-center gap-2">
              <Input
                value={info.transactionHash}
                readOnly
                className="mt-1 bg-gray-700 text-gray-200 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(info.transactionHash)}
                className="whitespace-nowrap"
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHelperContractCard = (helper: HelperContract) => {
    const type = `helper_${helper.name}`;
    const isNew = deploymentMode[helper.name] === 'new';
    const address = isNew ? deployedAddresses.helpers[type] : existingAddresses.helpers[type];

    return (
      <Card key={helper.name} className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-100">
            {helper.name} Helper Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, [helper.name]: 'new' }))}
                className="w-1/2"
              >
                Deploy New
              </Button>
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, [helper.name]: 'existing' }))}
                className="w-1/2"
              >
                Use Existing
              </Button>
            </div>

            {!isNew && (
              <div>
                <Label htmlFor={`${type}-address`} className="text-gray-300">
                  Contract Address
                </Label>
                <Input
                  id={`${type}-address`}
                  name={`${type}-address`}
                  value={existingAddresses.helpers[type] || ''}
                  onChange={(e) => handleExistingAddressChange(type, e.target.value)}
                  className="mt-1 bg-gray-700 text-gray-200"
                  placeholder="Enter deployed contract address"
                />
              </div>
            )}

            {address && renderDeploymentInfo(type)}
            {address && helper.abi && (
              <ContractInteraction
                abi={helper.abi}
                contractAddress={address}
                web3={web3}
                account={account}
              />
            )}

            {isNew && !address && (
              <>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({
                      ...prev,
                      helpers: { ...prev.helpers, [type]: !prev.helpers[type] }
                    }))}
                    className="text-gray-300"
                  >
                    {showCode.helpers[type] ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>

                {showCode.helpers[type] && (
                  <MonacoEditor
                    height="300px"
                    language="solidity"
                    theme="vs-dark"
                    value={helper.contract}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false }
                    }}
                  />
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs.helpers[helper.name] || {}).map(([argName, value]) => (
                    <div key={argName}>
                      <Label htmlFor={`${type}-${argName}`} className="text-gray-300">
                        {argName}
                      </Label>
                      <Input
                        id={`${type}-${argName}`}
                        name={`${type}-${argName}`}
                        value={value}
                        onChange={(e) => handleConstructorArgChange(type, argName, e.target.value)}
                        className="mt-1 bg-gray-700 text-gray-200"
                        placeholder={`Enter ${argName}`}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleDeploy(type)}
                  disabled={isDeploying.helpers[type]}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 w-full"
                >
                  {isDeploying.helpers[type] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    'Deploy Contract'
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderContractCard = (type: 'origin' | 'destination' | 'reactive') => {
    const isNew = deploymentMode[type] === 'new';
    const address = isNew ? deployedAddresses[type] : existingAddresses[type];
    const abi = type === 'reactive' ? reactiveABI : 
                type === 'origin' ? originABI : 
                destinationABI;
    const contract = type === 'reactive' ? reactiveTemplate :
                    type === 'origin' ? originContract :
                    destinationContract;

    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-100">
            {type.charAt(0).toUpperCase() + type.slice(1)} Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, [type]: 'new' }))}
                className="w-1/2"
              >
                Deploy New
              </Button>
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, [type]: 'existing' }))}
                className="w-1/2"
              >
                Use Existing
              </Button>
            </div>

            {!isNew && (
              <div>
                <Label htmlFor={`${type}-address`} className="text-gray-300">
                  Contract Address
                </Label>
                <Input
                  id={`${type}-address`}
                  name={`${type}-address`}
                  value={existingAddresses[type]}
                  onChange={(e) => handleExistingAddressChange(type, e.target.value)}
                  className="mt-1 bg-gray-700 text-gray-200"
                  placeholder="Enter deployed contract address"
                />
              </div>
            )}

            {address && renderDeploymentInfo(type)}
            {address && (
              <ContractInteraction
                abi={abi}
                contractAddress={address}
                web3={web3}
                account={account}
              />
            )}

            {isNew && !address && (
              <>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({ ...prev, [type]: !prev[type] }))}
                    className="text-gray-300"
                  >
                    {showCode[type] ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>

                {showCode[type] && (
                  <MonacoEditor
                    height="300px"
                    language="solidity"
                    theme="vs-dark"
                    value={contract}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false }
                    }}
                  />
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs[type]).map(([argName, value]) => (
                    <div key={argName}>
                      <Label htmlFor={`${type}-${argName}`} className="text-gray-300">
                        {argName}
                      </Label>
                      <Input
                        id={`${type}-${argName}`}
                        name={`${type}-${argName}`}
                        value={value}
                        onChange={(e) => handleConstructorArgChange(type, argName, e.target.value)}
                        className="mt-1 bg-gray-700 text-gray-200"
                        placeholder={`Enter ${argName}`}
                      />
                    </div>
                  ))}
                </div>

                {(type === 'destination' || (type === 'origin' && areContractsIdentical)) && (
                  <div>
                    <Label htmlFor={`${type}-token-amount`} className="text-gray-300">
                      Native Token Amount <span className="text-yellow-500">(min 0.1)</span>
                    </Label>
                    <Input
                      id={`${type}-token-amount`}
                      name={`${type}-token-amount`}
                      value={nativeTokenAmount[type]}
                      onChange={(e) => handleNativeTokenAmountChange(type, e.target.value)}
                      className="mt-1 bg-gray-700 text-gray-200"
                      placeholder="Enter amount in ETH"
                    />
                  </div>
                )}

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
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
          {renderContractCard('origin')}
        </>
      ) : (
        <>
          {renderContractCard('origin')}
          {renderContractCard('destination')}
        </>
      )}
      
      {renderContractCard('reactive')}

      {helperContracts?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Helper Contracts</h2>
          <div className="space-y-6">
            {helperContracts.map(helper => renderHelperContractCard(helper))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}