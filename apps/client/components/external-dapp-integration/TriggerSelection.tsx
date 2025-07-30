'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react'
// import { api } from '@/services/api'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { ethers } from 'ethers'
import { BASE_URL } from '@/data/constants'

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
  { id: '5318007', name: 'Lasna Testnet' }
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
        const response = await fetch(`${BASE_URL}/DappAutomation`, {
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
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-zinc-100">Select Trigger Type</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
                <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-0 mb-6">
                        <TabsTrigger 
                            value="custom"
                            className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                            Custom Origin Contract
                        </TabsTrigger>
                        <TabsTrigger 
                            value="protocol"
                            className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                            Protocol
                        </TabsTrigger>
                        <TabsTrigger 
                            value="blockchain"
                            className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                            Blockchain-wide
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="chainSelect" className="text-sm sm:text-base text-zinc-200">
                                Select Chain
                            </Label>
                            <Select onValueChange={handleChainSelect}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                                    <SelectValue placeholder="Select chain" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    {originSupportedChains.map(chain => (
                                        <SelectItem 
                                            key={chain.id} 
                                            value={chain.id}
                                            className="text-zinc-200 focus:bg-primary/20"
                                        >
                                            {chain.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <TabsContent value="custom" className="space-y-4">
                            <div>
                                <Label htmlFor="contractAddress" className="text-sm sm:text-base text-zinc-200">
                                    Contract Address
                                </Label>
                                <Input
                                    id="contractAddress"
                                    placeholder="0x..."
                                    value={contractAddress}
                                    onChange={(e) => setContractAddress(e.target.value)}
                                    className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="eventSignature" className="text-sm sm:text-base text-zinc-200">
                                    Event Signature
                                </Label>
                                <Input
                                    id="eventSignature"
                                    placeholder="Event(address,uint256)"
                                    value={eventABI}
                                    onChange={(e) => setEventABI(e.target.value)}
                                    className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                                />
                            </div>
                            <Button 
                                onClick={handleCustomContractSubmit}
                                className="w-full sm:w-auto"
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
                        </TabsContent>

                        <TabsContent value="protocol" className="space-y-4">
                            <div className="space-y-4">
                                {protocolAddresses.map((address, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-2">
                                        <Input
                                            placeholder="Protocol Address"
                                            value={address}
                                            onChange={(e) => handleProtocolAddressChange(index, e.target.value)}
                                            className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                                        />
                                        {index > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveProtocolAddress(index)}
                                                className="shrink-0"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button 
                                    onClick={handleAddProtocolAddress} 
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Protocol Address
                                </Button>
                                <Button 
                                    onClick={handleProtocolSubmit}
                                    className="w-full sm:w-auto"
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
                            </div>
                        </TabsContent>

                        <TabsContent value="blockchain" className="space-y-4">
                            <div>
                                <Label htmlFor="eventSignature" className="text-sm sm:text-base text-zinc-200">
                                    Event Signature
                                </Label>
                                <Input
                                    id="eventSignature"
                                    placeholder="Event(address,uint256)"
                                    value={blockchainEvent}
                                    onChange={(e) => setBlockchainEvent(e.target.value)}
                                    className="mt-1.5 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                                />
                            </div>
                            <Button 
                                onClick={handleBlockchainSubmit}
                                className="w-full sm:w-auto"
                            >
                                Submit
                            </Button>
                        </TabsContent>
                    </div>
                </Tabs>
                
                {/* Status Messages */}
                {verificationError && (
                    <div className="mt-4 text-sm text-red-500 p-3 rounded-md bg-red-500/10">
                        {verificationError}
                    </div>
                )}
                {successMessage && (
                    <div className="mt-4 text-sm text-green-500 p-3 rounded-md bg-green-500/10 flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {successMessage}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}