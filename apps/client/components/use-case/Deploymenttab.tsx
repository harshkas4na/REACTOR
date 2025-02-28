"use client";

import React, { useState, useEffect, useMemo, ReactElement } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Info } from 'lucide-react';
import { useWeb3 } from '@/app/_context/Web3Context';
import { toast } from 'react-hot-toast';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import dynamic from 'next/dynamic';
import ContractInteraction from './ContractInteraction';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define callback proxy addresses for different chains
const CALLBACK_PROXIES: { [chainId: string]: string } = {
  // '1': '0x0', // Ethereum Mainnet - placeholder
  '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA', // Sepolia
  '5318008': '0x0000000000000000000000000000000000fffFfF', // Kopli
  // '137': '0x0', // Polygon - placeholder
  // '80001': '0x0', // Mumbai - placeholder
};

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
  helperContracts?: any[];
}


const DeploymentTab = ({
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
}: DeploymentTabProps): ReactElement => {
  const areContractsIdentical = useMemo(() => 
    originContract === destinationContract &&
    originABI === destinationABI &&
    originBytecode === destinationBytecode,
    [originContract, destinationContract, originABI, destinationABI, originBytecode, destinationBytecode]
  );

  const [networkStatus, setNetworkStatus] = useState<{
    isCorrectNetwork: boolean;
    currentNetwork: string;
    chainId: string;
  }>({ isCorrectNetwork: false, currentNetwork: '', chainId: '' });
  
  const { account, web3 } = useWeb3();
  const { setOriginAddress, setDestinationAddress, callbackSender, setCallbackSender } = useAutomationContext();

  // Update network status when web3 is available
  useEffect(() => {
    const checkNetwork = async () => {
      if (web3) {
        const chainId = await web3.eth.getChainId();
        const chainIdStr = chainId.toString();
        const isKopli = chainId === BigInt(5318008);
        const networkName = 
          chainId === BigInt(5318008) ? 'Kopli' : 
          chainId === BigInt(1) ? 'Ethereum Mainnet' :
          chainId === BigInt(11155111) ? 'Sepolia' :
          chainId === BigInt(137) ? 'Polygon' :
          chainId === BigInt(80001) ? 'Mumbai' :
          `Chain ID: ${chainId}`;
        
        setNetworkStatus({
          isCorrectNetwork: isKopli,
          currentNetwork: networkName,
          chainId: chainIdStr
        });
        
        // Update callback sender when network changes
        if (CALLBACK_PROXIES[chainIdStr]) {
          setCallbackSender(CALLBACK_PROXIES[chainIdStr]);
        }
      }
    };
    
    checkNetwork();
  }, [web3, setCallbackSender]);

  // Initialize constructor args with callback proxy
  const initialConstructorArgs = useMemo(() => {
    const parseConstructorArgs = (abi: string, isOriginWithCallback = false): Record<string, string> => {
      try {
        const parsedABI = JSON.parse(abi);
        const constructor = parsedABI.find((item: any) => item.type === 'constructor');
        
        if (constructor?.inputs && constructor.inputs.length > 0) {
          const result: Record<string, string> = {};
          
          constructor.inputs.forEach((input: any, index: number) => {
            // Set callback_sender for destination contracts or origin contracts that are also destination
            if ((index === 0 && 
                (input.name === 'callback_sender' || input.name === '_callback_sender') && 
                networkStatus.chainId && 
                CALLBACK_PROXIES[networkStatus.chainId]) ||
                (isOriginWithCallback && (input.name === 'callback_sender' || input.name === '_callback_sender'))) {
              result[input.name] = CALLBACK_PROXIES[networkStatus.chainId] || '';
            } else {
              result[input.name] = '';
            }
          });
          
          return result;
        }
        
        return {};
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
      // Pass true to indicate this origin contract also serves as destination when contracts are identical
      origin: parseConstructorArgs(originABI, areContractsIdentical),
      destination: !areContractsIdentical ? parseConstructorArgs(destinationABI) : {},
      reactive: parseConstructorArgs(reactiveABI),
      helpers: helperArgs
    };
  }, [originABI, destinationABI, reactiveABI, areContractsIdentical, helperContracts, networkStatus.chainId]);

  const [constructorArgs, setConstructorArgs] = useState(initialConstructorArgs);

  // Update constructor args when network changes
  useEffect(() => {
    if (networkStatus.chainId && CALLBACK_PROXIES[networkStatus.chainId]) {
      // Start with current constructor args
      const updatedArgs = {...constructorArgs};
      
      // Update destination contract callback sender
      if (!areContractsIdentical) {
        const destArgs = {...updatedArgs.destination};
        Object.keys(destArgs).forEach(key => {
          if (key === 'callback_sender' || key === '_callback_sender') {
            destArgs[key] = CALLBACK_PROXIES[networkStatus.chainId];
          }
        });
        updatedArgs.destination = destArgs;
      }
      
      // Update origin contract callback sender if contracts are identical
      if (areContractsIdentical) {
        const originArgs = {...updatedArgs.origin};
        Object.keys(originArgs).forEach(key => {
          if (key === 'callback_sender' || key === '_callback_sender') {
            originArgs[key] = CALLBACK_PROXIES[networkStatus.chainId];
          }
        });
        updatedArgs.origin = originArgs;
      }
      
      setConstructorArgs(updatedArgs);
      
      // Also update the callback sender in context
      setCallbackSender(CALLBACK_PROXIES[networkStatus.chainId]);
    }
  }, [networkStatus.chainId, setCallbackSender, areContractsIdentical]);

  const [deploymentMode, setDeploymentMode] = useState<Record<string, string>>(() => {
    const modes: Record<string, string> = {
      origin: 'new',
      destination: 'new',
      reactive: 'new',
    };
    helperContracts.forEach((helper) => {
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

  // New state for callback sender display
  const [showCallbackInfo, setShowCallbackInfo] = useState(false);

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
      
      // Update callback sender in context if this is the callback_sender parameter
      if ((name === 'callback_sender' || name === '_callback_sender') && 
          (type === 'destination' || (type === 'origin' && areContractsIdentical))) {
        setCallbackSender(value);
      }
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

  // Function to render the callback sender information for destination contracts
  const renderCallbackSenderInfo = () => {
    if (!networkStatus.chainId) return null;
    
    const callbackAddress = CALLBACK_PROXIES[networkStatus.chainId] || 'Not available for this network';
    
    return (
      <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-md font-medium text-blue-300">Callback Sender Information</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCallbackInfo(!showCallbackInfo)}
            className="text-blue-300 hover:text-blue-100"
          >
            {showCallbackInfo ? 'Hide' : 'Show'}
          </Button>
        </div>
        
        {showCallbackInfo && (
          <div className="space-y-3 text-sm text-zinc-300">
            <div>
              <Label className="text-blue-200">Network</Label>
              <div className="text-zinc-300 mt-1">{networkStatus.currentNetwork}</div>
            </div>
            
            <div>
              <Label className="text-blue-200">Callback Proxy Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-blue-900/30 px-2 py-1 rounded text-zinc-300 font-mono text-xs break-all">
                  {callbackAddress}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(callbackAddress);
                    toast.success("Callback address copied to clipboard");
                  }}
                  className="whitespace-nowrap text-xs h-7"
                >
                  Copy
                </Button>
              </div>
            </div>
            
            <Alert className="bg-blue-900/10 border-blue-800/30 py-2">
              <AlertDescription className="text-zinc-300 text-xs">
                This address will be automatically used as the first constructor parameter for destination contracts. 
                It ensures the validity of callback transactions by verifying they originate from the Reactive Network.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    );
  };
  // Helper function to render the deploy button content
  const renderDeployButton = (type: string, isDeploying: boolean) => {
    if (!web3 || !account) {
      return (
        <div className="mt-6 space-y-2">
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertTitle className="flex text-red-500 items-center gap-2">
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
      const chainIdStr = chainId.toString();
      const isKopli = chainId === BigInt(5318008);
      
      if (type === 'reactive' && !isKopli) {
        toast.error("Reactive contracts must be deployed on Kopli network", {
          id: deploymentToast
        });
        return;
      }

      // For destination contracts, ensure callback sender is set
      if ((type === 'destination' || (type === 'origin' && areContractsIdentical)) && 
          (!callbackSender || callbackSender === '0x0')) {
        // Set default callback proxy for this chain if available
        if (CALLBACK_PROXIES[chainIdStr]) {
          setCallbackSender(CALLBACK_PROXIES[chainIdStr]);
          
          // Update in constructor args too
          if (type === 'destination') {
            const destArgs = {...constructorArgs.destination};
            Object.keys(destArgs).forEach(key => {
              if (key === 'callback_sender' || key === '_callback_sender') {
                destArgs[key] = CALLBACK_PROXIES[chainIdStr];
              }
            });
            
            setConstructorArgs(prev => ({
              ...prev,
              destination: destArgs
            }));
          } else if (type === 'origin' && areContractsIdentical) {
            const originArgs = {...constructorArgs.origin};
            Object.keys(originArgs).forEach(key => {
              if (key === 'callback_sender' || key === '_callback_sender') {
                originArgs[key] = CALLBACK_PROXIES[chainIdStr];
              }
            });
            
            setConstructorArgs(prev => ({
              ...prev,
              origin: originArgs
            }));
          }
        } else {
          toast.error(`Callback sender address is not set for network ${networkStatus.currentNetwork}`, {
            id: deploymentToast
          });
          return;
        }
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
                value={info.address ? info.address:"0x0"}
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
                onClick={() => setDeploymentMode((prev) => ({ ...prev, [helper.name]: 'new' }))}
                className={`w-1/2 ${isNew ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Deploy New
              </Button>
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setDeploymentMode((prev) => ({ ...prev, [helper.name]: 'existing' }))}
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

  return (
    <div className="space-y-6">
      {/* Network Status Banner */}
      {web3 && (
        <Alert className={`${
          networkStatus.chainId && CALLBACK_PROXIES[networkStatus.chainId] 
            ? 'bg-green-900/20 border-green-700/50' 
            : 'bg-yellow-900/20 border-yellow-700/50'
        }`}>
          <AlertTitle className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              networkStatus.chainId && CALLBACK_PROXIES[networkStatus.chainId] 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-yellow-500 animate-pulse'
            }`}/>
            Connected to {networkStatus.currentNetwork}
          </AlertTitle>
          <AlertDescription>
            {networkStatus.chainId && CALLBACK_PROXIES[networkStatus.chainId] ? (
              <span>Callback proxy available for this network: <code className="bg-green-900/30 px-2 py-1 rounded text-xs">{CALLBACK_PROXIES[networkStatus.chainId].slice(0, 6)}...{CALLBACK_PROXIES[networkStatus.chainId].slice(-4)}</code></span>
            ) : (
              <span>No callback proxy configured for this network. Destination contracts may not deploy correctly.</span>
            )}
          </AlertDescription>
        </Alert>
      )}
  
      {/* Origin Contract Card */}
      <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 overflow-visible">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-zinc-100 flex items-center">
            Origin Contract
            
            {areContractsIdentical && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-200">
                      <Info className="w-3 h-3 mr-1" />
                      Also Destination
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">This contract serves as both Origin and Destination. It requires a callback sender address and 0.1 native tokens.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative">
          <div className="space-y-4 relative z-30">
            <div className="flex gap-4">
              <Button
                variant={deploymentMode.origin === 'new' ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, origin: 'new' }))}
                className={`w-1/2 ${deploymentMode.origin === 'new' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Deploy New
              </Button>
              <Button
                variant={deploymentMode.origin === 'existing' ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, origin: 'existing' }))}
                className={`w-1/2 ${deploymentMode.origin === 'existing' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Use Existing
              </Button>
            </div>
            
            {/* Show callback sender info if this is also a destination contract */}
            {areContractsIdentical && deploymentMode.origin === 'new' && !deployedAddresses.origin && renderCallbackSenderInfo()}
  
            {deploymentMode.origin === 'existing' && (
              <div className="relative z-30">
                <Label htmlFor="origin-address" className="text-zinc-300">
                  Contract Address
                </Label>
                <Input
                  id="origin-address"
                  value={existingAddresses.origin}
                  onChange={(e) => handleExistingAddressChange('origin', e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                  placeholder="Enter deployed contract address"
                />
              </div>
            )}
  
            {(deployedAddresses.origin || existingAddresses.origin) && renderDeploymentInfo('origin')}
            {(deployedAddresses.origin || existingAddresses.origin) && (
              <ContractInteraction
                abi={originABI}
                contractAddress={deploymentMode.origin === 'new' ? deployedAddresses.origin : existingAddresses.origin}
                web3={web3}
                account={account}
              />
            )}
  
            {deploymentMode.origin === 'new' && !deployedAddresses.origin && (
              <>
                <div className="flex justify-between relative z-30">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({ ...prev, origin: !prev.origin }))}
                    className="text-zinc-300 border-blue-500/20 hover:bg-blue-900/20"
                  >
                    {showCode.origin ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>
  
                {showCode.origin && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden relative z-30">
                    <MonacoEditor
                      height="300px"
                      language="solidity"
                      theme="vs-dark"
                      value={originContract}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false }
                      }}
                    />
                  </div>
                )}
  
                <div className="space-y-4 relative z-30">
                  <h3 className="text-lg font-medium text-zinc-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs.origin).map(([argName, value]) => {
                    // Special handling for callback sender parameter if this also serves as destination contract
                    const isCallbackSender = areContractsIdentical && (argName === 'callback_sender' || argName === '_callback_sender');
                    
                    return (
                      <div key={argName} className="relative">
                        <Label 
                          htmlFor={`origin-${argName}`} 
                          className={`flex items-center ${isCallbackSender ? 'text-blue-300' : 'text-zinc-300'}`}
                        >
                          {argName}
                          {isCallbackSender && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-4 h-4 ml-1 text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">This parameter is automatically set to the callback proxy address for the current network.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </Label>
                        <Input
                          id={`origin-${argName}`}
                          value={value}
                          onChange={(e) => handleConstructorArgChange('origin', argName, e.target.value)}
                          className={`mt-1 border-zinc-700 text-zinc-200 pointer-events-auto ${
                            isCallbackSender ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-900/20'
                          }`}
                          placeholder={`Enter ${argName}`}
                          readOnly={isCallbackSender} // Make callback sender read-only by default
                        />
                        {isCallbackSender && (
                          <div className="text-xs text-blue-400 mt-1">
                            Callback proxy for {networkStatus.currentNetwork}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
  
                {areContractsIdentical && (
                  <div className="relative z-30">
                    <Label htmlFor="origin-token-amount" className="text-zinc-300">
                      Native Token Amount <span className="text-yellow-400">(min 0.1)</span>
                    </Label>
                    <Input
                      id="origin-token-amount"
                      value={nativeTokenAmount.origin}
                      onChange={(e) => handleNativeTokenAmountChange('origin', e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                      placeholder="Enter amount in ETH"
                    />
                  </div>
                )}
  
                {renderDeployButton('origin', isDeploying.origin)}
              </>
            )}
          </div>
        </CardContent>
      </Card>
  
      {/* Destination Contract Card (only if not identical to origin) */}
      {!areContractsIdentical && (
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 overflow-visible">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-xl font-bold text-zinc-100 flex items-center">
              Destination Contract
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-200">
                      <Info className="w-3 h-3 mr-1" />
                      Requires Callback
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">This contract requires a callback sender address as a constructor parameter. It will be automatically set based on the current network.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 relative">
            <div className="space-y-4 relative z-30">
              <div className="flex gap-4">
                <Button
                  variant={deploymentMode.destination === 'new' ? "default" : "outline"}
                  onClick={() => setDeploymentMode(prev => ({ ...prev, destination: 'new' }))}
                  className={`w-1/2 ${deploymentMode.destination === 'new' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
                >
                  Deploy New
                </Button>
                <Button
                  variant={deploymentMode.destination === 'existing' ? "default" : "outline"}
                  onClick={() => setDeploymentMode(prev => ({ ...prev, destination: 'existing' }))}
                  className={`w-1/2 ${deploymentMode.destination === 'existing' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
                >
                  Use Existing
                </Button>
              </div>
              
              {/* Show callback sender info */}
              {deploymentMode.destination === 'new' && !deployedAddresses.destination && renderCallbackSenderInfo()}
            
              {deploymentMode.destination === 'existing' && (
                <div className="relative z-30">
                  <Label htmlFor="destination-address" className="text-zinc-300">
                    Contract Address
                  </Label>
                  <Input
                    id="destination-address"
                    value={existingAddresses.destination}
                    onChange={(e) => handleExistingAddressChange('destination', e.target.value)}
                    className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                    placeholder="Enter deployed contract address"
                  />
                </div>
              )}
            
              {(deployedAddresses.destination || existingAddresses.destination) && renderDeploymentInfo('destination')}
              {(deployedAddresses.destination || existingAddresses.destination) && (
                <ContractInteraction
                  abi={destinationABI}
                  contractAddress={deploymentMode.destination === 'new' ? deployedAddresses.destination : existingAddresses.destination}
                  web3={web3}
                  account={account}
                />
              )}
            
              {deploymentMode.destination === 'new' && !deployedAddresses.destination && (
                <>
                  <div className="flex justify-between relative z-30">
                    <Button
                      variant="outline"
                      onClick={() => setShowCode(prev => ({ ...prev, destination: !prev.destination }))}
                      className="text-zinc-300 border-blue-500/20 hover:bg-blue-900/20"
                    >
                      {showCode.destination ? 'Hide Code' : 'Show Code'}
                    </Button>
                  </div>
            
                  {showCode.destination && (
                    <div className="border border-zinc-800 rounded-lg overflow-hidden relative z-30">
                      <MonacoEditor
                        height="300px"
                        language="solidity"
                        theme="vs-dark"
                        value={destinationContract}
                        options={{
                          readOnly: true,
                          minimap: { enabled: false }
                        }}
                      />
                    </div>
                  )}
            
                  <div className="space-y-4 relative z-30">
                    <h3 className="text-lg font-medium text-zinc-200">Constructor Arguments</h3>
                    {Object.entries(constructorArgs.destination).map(([argName, value]) => {
                      // Special handling for callback sender parameter
                      const isCallbackSender = argName === 'callback_sender' || argName === '_callback_sender';
                      
                      return (
                        <div key={argName} className="relative">
                          <Label 
                            htmlFor={`destination-${argName}`} 
                            className={`flex items-center ${isCallbackSender ? 'text-blue-300' : 'text-zinc-300'}`}
                          >
                            {argName}
                            {isCallbackSender && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 ml-1 text-blue-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-sm">This parameter is automatically set to the callback proxy address for the current network.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </Label>
                          <Input
                            id={`destination-${argName}`}
                            value={value}
                            onChange={(e) => handleConstructorArgChange('destination', argName, e.target.value)}
                            className={`mt-1 border-zinc-700 text-zinc-200 pointer-events-auto ${
                              isCallbackSender ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-900/20'
                            }`}
                            placeholder={`Enter ${argName}`}
                            readOnly={isCallbackSender} // Make callback sender read-only by default
                          />
                          {isCallbackSender && (
                            <div className="text-xs text-blue-400 mt-1">
                              Callback proxy for {networkStatus.currentNetwork}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
            
                  <div className="relative z-30">
                    <Label htmlFor="destination-token-amount" className="text-zinc-300">
                      Native Token Amount <span className="text-yellow-400">(min 0.1)</span>
                    </Label>
                    <Input
                      id="destination-token-amount"
                      value={nativeTokenAmount.destination}
                      onChange={(e) => handleNativeTokenAmountChange('destination', e.target.value)}
                      className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                      placeholder="Enter amount in ETH"
                    />
                  </div>
            
                  {renderDeployButton('destination', isDeploying.destination)}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
  
      {/* Reactive Contract Card */}
      <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 overflow-visible">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-zinc-100 flex items-center">
            Reactive Contract
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/40 text-purple-200">
                    <Info className="w-3 h-3 mr-1" />
                    Kopli Network
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">This contract must be deployed on the Kopli Network for proper event monitoring and callback functionality.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative">
          <div className="space-y-4 relative z-30">
            <div className="flex gap-4">
              <Button
                variant={deploymentMode.reactive === 'new' ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, reactive: 'new' }))}
                className={`w-1/2 ${deploymentMode.reactive === 'new' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Deploy New
              </Button>
              <Button
                variant={deploymentMode.reactive === 'existing' ? "default" : "outline"}
                onClick={() => setDeploymentMode(prev => ({ ...prev, reactive: 'existing' }))}
                className={`w-1/2 ${deploymentMode.reactive === 'existing' ? 'bg-primary hover:bg-primary/80' : 'border-blue-500/20 hover:bg-blue-900/20'}`}
              >
                Use Existing
              </Button>
            </div>
          
            {deploymentMode.reactive === 'existing' && (
              <div className="relative z-30">
                <Label htmlFor="reactive-address" className="text-zinc-300">
                  Contract Address
                </Label>
                <Input
                  id="reactive-address"
                  value={existingAddresses.reactive}
                  onChange={(e) => handleExistingAddressChange('reactive', e.target.value)}
                  className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                  placeholder="Enter deployed contract address"
                />
              </div>
            )}
          
            {(deployedAddresses.reactive || existingAddresses.reactive) && renderDeploymentInfo('reactive')}
            {(deployedAddresses.reactive || existingAddresses.reactive) && (
              <ContractInteraction
                abi={reactiveABI}
                contractAddress={deploymentMode.reactive === 'new' ? deployedAddresses.reactive : existingAddresses.reactive}
                web3={web3}
                account={account}
              />
            )}
          
            {deploymentMode.reactive === 'new' && !deployedAddresses.reactive && (
              <>
                <div className="flex justify-between relative z-30">
                  <Button
                    variant="outline"
                    onClick={() => setShowCode(prev => ({ ...prev, reactive: !prev.reactive }))}
                    className="text-zinc-300 border-blue-500/20 hover:bg-blue-900/20"
                  >
                    {showCode.reactive ? 'Hide Code' : 'Show Code'}
                  </Button>
                </div>
          
                {showCode.reactive && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden relative z-30">
                    <MonacoEditor
                      height="300px"
                      language="solidity"
                      theme="vs-dark"
                      value={reactiveTemplate}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false }
                      }}
                    />
                  </div>
                )}
          
                <div className="space-y-4 relative z-30">
                  <h3 className="text-lg font-medium text-zinc-200">Constructor Arguments</h3>
                  {Object.entries(constructorArgs.reactive).map(([argName, value]) => (
                    <div key={argName} className="relative">
                      <Label htmlFor={`reactive-${argName}`} className="text-zinc-300">
                        {argName}
                      </Label>
                      <Input
                        id={`reactive-${argName}`}
                        value={value}
                        onChange={(e) => handleConstructorArgChange('reactive', argName, e.target.value)}
                        className="mt-1 bg-blue-900/20 border-zinc-700 text-zinc-200 pointer-events-auto"
                        placeholder={`Enter ${argName}`}
                      />
                    </div>
                  ))}
                </div>
          
                {renderDeployButton('reactive', isDeploying.reactive)}
              </>
            )}
          </div>
        </CardContent>
      </Card>
  
      {/* Helper Contracts */}
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
};

export default DeploymentTab;