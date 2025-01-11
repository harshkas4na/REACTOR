import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TransactionDetailsProps {
  stage: "originTx" | "eventEmission" | "rscCapture" | "callback" | "destinationExecution"
  data: any
}

export default function TransactionDetails({ stage, data }: TransactionDetailsProps) {
  const renderDetails = () => {
    switch (stage) {
      case 'originTx':
        return (
          <>
            <p>Block Number: {data.blockNumber}</p>
            <p>Gas Used: {data.gasUsed}</p>
          </>
        )
      case 'eventEmission':
        return (
          <>
            <p>Event Signature: {data.eventSignature}</p>
            <p>Matches Config: <Badge variant={data.matchesConfig ? "default" : "destructive"}>{data.matchesConfig ? "Yes" : "No"}</Badge></p>
          </>
        )
      case 'rscCapture':
        return (
          <>
            <p>RVM Transaction Hash: {data.rvmTxHash}</p>
          </>
        )
      case 'callback':
        return (
          <>
            <p>Callback Transaction Hash: {data.txHash}</p>
            <p>Gas Used: {data.gasUsed}</p>
          </>
        )
      case 'destinationExecution':
        return (
          <>
            <p>Function Called: {data.functionCalled}</p>
            <p>Parameters: {JSON.stringify(data.params)}</p>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Card className="mt-4 bg-gray-50 dark:bg-gray-900">
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-2">Transaction Details</h4>
        {renderDetails()}
      </CardContent>
    </Card>
  )
}

