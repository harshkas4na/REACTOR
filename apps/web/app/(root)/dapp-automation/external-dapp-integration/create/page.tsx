import { Metadata } from 'next'
import AutomationCreator from '@/components/ext-dapp-automation/AutomationCreator'

export const metadata: Metadata = {
  title: 'Create Automation | DApp Automation',
  description: 'Create a new DApp automation',
}

export default function CreatePage() {
  return <AutomationCreator />
}

