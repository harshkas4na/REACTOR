import React, { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  Settings, 
  RefreshCw, 
  Wallet, 
  AlertTriangle, 
  Zap, 
  Loader2, 
  Download,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { UserContractAddresses, ChainConfig, ContractBalances } from '../types/dashboard';
import { CALLBACK_CONTRACT_ABI, REACTIVE_STOP_ORDER_ABI } from '../config/dashboard';
import { getExplorerUrl, switchNetwork } from '../utils/dashboardUtils';

interface ContractBalanceManagerProps {
  userContracts: UserContractAddresses;
  connectedChain: ChainConfig;
  onBalanceUpdate: (balances: ContractBalances) => void;
  connectedAccount: string;
}

export const ContractBalanceManager: React.FC<ContractBalanceManagerProps> = ({ 
  userContracts, 
  connectedChain, 
  onBalanceUpdate,
  connectedAccount 
}) => {
  const [balances, setBalances] = useState<ContractBalances>({
    callbackBalance: '0',
    rscBalance: '0',
    isLoading: true,
    lastUpdated: 0
  });
  
  const [isFunding, setIsFunding] = useState<{ callback: boolean; rsc: boolean }>({
    callback: false,
    rsc: false
  });
  
  const [isWithdrawing, setIsWithdrawing] = useState<{ callback: boolean; rsc: boolean }>({
    callback: false,
    rsc: false
  });

  // Define minimum safe balances
  const MIN_CALLBACK_BALANCE = 0.001; // 0.001 ETH
  const MIN_RSC_BALANCE = 0.001; // 0.001 REACT

  // Funding input states
  const [callbackFundingAmount, setCallbackFundingAmount] = useState('0.01');
  const [rscFundingAmount, setRscFundingAmount] = useState('0.1');
  const [withdrawalAmounts, setWithdrawalAmounts] = useState({
    callback: '',
    rsc: ''
  });

  const [showFundingOptions, setShowFundingOptions] = useState(false);
  const [showWithdrawalOptions, setShowWithdrawalOptions] = useState(false);

  // ===== FETCH BALANCES =====
  const fetchBalances = useCallback(async () => {
    try {
      setBalances(prev => ({ ...prev, isLoading: true }));

      // Fetch callback contract balance (Sepolia)
      const sepoliaProvider = new ethers.JsonRpcProvider(connectedChain.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
      const callbackBalance = await sepoliaProvider.getBalance(userContracts.callbackContract);
      const callbackBalanceFormatted = ethers.formatEther(callbackBalance);

      // Fetch RSC contract balance (Lasna)
      const rscProvider = new ethers.JsonRpcProvider(connectedChain.rscNetwork.rpcUrl);
      const rscBalance = await rscProvider.getBalance(userContracts.reactiveContract);
      const rscBalanceFormatted = ethers.formatEther(rscBalance);

      const newBalances = {
        callbackBalance: callbackBalanceFormatted,
        rscBalance: rscBalanceFormatted,
        isLoading: false,
        lastUpdated: Date.now()
      };

      setBalances(newBalances);
      onBalanceUpdate(newBalances);
    } catch (error) {
      console.error('Error fetching contract balances:', error);
      setBalances(prev => ({ ...prev, isLoading: false }));
    }
  }, [userContracts, connectedChain, onBalanceUpdate]);

  useEffect(() => {
    fetchBalances();
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // ===== FUNDING HANDLERS =====
  const handleFundCallback = async () => {
    try {
      if (!callbackFundingAmount || parseFloat(callbackFundingAmount) <= 0) {
        toast.error('Please enter a valid funding amount');
        return;
      }

      setIsFunding(prev => ({ ...prev, callback: true }));
      
      // Switch to Sepolia if not already
      await switchNetwork(connectedChain.id);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: userContracts.callbackContract,
        value: ethers.parseEther(callbackFundingAmount),
      });
      
      await tx.wait();
      toast.success(`Callback contract funded with ${callbackFundingAmount} ETH`);
      await fetchBalances();
    } catch (error: any) {
      console.error('Error funding callback contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to fund callback contract');
      }
    } finally {
      setIsFunding(prev => ({ ...prev, callback: false }));
    }
  };

  const handleFundRSC = async () => {
    try {
      if (!rscFundingAmount || parseFloat(rscFundingAmount) <= 0) {
        toast.error('Please enter a valid funding amount');
        return;
      }

      setIsFunding(prev => ({ ...prev, rsc: true }));
      
      // Switch to RSC network
      await switchNetwork(connectedChain.rscNetwork.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: userContracts.reactiveContract,
        value: ethers.parseEther(rscFundingAmount),
      });
      
      await tx.wait();
      toast.success(`RSC contract funded with ${rscFundingAmount} REACT`);
      await fetchBalances();
    } catch (error: any) {
      console.error('Error funding RSC contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error('Failed to fund RSC contract');
      }
    } finally {
      setIsFunding(prev => ({ ...prev, rsc: false }));
    }
  };

  // ===== WITHDRAWAL HANDLERS =====
  const handleWithdrawCallback = async (withdrawAll: boolean = false) => {
    try {
      if (!withdrawAll && (!withdrawalAmounts.callback || parseFloat(withdrawalAmounts.callback) <= 0)) {
        toast.error('Please enter a valid withdrawal amount');
        return;
      }

      const availableBalance = parseFloat(balances.callbackBalance);
      const withdrawAmount = withdrawAll ? availableBalance : parseFloat(withdrawalAmounts.callback);

      if (withdrawAmount > availableBalance) {
        toast.error('Withdrawal amount exceeds available balance');
        return;
      }

      if (!confirm(`Are you sure you want to withdraw ${withdrawAll ? 'all' : withdrawAmount} ETH from the callback contract?`)) {
        return;
      }

      setIsWithdrawing(prev => ({ ...prev, callback: true }));
      
      // Switch to Sepolia
      await switchNetwork(connectedChain.id);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const callbackContract = new ethers.Contract(
        userContracts.callbackContract,
        CALLBACK_CONTRACT_ABI,
        signer
      );

      let tx;
      if (withdrawAll) {
        tx = await callbackContract.withdrawAllETH(connectedAccount);
      } else {
        tx = await callbackContract.withdrawETH(
          connectedAccount,
          ethers.parseEther(withdrawalAmounts.callback)
        );
      }
      
      await tx.wait();
      toast.success(`Successfully withdrew ${withdrawAll ? 'all' : withdrawAmount} ETH from callback contract`);
      setWithdrawalAmounts(prev => ({ ...prev, callback: '' }));
      await fetchBalances();
    } catch (error: any) {
      console.error('Error withdrawing from callback contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('Only deployer')) {
        toast.error('Only the contract deployer can withdraw funds');
      } else {
        toast.error('Failed to withdraw from callback contract');
      }
    } finally {
      setIsWithdrawing(prev => ({ ...prev, callback: false }));
    }
  };

  const handleWithdrawRSC = async (withdrawAll: boolean = false) => {
    try {
      if (!withdrawAll && (!withdrawalAmounts.rsc || parseFloat(withdrawalAmounts.rsc) <= 0)) {
        toast.error('Please enter a valid withdrawal amount');
        return;
      }

      const availableBalance = parseFloat(balances.rscBalance);
      const withdrawAmount = withdrawAll ? availableBalance : parseFloat(withdrawalAmounts.rsc);

      if (withdrawAmount > availableBalance) {
        toast.error('Withdrawal amount exceeds available balance');
        return;
      }

      if (!confirm(`Are you sure you want to withdraw ${withdrawAll ? 'all' : withdrawAmount} REACT from the RSC contract?`)) {
        return;
      }

      setIsWithdrawing(prev => ({ ...prev, rsc: true }));
      
      // Switch to RSC network
      await switchNetwork(connectedChain.rscNetwork.chainId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const reactiveContract = new ethers.Contract(
        userContracts.reactiveContract,
        REACTIVE_STOP_ORDER_ABI,
        signer
      );

      let tx;
      if (withdrawAll) {
        tx = await reactiveContract.withdrawAllETH(connectedAccount);
      } else {
        tx = await reactiveContract.withdrawETH(
          connectedAccount,
          ethers.parseEther(withdrawalAmounts.rsc)
        );
      }
      
      await tx.wait();
      toast.success(`Successfully withdrew ${withdrawAll ? 'all' : withdrawAmount} REACT from RSC contract`);
      setWithdrawalAmounts(prev => ({ ...prev, rsc: '' }));
      await fetchBalances();
    } catch (error: any) {
      console.error('Error withdrawing from RSC contract:', error);
      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.message.includes('Only deployer')) {
        toast.error('Only the contract deployer can withdraw funds');
      } else {
        toast.error('Failed to withdraw from RSC contract');
      }
    } finally {
      setIsWithdrawing(prev => ({ ...prev, rsc: false }));
    }
  };

  // ===== COMPUTED VALUES =====
  const callbackBalanceNum = parseFloat(balances.callbackBalance);
  const rscBalanceNum = parseFloat(balances.rscBalance);
  const callbackLow = callbackBalanceNum < MIN_CALLBACK_BALANCE;
  const rscLow = rscBalanceNum < MIN_RSC_BALANCE;

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = (now - timestamp) / 1000;
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="border-b border-slate-700 pb-4">
        <CardTitle className="text-slate-200 flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-slate-400" />
            Contract Details
          </div>
          <Button
            onClick={fetchBalances}
            disabled={balances.isLoading}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${balances.isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Monitor, fund, and withdraw from your smart contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Callback Contract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-300 font-medium">Callback Contract (Sepolia)</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.callbackContract.slice(0, 10)}...{userContracts.callbackContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.callbackContract, connectedChain.id, 'address', connectedAccount)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Button>
            </Link>
          </div>
          
          <div className={`p-3 rounded-lg border ${callbackLow ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-600 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">
                    {balances.isLoading ? 'Loading...' : `${parseFloat(balances.callbackBalance).toFixed(6)} ETH`}
                  </span>
                  {callbackLow && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                {callbackLow && (
                  <p className="text-xs text-amber-300 mt-1">
                    Balance below safe limit ({MIN_CALLBACK_BALANCE} ETH)
                  </p>
                )}
              </div>
              {callbackLow && (
                <Button
                  onClick={handleFundCallback}
                  disabled={isFunding.callback}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isFunding.callback ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      Fund
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* RSC Contract */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-300 font-medium">Reactive Contract (Lasna)</h4>
              <p className="text-xs text-slate-500 font-mono">
                {userContracts.reactiveContract.slice(0, 10)}...{userContracts.reactiveContract.slice(-8)}
              </p>
            </div>
            <Link 
              href={getExplorerUrl(userContracts.reactiveContract, connectedChain.rscNetwork.chainId, 'address', connectedAccount)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </Button>
            </Link>
          </div>
          
          <div className={`p-3 rounded-lg border ${rscLow ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-600 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 font-medium">
                    {balances.isLoading ? 'Loading...' : `${parseFloat(balances.rscBalance).toFixed(6)} REACT`}
                  </span>
                  {rscLow && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>
                {rscLow && (
                  <p className="text-xs text-amber-300 mt-1">
                    Balance below safe limit ({MIN_RSC_BALANCE} REACT)
                  </p>
                )}
              </div>
              {rscLow && (
                <Button
                  onClick={handleFundRSC}
                  disabled={isFunding.rsc}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isFunding.rsc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      Fund
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Management Options */}
        <div className="pt-3 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-slate-400">Last updated:</span>
            <span className="text-slate-300">
              {balances.lastUpdated ? formatTimeAgo(balances.lastUpdated) : 'Never'}
            </span>
          </div>
          
          <div className="space-y-2">
            {/* Funding Options */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFundingOptions(!showFundingOptions)}
              className="w-full justify-between text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            >
              <div className="flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Fund Contracts
              </div>
              {showFundingOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showFundingOptions && (
              <div className="mt-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600/30 space-y-4">
                {/* Callback Funding */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Fund Callback Contract (ETH)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={callbackFundingAmount}
                      onChange={(e) => setCallbackFundingAmount(e.target.value)}
                      placeholder="0.01"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={handleFundCallback}
                      disabled={isFunding.callback}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isFunding.callback ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Fund'
                      )}
                    </Button>
                  </div>
                </div>

                {/* RSC Funding */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Fund RSC Contract (REACT)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rscFundingAmount}
                      onChange={(e) => setRscFundingAmount(e.target.value)}
                      placeholder="0.1"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={handleFundRSC}
                      disabled={isFunding.rsc}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isFunding.rsc ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Fund'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal Options */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWithdrawalOptions(!showWithdrawalOptions)}
              className="w-full justify-between text-slate-300 hover:text-slate-100 hover:bg-slate-800/50"
            >
              <div className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Withdraw from Contracts
              </div>
              {showWithdrawalOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {showWithdrawalOptions && (
              <div className="mt-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600/30 space-y-4">
                {/* Callback Withdrawal */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    Withdraw from Callback Contract (Available: {parseFloat(balances.callbackBalance).toFixed(6)} ETH)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      max={balances.callbackBalance}
                      value={withdrawalAmounts.callback}
                      onChange={(e) => setWithdrawalAmounts(prev => ({ ...prev, callback: e.target.value }))}
                      placeholder="Amount to withdraw"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={() => handleWithdrawCallback(false)}
                      disabled={isWithdrawing.callback}
                      size="sm"
                      variant="outline"
                      className="border-slate-600"
                    >
                      {isWithdrawing.callback ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleWithdrawCallback(true)}
                      disabled={isWithdrawing.callback}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      All
                    </Button>
                  </div>
                </div>

                {/* RSC Withdrawal */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    Withdraw from RSC Contract (Available: {parseFloat(balances.rscBalance).toFixed(6)} REACT)
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={balances.rscBalance}
                      value={withdrawalAmounts.rsc}
                      onChange={(e) => setWithdrawalAmounts(prev => ({ ...prev, rsc: e.target.value }))}
                      placeholder="Amount to withdraw"
                      className="flex-1 bg-slate-800 border-slate-600 text-slate-200"
                    />
                    <Button
                      onClick={() => handleWithdrawRSC(false)}
                      disabled={isWithdrawing.rsc}
                      size="sm"
                      variant="outline"
                      className="border-slate-600"
                    >
                      {isWithdrawing.rsc ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </Button>
                    <Button
                      onClick={() => handleWithdrawRSC(true)}
                      disabled={isWithdrawing.rsc}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-300 hover:bg-red-900/20"
                    >
                      All
                    </Button>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
                  ⚠️ Only the contract deployer can withdraw funds. Withdrawing all funds may prevent future order execution.
                </div>
              </div>
            )}
          </div>
          
          {(callbackLow || rscLow) && (
            <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300">
              Low contract balances may prevent order execution. Fund contracts to ensure reliability.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};