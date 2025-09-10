import React from 'react';
import Link from 'next/link';
import { Loader2, X, Activity, Layers, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { StopOrder, OrderStatus, ChainConfig } from '../types/dashboard';
import { STATUS_CONFIG } from '../config/dashboard';
import { formatTimeAgo, getExplorerUrl } from '../utils/dashboardUtils';

interface OrderCardProps {
  order: StopOrder;
  connectedChain: ChainConfig | null;
  connectedAccount: string;
  actionLoading: { [key: number]: string };
  onCancelOrder: (orderId: number) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  connectedChain,
  connectedAccount,
  actionLoading,
  onCancelOrder
}) => {
  const statusConfig = STATUS_CONFIG[order.status];
  const StatusIcon = statusConfig.icon;
  const loadingAction = actionLoading[order.id];
  const isActive = order.status === OrderStatus.Active;

  return (
    <Card className={`border-slate-700 bg-slate-900/50 ${statusConfig.borderColor}`}>
      <CardHeader className="border-b border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200">
              #{order.id}
            </div>
            <div>
              <CardTitle className="text-lg text-slate-200 flex items-center space-x-2">
                <span>{order.tokenSell?.symbol} → {order.tokenBuy?.symbol}</span>
                {isActive && <Activity className="w-4 h-4 text-emerald-400" />}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Created {formatTimeAgo(order.createdAt)}
              </CardDescription>
            </div>
          </div>
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Current Price</p>
            <p className="text-base font-semibold text-slate-200">
              {Number(order.currentPrice) || '0.000000'}
            </p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Trigger Price</p>
            <p className="text-base font-semibold text-red-300">
              {order.triggerPrice || '0.000000'}
            </p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg">
            <p className="text-sm text-slate-400 mb-1">Drop %</p>
            <p className="text-base font-semibold text-orange-300">
              -{order.dropPercentage || 0}%
            </p>
          </div>
        </div>

        {/* Token Information */}
        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-2">Selling</p>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold">
                  {order.tokenSell?.symbol.charAt(0)}
                </div>
                <span className="text-sm font-medium text-slate-200">
                  {order.tokenSell?.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{order.tokenSell?.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Buying</p>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
                  {order.tokenBuy?.symbol.charAt(0)}
                </div>
                <span className="text-sm font-medium text-slate-200">
                  {order.tokenBuy?.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{order.tokenBuy?.name}</p>
            </div>
          </div>
        </div>

        {/* Contract Information */}
        <div className="bg-slate-800/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-400">Contract:</span>
            </div>
            <div className="flex items-center space-x-2">
              <code className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                {order.contractAddress?.slice(0, 6)}...{order.contractAddress?.slice(-4)}
              </code>
              {connectedChain && (
                <Link 
                  href={getExplorerUrl(
                    order.contractAddress || '', 
                    connectedChain?.rscNetwork.chainId || '5318007', 
                    'address', 
                    connectedAccount
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Technical Details for Advanced Users */}
        <div className="bg-slate-800/20 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Coefficient:</span>
              <span className="text-slate-300 ml-2">{order.coefficient}</span>
            </div>
            <div>
              <span className="text-slate-500">Threshold:</span>
              <span className="text-slate-300 ml-2">{order.threshold}</span>
            </div>
            <div>
              <span className="text-slate-500">Direction:</span>
              <span className="text-slate-300 ml-2">{order.token0 ? 'Token0 → Token1' : 'Token1 → Token0'}</span>
            </div>
            <div>
              <span className="text-slate-500">Triggered:</span>
              <span className="text-slate-300 ml-2">{order.triggered ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={() => onCancelOrder(order.id)}
              disabled={!!loadingAction}
              variant="outline"
              className="bg-red-900/20 border-red-700 text-red-300 hover:bg-red-800/30 flex-1"
            >
              {loadingAction === 'cancelling' ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelling...
                </div>
              ) : (
                <div className="flex items-center">
                  <X className="w-4 h-4 mr-2" />
                  Cancel Order
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Show execution details for completed orders */}
        {order.status === OrderStatus.Executed && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              <strong>Order Executed:</strong> This stop order was triggered and your tokens were automatically sold.
            </p>
            <p className="text-xs text-blue-300/80 mt-1">
              Updated: {formatTimeAgo(order.updatedAt)}
            </p>
          </div>
        )}

        {/* Show cancellation details */}
        {order.status === OrderStatus.Cancelled && (
          <div className="bg-slate-900/20 border border-slate-500/30 rounded-lg p-3">
            <p className="text-sm text-slate-300">
              <strong>Order Cancelled:</strong> This stop order was manually cancelled.
            </p>
            <p className="text-xs text-slate-300/80 mt-1">
              Updated: {formatTimeAgo(order.updatedAt)}
            </p>
          </div>
        )}

        {/* Show failure details */}
        {order.status === OrderStatus.Failed && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-300">
              <strong>Order Failed:</strong> This stop order encountered an error during execution.
            </p>
            <p className="text-xs text-red-300/80 mt-1">
              This could be due to insufficient liquidity, slippage, or contract issues.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};