import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useWeb3 } from '@/app/_context/Web3Context'
import { useAutomationContext } from '@/app/_context/AutomationContext'

// Import CALLBACK_PROXIES from DeploymentHistory
import { CALLBACK_PROXIES } from '@/components/smart-contract-deployer/DeploymentHistory'

interface DeploymentConfigProps {
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error'
  compilationError: string | null
  onDeploy: () => void
  deploymentStatus: 'idle' | 'deploying' | 'success' | 'error'
  deploymentError: string | null
  abi: any
  bytecode: string
  contractType: 'origin' | 'destination' | 'both'
}

// Define the type for supported networks
interface SupportedNetwork {
  chainId: number;
  name: string;
  rpcUrl: string;
}

const SUPPORTED_NETWORKS: { [key: string]: SupportedNetwork } = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID'
  },
  KOPLI: {
    chainId: 5318008,
    name: 'Kopli',
    rpcUrl: 'https://kopli-rpc.rnk.dev'
  },
  MUMBAI: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com'
  }
  // Add more networks as needed
}

export default function DeploymentConfig({
  compilationStatus,
  compilationError,
  onDeploy,
  deploymentStatus,
  deploymentError,
  abi,
  bytecode,
  contractType,
}: DeploymentConfigProps) {
  const {
    selectedNetwork,
    account,
    web3,
    connectWallet,
    switchNetwork
  } = useWeb3();

  const { callbackSender, setCallbackSender } = useAutomationContext();
  const [useCustomCallbackSender, setUseCustomCallbackSender] = useState(false);
  const [customCallbackSender, setCustomCallbackSender] = useState('');
  
  // Set default callback sender based on current network
  useEffect(() => {
    if (web3 && (contractType === 'destination' || contractType === 'both')) {
      web3.eth.getChainId().then((chainId: bigint) => {
        const chainIdStr = chainId.toString();
        if (CALLBACK_PROXIES[chainIdStr]) {
          setCallbackSender(CALLBACK_PROXIES[chainIdStr]);
        }
      }).catch((error: Error) => console.error('Error getting chain ID:', error));
    }
  }, [web3, contractType, setCallbackSender]);

  // Handle custom callback sender change
  useEffect(() => {
    if (useCustomCallbackSender && customCallbackSender) {
      setCallbackSender(customCallbackSender);
    } else if (!useCustomCallbackSender && web3) {
      web3.eth.getChainId().then((chainId: bigint) => {
        const chainIdStr = chainId.toString();
        if (CALLBACK_PROXIES[chainIdStr]) {
          setCallbackSender(CALLBACK_PROXIES[chainIdStr]);
        }
      }).catch((error: Error) => console.error('Error getting chain ID:', error));
    }
  }, [useCustomCallbackSender, customCallbackSender, web3, setCallbackSender]);

  // Update gas price automatically
  useEffect(() => {
    const updateGasPrice = async () => {
      if (web3 && account) {
        try {
          const currentGasPrice = await web3.eth.getGasPrice();
          // We don't need to set it here as we're using the real-time value
        } catch (error) {
          console.error('Error fetching gas price:', error);
        }
      }
    };
    updateGasPrice();
  }, [web3, account, selectedNetwork]);

  return (
    <div className="relative space-y-6">
      {/* Compilation Status */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-zinc-100">Compilation & Deployment</h2>
        <div className="flex items-center space-x-4">
          <Badge 
            variant={compilationStatus === 'success' ? 'default' : 'secondary'}
            className={compilationStatus === 'success' 
              ? 'bg-green-900/20 text-white border-green-500/50'
              : compilationStatus === 'error'
                ? 'bg-red-900/20 text-red-300 border-red-500/50'
                : 'bg-blue-900/20 text-blue-300 border-blue-500/50'
            }
          >
            {compilationStatus === 'idle' ? 'Not Compiled' :
             compilationStatus === 'compiling' ? 'Compiling...' :
             compilationStatus === 'success' ? 'Compilation Successful' : 'Compilation Failed'}
          </Badge>
        </div>
        {compilationError && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-300">Compilation Error</AlertTitle>
            <AlertDescription className="text-red-200">{compilationError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Callback Sender Configuration (for destination contracts) */}
      {(contractType === 'destination' || contractType === 'both') && compilationStatus === 'success' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-zinc-100">Callback Sender</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <Info className="h-5 w-5 text-zinc-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>The callback sender address ensures the validity of callback transactions by verifying they originate from the Reactive Network.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800/50">
            <div className="mb-2 flex items-center">
              <input 
                type="checkbox"
                id="useCustomCallback"
                checked={useCustomCallbackSender}
                onChange={(e) => setUseCustomCallbackSender(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useCustomCallback" className="text-sm text-zinc-300">
                Use custom callback sender address
              </label>
            </div>

            {useCustomCallbackSender ? (
              <div className="space-y-2">
                <Input
                  placeholder="Enter custom callback sender address"
                  value={customCallbackSender}
                  onChange={(e) => setCustomCallbackSender(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
                <div className="text-xs text-yellow-400">
                  Warning: Only use custom addresses if you know what you're doing.
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-300">
                Using network default: <span className="font-mono text-blue-400">{callbackSender}</span>
              </div>
            )}
            
            <div className="mt-3 text-xs text-zinc-400">
              The callback sender will be automatically passed as the first constructor argument
              for your destination contract.
            </div>
          </div>
        </div>
      )}

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
            
            {/* Deployment Requirements Info */}
            {(contractType === 'destination' || contractType === 'both') && (
              <div className="mt-3 p-3 bg-yellow-900/20 rounded border border-yellow-800/50">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-400 font-medium">Destination Contract Requirement</h4>
                    <p className="text-yellow-300 text-sm">
                      Your destination contract requires a minimum of 0.1 native currency to fund callback payments.
                      This amount will be automatically added during deployment.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
          <AlertCircle className="h-4 w-4" />
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
          !bytecode ||
          ((contractType === 'destination' || contractType === 'both') && !callbackSender)
        }
      >
        {deploymentStatus === 'deploying' ? (
          <div className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            Deploying...
          </div>
        ) : (
          'Deploy Contract'
        )}
      </Button>

      {/* Deployment Success */}
      {deploymentStatus === 'success' && (
        <Alert className="bg-green-900/20 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-300">Deployment Successful</AlertTitle>
          <AlertDescription className="text-green-200">
            Contract deployed successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}