import React from 'react'
import { Card, CardContent } from "@/components/ui/card"

type TransactionDetailsProps = {
  hash: string
}

export function TransactionDetails({ hash }: TransactionDetailsProps) {
  return (
    <Card className="mt-4 bg-gray-50 dark:bg-gray-900">
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-2">Transaction Details</h4>
        <p className="text-xs font-mono break-all">{hash}</p>
        {/* Add more transaction details here */}
      </CardContent>
    </Card>
  )
}

