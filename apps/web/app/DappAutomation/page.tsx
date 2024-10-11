'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Loader2, CheckCircle, ChevronDown, ChevronUp, Edit, Save, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AutomationPage() {
  const [contractAddress, setContractAddress] = useState('')
  const [userAddress, setUserAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [chainId, setChainId] = useState('11155111')
  const [contractData, setContractData] = useState<{
    events: { formatted: string, abi: any }[],
    functions: string[]
  } | null>(null)

  const [selectedPairs, setSelectedPairs] = useState<{ topic0: string, function: string, eventAbi: any }[]>([])
  const [originAddress, setOriginAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [reactiveContract, setReactiveContract] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showContract, setShowContract] = useState(false)
  const [editingContract, setEditingContract] = useState(false)
  const [editedContract, setEditedContract] = useState('')
  const [abi, setAbi] = useState<any>(null)
  const [bytecode, setBytecode] = useState('')
  const [deployedAddress, setDeployedAddress] = useState('')
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setContractData(null)
    setSuccessMessage('')

    try {
      const response = await fetch('http://localhost:5000/DappAutomation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress, userAddress })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process contract')
      }

      const data = await response.json()
      setContractData(data)
      setSuccessMessage('Contract processed successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePairSelection = (event: { formatted: string, abi: any }, func: string) => {
    const topic0 = ethers.keccak256(ethers.toUtf8Bytes(event.formatted))
    setSelectedPairs(prev => {
      const exists = prev.some(pair => pair.topic0 === topic0 && pair.function === func)
      if (exists) {
        return prev.filter(pair => !(pair.topic0 === topic0 && pair.function === func))
      } else {
        return [...prev, { topic0, function: func, eventAbi: event.abi }]
      }
    })
  }

  const handleGenerateContract = async () => {
    setIsLoading(true)
    setError('')
    setReactiveContract('')
    setSuccessMessage('')

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicFunctionPairs: selectedPairs,
          originContract: originAddress,
          chainId: parseInt(chainId),
          destinationContract: destinationAddress,
          ownerAddress: userAddress
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate contract')
      }

      const data = await response.json()
      setReactiveContract(data.reactiveSmartContractTemplate)
      setAbi(data.abi)
      setBytecode(data.bytecode)
      setSuccessMessage('Contract generated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditContract = () => {
    setEditingContract(true)
    setEditedContract(reactiveContract)
  }

  const handleSaveEditedContract = () => {
    setReactiveContract(editedContract)
    setEditingContract(false)
  }

  const handleRecompile = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5000/recompile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceCode: editedContract,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to recompile contract')
      }

      const data = await response.json()
      setAbi(data.abi)
      setBytecode(data.bytecode)
      setSuccessMessage('Contract recompiled successfully!')
    } catch (err) {
      setError('An error occurred while recompiling the contract. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const deployContract = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask to deploy the contract.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Switch to Kopli Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x512578' }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x512578',
                chainName: 'Kopli Testnet',
                nativeCurrency: {
                  name: 'REACT',
                  symbol: 'REACT',
                  decimals: 18
                },
                rpcUrls: ['https://kopli-rpc.rkt.ink'],
                blockExplorerUrls: ['https://kopli.reactscan.net']
              }],
            })
          } catch (addError) {
            throw new Error('Failed to add Kopli Testnet to MetaMask')
          }
        } else {
          throw switchError
        }
      }

      const factory = new ethers.ContractFactory(abi, bytecode, signer)
      
      const contract = await factory.deploy("0x0000000000000000000000000000000000FFFFFF")
      await contract.waitForDeployment()

      setDeployedAddress(await contract.getAddress())
      setSuccessMessage('Contract deployed successfully!')
    } catch (err) {
      if (err instanceof Error) {
        setError('Failed to deploy the contract. ' + err.message)
      } else {
        setError('Failed to deploy the contract. An unknown error occurred.')
      }
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8 bg-gray-900 text-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-center text-gray-100">DApp Automation</h1>

      {/* Contract Processing Form */}
      <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Process Contract</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contractAddress" className="text-gray-300">Contract Address</Label>
              <Input
                id="contractAddress"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                required
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userAddress" className="text-gray-300">Your Address</Label>
              <Input
                id="userAddress"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                required
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Process Contract'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="bg-red-900 border-red-700 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert variant="default" className="bg-green-900 border-green-700 text-green-100">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertTitle className="text-green-100">Success</AlertTitle>
          <AlertDescription className="text-green-200">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Contract Data Modal */}
      {contractData && (
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Select Event-Function Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {contractData.functions.map((func, funcIndex) => (
                <Dialog key={`function-${funcIndex}`}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600"
                      onClick={() => setSelectedFunction(func)}
                    >
                      {func}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100">
                    <DialogHeader>
                      <DialogTitle className="text-gray-100">Select Events for {func}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {contractData.events.map((event, eventIndex) => (
                        <div key={`pair-${eventIndex}-${funcIndex}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pair-${eventIndex}-${funcIndex}`}
                            checked={selectedPairs.some(pair => 
                              pair.topic0 === ethers.keccak256(ethers.toUtf8Bytes(event.formatted)) && 
                              pair.function === func
                            )}
                            onCheckedChange={() => handlePairSelection(event, func)}
                            className="border-gray-500"
                          />
                          <Label htmlFor={`pair-${eventIndex}-${funcIndex}`} className="text-gray-300">{event.formatted}</Label>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Contract */}
      {selectedPairs.length > 0 && (
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Generate Reactive Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="originAddress" className="text-gray-300">Origin Address</Label>
              <Input
                id="originAddress"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="0x..."
                required
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinationAddress" className="text-gray-300">Destination Address</Label>
              <Input
                id="destinationAddress"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                required
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chainId" className="text-gray-300">Chain ID</Label>
              <Input
                id="chainId"
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                placeholder="Chain ID (e.g., 11155111 for Sepolia)"
                required
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <Button onClick={handleGenerateContract} className="w-full bg-primary hover:bg-primary-foreground" 
disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Contract'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reactive Contract Display */}
      {reactiveContract && (
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-gray-100">
              <span>Reactive Contract</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContract(!showContract)}
                className="text-gray-300 hover:text-gray-100"
              >
                {showContract ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {showContract && (
            <CardContent>
              {!editingContract ? (
                <>
                  <div className="bg-gray-700 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap">{reactiveContract}</pre>
                  </div>
                  <Button onClick={handleEditContract} className="mt-4 bg-primary hover:bg-primary-foreground">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Contract
                  </Button>
                </>
              ) : (
                <>
                  <Textarea
                    value={editedContract}
                    onChange={(e) => setEditedContract(e.target.value)}
                    className="h-64 mb-4 font-mono bg-gray-700 text-gray-100 border-gray-600"
                  />
                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => setEditingContract(false)} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEditedContract} className="bg-primary hover:bg-primary-foreground">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recompile and Deploy */}
      {abi && bytecode && (
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Deploy Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleRecompile} className="w-full bg-primary hover:bg-primary-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Recompile Contract'}
            </Button>
            <Button onClick={deployContract} className="w-full bg-primary hover:bg-primary-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Deploy Contract with MetaMask'}
            </Button>
            <p className="text-sm text-gray-400">
              Please make sure to recompile the contract before deploying if you've made any changes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deployed Contract Information */}
      {deployedAddress && (
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Deployed Contract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-green-400 font-semibold">Contract deployed successfully!</p>
            <p className="text-gray-300">Deployed address: {deployedAddress}</p>
            <a 
              href={`https://kopli.reactscan.net/address/${deployedAddress}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              View on Block Explorer
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}