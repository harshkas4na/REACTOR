import { useState } from 'react'
import { useAutomationStore } from '@/lib/stores/automationStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LogicConfiguration({ onComplete }: { onComplete: () => void }) {
  const { updateAutomationConfig, automationConfig } = useAutomationStore()
  const [logic, setLogic] = useState<string>(automationConfig.logic || '')

  const handleSave = () => {
    updateAutomationConfig({ logic })
    onComplete()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Logic Configuration</h2>
      <Card>
        <CardHeader>
          <CardTitle>Custom Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="logic">Enter your custom logic here:</Label>
          <Textarea
            id="logic"
            value={logic}
            onChange={(e) => setLogic(e.target.value)}
            placeholder="// Enter your custom Solidity logic here"
            className="h-64 font-mono"
          />
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={!logic.trim()}>
        Save Logic
      </Button>
    </div>
  )
}

