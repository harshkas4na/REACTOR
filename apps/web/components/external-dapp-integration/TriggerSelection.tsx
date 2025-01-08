import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TriggerSelectionProps {
  onSelect: (type: string) => void
}

export default function TriggerSelection({ onSelect }: TriggerSelectionProps) {
  const [selectedTab, setSelectedTab] = useState<string>('custom')

  const handleTabChange = (value: string) => {
    setSelectedTab(value)
    onSelect(value)
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
            <TabsTrigger value="famous">Famous Contract/Protocol</TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain-wide Event</TabsTrigger>
          </TabsList>
          <TabsContent value="custom">
            <div className="space-y-4">
              <div>
                <Label htmlFor="contractAddress">Contract Address</Label>
                <Input id="contractAddress" placeholder="0x..." />
              </div>
              <div>
                <Label htmlFor="contractABI">Contract ABI</Label>
                <Input id="contractABI" placeholder="Paste ABI here" />
              </div>
              <Button>Verify Contract</Button>
            </div>
          </TabsContent>
          <TabsContent value="famous">
            <div className="space-y-4">
              <div>
                <Label htmlFor="protocolSelect">Select Protocol</Label>
                <Select>
                  <SelectTrigger id="protocolSelect">
                    <SelectValue placeholder="Choose a protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uniswap">Uniswap</SelectItem>
                    <SelectItem value="aave">Aave</SelectItem>
                    <SelectItem value="compound">Compound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contractSelect">Select Contract</Label>
                <Select>
                  <SelectTrigger id="contractSelect">
                    <SelectValue placeholder="Choose a contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Populate with contracts based on selected protocol */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="blockchain">
            <div className="space-y-4">
              <div>
                <Label htmlFor="chainSelect">Select Blockchain</Label>
                <Select>
                  <SelectTrigger id="chainSelect">
                    <SelectValue placeholder="Choose a blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Input id="eventType" placeholder="e.g., Transfer, Swap, etc." />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

