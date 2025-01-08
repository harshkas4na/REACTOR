// components/external-dapp-integration/TriggerSelection.tsx

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { useAutomationContext } from '@/app/_context/AutomationContext'

interface TriggerSelectionProps {
    onSelect: (type: string) => void
}

export default function TriggerSelection({ onSelect }: TriggerSelectionProps) {
    const { 
        setOriginAddress, 
        setOrgChainId,
        setAutomations 
    } = useAutomationContext();
    
    const [selectedTab, setSelectedTab] = useState<string>('custom')
    const [isVerifying, setIsVerifying] = useState(false)
    const [contractAddress, setContractAddress] = useState('')
    const [verificationError, setVerificationError] = useState('')

    const handleTabChange = (value: string) => {
        setSelectedTab(value)
        onSelect(value)
    }

    const handleVerifyContract = async () => {
        setIsVerifying(true)
        setVerificationError('')
        try {
            const { data } = await api.verifyContract(contractAddress)
            if (data.events && data.functions) {
                setOriginAddress(contractAddress)
                setAutomations([])  // Reset automations
            }
        } catch (error: any) {
            setVerificationError(error.message || 'Failed to verify contract')
        } finally {
            setIsVerifying(false)
        }
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
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="chainSelect">Select Chain</Label>
                                <Select onValueChange={setOrgChainId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select chain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Ethereum</SelectItem>
                                        <SelectItem value="137">Polygon</SelectItem>
                                        <SelectItem value="42161">Arbitrum</SelectItem>
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
                            {verificationError && (
                                <div className="text-red-500 text-sm">{verificationError}</div>
                            )}
                            <Button 
                                onClick={handleVerifyContract} 
                                disabled={isVerifying || !contractAddress}
                            >
                                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify Contract
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="protocol">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="protocolSelect">Select Protocol</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose protocol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aave">Aave</SelectItem>
                                        <SelectItem value="compound">Compound</SelectItem>
                                        <SelectItem value="uniswap">Uniswap</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="contractSelect">Select Contract</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose contract" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Protocol-specific contracts */}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="blockchain">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="chainSelect">Select Chain</Label>
                                <Select onValueChange={setOrgChainId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select chain" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Ethereum</SelectItem>
                                        <SelectItem value="137">Polygon</SelectItem>
                                        <SelectItem value="42161">Arbitrum</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="eventType">Event Type</Label>
                                <Input id="eventType" placeholder="e.g., Transfer(address,address,uint256)" />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}