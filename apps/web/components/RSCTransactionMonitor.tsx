'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Clock, AlertCircle, RefreshCw, ExternalLink, Copy } from 'lucide-react'
import TransactionTimeline from './TransactionTimeline'
import StatusIndicator from './StatusIndicator'
import NetworkBadge from './NetworkBadge'
import TransactionDetails from './TransactionDetails'
import { query, mutation } from '../convex/_generated/server'
import { RSCMonitorService } from '../services/RSCMonitorService'
import { WebSocketManager } from '../services/WebSocketManager'

export default function RSCTransactionMonitor() {
  const [activeTab, setActiveTab] = useState('myRSCs')
  const [selectedRSC, setSelectedRSC] = useState('')
  const [rscAddress, setRscAddress] = useState('')
  const [transactionHash, setTransactionHash] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null)

  // const userRSCs = query('getRSCsForUser', { userId: 'current-user-id' }) // Replace with actual user ID
  // const startMonitoring = mutation('startRSCMonitoring')

  // const monitorService = new RSCMonitorService()
  // const wsManager = new WebSocketManager()

  // useEffect(() => {
  //   wsManager.setupSubscriptions(['1', '11155111']) // Ethereum and Sepolia chain IDs
  //   return () => wsManager.closeConnections()
  // }, [])

  const handleMonitor = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let monitoringParams: any = {}
      if (activeTab === 'myRSCs') {
        monitoringParams.rscId = selectedRSC
      } else if (activeTab === 'enterRSC') {
        monitoringParams.rscAddress = rscAddress
      } else {
        monitoringParams.originTxHash = transactionHash
      }

      const initialStatus = await startMonitoring(monitoringParams)
      setTransactionStatus(initialStatus)

      const status = await monitorService.initializeMonitoring(monitoringParams)
      setTransactionStatus(status)

      wsManager.handleStatusUpdates((update) => {
        setTransactionStatus((prevStatus) => ({ ...prevStatus, ...update }))
      })
    } catch (err) {
      setError(err.message || 'An error occurred while starting monitoring')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300">
          RSC Transaction Monitor
        </h1>
        
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-teal-400 text-white p-6 rounded-t-lg">
            <CardTitle className="text-2xl font-bold">
              Monitor Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="myRSCs">Monitor My RSCs</TabsTrigger>
                <TabsTrigger value="enterRSC">Enter RSC Address</TabsTrigger>
                <TabsTrigger value="trackTx">Track by Transaction</TabsTrigger>
              </TabsList>
              <TabsContent value="myRSCs">
                <Select value={selectedRSC} onValueChange={setSelectedRSC}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an RSC" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRSCs?.map((rsc) => (
                      <SelectItem key={rsc.id} value={rsc.id}>{rsc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="enterRSC">
                <Input
                  placeholder="Enter RSC Address"
                  value={rscAddress}
                  onChange={(e) => setRscAddress(e.target.value)}
                  className={`w-full ${rscAddress && (rscAddress.startsWith('0x') && rscAddress.length === 42 ? 'border-green-500' : 'border-red-500')}`}
                />
              </TabsContent>
              <TabsContent value="trackTx">
                <Input
                  placeholder="Enter Transaction Hash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className={`w-full ${transactionHash && (transactionHash.startsWith('0x') && transactionHash.length === 66 ? 'border-green-500' : 'border-red-500')}`}
                />
              </TabsContent>
            </Tabs>
            <Button 
              onClick={handleMonitor} 
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Monitoring...
                </>
              ) : (
                'Start Monitoring'
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {transactionStatus && (
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-400 text-white p-6 rounded-t-lg">
              <CardTitle className="text-2xl font-bold">
                Transaction Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <TransactionTimeline status={transactionStatus} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

