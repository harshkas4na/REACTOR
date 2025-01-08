import { create } from 'zustand'
import { AutomationConfig, Automation } from '@/types/automation'

interface AutomationStore {
  automationConfig: AutomationConfig
  updateAutomationConfig: (config: Partial<AutomationConfig>) => void
  createAutomation: (config: AutomationConfig & { name: string }) => Promise<Automation>
}

export const useAutomationStore = create<AutomationStore>((set) => ({
  automationConfig: {},
  updateAutomationConfig: (config) =>
    set((state) => ({ automationConfig: { ...state.automationConfig, ...config } })),
  createAutomation: async (config) => {
    // This would typically be an API call
    console.log('Creating automation with config:', config)
    const newAutomation: Automation = {
      id: Date.now().toString(),
      name: config.name,
      type: config.type!,
      status: 'PENDING',
      selectedProtocols: config.selectedProtocols!,
      contracts: config.contracts!,
      eventFunctionMappings: config.eventFunctionMappings!,
      parameters: config.parameters!,
      logic: config.logic!,
      chainId: config.chainId!,
      createdAt: new Date(),
      lastActive: new Date(),
    }
    return newAutomation
  },
}))

