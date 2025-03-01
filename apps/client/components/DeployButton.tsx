import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Check, X, AlertTriangle, RefreshCcw, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BASE_URL } from '@/data/constants';
import { ethers } from 'ethers';

interface DeployButtonProps {
  editedContract: string;
  onCompileSuccess: (abi: any, bytecode: string) => void;
  onDeploySuccess: (contractAddress: string, transactionHash: string) => void;
  web3: any;
  account: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const DeployButton = ({ 
  editedContract, 
  onCompileSuccess, 
  onDeploySuccess, 
  web3, 
  account 
}: DeployButtonProps) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const { toast } = useToast();
  
  const getNetworkName = async (web3: any) => {
    try {
      const chainId = await web3.eth.getChainId();
      const NETWORK_NAMES = {
        5318008: 'Kopli'
      };
      return NETWORK_NAMES[chainId as keyof typeof NETWORK_NAMES] || `Chain ID: ${chainId}`;
    } catch (error: any) {
      console.error('Error getting network name:', error);
      return 'Unknown Network';
    }
  };

  const validateRSC = async (sourceCode: string): Promise<ValidationResult> => {
    const response = await fetch(`${BASE_URL}/rsc-checker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceCode })
    });

    if (!response.ok) {
      throw new Error('RSC validation failed');
    }

    const { data } = await response.json();
    return data;
  };

  const resetState = () => {
    setStatus('idle');
    setError(null);
    setValidationResult(null);
    setDeployedContractAddress(null);
    setTransactionHash(null);
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handleDeploy = async () => {
    if (!web3 || !account) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Please connect your wallet first",
      });
      return;
    }

    // Reset state when starting a new deployment
    if (status === 'error' || status === 'validation-failed') {
      resetState();
    }

    try {
      // Start RSC validation
      setStatus('validating');
      setError(null);
      
      const validation = await validateRSC(editedContract);
      setValidationResult(validation);

      if (!validation.isValid) {
        setStatus('validation-failed');
        throw new Error('Contract validation failed: ' + validation.errors.join(', '));
      }

      if (validation.warnings.length > 0) {
        toast({
          title: "Validation Warnings",
          description: validation.warnings.join('\n'),
          variant: "destructive",
        });
      }

      // Start compilation
      setStatus('compiling');
      
      // Compile contract
      const response = await fetch(`${BASE_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: editedContract }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful but missing data');
      }

      onCompileSuccess(abi, bytecode);
      
      // Verify network
      const networkName = await getNetworkName(web3);
      if (networkName !== 'Kopli') {
        throw new Error('Please switch to Kopli network');
      }

      // Check balance for deployment + 0.1 REACT funding
      const balance = await web3.eth.getBalance(account);
      
      // Create contract instance
      const contract = new web3.eth.Contract(abi);
      const deploy = contract.deploy({
        data: bytecode,
        arguments: []
      });

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await deploy.estimateGas({ from: account });
      } catch (e: any) {
        console.warn('Gas estimation failed:', e.message);
        // Use a higher default if estimation fails
        gasEstimate = 3000000;
      }

      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();
      
      // Calculate required balance (gas costs + 0.1 REACT)
      const gasCost = BigInt(gasLimit) * BigInt(gasPrice);
      const fundingAmount = BigInt('100000000000000000'); // 0.1 REACT in wei
      const totalRequired = gasCost + fundingAmount;

      if (BigInt(balance) < totalRequired) {
        throw new Error(`Insufficient balance for deployment and funding. You need at least ${
          web3.utils.fromWei(totalRequired.toString(), 'ether')
        } REACT (includes 0.1 REACT for contract funding).`);
      }

      // STEP 1: Deploy contract and fund it in one step
      setStatus('deploying');
      
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
          value: '100000000000000000' // 0.1 REACT included with deployment
        })
        .on('transactionHash', (hash: string) => {
          setTransactionHash(hash);
          toast({
            title: "Transaction Sent",
            description: "Deployment transaction has been submitted.",
          });
        })
        .on('error', (error: any) => {
          if (error.code === 4001 || error.message.includes('User denied')) {
            reject(new Error('Transaction cancelled by user'));
          } else {
            reject(error);
          }
        })
        .then(resolve)
        .catch(reject);
      });

      if (!deployedContract) {
        throw new Error('Deployment failed');
      }

      const contractAddress = (deployedContract as any).options.address;
      setDeployedContractAddress(contractAddress);
      
      // Notify about successful deployment with funding
      toast({
        title: "Deployment Successful",
        description: `Contract deployed and funded with 0.1 REACT at ${contractAddress}.`,
      });
      
      // Mark as complete success
      setStatus('success');
      
      // Call the success callback
      onDeploySuccess(contractAddress, transactionHash as string);

    } catch (error: any) {
      console.error('Deployment error:', error);
      setStatus('error');
      
      // Enhanced error messaging
      let errorMessage = error.message;
      if (error.message.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user. Click "Deploy Contract" to try again.';
      } else if (error.message.includes('Insufficient balance')) {
        errorMessage = error.message;
      } else {
        errorMessage = `${error.message}. Click "Try Again" to retry deployment.`;
      }
      
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: errorMessage,
      });
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'validating':
        return (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Validating RSC...</span>
          </span>
        );
      case 'compiling':
        return (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Compiling Contract...</span>
          </span>
        );
      case 'deploying':
        return (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Deploying & Funding...</span>
          </span>
        );
      case 'success':
        return (
          <span className="flex items-center">
            <Check className="mr-2 h-4 w-4" />
            <span>Deployment Successful</span>
          </span>
        );
      case 'validation-failed':
        return (
          <span className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            <span>Try Again</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            <span>Try Again</span>
          </span>
        );
      default:
        return 'Deploy & Fund Contract';
    }
  };

  // Calculate estimated costs in a readable format
  const getExplorerUrl = (hash: string) => {
    return `https://kopli.reactscan.net/tx/${hash}`;
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDeploy}
        disabled={status === 'validating' || status === 'compiling' || status === 'deploying'}
        className={`w-full md:w-60 relative overflow-hidden ${
          status === 'success' 
            ? 'bg-green-600 hover:bg-green-700' 
            : status === 'error' || status === 'validation-failed'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white`}
      >
        {getButtonContent()}
      </Button>

      {/* Show transaction processing info */}
      {status === 'deploying' && transactionHash && (
        <Alert className="bg-blue-900/30 border-blue-700">
          <AlertTitle className="text-blue-100 font-semibold flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Transaction Processing
          </AlertTitle>
          <AlertDescription className="text-blue-200">
            <p className="mb-2">Your deployment transaction has been submitted and is being processed:</p>
            <div className="flex items-start space-x-2 bg-blue-950/50 p-2 rounded mb-3">
              <code className="font-mono text-sm break-all">{transactionHash}</code>
              <div className="flex flex-col space-y-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full hover:bg-blue-800/50"
                  onClick={() => copyToClipboard(transactionHash as string)}
                >
                  <Copy className="h-3 w-3 text-blue-200" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full hover:bg-blue-800/50"
                  onClick={() => window.open(getExplorerUrl(transactionHash as string), '_blank')}
                >
                  <ExternalLink className="h-3 w-3 text-blue-200" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-blue-300">Please wait while the transaction is being confirmed on the blockchain. This may take a few minutes.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Show success message */}
      {status === 'success' && deployedContractAddress && (
        <Alert className="bg-green-900/30 border-green-700">
          <AlertTitle className="text-green-100 font-semibold flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Contract Deployed and Funded Successfully
          </AlertTitle>
          <AlertDescription className="text-green-200">
            <p className="mb-2">Your contract has been deployed and funded with 0.1 REACT at:</p>
            <div className="flex items-center space-x-2 bg-green-950/50 p-2 rounded mb-3">
              <code className="font-mono text-sm truncate max-w-[240px]">{deployedContractAddress}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-green-800/50"
                onClick={() => copyToClipboard(deployedContractAddress)}
              >
                <Copy className="h-3 w-3 text-green-200" />
              </Button>
            </div>
            
            {transactionHash && (
              <>
                <p className="mb-2">Transaction hash:</p>
                <div className="flex items-center space-x-2 bg-green-950/50 p-2 rounded mb-3">
                  <code className="font-mono text-sm truncate max-w-[240px]">{transactionHash}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full hover:bg-green-800/50"
                    onClick={() => copyToClipboard(transactionHash)}
                  >
                    <Copy className="h-3 w-3 text-green-200" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full hover:bg-green-800/50"
                    onClick={() => window.open(getExplorerUrl(transactionHash), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 text-green-200" />
                  </Button>
                </div>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {validationResult && !validationResult.isValid && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertTitle className="text-red-200 font-semibold flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            RSC Validation Failed
          </AlertTitle>
          <AlertDescription className="text-red-300">
            <ul className="list-disc list-inside">
              {validationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            <p className="mt-2 font-semibold">Click "Try Again" to attempt revalidation.</p>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertTitle className="text-red-200 font-semibold flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Deployment Error
          </AlertTitle>
          <AlertDescription className="text-red-300">
            <p>{error}</p>
            <p className="mt-2 font-semibold">
              {error.includes('User denied') 
                ? 'Transaction was cancelled. You can try deploying again.'
                : 'Click the "Try Again" button above to retry deployment.'}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DeployButton;