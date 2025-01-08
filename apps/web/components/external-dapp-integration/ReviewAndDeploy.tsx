import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useWeb3 } from '@/app/_context/Web3Context'

export default function ReviewAndDeploy() {
  const [isCompiling, setIsCompiling] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [deployedAddress, setDeployedAddress] = useState('')
  const [isContractVisible, setIsContractVisible] = useState(false)

  const { reactiveContract } = useAutomationContext()
  const { account, web3 } = useWeb3()

  const handleCompile = async () => {
    setIsCompiling(true)
    try {
      const response = await fetch('http://localhost:5000/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode: reactiveContract }),
      })
      const { abi, bytecode } = await response.json()
      setDeploymentStatus('Contract compiled successfully')
      return { abi, bytecode }
    } catch (error) {
      console.error('Compilation error:', error)
      setDeploymentStatus('Failed to compile contract')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account) {
      console.error('Web3 or account not available')
      return
    }

    setIsDeploying(true)
    try {
      const { abi, bytecode } = await handleCompile()
      const contract = new web3.eth.Contract(abi)
      const deployTransaction = contract.deploy({ data: bytecode, arguments: [] })
      
      const gasEstimate = await deployTransaction.estimateGas({ from: account })
      const gasPrice = await web3.eth.getGasPrice()

      const deployedContract = await deployTransaction.send({
        from: account,
        gas: gasEstimate,
        gasPrice: gasPrice,
      })
      
      setDeployedAddress(deployedContract.options.address)
      setDeploymentStatus('Contract deployed successfully')
    } catch (error) {
      console.error('Deployment error:', error)
      setDeploymentStatus('Failed to deploy contract')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Generated Contract</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsContractVisible(!isContractVisible)}
            className="w-full flex justify-between items-center"
          >
            <span>View Contract Code</span>
            {isContractVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {isContractVisible && (
            <pre className="mt-4 p-4 bg-gray-100 rounded-md overflow-x-auto">
              {reactiveContract}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button onClick={handleCompile} disabled={isCompiling} className="w-full">
          {isCompiling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isCompiling ? 'Compiling...' : 'Compile Contract'}
        </Button>

        <Button onClick={handleDeploy} disabled={isDeploying} className="w-full">
          {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isDeploying ? 'Deploying...' : 'Deploy Contract'}
        </Button>

        {deploymentStatus && (
          <Alert variant={deploymentStatus.includes('successfully') ? 'success' : 'destructive'}>
            <AlertTitle>Deployment Status</AlertTitle>
            <AlertDescription>{deploymentStatus}</AlertDescription>
          </Alert>
        )}

        {deployedAddress && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Contract Deployed</AlertTitle>
            <AlertDescription>Deployed at: {deployedAddress}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

