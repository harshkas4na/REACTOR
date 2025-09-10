export interface Automation {
  id: number
  name: string
  status: 'active' | 'pending' | 'failed'
  lastRun: string
}

export interface HealthItem {
  name: string
  status: 'healthy' | 'warning' | 'error'
}

export interface PerformanceData {
  name: string
  value: number
}

