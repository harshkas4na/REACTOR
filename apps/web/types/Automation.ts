export interface AutomationType {
    event: string;
    function: string;
    topic0: string;
  }

  export type ExternalAutomationType = 'PROTOCOL_TO_PROTOCOL' | 'ORIGIN_TO_PROTOCOL' | 'BLOCKCHAIN_WIDE'

export interface Protocol {
  id: string
  name: string
  icon: string
  description: string
  chainIds: number[]
  supported: {
    events: string[]
    functions: string[]
  }
  verified: boolean
}

export interface Automation {
  id: string
  name: string
  type: AutomationType
  status: 'ACTIVE' | 'PENDING' | 'FAILED' | 'PAUSED'
  selectedProtocols: string[]
  contracts: Record<string, string>
  eventFunctionMappings: Record<string, { event: string; function: string }>
  parameters: Record<string, Record<string, { value: string; type: 'fixed' | 'event' }>>
  logic: string
  chainId: string
  createdAt: Date
  lastActive: Date
}

export interface AutomationConfig {
  type?: AutomationType
  selectedProtocols?: string[]
  contracts?: Record<string, string>
  eventFunctionMappings?: Record<string, { event: string; function: string }>
  parameters?: Record<string, Record<string, { value: string; type: 'fixed' | 'event' }>>
  logic?: string
  chainId?: string
}

