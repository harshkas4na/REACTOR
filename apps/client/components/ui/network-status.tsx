// components/ui/network-status.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface NetworkStatusProps {
  chainId: string;
  expectedChainId: string;
  chainName: string;
  expectedChainName: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  chainId,
  expectedChainId,
  chainName,
  expectedChainName
}) => {
  const isCorrectNetwork = chainId === expectedChainId;
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        {isCorrectNetwork ? (
          <CheckCircle className="h-4 w-4 text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-400" />
        )}
        <span className="text-sm text-zinc-300">Network:</span>
      </div>
      <Badge 
        variant={isCorrectNetwork ? "default" : "secondary"}
        className={`${
          isCorrectNetwork 
            ? 'bg-green-900/20 border-green-500/50 text-green-400' 
            : 'bg-amber-900/20 border-amber-500/50 text-amber-400'
        }`}
      >
        {chainName}
      </Badge>
      {!isCorrectNetwork && (
        <span className="text-xs text-zinc-500">
          (Expected: {expectedChainName})
        </span>
      )}
    </div>
  );
};