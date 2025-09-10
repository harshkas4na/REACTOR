'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  RefreshCw,
  Plus,
  Eye,
  Loader2,
  Target,
  Activity,
  CheckCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Shield,
  Info
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import our restructured modules
import { useDashboard } from '../../../../../hooks/useDashboard';
import { ContractBalanceManager } from '@/components/ContractBalanceManager';
import { OrderCard } from '@/components/OrderCard';
import { OrderStatus } from '../../../../../types/dashboard';

export default function RefactoredDashboard() {
  // ===== STATE FROM CUSTOM HOOK =====
  const {
    orders,
    activeOrders,
    completedOrders,
    connectedAccount,
    connectedChain,
    isLoading,
    isRefreshing,
    actionLoading,
    userContracts,
    contractsValid,
    contractBalances,
    orderStats,
    setContractBalances,
    refreshData,
    handleCancelOrder
  } = useDashboard();

  // ===== LOCAL UI STATE =====
  const [isContractsOpen, setIsContractsOpen] = useState(false);

  // ===== RENDER FUNCTIONS =====
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="p-4 text-center">
          <h3 className="text-2xl font-bold text-emerald-300">{orderStats.active}</h3>
          <p className="text-sm text-slate-400">Active Orders</p>
        </CardContent>
      </Card>
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="p-4 text-center">
          <h3 className="text-2xl font-bold text-blue-300">{orderStats.executed}</h3>
          <p className="text-sm text-slate-400">Executed</p>
        </CardContent>
      </Card>
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="p-4 text-center">
          <h3 className="text-2xl font-bold text-slate-300">{orderStats.cancelled}</h3>
          <p className="text-sm text-slate-400">Cancelled</p>
        </CardContent>
      </Card>
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="p-4 text-center">
          <h3 className="text-2xl font-bold text-slate-300">{orderStats.total}</h3>
          <p className="text-sm text-slate-400">Total Orders</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveOrders = () => {
    if (activeOrders.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center mb-6">
          <Activity className="w-6 h-6 text-emerald-400 mr-2" />
          <h2 className="text-2xl font-bold text-slate-100">
            Active Orders ({activeOrders.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              connectedChain={connectedChain}
              connectedAccount={connectedAccount}
              actionLoading={actionLoading}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  const renderCompletedOrders = () => {
    if (completedOrders.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center mb-6">
          <CheckCircle className="w-6 h-6 text-blue-400 mr-2" />
          <h2 className="text-2xl font-bold text-slate-100">
            Order History ({completedOrders.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {completedOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              connectedChain={connectedChain}
              connectedAccount={connectedAccount}
              actionLoading={actionLoading}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      </motion.div>
    );
  };

  const renderCollapsibleContractManager = () => {
    if (!userContracts || !contractsValid || !connectedChain) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
          <button
            onClick={() => setIsContractsOpen(!isContractsOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center">
              <Settings className="w-6 h-6 mr-4 text-slate-400" />
              <div>
                <h2 className="text-xl font-bold text-slate-100">Contracts Management</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {isContractsOpen ? 'Click to collapse' : 'Click to manage contract funds'}
                </p>
              </div>
            </div>
            {isContractsOpen 
              ? <ChevronUp className="w-5 h-5 text-slate-300" /> 
              : <ChevronDown className="w-5 h-5 text-slate-300" />}
          </button>

          <AnimatePresence initial={false}>
            {isContractsOpen && (
              <motion.section
                key="content"
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={{
                  open: { opacity: 1, height: "auto" },
                  collapsed: { opacity: 0, height: 0 }
                }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className="p-6 border-t border-slate-700">
                  <ContractBalanceManager 
                    userContracts={userContracts}
                    connectedChain={connectedChain}
                    onBalanceUpdate={setContractBalances}
                    connectedAccount={connectedAccount}
                  />
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  const renderEmptyState = () => {
    if (userContracts || orders.length > 0 || isLoading) return null;

    return (
      <Card className="border-slate-700 bg-slate-900/50">
        <CardContent className="py-16">
          <div className="text-center">
            <Target className="w-20 h-20 text-slate-400 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-slate-200 mb-4">No stop orders found</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              You haven't created any stop orders yet. Start protecting your investments with automated stop-loss orders.
            </p>
            <Link href="/automations/stop-order">
              <Button className="bg-primary/50 hover:bg-primary/60 text-slate-100 text-lg px-8 py-3">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Stop Order
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConvexSystemInfo = () => {
    if (userContracts || connectedAccount === '' || isLoading) return null;

    return (
      <Alert className="bg-blue-900/20 border-blue-600/30 text-blue-200 mt-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Convex Database System Ready</p>
            <p className="text-sm">
              Your first stop order will deploy personal smart contracts and register them in our fast Convex database. 
              Additional orders will automatically discover and use the same contracts at much lower cost.
            </p>
            <p className="text-xs text-blue-300 mt-2">
              Storage: Convex Database (Instant Access • No Gas Fees for Lookups)
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // ===== MAIN RENDER =====
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading your stop orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2">
                Stop Orders Dashboard
              </h1>
              <p className="text-lg text-slate-400">
                Monitor and manage your automated stop loss orders
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={refreshData}
                disabled={isRefreshing}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800/50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/automations/stop-order">
                <Button className="bg-primary/50 hover:bg-primary/60 text-slate-100">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Order
                </Button>
              </Link>
            </div>
          </div>

          {/* Connected Account Info */}
          {connectedAccount && (
            <Alert className="bg-slate-800/50 border-slate-600/50 mb-6">
              <Eye className="h-4 w-4 text-slate-400" />
              <AlertDescription className="text-slate-300">
                <div className="flex items-center justify-between">
                  <div>
                    Wallet: <span className="font-mono text-slate-200">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>
                    {connectedChain && (
                      <span className="ml-4">
                        Data from: <span className="text-slate-200">{connectedChain.name} + {connectedChain.rscNetwork.name}</span>
                      </span>
                    )}
                  </div>
                  {userContracts && contractsValid && (
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm">Convex Database System Active</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          {renderStatsCards()}
        </motion.div>

        {/* Active Orders Section */}
        {renderActiveOrders()}

        {/* Completed Orders Section */}
        {renderCompletedOrders()}

        {/* Collapsible Contract Balance Management */}
        {renderCollapsibleContractManager()}

        {/* Empty State */}
        {renderEmptyState()}

        {/* Convex Database System Info */}
        {renderConvexSystemInfo()}
      </div>
    </div>
  );
}