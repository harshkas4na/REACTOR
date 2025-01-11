import React from 'react'
import { Badge } from "@/components/ui/badge"

type NetworkBadgeProps = {
  network: string
}

export function NetworkBadge({ network }: NetworkBadgeProps) {
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'sepolia':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'kopli':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <Badge variant="outline" className={`${getNetworkColor(network)} font-medium`}>
      {network}
    </Badge>
  )
}

