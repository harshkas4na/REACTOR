import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function DeploymentOptions() {
  const [name, setName] = useState('')
  const [chainId, setChainId] = useState('')
  const { createAutomation, automationConfig } = useAutomationStore()
  const { toast } = useToast()
  const router = useRouter()

  const handleDeploy = async () => {
    try {
      const newAutomation = await createAutomation({ ...automationConfig, name, chainId })
      toast({
        title: 'Automation Deployed',
        description: `Automation "${newAutomation.name}" has been successfully deployed.`,
      })
      router.push('/dashboard')
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: 'There was an error deploying your automation. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Deployment Options</h2>
      <div className="space-y-2">
        <Label htmlFor="automationName">Automation Name</Label>
        <Input
          id="automationName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for your automation"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="chainSelector">Target Chain</Label>
        <Select value={chainId} onValueChange={setChainId}>
          <SelectTrigger id="chainSelector">
            <SelectValue placeholder="Select target chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Ethereum Mainnet</SelectItem>
            <SelectItem value="137">Polygon</SelectItem>
            <SelectItem value="56">Binance Smart Chain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleDeploy} disabled={!name || !chainId}>
        Deploy Automation
      </Button>
    </div>
  )
}

