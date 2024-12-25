import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeploymentRecord } from './SmartContractDeployer'

export default function DeploymentHistory() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([])

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

    // Listen for storage changes
    window.addEventListener('storage', loadDeployments)
    return () => window.removeEventListener('storage', loadDeployments)
  }, [])

  const getExplorerUrl = (network: string, txHash: string) => {
    switch (network.toLowerCase()) {
      case 'ethereum':
        return `https://etherscan.io/tx/${txHash}`
      case 'sepolia':
        return `https://sepolia.etherscan.io/tx/${txHash}`
      case 'polygon':
        return `https://polygonscan.com/tx/${txHash}`
      case 'kopli':
        return `https://testnet-explorer.rkt.ink/tx/${txHash}`
      default:
        return `https://etherscan.io/tx/${txHash}`
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deployment History</h2>
      {deployments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No deployments yet. Your deployment history will appear here.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>{deployment.contractName}</TableCell>
                <TableCell className="font-mono">
                  {`${deployment.address.slice(0, 6)}...${deployment.address.slice(-4)}`}
                </TableCell>
                <TableCell>{deployment.network}</TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      deployment.status === 'success' ? 'success' : 
                      deployment.status === 'pending' ? 'warning' : 'destructive'
                    }
                  >
                    {deployment.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(deployment.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={getExplorerUrl(deployment.network, deployment.txHash)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View on Explorer
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}