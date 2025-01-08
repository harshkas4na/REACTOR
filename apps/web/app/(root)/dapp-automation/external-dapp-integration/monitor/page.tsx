import { Metadata } from 'next'
import MonitorContent from '@/components/ext-dapp-automation/MonitorContent'

export const metadata: Metadata = {
  title: 'Monitor Automations | DApp Automation',
  description: 'Monitor and manage your DApp automations',
}

export default function MonitorPage() {
  return <MonitorContent />
}

