import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const stats = [
  { title: 'Total Automations', value: 12, icon: Activity, color: 'text-blue-500' },
  { title: 'Active', value: 8, icon: CheckCircle, color: 'text-green-500' },
  { title: 'Pending', value: 3, icon: Clock, color: 'text-yellow-500' },
  { title: 'Failed', value: 1, icon: AlertTriangle, color: 'text-red-500' },
]

export default function QuickStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

