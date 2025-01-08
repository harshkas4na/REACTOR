// components/external-dapp-integration/ReviewAndDeploy.tsx

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useWeb3 } from '@/app/_context/Web3Context'
import { api } from '@/services/api'

export default function ReviewAndDeploy() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [deployedAddress, setDeployedAddress] = useState('')
  const [isContractVisible, setIsContractVisible] = useState(false)
  const [error, setError] = useState('')
  const [compiledData, setCompiledData] = useState<{ abi: any; bytecode: string } | null>(null)

  const { 
    automations,
    OrgChainId,
    DesChainId,
    originAddress,
    destinationAddress,
    reactiveContract,
    setReactiveContract,
    triggerType,
    isPausable
  } = useAutomationContext()

  const { account, web3 } = useWeb3()

  const handleGenerateContract = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const { data } = await api.generateContracts({
        type: triggerType.toUpperCase(),
        chainId: Number(OrgChainId),
        originContract: originAddress,
        destinationContract: destinationAddress,
        pairs: automations,
        isPausable
      })
      
      setReactiveContract(data.rsc.code)
      setDeploymentStatus('Contract generated successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to generate contract')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCompile = async () => {
    if (!reactiveContract) {
      setError('No contract to compile')
      return
    }

    setIsCompiling(true)
    setError('')
    try {
      const result = await api.compileContract(reactiveContract)
      setCompiledData(result)
      setDeploymentStatus('Contract compiled successfully')
      return result
    } catch (error: any) {
      setError(error.message || 'Failed to compile contract')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account) {
      setError('Web3 or account not available')
      return
    }

    setIsDeploying(true)
    setError('')
    try {
      const compiledContract = compiledData || await handleCompile()
      if (!compiledContract) {
        throw new Error('Compilation failed')
      }

      const contract = new web3.eth.Contract(compiledContract.abi)
      const deploy = contract.deploy({ data: compiledContract.bytecode })
      
      const gas = await deploy.estimateGas({ from: account })
      const gasPrice = await web3.eth.getGasPrice()

      const deployed = await deploy.send({
        from: account,
        gas,
        gasPrice
      })

      setDeployedAddress(deployed.options.address)
      setDeploymentStatus('Contract deployed successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to deploy contract')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review and Deploy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Button
              onClick={handleGenerateContract}
              disabled={isGenerating || automations.length === 0}
              className="w-full"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Contract
            </Button>

            {reactiveContract && (
              <>
                <Button
                  onClick={() => setIsContractVisible(!isContractVisible)}
                  className="w-full flex justify-between items-center"
                  variant="outline"
                >
                  <span>View Contract Code</span>
                  {isContractVisible ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {isContractVisible && (
                  <pre className="mt-4 p-4 bg-gray-100 rounded-lg overflow-x-auto">
                    <code>{reactiveContract}</code>
                  </pre>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={handleCompile}
                    disabled={isCompiling}
                    className="w-full"
                  >
                    {isCompiling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Compile Contract
                  </Button>

                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying || !compiledData}
                    className="w-full"
                  >
                    {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Deploy Contract
                  </Button>
                </div>
              </>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {deploymentStatus && !error && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Status</AlertTitle>
              <AlertDescription>{deploymentStatus}</AlertDescription>
            </Alert>
          )}

          {deployedAddress && (
            <Alert>
              <AlertTitle>Deployed Contract Address</AlertTitle>
              <AlertDescription className="font-mono">{deployedAddress}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}