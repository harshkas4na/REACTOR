import { CheckCircle, AlertTriangle } from 'lucide-react'

const healthItems = [
  { name: 'API Server', status: 'healthy' },
  { name: 'Database', status: 'healthy' },
  { name: 'Blockchain Node', status: 'warning' },
  { name: 'Task Queue', status: 'healthy' },
]

export default function SystemHealth() {
  return (
    <div className="space-y-4">
      {healthItems.map((item) => (
        <div key={item.name} className="flex items-center justify-between">
          <span className="font-medium">{item.name}</span>
          {item.status === 'healthy' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
        </div>
      ))}
    </div>
  )
}

