import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react'
import StatusIndicator from './StatusIndicator'
import NetworkBadge from './NetworkBadge'
import TransactionDetails from './TransactionDetails'

interface TransactionTimelineProps {
  status: any
}

export default function TransactionTimeline({ status }: TransactionTimelineProps) {
  const [expandedStage, setExpandedStage] = React.useState<string | null>(null)

  const toggleExpand = (stage: string) => {
    setExpandedStage(expandedStage === stage ? null : stage)
  }

  const stages = [
    { key: 'originTx', title: 'Origin Transaction', chain: status.stages.originTx.chain },
    { key: 'eventEmission', title: 'Event Emission', chain: status.stages.eventEmission.chain },
    { key: 'rscCapture', title: 'RSC Event Capture', chain: 'Kopli' },
    { key: 'callback', title: 'Callback Processing', chain: 'Kopli' },
    { key: 'destinationExecution', title: 'Destination Execution', chain: status.stages.destinationExecution.chain },
  ]

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => (
        <Card key={stage.key} className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <StatusIndicator status={status.stages[stage.key].status} />
                <div>
                  <h3 className="text-lg font-semibold">{stage.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <NetworkBadge network={stage.chain} />
                    <span>{status.stages[stage.key].timestamp}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(status.stages[stage.key].hash)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy transaction hash</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => window.open(`https://explorer.${stage.chain.toLowerCase()}.com/tx/${status.stages[stage.key].hash}`, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View in explorer</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="outline" size="icon" onClick={() => toggleExpand(stage.key)}>
                  {expandedStage === stage.key ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {expandedStage === stage.key && (
              <TransactionDetails stage={stage.key as "originTx" | "eventEmission" | "rscCapture" | "callback" | "destinationExecution"} data={status.stages[stage.key]} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

