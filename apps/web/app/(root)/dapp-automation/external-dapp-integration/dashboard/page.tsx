import { Metadata } from 'next'
import DashboardContent from '@/components/ext-dapp-automation/DashboardContent'

export const metadata: Metadata = {
  title: 'Dashboard | DApp Automation',
  description: 'Overview of your DApp automations and system health',
}

export default function DashboardPage() {
  return <DashboardContent />
}

