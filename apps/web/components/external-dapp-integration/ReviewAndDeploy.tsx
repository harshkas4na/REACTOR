'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useWeb3 } from '@/app/_context/Web3Context'
import { api } from '@/services/api'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AutomationMappings {
  functionInputs: Record<string, { type: 'direct' | 'event', value: string, eventArg?: string }>
}

export default function ReviewAndDeploy() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [deployedDestinationAddress, setDeployedDestinationAddress] = useState('')
  const [deployedRSCAddress, setDeployedRSCAddress] = useState('')
  const [isContractVisible, setIsContractVisible] = useState(false)
  const [error, setError] = useState('')
  const [compiledData, setCompiledData] = useState<{ abi: any; bytecode: string } | null>(null)
  const [destinationContract, setDestinationContract] = useState('')
  const [rscContract, setRscContract] = useState('')
  const [automationMappings, setAutomationMappings] = useState<Record<number, AutomationMappings>>({})

  const { 
    automations,
    OrgChainId,
    DesChainId,
    originAddress,
    destinationAddress,
    triggerType,
    isPausable
  } = useAutomationContext()

  const { account, web3 } = useWeb3()

  useEffect(() => {
    // Initialize mappings for each automation's function inputs
    const initialMappings: Record<number, AutomationMappings> = {}
    automations.forEach((automation, index) => {
      initialMappings[index] = {
        functionInputs: automation.functionInputs?.reduce((acc, input) => ({
          ...acc,
          [input.name]: { type: 'direct', value: '' }
        }), {}) || {}
      }
    })
    setAutomationMappings(initialMappings)
  }, [automations])

  const handleFunctionInputChange = (
    automationIndex: number,
    paramName: string,
    type: 'direct' | 'event',
    value: string
  ) => {
    setAutomationMappings(prev => ({
      ...prev,
      [automationIndex]: {
        ...prev[automationIndex],
        functionInputs: {
          ...prev[automationIndex].functionInputs,
          [paramName]: { type, value }
        }
      }
    }))
  }

  const getEventArguments = (eventSignature: string) => {
    const argsMatch = eventSignature.match(/\((.*?)\)/)
    if (!argsMatch) return []
    return argsMatch[1].split(',').map(arg => {
      const [type, name] = arg.trim().split(' ')
      return { type, name: name || type }
    })
  }

  const handleGenerateContract = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const { data } = await api.generateContracts({
        type: triggerType.toUpperCase(),
        chainId: Number(OrgChainId),
        originContract: originAddress,
        destinationContract: destinationAddress,
        pairs: automations.map((automation, index) => ({
          ...automation,
          functionArguments: Object.entries(automationMappings[index].functionInputs).map(([name, mapping]) => ({
            name,
            type: mapping.type,
            value: mapping.value
          }))
        })),
        isPausable
      })
      
      setDestinationContract(data.destination.code)
      setRscContract(data.rsc.code)
      setDeploymentStatus('Contracts generated successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to generate contracts')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCompile = async (contract: string) => {
    if (!contract) {
      setError('No contract to compile')
      return
    }

    setIsCompiling(true)
    setError('')
    try {
      const result = await api.compileContract(contract)
      setCompiledData(result)
      setDeploymentStatus('Contract compiled successfully')
      return result
    } catch (error: any) {
      setError(error.message || 'Failed to compile contract')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleDeploy = async (contract: string, isDestination: boolean) => {
    if (!web3 || !account) {
      setError('Web3 or account not available')
      return
    }

    setIsDeploying(true)
    setError('')
    try {
      const compiledContract = await handleCompile(contract)
      if (!compiledContract) {
        throw new Error('Compilation failed')
      }

      const deployContract = new web3.eth.Contract(compiledContract.abi)
      const deploy = deployContract.deploy({ data: compiledContract.bytecode })
      
      const gas = await deploy.estimateGas({ from: account })
      const gasPrice = await web3.eth.getGasPrice()

      const deployed = await deploy.send({
        from: account,
        gas,
        gasPrice
      })

      if (isDestination) {
        setDeployedDestinationAddress(deployed.options.address)
        // Update RSC with deployed destination address
        const updatedRSC = rscContract.replace('DESTINATION_ADDRESS_PLACEHOLDER', deployed.options.address)
        setRscContract(updatedRSC)
      } else {
        setDeployedRSCAddress(deployed.options.address)
      }
      setDeploymentStatus(`${isDestination ? 'Destination' : 'RSC'} contract deployed successfully`)
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin Chain ID</Label>
              <Input value={OrgChainId} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Destination Chain ID</Label>
              <Input value={DesChainId} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origin Address</Label>
              <Input value={originAddress} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Destination Address</Label>
              <Input value={destinationAddress} readOnly />
            </div>
          </div>

          {automations.map((automation, index) => {
            const eventArgs = getEventArguments(automation.event)
            
            return (
              <Card key={index}>
                <CardContent className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Event: {automation.event}</Label>
                    <div className="pl-4 space-y-1">
                      {eventArgs.map((arg, i) => (
                        <div key={i} className="text-sm text-gray-600">
                          {arg.name} ({arg.type})
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Function: {automation.function}</Label>
                    <div className="space-y-4">
                      {automation.functionInputs?.map((input) => (
                        <div key={input.name} className="pl-4 space-y-2">
                          <Label className="text-sm">
                            Parameter: {input.name} ({input.type})
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={automationMappings[index]?.functionInputs[input.name]?.type || 'direct'}
                              onValueChange={(value: 'direct' | 'event') => {
                                handleFunctionInputChange(
                                  index,
                                  input.name,
                                  value,
                                  value === 'direct' ? '' : eventArgs[0]?.name || ''
                                )
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select input type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="direct">Direct Value</SelectItem>
                                <SelectItem value="event">Map from Event</SelectItem>
                              </SelectContent>
                            </Select>

                            {automationMappings[index]?.functionInputs[input.name]?.type === 'direct' ? (
                              <Input
                                placeholder={`Value for ${input.name}`}
                                value={automationMappings[index]?.functionInputs[input.name]?.value || ''}
                                onChange={(e) => handleFunctionInputChange(
                                  index,
                                  input.name,
                                  'direct',
                                  e.target.value
                                )}
                              />
                            ) : (
                              <Select
                                value={automationMappings[index]?.functionInputs[input.name]?.value || ''}
                                onValueChange={(value) => {
                                  handleFunctionInputChange(
                                    index,
                                    input.name,
                                    'event',
                                    value
                                  )
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select event argument" />
                                </SelectTrigger>
                                <SelectContent>
                                  {eventArgs.map((arg) => (
                                    <SelectItem key={arg.name} value={arg.name}>
                                      {arg.name} ({arg.type})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <Button
            onClick={handleGenerateContract}
            disabled={isGenerating || automations.length === 0}
            className="w-full"
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Contracts
          </Button>

          {destinationContract && rscContract && (
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
                <div className="space-y-4">
                  <div>
                    <Label>Destination Contract</Label>
                    <Textarea
                      value={destinationContract}
                      onChange={(e) => setDestinationContract(e.target.value)}
                      rows={10}
                    />
                  </div>
                  <div>
                    <Label>RSC Contract</Label>
                    <Textarea
                      value={rscContract}
                      onChange={(e) => setRscContract(e.target.value)}
                      rows={10}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={() => handleDeploy(destinationContract, true)}
                  disabled={isDeploying || !destinationContract}
                  className="w-full"
                >
                  {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Deploy Destination Contract
                </Button>

                {deployedDestinationAddress && (
                  <Button
                    onClick={() => handleDeploy(rscContract, false)}
                    disabled={isDeploying || !rscContract}
                    className="w-full"
                  >
                    {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Deploy RSC to Kopli Network
                  </Button>
                )}
              </div>
            </>
          )}

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

          {deployedDestinationAddress && (
            <Alert>
              <AlertTitle>Deployed Destination Contract Address</AlertTitle>
              <AlertDescription className="font-mono">{deployedDestinationAddress}</AlertDescription>
            </Alert>
          )}

          {deployedRSCAddress && (
            <Alert>
              <AlertTitle>Deployed RSC Address on Kopli Network</AlertTitle>
              <AlertDescription className="font-mono">{deployedRSCAddress}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

