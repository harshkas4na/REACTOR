"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  const areContractsIdentical = useMemo(() => 
    originContract === destinationContract &&
    originABI === destinationABI &&
    originBytecode === destinationBytecode,
    [originContract, destinationContract, originABI, destinationABI, originBytecode, destinationBytecode]
  );

  const [networkStatus, setNetworkStatus] = useState<{
    isCorrectNetwork: boolean;
    currentNetwork: string;
  }>({ isCorrectNetwork: false, currentNetwork: '' });
  
  const initialConstructorArgs = useMemo(() => {
    const parseConstructorArgs = (abi: string): Record<string, string> => {
      try {
        const parsedABI = JSON.parse(abi);
        const constructor = parsedABI.find((item: any) => item.type === 'constructor');
        return constructor?.inputs 
          ? Object.fromEntries(constructor.inputs.map((input: any) => [input.name, '']))
          : {};
      } catch {
        return {};
      }
    };
  
    const helperArgs: Record<string, Record<string, string>> = {};
    helperContracts.forEach(helper => {
      if (helper.abi) {
        helperArgs[helper.name] = parseConstructorArgs(helper.abi);
      }
    });
  
    return {
      origin: parseConstructorArgs(originABI),
      destination: !areContractsIdentical ? parseConstructorArgs(destinationABI) : {},
      reactive: parseConstructorArgs(reactiveABI),
      helpers: helperArgs
    };
  }, [originABI, destinationABI, reactiveABI, areContractsIdentical, helperContracts]);

  const [constructorArgs, setConstructorArgs] = useState(initialConstructorArgs);

const [deploymentMode, setDeploymentMode] = useState(() => {
  const modes:any = {
    origin: 'new',
    destination: 'new',
    reactive: 'new',
  };
  helperContracts.forEach((helper:any) => {
    modes[helper.name] = 'new';
  }); 
  return modes;
});

  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({
    origin: null,
    destination: null,
    reactive: null,
    helpers: {}
  });

  const [deployedAddresses, setDeployedAddresses] = useState({
    origin: '',
    destination: '',
    reactive: '',
    helpers: {} as Record<string, string>
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
      setConstructorArgs(prev => ({
        ...prev,
        [type]: {
          ...prev[type as keyof typeof prev],
          [name]: value
        }
      }));
    }
  };

  const handleExistingAddressChange = (type: string, value: string) => {
    if (type.startsWith('helper_')) {
      setExistingAddresses(prev => ({
        ...prev,
        helpers: {
          ...prev.helpers,
          [type]: value
        }
      }));
    } else {
      setExistingAddresses(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  const handleNativeTokenAmountChange = (type: string, value: string) => {
    // Only allow numbers with up to 18 decimal places
    const regex = /^\d*\.?\d{0,18}$/;
    if (!regex.test(value) && value !== '') return;
  
    // Prevent values over 1000 ETH for safety
    if (parseFloat(value) > 1000) return;
  
    if (type.startsWith('helper_')) {
      setNativeTokenAmount(prev => ({
        ...prev,
        helpers: { ...prev.helpers, [type]: value }
      }));
    } else {
      setNativeTokenAmount(prev => ({ ...prev, [type]: value }));
    }
  };
  
  const validateNativeTokenAmount = (type: string) => {
    let amount;
    if (type.startsWith('helper_')) {
      amount = parseFloat(nativeTokenAmount.helpers[type] || '0');
    } else {
      amount = parseFloat(nativeTokenAmount[type as keyof typeof nativeTokenAmount] as string);
    }
  
    // For reactive contracts, no native token is needed
    if (type === 'reactive') return;
  
    const isDestination = type === 'destination' || (type === 'origin' && areContractsIdentical);
    if (isDestination && (isNaN(amount) || amount < 0.1)) {
      throw new Error(`Minimum 0.1 native tokens required for ${type} contract`);
    }
  
    // Maximum safety check
    if (amount > 1000) {
      throw new Error('Maximum native token amount exceeded (1000 ETH limit)');
    }
  };

  useEffect(() => {
    const checkNetwork = async () => {
      if (web3) {
        const chainId = await web3.eth.getChainId();
        const isKopli = chainId === BigInt(5318008);
        const networkName = chainId === BigInt(5318008) ? 'Kopli' : 
          chainId === BigInt(1) ? 'Ethereum' :
          chainId === BigInt(137) ? 'Polygon' :
          `Chain ID: ${chainId}`;
        
        setNetworkStatus({
          isCorrectNetwork: isKopli,
          currentNetwork: networkName
        });
      }
    };
    checkNetwork();
  }, [web3]);

  // Helper function to render the deploy button content
  const renderDeployButton = (type: string, isDeploying: boolean) => {
    if (!web3 || !account) {
      return (
        <div className="mt-6 space-y-2">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
              Wallet Not Connected
            </AlertTitle>
            <AlertDescription className="mt-2 text-zinc-300">
              {type === 'reactive' ? (
                <span>Please connect your wallet to the <strong>Kopli Network</strong> to deploy this contract.</span>
              ) : (
                <span>Please connect your wallet to deploy this contract.</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (type === 'reactive' && !networkStatus.isCorrectNetwork) {
      return (
        <div className="mt-6 space-y-2">
          <Alert variant="destructive" className="bg-yellow-900/20 border-yellow-800">
            <AlertTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"/>
              Incorrect Network
            </AlertTitle>
            <AlertDescription className="mt-2 text-zinc-300">
              You are currently on <strong>{networkStatus.currentNetwork}</strong>.
              <br />
              Reactive contracts must be deployed on <strong>Kopli Network</strong>.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="mt-6 space-y-2">
        {type === 'reactive' && (
          <Alert className="bg-blue-900/20 border-blue-800">
            <AlertTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"/>
              Network Status
            </AlertTitle>
            <AlertDescription className="text-zinc-300">
              Connected to <strong>Kopli Network</strong> - Ready to deploy
            </AlertDescription>
          </Alert>
        )}
        
        <Button
          onClick={() => handleDeploy(type)}
          disabled={isDeploying}
          className={`bg-gradient-to-r relative z-30 from-blue-600 to-purple-600 
            hover:from-blue-700 hover:to-purple-700 transition-all duration-200
            ${isDeploying ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {isDeploying ? (
            <div className="relative">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deploying Contract...</span>
              </div>
              <div className="absolute top-8 left-0 right-0 text-xs text-zinc-400">
                Please wait for transaction confirmation
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Deploy Contract</span>
              {type === 'reactive' && (
                <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">
                  on Kopli
                </span>
              )}
            </div>
          )}
        </Button>
      </div>
    );
  };

// Updated handle deploy function with better error handling


const handleDeploy = async (type: string) => {
  if (!web3 || !account) {
    toast.error("Please connect your wallet first");
    return;
  }

  const deploymentToast = toast.loading(
    "Preparing deployment...", 
    { id: `deploy-${type}` }
  );

  try {
    validateNativeTokenAmount(type);
    setIsDeploying(prev => ({
      ...prev,
      [type]: true
    }));
    setError(null);

    const chainId = await web3.eth.getChainId();
    const isKopli = chainId === BigInt(5318008);
    
    if (type === 'reactive' && !isKopli) {
      toast.error("Reactive contracts must be deployed on Kopli network", {
        id: deploymentToast
      });
      return;
    }

    let contractData;
    let constructorParameters;
    let deploymentValue;

    try {
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
        deploymentValue = type === 'reactive' ? '0' : 
          web3.utils.toWei(nativeTokenAmount[type as keyof typeof nativeTokenAmount] as any || '0', 'ether');
      }
    } catch (error) {
      toast.error("Failed to prepare contract data. Please check your inputs.", {
        id: deploymentToast
      });
      return;
    }

    // Validate constructor parameters
    const missingParams = constructorParameters.filter(param => !param);
    if (missingParams.length > 0) {
      toast.error(`Please fill in all constructor parameters for ${type} contract`, {
        id: deploymentToast
      });
      return;
    }

    toast.loading("Creating contract instance...", { id: deploymentToast });

    const contract = new web3.eth.Contract(contractData.abi);
    const deploy = contract.deploy({
      data: contractData.bytecode,
      arguments: constructorParameters
    });

    toast.loading("Estimating gas...", { id: deploymentToast });

    let gasEstimate;
    try {
      gasEstimate = await deploy.estimateGas({
        from: account,
        value: deploymentValue
      });
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas estimation';
      } else if (errorMessage.includes('execution reverted')) {
        errorMessage = 'Contract deployment would fail - please check your constructor parameters';
      }
      toast.error(`Gas estimation failed: ${errorMessage}`, {
        id: deploymentToast
      });
      return;
    }

    // Calculate gas limit with 20% buffer
    const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);

    // Get current balance for validation
    const balance = await web3.eth.getBalance(account);
    const gasPrice = await web3.eth.getGasPrice();
    const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice) + BigInt(deploymentValue);

    if (BigInt(balance) < requiredBalance) {
      const required = web3.utils.fromWei(requiredBalance.toString(), 'ether');
      const available = web3.utils.fromWei(balance.toString(), 'ether');
      toast.error(
        `Insufficient balance! Required: ${Number(required).toFixed(4)} ETH, Available: ${Number(available).toFixed(4)} ETH`,
        { id: deploymentToast }
      );
      return;
    }

    toast.loading(
      "Please confirm the transaction in your wallet...", 
      { id: deploymentToast }
    );

    let transactionHash = '';

    const deployedContract = await new Promise((resolve, reject) => {
      deploy.send({
        from: account,
        gas: String(gasLimit),
        value: deploymentValue,
        
      })
      .on('transactionHash', (hash: string | Uint8Array) => {
        transactionHash = hash.toString();
        toast.loading(
          `Transaction submitted\nHash: ${hash.toString().slice(0, 6)}...${hash.toString().slice(-4)}`,
          { id: deploymentToast }
        );

        if (type.startsWith('helper_')) {
          setDeploymentInfo((prev: any) => ({
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
      .on('receipt', (receipt: any) => {
      })
      .on('error', (error: any) => {
        console.error('Deployment error:', error);
        if (error.code === 4001) {
          toast.error('Transaction was rejected by user', { id: deploymentToast });
        } else {
          reject(error);
        }
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

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} contract deployed successfully!\nAddress: ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
        { id: deploymentToast, duration: 5000 }
      );
    }
  } catch (error: any) {
    console.error('Deployment error:', error);
    let errorMessage = error.message;
    
    if (error.code === 4001) {
      errorMessage = 'Transaction rejected by user';
    } else if (error.code === -32603) {
      errorMessage = 'Internal JSON-RPC error. Please check your wallet and try again.';
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for deployment';
    } else if (errorMessage.includes('nonce too low')) {
      errorMessage = 'Transaction nonce error. Please reset your MetaMask account.';
    }
    
    toast.error(`Deployment failed: ${errorMessage}`, { id: deploymentToast });
    setError(errorMessage);
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
      <Card key={helper.name} className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800  overflow-visible">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-zinc-100">
            {helper.name} Helper Contract
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative">
          <div className="space-y-4 relative z-30">
            <div className="flex gap-4">
              <Button
                variant={isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode((prev:any) => ({ ...prev, [helper.name]: 'new' }))}
                className={`w-1/2 ${isNew ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Deploy New
              </Button>
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode((prev:any) => ({ ...prev, [helper.name]: 'existing' }))}
                className={`w-1/2 ${!isNew ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Use Existing
              </Button>
            </div>
  
            {!isNew && (
              <div className="relative z-30">
                <Label htmlFor={`${type}-address`} className="text-zinc-300">
                  Contract Address
                </Label>
                <Input
                  id={`${type}-address`}
                  value={existingAddresses.helpers[type] || ''}
                  onChange={(e) => handleExistingAddressChange(type, e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
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
                <div className="flex justify-between relative z-30">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({
                      ...prev,
                      helpers: { ...prev.helpers, [type]: !prev.helpers[type] }
                    }))}
                    className="text-zinc-300 border-blue-500/20 hover:bg-blue-900/20"
                  >
                    {showCode.helpers[type] ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>
  
                {showCode.helpers[type] && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden relative z-30">
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
                  </div>
                )}
  
                <div className="space-y-4 relative z-30">
                  <h3 className="text-lg font-medium text-zinc-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs.helpers[helper.name] || {}).map(([argName, value]) => (
                    <div key={argName} className="relative">
                      <Label htmlFor={`${type}-${argName}`} className="text-zinc-300">
                        {argName}
                      </Label>
                      <Input
                        id={`${type}-${argName}`}
                        value={value}
                        onChange={(e) => handleConstructorArgChange(type, argName, e.target.value)}
                        className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                        placeholder={`Enter ${argName}`}
                      />
                    </div>
                  ))}
                </div>
  
                <div className="relative z-30">
                  <Label htmlFor={`${type}-token-amount`} className="text-zinc-300">
                    Native Token Amount
                  </Label>
                  <Input
                    id={`${type}-token-amount`}
                    value={nativeTokenAmount.helpers[type] || '0'}
                    onChange={(e) => handleNativeTokenAmountChange(type, e.target.value)}
                    className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                    placeholder="Enter amount in ETH"
                  />
                </div>
  
                {renderDeployButton(type, isDeploying.helpers[type])}
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
      <Card className="bg-gradient-to-br relative from-blue-900/30 to-purple-900/30 border-zinc-800  overflow-visible">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-zinc-100">
            {type.charAt(0).toUpperCase() + type.slice(1)} Contract
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative">
          <div className="space-y-4 relative z-30">
            <div className="flex gap-4">
              <Button
                variant={isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode((prev:any) => ({ ...prev, [type]: 'new' }))}
                className={`w-1/2 ${isNew ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Deploy New
              </Button>
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode((prev:any) => ({ ...prev, [type]: 'existing' }))}
                className={`w-1/2 ${!isNew ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Use Existing
              </Button>
            </div>
  
            {!isNew && (
              <div className="relative z-30">
                <Label htmlFor={`${type}-address`} className="text-zinc-300">
                  Contract Address
                </Label>
                <Input
                  id={`${type}-address`}
                  value={existingAddresses[type]}
                  onChange={(e) => handleExistingAddressChange(type, e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
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
                <div className="flex justify-between relative z-30">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({ ...prev, [type]: !prev[type] }))}
                    className="text-zinc-300 border-blue-500/20 hover:bg-blue-900/20"
                  >
                    {showCode[type] ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>
  
                {showCode[type] && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden relative z-30">
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
                  </div>
                )}
  
                <div className="space-y-4 relative z-30">
                  <h3 className="text-lg font-medium text-zinc-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs[type]).map(([argName, value]) => (
                    <div key={argName} className="relative">
                      <Label htmlFor={`${type}-${argName}`} className="text-zinc-300">
                        {argName}
                      </Label>
                      <Input
                        id={`${type}-${argName}`}
                        value={value}
                        onChange={(e) => handleConstructorArgChange(type, argName, e.target.value)}
                        className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                        placeholder={`Enter ${argName}`}
                      />
                    </div>
                  ))}
                </div>
  
                {(type === 'destination' || (type === 'origin' && areContractsIdentical)) && (
                  <div className="relative z-30">
                    <Label htmlFor={`${type}-token-amount`} className="text-zinc-300">
                      Native Token Amount <span className="text-yellow-400">(min 0.1)</span>
                    </Label>
                    <Input
                      id={`${type}-token-amount`}
                      value={nativeTokenAmount[type]}
                      onChange={(e) => handleNativeTokenAmountChange(type, e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                      placeholder="Enter amount in ETH"
                    />
                  </div>
                )}
  
                
                {renderDeployButton(type, isDeploying[type])}
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