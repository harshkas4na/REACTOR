'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { ethers } from 'ethers'

interface TriggerSelectionProps {
    onSelect: (type: string) => void
}

const originSupportedChains = [
  { id: '11155111', name: 'Ethereum Sepolia' },
  { id: '1', name: 'Ethereum Mainnet' },
  { id: '43114', name: 'Avalanche C-Chain' },
  { id: '42161', name: 'Arbitrum One' },
  { id: '169', name: 'Manta Pacific' },
  { id: '8453', name: 'Base Chain' },
  { id: '56', name: 'Binance Smart Chain' },
  { id: '137', name: 'Polygon PoS' },
  { id: '5318008', name: 'Kopli Testnet' }
]

export default function TriggerSelection({ onSelect }: TriggerSelectionProps) {
    const { 
        setOriginAddress, 
        setOrgChainId,
        setAutomations,
        setTriggerType
    } = useAutomationContext();
    
    const [selectedTab, setSelectedTab] = useState<string>('custom')
    const [isVerifying, setIsVerifying] = useState(false)
    const [contractAddress, setContractAddress] = useState('')
    const [verificationError, setVerificationError] = useState('')
    const [eventABI, setEventABI] = useState('')
    const [protocolAddresses, setProtocolAddresses] = useState<string[]>([''])
    const [blockchainEvent, setBlockchainEvent] = useState('')
    const [events, setEvents] = useState([])
    const [selectedChain, setSelectedChain] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const handleTabChange = (value: string) => {
        setSelectedTab(value)
        setTriggerType(value as "custom" | "protocol" | "blockchain")
        onSelect(value)
    }

    const validateContract = async (address: string) => {
      setIsVerifying(true)
      try {
        const response = await fetch('http://localhost:5000/DappAutomation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ originAddress: address }),
        })
        const data = await response.json()
        if (response.ok) {
          const eventsWithTopic0 = data.events.map((event: any) => ({
            ...event,
            //@ts-ignore
            topic0: ethers.keccak256(ethers.toUtf8Bytes(`${event.name}(${event.inputs.map((input: any) => input.type).join(',')})`))
          }))
          setEvents(eventsWithTopic0)
          return true
        } else {
          throw new Error(data.message || 'Failed to validate contract')
        }
      } catch (error: any) {
        console.error('Error validating contract:', error)
        setVerificationError(error.message || 'Failed to validate contract')
        return false
      } finally {
        setIsVerifying(false)
      }
    }

    const handleVerifyContract = async (address: string) => {
      const isValid = await validateContract(address)
      if (isValid) {
        setOriginAddress(address)
      }
      return isValid
    }

    const handleCustomContractSubmit = async () => {
        // Reset error state
        setVerificationError('')
        
        // Validate chain selection
        if (!selectedChain) {
            setVerificationError('Please select a chain first')
            return
        }
    
        // Validate inputs
        if (!contractAddress) {
            setVerificationError('Please enter a contract address')
            return
        }
    
        if (!eventABI) {
            setVerificationError('Please enter an event signature')
            return
        }
    
        try {
            setIsLoading(true)
            
            // First validate the contract
            const isValid = await handleVerifyContract(contractAddress)
            if (!isValid) {
                setVerificationError('Contract validation failed')
                return
            }
    
            // If contract is valid, process the event signature
            const topic0 = ethers.keccak256(ethers.toUtf8Bytes(eventABI))
            setAutomations([{ event: eventABI, topic0, function: '' }])
            
            // Clear any existing errors
            setVerificationError('')
            // Set Success Message
            setSuccessMessage('Event signature processed successfully')
        } catch (error: any) {
            console.error('Error in custom contract submission:', error)
            setVerificationError(error.message || 'Failed to process event signature')
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddProtocolAddress = () => {
        setProtocolAddresses([...protocolAddresses, ''])
    }

    const handleRemoveProtocolAddress = (index: number) => {
        setProtocolAddresses(protocolAddresses.filter((_, i) => i !== index))
    }

    const handleProtocolAddressChange = (index: number, value: string) => {
        const newAddresses = [...protocolAddresses]
        newAddresses[index] = value
        setProtocolAddresses(newAddresses)
    }

    const handleProtocolSubmit = async () => {
        if (!selectedChain) {
            setVerificationError('Please select a chain first')
            return
        }
        const verifiedAddresses = []
        for (const address of protocolAddresses) {
            if (address && await handleVerifyContract(address)) {
                verifiedAddresses.push(address)
            }
        }
        setOriginAddress(verifiedAddresses.join(','))
        // Set Success Message
        setSuccessMessage('Protocol addresses verified successfully')
    }

    const handleBlockchainSubmit = () => {
        if (!selectedChain) {
            setVerificationError('Please select a chain first')
            return
        }
        if (blockchainEvent) {
            try {
                //@ts-ignore
                const topic0 = ethers.keccak256(ethers.toUtf8Bytes(blockchainEvent))
                setAutomations([{ event: blockchainEvent, topic0, function: '' }])
                // Set Success Message
                setSuccessMessage('Blockchain event processed successfully')
            } catch (error) {
                console.error('Error generating topic0:', error)
            }
        }
    }

    const handleChainSelect = (chainId: string) => {
        setSelectedChain(chainId)
        setOrgChainId(chainId)
        setVerificationError('')
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Select Trigger Type</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={selectedTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="custom">Custom Origin Contract</TabsTrigger>
                        <TabsTrigger value="protocol">Protocol</TabsTrigger>
                        <TabsTrigger value="blockchain">Blockchain-wide</TabsTrigger>
                    </TabsList>

                    <TabsContent value="custom">
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="chainSelect">Select Chain</Label>
                                <Select onValueChange={handleChainSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select chain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {originSupportedChains.map(chain => (
                                            <SelectItem key={chain.id} value={chain.id}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="contractAddress">Contract Address</Label>
                                <Input
                                    id="contractAddress"
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="eventSignature">Event Signature</Label>
                                <Input
                                    id="eventSignature"
                                    placeholder="Event(address,uint256)"
                                    value={eventABI}
                                    onChange={(e) => setEventABI(e.target.value)}
                                />
                            </div>
                            <div className="pt-4">
                                <Button 
                                    onClick={handleCustomContractSubmit}
                                    className="w-40"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit'
                                    )}
                                </Button>
                                {successMessage && (
                                    <div className="text-green-500 text-sm mt-2 px-6 pb-4 flex items-center">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="protocol">
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="chainSelect">Select Chain</Label>
                                <Select onValueChange={handleChainSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select chain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {originSupportedChains.map(chain => (
                                            <SelectItem key={chain.id} value={chain.id}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4">
                                {protocolAddresses.map((address, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Protocol Address"
                                            value={address}
                                            onChange={(e) => handleProtocolAddressChange(index, e.target.value)}
                                        />
                                        {index > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveProtocolAddress(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col gap-4 pt-4">
                                <Button onClick={handleAddProtocolAddress} variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> Add Protocol Address
                                </Button>
                                <Button 
                                    onClick={handleProtocolSubmit}
                                    className="w-40"
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying
                                        </>
                                    ) : (
                                        'Verify and Submit'
                                    )}
                                </Button>
                                {successMessage && (
                                    <div className="text-green-500 text-sm mt-2 px-6 pb-4 flex items-center">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="blockchain">
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="chainSelect">Select Chain</Label>
                                <Select onValueChange={handleChainSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select chain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {originSupportedChains.map(chain => (
                                            <SelectItem key={chain.id} value={chain.id}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="eventSignature">Event Signature</Label>
                                <Input
                                    id="eventSignature"
                                    placeholder="Event(address,uint256)"
                                    value={blockchainEvent}
                                    onChange={(e) => setBlockchainEvent(e.target.value)}
                                />
                            </div>
                            <div className="pt-4">
                                <Button 
                                    onClick={handleBlockchainSubmit}
                                    className="w-40"
                                >
                                    Submit
                                </Button>
                                {successMessage && (
                                    <div className="text-green-500 text-sm mt-2 px-6 pb-4 flex items-center">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {successMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            {verificationError && (
                <div className="text-red-500 text-sm mt-2 px-6 pb-4">{verificationError}</div>
            )}
        </Card>
    )
}