import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, AlertCircle, Info, Layers, Zap } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { 
  StopOrderFormData, 
  ChainConfig, 
  UserContractAddresses, 
  SimpleContractStatus,
  DeploymentStep 
} from '../types';

// ===== ENHANCED STATUS INDICATOR =====
interface EnhancedStatusIndicatorProps {
  formData: StopOrderFormData;
  connectedChain: ChainConfig | null;
  hasTokenBalance: boolean;
  isLoadingPair: boolean;
  existingContracts: UserContractAddresses | null;
  contractsValid: boolean;
  contractStatus: SimpleContractStatus | null;
  onFundAndSettle: () => void;
  isFundingDebt: boolean;
}

export const EnhancedStatusIndicator: React.FC<EnhancedStatusIndicatorProps> = ({ 
  formData, 
  connectedChain, 
  hasTokenBalance,
  isLoadingPair,
  existingContracts,
  contractsValid,
  contractStatus,
  onFundAndSettle,
  isFundingDebt
}) => {
  const getStatus = () => {
    if (!connectedChain) {
      return { type: 'error', message: 'Please switch to a supported network (Sepolia)' };
    }
    if (existingContracts && contractsValid && contractStatus && !contractStatus.isActive) {
      return { 
        type: 'inactive_debt', 
        message: 'Your contracts are inactive due to outstanding debt.',
        subMessage: 'Fund your contracts and settle debt to re-enable them.'
      };
    }
    if (existingContracts && contractsValid && contractStatus?.needsFunding) {
      return { 
        type: 'warning', 
        message: 'Contract balances are running low.',
        subMessage: 'Consider funding your contracts in the Dashboard to ensure reliability.'
      };
    }
    if (isLoadingPair) {
      return { type: 'loading', message: 'Finding trading pair...' };
    }
    if (!formData.selectedPair && formData.sellToken && formData.buyToken) {
      return { type: 'error', message: 'Trading pair not found on DEX' };
    }
    if (formData.sellToken && formData.buyToken) {
      if (formData.amount && parseFloat(formData.amount) > 0 && !hasTokenBalance) {
        return { type: 'error', message: 'Insufficient token balance' };
      }
      if (!formData.dropPercentage || parseFloat(formData.dropPercentage) <= 0) {
        return { type: 'warning', message: 'Set stop loss percentage' };
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        return { type: 'warning', message: 'Enter amount to sell' };
      }
      if (existingContracts && contractsValid && contractStatus?.isActive) {
        return { 
          type: 'success', 
          message: 'Ready to add to existing contracts!',
          subMessage: 'Lower cost - using existing funded smart contracts'
        };
      } else {
        return { 
          type: 'success', 
          message: 'Ready to create stop order!',
          subMessage: 'First order - will deploy new smart contracts'
        };
      }
    }
    return null;
  };

  const status = getStatus();
  if (!status) return null;

  const getStatusStyles = () => {
    switch (status.type) {
      case 'error':
      case 'inactive_debt':
        return 'bg-amber-900/20 border-amber-500/30 text-amber-200';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-200';
      case 'loading':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-200';
      case 'success':
        return 'bg-green-900/20 border-green-500/30 text-green-200';
      default:
        return 'bg-zinc-800/50 border-zinc-700 text-zinc-300';
    }
  };

  const getStatusIcon = () => {
    switch (status.type) {
      case 'error':
      case 'inactive_debt':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return existingContracts && contractsValid ? <Layers className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <Alert className={`${getStatusStyles()} mb-8`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1">
            <AlertDescription className="text-base">
                {status.message}
                {status.subMessage && <div className="text-sm mt-1 opacity-80">{status.subMessage}</div>}
            </AlertDescription>
            {status.type === 'inactive_debt' && (
                <Button 
                    onClick={onFundAndSettle} 
                    disabled={isFundingDebt}
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3"
                >
                    {isFundingDebt ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                        <><Zap className="w-4 h-4 mr-2" />Fund & Settle Debt</>
                    )}
                </Button>
            )}
        </div>
      </div>
    </Alert>
  );
};

// ===== DEPLOYMENT STATUS COMPONENT =====
interface DeploymentStatusProps {
  deploymentStep: DeploymentStep;
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ deploymentStep }) => {
  const getFundingStepDescription = (step: DeploymentStep) => {
    switch (step) {
      case 'checking-contracts':
        return { title: 'Checking Existing Contracts', message: 'Looking for your existing stop order contracts...', color: 'blue' };
      case 'checking-approval':
        return { title: 'Checking Token Approval', message: 'Verifying if tokens are approved for trading...', color: 'blue' };
      case 'approving':
        return { title: 'Approving Tokens', message: 'Please confirm token approval in your wallet...', color: 'yellow' };
      case 'switching-rsc':
        return { title: 'Switching to Reactive Network', message: 'Please confirm network switch in your wallet...', color: 'purple' };
      case 'funding-rsc':
        return { title: 'Funding RSC System', message: 'Sending 0.05 REACT to the system contract...', color: 'blue' };
      case 'deploying-callback':
        return { title: 'Deploying Callback Contract', message: 'Creating your personal callback contract on Sepolia...', color: 'green' };
      case 'deploying-reactive':
        return { title: 'Deploying Reactive Contract', message: 'Creating your multi-order stop loss contract on Reactive Network...', color: 'green' };
      case 'creating-order':
        return { title: 'Creating Stop Order', message: 'Adding stop order to your contract...', color: 'green' };
      case 'complete':
        return { title: 'Stop Order Active!', message: 'Your stop order is now monitoring prices 24/7', color: 'green' };
      default:
        return null;
    }
  };

  if (deploymentStep === 'idle') return null;

  const stepInfo = getFundingStepDescription(deploymentStep);
  if (!stepInfo) return null;

  const colorClasses = {
    blue: 'bg-blue-900/20 border-blue-500/50 text-blue-300',
    purple: 'bg-purple-900/20 border-purple-500/50 text-purple-300',
    green: 'bg-green-900/20 border-green-500/50 text-green-300',
    yellow: 'bg-yellow-900/20 border-yellow-500/50 text-yellow-300'
  };

  return (
    <Alert className={colorClasses[stepInfo.color as keyof typeof colorClasses]}>
      {deploymentStep === 'complete' ? (
        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
      )}
      <AlertDescription>
        <div className="space-y-1">
          <span className="font-medium text-zinc-200 text-sm sm:text-base">{stepInfo.title}</span>
          <div className="text-xs sm:text-sm opacity-80">{stepInfo.message}</div>
        </div>
      </AlertDescription>
    </Alert>
  );
};