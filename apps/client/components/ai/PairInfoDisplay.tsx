import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, Copy } from 'lucide-react';

export const PairInfoDisplay: React.FC<{ pairInfo: any }> = ({ pairInfo }) => {
  if (!pairInfo) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30"
    >
      <div className="flex items-center space-x-2 mb-3">
        <Network className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-blue-300">Trading Pair Information</span>
      </div>
      <div className="grid grid-cols-1 gap-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Pair:</span>
          <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
            {pairInfo.token0}/{pairInfo.token1}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Address:</span>
          <div className="flex items-center space-x-1">
            <code className="bg-gray-800 px-2 py-1 rounded text-blue-300">
              {pairInfo.pairAddress.slice(0, 8)}...{pairInfo.pairAddress.slice(-6)}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-blue-600/20"
              onClick={() => navigator.clipboard.writeText(pairInfo.pairAddress)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Price:</span>
          <span className="text-green-400 font-mono">${pairInfo.currentPrice.toFixed(6)}</span>
        </div>
      </div>
    </motion.div>
  );
}; 