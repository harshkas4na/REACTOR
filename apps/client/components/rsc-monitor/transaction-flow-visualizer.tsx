"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {  ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react'
import { StatusIndicator } from './status-indicator'
import { NetworkBadge } from './network-badge'
import { TransactionDetails } from './transaction-details'

type Stage = {
  title: string
  status: 'success' | 'pending' | 'failed'
  chain: string
  timestamp: string
  hash: string
}

const initialTimelineStages: Stage[] = [
  { 
    title: 'Origin Transaction', 
    status: 'success', 
    chain: 'Sepolia', 
    timestamp: '2023-04-15 14:30:00',
    hash: '0x1234...5678'
  },
  { 
    title: 'Event Emission', 
    status: 'success', 
    chain: 'Sepolia', 
    timestamp: '2023-04-15 14:30:05',
    hash: '0x2345...6789'
  },
  { 
    title: 'RSC Event Capture', 
    status: 'success', 
    chain: 'Kopli', 
    timestamp: '2023-04-15 14:30:10',
    hash: '0x3456...7890'
  },
  { 
    title: 'Callback Processing', 
    status: 'pending', 
    chain: 'Kopli', 
    timestamp: '2023-04-15 14:30:15',
    hash: '0x4567...8901'
  },
  { 
    title: 'Destination Execution', 
    status: 'pending', 
    chain: 'Sepolia', 
    timestamp: '-',
    hash: '-'
  },
]

export function TransactionFlowVisualizer() {
  const [timelineStages, setTimelineStages] = useState<Stage[]>(initialTimelineStages)
  const [expandedStage, setExpandedStage] = useState<number | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleExpand = (index: number) => {
    setExpandedStage(expandedStage === index ? null : index)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction Flow</CardTitle>
        <CardDescription>Visualize the progress of your RSC transaction</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineStages.map((stage, index) => (
            <Card key={index} className="border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <StatusIndicator status={stage.status} />
                    <div>
                      <h3 className="text-lg font-semibold">{stage.title}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <NetworkBadge network={stage.chain} />
                        <span>{stage.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => handleCopy(stage.hash)}>
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
                          <Button variant="outline" size="icon" onClick={() => window.open(`https://etherscan.io/tx/${stage.hash}`, '_blank')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View in explorer</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="outline" size="icon" onClick={() => handleExpand(index)}>
                      {expandedStage === index ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {expandedStage === index && (
                  <TransactionDetails hash={stage.hash} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

