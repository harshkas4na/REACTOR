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
  const [showManualFunding, setShowManualFunding] = useState(false);
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
    setShowManualFunding(false);
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  // Function to handle manual funding
  const handleManualFunding = async () => {
    if (!deployedContractAddress) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const valueToSend = ethers.parseEther('0.1');
      
      // Create and send transaction
      const tx = await signer.sendTransaction({
        to: deployedContractAddress,
        value: valueToSend
      });
      
      toast({
        title: "Transaction Sent",
        description: "Funding transaction has been sent.",
      });
      
      // Wait for transaction to be mined
      await tx.wait();
      
      setStatus('success');
      toast({
        title: "Funding Successful",
        description: "Contract has been funded with 0.1 REACT.",
      });
      
      // If we haven't called onDeploySuccess yet, do it now
      if (deployedContractAddress && transactionHash) {
        onDeploySuccess(deployedContractAddress, transactionHash);
      }
      
    } catch (error: any) {
      console.error('Manual funding error:', error);
      toast({
        variant: "destructive",
        title: "Funding Failed",
        description: error.message || "Failed to fund the contract.",
      });
    }
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

      // STEP 1: Deploy contract using web3.js (which we know works)
      setStatus('deploying');
      
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

      // Check balance for deployment
      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance for deployment. Please add more REACT to your wallet.`);
      }

      // Deploy contract without sending REACT
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice)
        })
        .on('transactionHash', (hash: string) => {
          setTransactionHash(hash);
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
      
      // Notify about successful deployment
      toast({
        title: "Deployment Successful",
        description: `Contract deployed at ${contractAddress}. Now you need to fund it with 0.1 REACT.`,
      });
      
      // Show the manual funding option
      setStatus('needsFunding');
      setShowManualFunding(true);

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
            Deploying Contract...
          </>
        );
      case 'needsFunding':
        return (
          <>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Start Over
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
            : status === 'error' || status === 'validation-failed' || status === 'needsFunding'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white`}
      >
        {getButtonContent()}
      </Button>

      {/* Show manual funding option */}
      {showManualFunding && deployedContractAddress && (
        <Alert className="bg-blue-900/30 border-blue-700">
          <AlertTitle className="text-blue-100 font-semibold flex items-center">
            <Check className="h-4 w-4 mr-2" />
            Contract Deployed Successfully
          </AlertTitle>
          <AlertDescription className="text-blue-200">
            <p className="mb-2">Your contract has been deployed at:</p>
            <div className="flex items-center space-x-2 bg-blue-950/50 p-2 rounded mb-3">
              <code className="font-mono text-sm truncate max-w-[240px]">{deployedContractAddress}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-blue-800/50"
                onClick={() => copyToClipboard(deployedContractAddress)}
              >
                <Copy className="h-3 w-3 text-blue-200" />
              </Button>
            </div>
            
            <p className="mb-2">Now you need to send <strong>0.1 REACT</strong> to fund it:</p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                onClick={handleManualFunding}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Send 0.1 REACT Now
              </Button>
              
              <Button 
                variant="outline" 
                className="bg-transparent border-blue-500 text-blue-100 hover:bg-blue-800/30"
                onClick={() => {
                  if (deployedContractAddress && transactionHash) {
                    onDeploySuccess(deployedContractAddress, transactionHash);
                  }
                  setStatus('success');
                }}
              >
                Skip Funding
              </Button>
            </div>
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