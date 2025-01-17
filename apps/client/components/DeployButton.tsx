import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BASE_URL } from '@/data/constants';

interface DeployButtonProps {
  editedContract: string;
  onCompileSuccess: (abi: any, bytecode: string) => void;
  onDeploySuccess: (contractAddress: string, transactionHash: string) => void;
  web3: any;
  account: string;
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

  const handleDeploy = async () => {
    if (!web3 || !account) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Please connect your wallet first",
      });
      return;
    }

    try {
      // Start compilation
      setStatus('compiling');
      setError(null);
      
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
          console.log('Transaction Hash:', hash);
          transactionHash = hash;
        })
        .on('error', (error: any) => {
          reject(error);
        })
        .then(resolve);
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
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error.message,
      });
    }
  };

  const getButtonContent = () => {
    switch (status) {
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
      case 'error':
        return (
          <>
            <X className="mr-2 h-4 w-4" />
            Deployment Failed
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
        disabled={status === 'compiling' || status === 'deploying'}
        className={`w-60 relative ${
          status === 'success' 
            ? 'bg-green-600 hover:bg-green-700' 
            : status === 'error'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white`}
      >
        {getButtonContent()}
      </Button>

      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertTitle className="text-red-200 font-semibold">
            Deployment Error
          </AlertTitle>
          <AlertDescription className="text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DeployButton;