// 'use client'

// import { useState } from 'react'
// import { useQuery } from '@tanstack/react-query'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/button'
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
// import { fetchAutomations } from '@/lib/api'
// import { Automation } from '@/types/automation'
// import ProtocolCard from '@/components/ProtocolCard'
// import StatusIndicator from '@/components/StatusIndicator'

// export default function MonitorContent() {
//   const [searchTerm, setSearchTerm] = useState('')
//   const { data: automations, isLoading, isError } = useQuery<Automation[]>({
//     queryKey: ['automations'],
//     queryFn: fetchAutomations,
//   })

//   const filteredAutomations = automations?.filter(
//     (automation) =>
//       automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       automation.contractAddress.toLowerCase().includes(searchTerm.toLowerCase())
//   )

//   if (isLoading) return <div>Loading automations...</div>
//   if (isError) return <div>Error loading automations</div>

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-bold tracking-tight">Monitor Automations</h1>
//         <div className="flex space-x-2">
//           <Input
//             placeholder="Search automations..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-64"
//           />
//           <Button>Refresh</Button>
//         </div>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Active Automations</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Name</TableHead>
//                 <TableHead>Protocol</TableHead>
//                 <TableHead>Status</TableHead>
//                 <TableHead>Last Active</TableHead>
//                 <TableHead>Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {filteredAutomations?.map((automation) => (
//                 <TableRow key={automation.id}>
//                   <TableCell>{automation.name}</TableCell>
//                   <TableCell>
//                     <ProtocolCard protocol={automation.protocol} />
//                   </TableCell>
//                   <TableCell>
//                     <StatusIndicator status={automation.status} />
//                   </TableCell>
//                   <TableCell>{new Date(automation.lastActive).toLocaleString()}</TableCell>
//                   <TableCell>
//                     <Button variant="outline" size="sm">
//                       View Details
//                     </Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

