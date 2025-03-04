import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Check, AlertTriangle, RefreshCcw, Copy, ExternalLink, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BASE_URL } from '@/data/constants';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [gasCost, setGasCost] = useState<bigint>(BigInt(0));
  const [fundingAmount, setFundingAmount] = useState<string>('0.05');
  const { toast } = useToast();
  
  // Constants for deployment
  const DEFAULT_GAS_LIMIT = 3000000;
  const GAS_BUFFER = 1.2; // 20% buffer on gas estimate
  
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
    setGasCost(BigInt(0));
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
  };

  const handleFundingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimals with up to 18 decimal places
    if (/^\d*\.?\d{0,18}$/.test(value) || value === '') {
      setFundingAmount(value);
    }
  };

  const calculateCosts = async (abi: any, bytecode: string) => {
    try {
      const contract = new web3.eth.Contract(abi);
      const deploy = contract.deploy({
        data: bytecode,
        arguments: []
      });

      // Estimate gas with fallback to default if estimation fails
      let gasEstimate;
      try {
        gasEstimate = await deploy.estimateGas({ from: account });
      } catch (e: any) {
        console.warn('Gas estimation failed:', e.message);
        gasEstimate = DEFAULT_GAS_LIMIT;
      }

      const gasLimit = Math.ceil(Number(gasEstimate) * GAS_BUFFER);
      const gasPrice = await web3.eth.getGasPrice();
      
      // Calculate total gas cost
      const estimatedGasCost = BigInt(gasLimit) * BigInt(gasPrice);
      setGasCost(estimatedGasCost);
      
      return {
        gasLimit,
        gasPrice,
        estimatedGasCost
      };
    } catch (error) {
      console.error("Error calculating costs:", error);
      throw error;
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Please connect your wallet first",
      });
      return;
    }

    // Validate funding amount
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Funding Amount",
        description: "Please enter a valid funding amount greater than 0",
      });
      return;
    }

    // Reset state when starting a new deployment
    if (status === 'error' || status === 'validation-failed') {
      resetState();
    }

    try {
      // Convert funding amount to wei
      const fundingWei = web3.utils.toWei(fundingAmount, 'ether');
      
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

      // Calculate deployment costs
      const { gasLimit, gasPrice, estimatedGasCost } = await calculateCosts(abi, bytecode);

      // Get user balance and check if sufficient
      const balance = await web3.eth.getBalance(account);
      const totalRequired = estimatedGasCost + BigInt(fundingWei);

      if (BigInt(balance) < totalRequired) {
        const requiredREACT = web3.utils.fromWei(totalRequired.toString(), 'ether');
        const gasInREACT = web3.utils.fromWei(estimatedGasCost.toString(), 'ether');
        
        throw new Error(
          `Insufficient balance for deployment and funding. You need at least ${requiredREACT} REACT (${gasInREACT} for gas + ${fundingAmount} for RSC funding). Your current balance is ${web3.utils.fromWei(balance, 'ether')} REACT.`
        );
      }

      // Deploy contract and fund it
      setStatus('deploying');
      
      const deployedContract = await new Promise((resolve, reject) => {
        const deploy = new web3.eth.Contract(abi).deploy({
          data: bytecode,
          arguments: []
        });

        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
          value: fundingWei // User-specified funding amount
        })
        .on('transactionHash', (hash: string) => {
          setTransactionHash(hash);
          toast({
            title: "Transaction Sent",
            description: "Deployment transaction has been submitted",
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
        title: "Success!",
        description: `RSC deployed and funded with ${fundingAmount} REACT`,
        variant: "default",
      });
      
      setStatus('success');
      onDeploySuccess(contractAddress, transactionHash as string);

    } catch (error: any) {
      console.error('Deployment error:', error);
      setStatus('error');
      
      // Enhanced error messaging
      let errorMessage = error.message;
      if (error.message.includes('User denied')) {
        errorMessage = 'Transaction cancelled by user. Click "Deploy RSC" to try again.';
      } else if (error.message.includes('Insufficient balance')) {
        errorMessage = error.message;
      } else {
        errorMessage = `${error.message}. Click "Try Again" to retry deployment.`;
      }
      
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
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
            <span>Deploying & Funding ({fundingAmount} REACT)...</span>
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
      case 'error':
        return (
          <span className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            <span>Try Again</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center">
            <span>Deploy & Fund RSC</span>
          </span>
        );
    }
  };

  // Get explorer URL for transaction
  const getExplorerUrl = (hash: string) => {
    return `https://kopli.reactscan.net/tx/${hash}`;
  };

  return (
    <div className="space-y-4">
      {/* Funding information section */}
      {status === 'idle' && (
        <Alert className="bg-blue-900/20 border-blue-600/50">
          <AlertTitle className="text-blue-100 font-semibold flex items-center">
            <Info className="h-4 w-4 mr-2" />
            RSC Funding Information
          </AlertTitle>
          <AlertDescription className="text-blue-200 text-sm">
            <p>Your RSC requires REACT tokens to monitor events on the blockchain.</p>
            <p className="mt-1">We recommend at least 0.05 REACT for approximately one week of monitoring.</p>
            
            <div className="mt-3">
              <Label htmlFor="fundingAmount" className="text-blue-100">Funding Amount (REACT)</Label>
              <div className="flex items-center mt-1 space-x-2">
                <Input
                  id="fundingAmount"
                  value={fundingAmount}
                  onChange={handleFundingChange}
                  className="bg-blue-950/40 border-blue-800 text-blue-100 w-36"
                  placeholder="0.05"
                />
                <span className="text-xs text-blue-300">REACT</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleDeploy}
        disabled={status === 'validating' || status === 'compiling' || status === 'deploying'}
        className={`w-full md:w-auto relative overflow-hidden ${
          status === 'success' 
            ? 'bg-green-600 hover:bg-green-700' 
            : status === 'error' || status === 'validation-failed'
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white font-medium px-6 py-2`}
      >
        {getButtonContent()}
      </Button>

      {/* Gas estimation display */}
      {gasCost > 0 && status !== 'success' && status !== 'error' && (
        <div className="text-xs text-blue-300 mt-2">
          <span>Estimated gas: {web3?.utils.fromWei(gasCost.toString(), 'ether')} REACT + {fundingAmount} REACT funding</span>
        </div>
      )}

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
            <p className="text-xs text-blue-300">Please wait while the transaction is being confirmed. This may take a few minutes.</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Show success message */}
      {status === 'success' && deployedContractAddress && (
        <Alert className="bg-green-900/30 border-green-700">
          <AlertTitle className="text-green-100 font-semibold flex items-center">
            <Check className="h-4 w-4 mr-2" />
            RSC Deployed and Funded Successfully
          </AlertTitle>
          <AlertDescription className="text-green-200">
            <p className="mb-2">Your Reactive Smart Contract has been deployed and funded with {fundingAmount} REACT:</p>
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
            <p className="text-xs text-green-300 mt-1">Your RSC will monitor events according to its configuration for as long as its REACT funds allow.</p>
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