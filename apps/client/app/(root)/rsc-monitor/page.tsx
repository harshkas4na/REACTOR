import { Metadata } from 'next'
import RSCTransactionMonitor from '@/components/rsc-monitor/RSCTransactionMonitor'

export const metadata: Metadata = {
  title: 'RSC Transaction Monitor',
  description: 'Monitor and track Reactive Smart Contract (RSC) transactions across different blockchain networks',
}

export default function RSCMonitorPage() {
  return <RSCTransactionMonitor />
}

