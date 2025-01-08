import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface ContractInputProps {
  onVerify: (address: string, chainId: number) => Promise<boolean>
}

export default function ContractInput({ onVerify }: ContractInputProps) {
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState<number>(1) // Default to Ethereum mainnet
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const isVerified = await onVerify(address, chainId)
      if (isVerified) {
        toast({
          title: 'Contract Verified',
          description: 'The contract has been successfully verified.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Unable to verify the contract. Please check the address and try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: 'An error occurred during verification. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contractAddress">Contract Address</Label>
        <Input
          id="contractAddress"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="chainSelector">Chain</Label>
        <Select value={chainId.toString()} onValueChange={(value) => setChainId(Number(value))}>
          <SelectTrigger id="chainSelector">
            <SelectValue placeholder="Select a chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Ethereum Mainnet</SelectItem>
            <SelectItem value="137">Polygon</SelectItem>
            <SelectItem value="56">Binance Smart Chain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleVerify} disabled={!address || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Verify Contract'}
      </Button>
    </div>
  )
}

