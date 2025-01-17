import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useWeb3 } from '@/app/_context/Web3Context'

interface DeploymentConfigProps {
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error'
  compilationError: string | null
  onDeploy: () => void
  deploymentStatus: 'idle' | 'deploying' | 'success' | 'error'
  deploymentError: string | null
  abi: any
  bytecode: string
  contractType: 'origin' | 'destination';
}

const SUPPORTED_NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'
  },
  KOPLI: {
    chainId: 5318008,
    name: 'Kopli',
    rpcUrl: 'https://kopli-rpc.rkt.ink'
  }
}

export default function DeploymentConfig({
  compilationStatus,
  compilationError,
  onDeploy,
  deploymentStatus,
  deploymentError,
  abi,
  bytecode,
}: DeploymentConfigProps) {
  const {
    selectedNetwork,
    account,
    web3,
    connectWallet,
    switchNetwork
  } = useWeb3();

  const [customRpcUrl, setCustomRpcUrl] = useState('');
  const [gasLimit, setGasLimit] = useState('3000000');
  const [gasPrice, setGasPrice] = useState('20');
  const [value, setValue] = useState('0');

  useEffect(() => {
    const updateGasPrice = async () => {
      if (web3 && account) {
        try {
          const currentGasPrice = await web3.eth.getGasPrice();
          setGasPrice(web3.utils.fromWei(currentGasPrice, 'gwei'));
        } catch (error) {
          console.error('Error fetching gas price:', error);
        }
      }
    };
    updateGasPrice();
  }, [web3, account, selectedNetwork]);

  const getCurrentChainId = () => {
    return SUPPORTED_NETWORKS[selectedNetwork as keyof typeof SUPPORTED_NETWORKS]?.chainId || '';
  };

  return (
    <div className="relative space-y-6">
      {/* Compilation Status */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-zinc-100">Compilation & Deployment</h2>
        <div className="flex items-center space-x-4">
          <Badge 
            variant={compilationStatus === 'success' ? 'default' : 'destructive'}
            className={compilationStatus === 'success' 
              ? 'bg-green-900/20 text-white border-primary/50'
              : 'bg-red-900/20 text-red-300 border-red-500/50'
            }
          >
            {compilationStatus === 'success' ? 'Compilation Successful' : 'Compilation Failed'}
          </Badge>
        </div>
        {compilationError && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertTitle className="text-red-300">Compilation Error</AlertTitle>
            <AlertDescription className="text-red-200">{compilationError}</AlertDescription>
          </Alert>
        )}
      </div>

     

      {/* Wallet Connection */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-zinc-100">Wallet Connection</h3>
        {account ? (
          <div className="space-y-2 p-4 bg-blue-900/20 rounded-lg border border-zinc-800">
            <div className="text-zinc-300">
              Connected Account: <span className="text-blue-400 font-mono">{`${account.slice(0, 6)}...${account.slice(-4)}`}</span>
            </div>
            <div className="text-zinc-300">
              Network: <span className="text-blue-400">{selectedNetwork}</span>
            </div>
          </div>
        ) : (
          <Button 
            onClick={connectWallet}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Connect Wallet
          </Button>
        )}
      </div>

      {/* Deployment Error */}
      {deploymentError && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
          <AlertTitle className="text-red-300">Deployment Error</AlertTitle>
          <AlertDescription className="text-red-200">{deploymentError}</AlertDescription>
        </Alert>
      )}

      {/* Deploy Button */}
      <Button
        className="w-60 z-20 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        size="lg"
        onClick={onDeploy}
        disabled={
          !account || 
          compilationStatus !== 'success' || 
          deploymentStatus === 'deploying' ||
          !abi ||
          !bytecode
        }
      >
        {deploymentStatus === 'deploying' ? 'Deploying...' : 'Deploy Contract'}
      </Button>
    </div>
  );
}