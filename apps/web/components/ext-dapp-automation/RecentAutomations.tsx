import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const recentAutomations = [
  { id: 1, name: 'Uniswap Liquidity', status: 'active', lastRun: '2 minutes ago' },
  { id: 2, name: 'Aave Deposit', status: 'pending', lastRun: '15 minutes ago' },
  { id: 3, name: 'Compound Borrow', status: 'failed', lastRun: '1 hour ago' },
  { id: 4, name: 'Curve Swap', status: 'active', lastRun: '3 hours ago' },
]

export default function RecentAutomations() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Run</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentAutomations.map((automation) => (
          <TableRow key={automation.id}>
            <TableCell className="font-medium">{automation.name}</TableCell>
            <TableCell>
              <Badge
                variant={
                  automation.status === 'active'
                    ? 'success'
                    : automation.status === 'pending'
                    ? 'warning'
                    : 'destructive'
                }
              >
                {automation.status}
              </Badge>
            </TableCell>
            <TableCell>{automation.lastRun}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

