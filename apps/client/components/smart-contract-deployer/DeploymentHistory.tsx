import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clipboard, ExternalLink } from 'lucide-react'
import { DeploymentRecord } from '@/app/(root)/smart-contract-deployer/page'
import { useToast } from '@/hooks/use-toast'

// Type declarations for NETWORK_EXPLORERS and CALLBACK_PROXIES
type NetworkExplorers = {
  [key: string]: string;
}

type CallbackProxies = {
  [chainId: string]: string;
}

// Network explorer URLs and callback proxy addresses
const NETWORK_EXPLORERS: NetworkExplorers = {
  'Ethereum Mainnet': 'https://etherscan.io',
  'Sepolia': 'https://sepolia.etherscan.io',
  'Kopli': 'https://kopli.reactscan.net/',
  'Polygon': 'https://polygonscan.com',
  'Mumbai': 'https://mumbai.polygonscan.com',
  'Arbitrum': 'https://arbiscan.io',
  'Optimism': 'https://optimistic.etherscan.io',
  'BSC': 'https://bscscan.com',
  'Avalanche': 'https://snowtrace.io',
  'Fantom': 'https://ftmscan.com',
  'Chain ID: 5318008': 'https://kopli.reactscan.net', // Fallback for Kopli
}

// Callback proxy addresses for different chains
export const CALLBACK_PROXIES: CallbackProxies = {
  // '1': '0x0', // Ethereum Mainnet - placeholder, replace with actual address
  '11155111': '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA', // Sepolia
  '5318008': '0x0000000000000000000000000000000000fffFfF', // Kopli
  // '137': '0x0', // Polygon - placeholder, replace with actual address
  // '80001': '0x0', // Mumbai - placeholder, replace with actual address
}

export default function DeploymentHistory() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Load deployment history from localStorage
    const loadDeployments = () => {
      try {
        const history = localStorage.getItem('deploymentHistory')
        if (history) {
          setDeployments(JSON.parse(history))
        }
      } catch (error) {
        console.error('Failed to load deployment history:', error)
      }
    }

    loadDeployments()

    // Set up interval to update pending transactions
    const interval = setInterval(loadDeployments, 15000)

    // Listen for storage changes
    window.addEventListener('storage', loadDeployments)
    return () => {
      window.removeEventListener('storage', loadDeployments)
      clearInterval(interval)
    }
  }, [])

  const getExplorerUrl = (network: string, txHash: string, isAddress = false) => {
    const baseUrl = NETWORK_EXPLORERS[network] || 'https://etherscan.io'
    const path = isAddress ? 'address' : 'tx'
    return `${baseUrl}/${path}/${txHash}`
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      })
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your deployment history?')) {
      localStorage.removeItem('deploymentHistory')
      setDeployments([])
      toast({
        title: "History Cleared",
        description: "Your deployment history has been cleared",
      })
    }
  }

  return (
    <div className='bg-transparent'>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Deployment History</h2>
        {deployments.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}>
            Clear History
          </Button>
        )}
      </div>
      
      {deployments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No deployments yet. Your deployment history will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <div className="font-medium">{deployment.contractName}</div>
                    <div className="text-xs text-muted-foreground">
                      {deployment.contractType === 'origin' ? 'Origin' : 
                       deployment.contractType === 'destination' ? 'Destination' : 'Combined'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {deployment.address === "Deploying..." ? (
                      <span className="text-yellow-500">Deploying...</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {`${deployment.address.slice(0, 6)}...${deployment.address.slice(-4)}`}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(deployment.address, 'Address')}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Clipboard size={14} />
                        </button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{deployment.network}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        deployment.status === 'success' ? 'default' : 
                        deployment.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className={
                        deployment.status === 'success' ? 'bg-green-600/20 text-green-300 hover:bg-green-600/30 border-green-500/30' : 
                        deployment.status === 'pending' ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 border-yellow-500/30' : 
                        'bg-red-600/20 text-red-300 hover:bg-red-600/30 border-red-500/30'
                      }
                    >
                      {deployment.status === 'pending' ? 'Pending' : 
                       deployment.status === 'success' ? 'Success' : 'Failed'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(deployment.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {deployment.status !== 'pending' && deployment.address !== "Deploying..." && (
                        <Button variant="ghost" size="icon" asChild>
                          <a 
                            href={getExplorerUrl(deployment.network, deployment.address, true)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="View contract on explorer"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <a 
                          href={getExplorerUrl(deployment.network, deployment.txHash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="View transaction on explorer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </Button>
                      {deployment.contractType === 'destination' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            // Fixed the network to chainId mapping logic
                            let chainId = '11155111'; // Default to Sepolia
                            
                            if (deployment.network === 'Kopli' || deployment.network === 'Chain ID: 5318008') {
                              chainId = '5318008';
                            } else if (deployment.network === 'Ethereum Mainnet') {
                              chainId = '1';
                            } else if (deployment.network === 'Polygon') {
                              chainId = '137';
                            } else if (deployment.network === 'Mumbai') {
                              chainId = '80001';
                            }
                            
                            copyToClipboard(CALLBACK_PROXIES[chainId], 'Callback Proxy');
                          }}
                          title="Copy Callback Proxy Address"
                          className="ml-2 text-xs"
                        >
                          Copy Proxy
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}