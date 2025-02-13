import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Check, X, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BASE_URL } from '@/data/constants';

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


    if (!web3 || !account) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Please connect your wallet first",
      });
      return;
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
      
      // Start deployment
      setStatus('deploying');
      
      // Verify network
      const networkName = await getNetworkName(web3);
      if (networkName !== 'Kopli') {
        throw new Error('Please switch to Kopli network');
      }

      // Create contract instance
      const contract = new web3.eth.Contract(abi);
      const deploy = contract.deploy({
        data: bytecode,
        arguments: []
      });

      // Estimate gas
      const gasEstimate = await deploy.estimateGas({ from: account });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      // Check balance
      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance for deployment`);
      }

      let transactionHash = '';

      // Deploy contract with transaction hash tracking
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice)
        })
        .on('transactionHash', (hash: string) => {
          transactionHash = hash;
        })
        .on('error', (error: any) => {
          // Check for user rejection
          if (error.code === 4001 || error.message.includes('User denied')) {
            reject(new Error('Transaction cancelled by user'));
          } else {
            reject(error);
          }
        })
        .then(resolve)
        .catch(reject); // Catch any other errors
      });

      if (!deployedContract) {
        throw new Error('Deployment failed');
      }

      const contractAddress = (deployedContract as any).options.address;
      
      setStatus('success');
      onDeploySuccess(contractAddress, transactionHash);
      
      toast({
        title: "Deployment Successful",
        description: `Contract deployed at ${contractAddress}`,
      });

    } catch (error: any) {
      console.error('Deployment error:', error);
      setStatus('error');
      
      // Enhanced error messaging
      let errorMessage = error.message;
      if (error.message.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user. Click "Deploy Contract" to try again.';
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
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validating RSC...
          </>
        );
      case 'compiling':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Compiling Contract...
          </>
        );
      case 'deploying':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deploying to Kopli...
          </>
        );
      case 'success':
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            Deployment Successful
          </>
        );
      case 'validation-failed':
        return (
          <>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </>
        );
      case 'error':
        return (
          <>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </>
        );
      default:
        return 'Deploy Contract';
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleDeploy}
        disabled={status === 'validating' || status === 'compiling' || status === 'deploying'}
        className={`w-60 relative ${
          status === 'success' 
            ? 'bg-green-600 hover:bg-green-700' 
            : status === 'error' || status === 'validation-failed'
            ? 'bg-blue-600 hover:bg-blue-700' // Changed from red to blue for retry state
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white`}
      >
        {getButtonContent()}
      </Button>

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