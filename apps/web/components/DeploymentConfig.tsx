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
  } = useWeb3()

  const [customRpcUrl, setCustomRpcUrl] = useState('')
  const [gasLimit, setGasLimit] = useState('3000000')
  const [gasPrice, setGasPrice] = useState('20')
  const [value, setValue] = useState('0')

  useEffect(() => {
    const updateGasPrice = async () => {
      if (web3 && account) {
        try {
          const currentGasPrice = await web3.eth.getGasPrice()
          setGasPrice(web3.utils.fromWei(currentGasPrice, 'gwei'))
        } catch (error) {
          console.error('Error fetching gas price:', error)
        }
      }
    }
    updateGasPrice()
  }, [web3, account, selectedNetwork])

  const getCurrentChainId = () => {
    return SUPPORTED_NETWORKS[selectedNetwork.toUpperCase()]?.chainId || ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Compilation & Deployment</h2>
        <div className="flex items-center space-x-4 mb-4">
          <Badge variant={compilationStatus === 'success' ? 'success' : 'destructive'}>
            {compilationStatus === 'success' ? 'Compilation Successful' : 'Compilation Failed'}
          </Badge>
        </div>
        {compilationError && (
          <Alert variant="destructive">
            <AlertTitle>Compilation Error</AlertTitle>
            <AlertDescription>{compilationError}</AlertDescription>
          </Alert>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Network Configuration</h3>
        <div className="space-y-4 ">
          <Select value={selectedNetwork} onValueChange={switchNetwork}>
            <SelectTrigger className="w-full text-white">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent className='text-white'>
              <SelectItem value="sepolia">Ethereum Sepolia</SelectItem>
              <SelectItem value="kopli">Kopli Testnet</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Custom RPC URL (optional)"
            value={customRpcUrl}
            onChange={(e) => setCustomRpcUrl(e.target.value)}
          />
          <div>Chain ID: {getCurrentChainId()}</div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Deployment Settings</h3>
        <div className="space-y-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  placeholder="Gas Limit"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Maximum amount of gas you're willing to spend</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  placeholder="Gas Price (Gwei)"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(e.target.value)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Current network average: {gasPrice} Gwei</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            placeholder="Value (ETH)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Wallet Connection</h3>
        {account ? (
          <div className="space-y-2">
            <div>Connected Account: {`${account.slice(0, 6)}...${account.slice(-4)}`}</div>
            <div>Network: {selectedNetwork}</div>
          </div>
        ) : (
          <Button onClick={connectWallet}>Connect Wallet</Button>
        )}
      </div>

      {deploymentError && (
        <Alert variant="destructive">
          <AlertTitle>Deployment Error</AlertTitle>
          <AlertDescription>{deploymentError}</AlertDescription>
        </Alert>
      )}

      <Button
        className="w-full"
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
  )
}