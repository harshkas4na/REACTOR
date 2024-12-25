import React from 'react'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'

type StatusIndicatorProps = {
  status: 'success' | 'pending' | 'failed'
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const iconClass = "h-6 w-6 transition-all duration-300"
  
  switch (status) {
    case 'success':
      return <CheckCircle2 className={`${iconClass} text-green-500`} />
    case 'pending':
      return <Clock className={`${iconClass} text-yellow-500 animate-pulse`} />
    case 'failed':
      return <AlertCircle className={`${iconClass} text-red-500`} />
    default:
      return null
  }
}

