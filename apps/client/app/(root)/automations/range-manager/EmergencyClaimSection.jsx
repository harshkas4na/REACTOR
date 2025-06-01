'use client'
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionTrigger, AccordionItem } from '@/components/ui/accordion';
import { Info, AlertCircle, Clock, Zap, Loader2, CheckCircle, TimerReset } from 'lucide-react';
import { toast } from 'react-hot-toast';

// AdjustmentState enum matching the contract
const AdjustmentState = {
  NONE: 0,
  LIQUIDITY_REMOVED: 1,
  TOKENS_BALANCED: 2,
  COMPLETED: 3
};

// Component for emergency token claims
export default function EmergencyClaimSection({ 
  formData, 
  selectedChain, 
  positionInfo, 
  connectedAccount
}) {
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [isClaimingTokens, setIsClaimingTokens] = useState(false);
  
  // Check if a position has stuck adjustments that can be claimed
  const checkClaimStatus = async () => {
    if (!formData.tokenId || !connectedAccount) return;
    
    try {
      setIsCheckingClaim(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (formData.chainId && currentChainId !== formData.chainId) {
        throw new Error('Please switch to the selected network');
      }
      
      // Get the rangeAdjusterAddress from the selected chain
      const rangeAdjusterAddress = ethers.getAddress(selectedChain.rangeAdjusterAddress);
      
      // Interface to check adjustment status
      const rangeAdjusterInterface = new ethers.Interface([
        'function getAdjustmentStatus(uint256) view returns (uint8 state, address token0, address token1, uint256 amount0, uint256 amount1, uint256 timestamp)',
        'function positionOwners(uint256) view returns (address)'
      ]);
      
      const rangeAdjusterContract = new ethers.Contract(
        rangeAdjusterAddress,
        rangeAdjusterInterface,
        provider
      );
      
      // Check if the connected account is the position owner
      const positionOwner = await rangeAdjusterContract.positionOwners(formData.tokenId);
      const isOwner = connectedAccount.toLowerCase() === positionOwner.toLowerCase();
      
      // Get adjustment status
      const status = await rangeAdjusterContract.getAdjustmentStatus(formData.tokenId);
      
      // Check if there are tokens to claim
      const hasTokens = status.amount0 > 0 || status.amount1 > 0;
      
      // Check if timeout has been reached (24 hours)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeoutReached = status.timestamp > 0 && currentTime > status.timestamp.toString() + 24 * 3600;
      
      // Get token symbols if possible
      let token0Symbol = 'Unknown';
      let token1Symbol = 'Unknown';
      
      if (status.token0 !== ethers.ZeroAddress && status.token1 !== ethers.ZeroAddress) {
        try {
          const erc20Interface = new ethers.Interface(['function symbol() view returns (string)']);
          
          const token0Contract = new ethers.Contract(status.token0, erc20Interface, provider);
          token0Symbol = await token0Contract.symbol();
          
          const token1Contract = new ethers.Contract(status.token1, erc20Interface, provider);
          token1Symbol = await token1Contract.symbol();
        } catch (error) {
          console.warn("Could not fetch token symbols:", error);
        }
      }
      
      // Set claim status
      setClaimStatus({
        state: Number(status.state),
        token0: status.token0,
        token1: status.token1,
        amount0: status.amount0.toString(),
        amount1: status.amount1.toString(),
        timestamp: Number(status.timestamp),
        token0Symbol,
        token1Symbol,
        isOwner,
        hasTokens,
        timeoutReached
      });
      
    } catch (error) {
      console.error('Error checking claim status:', error);
      toast.error('Failed to check claim status: ' + error.message);
      setClaimStatus(null);
    } finally {
      setIsCheckingClaim(false);
    }
  };
  
  // Execute emergency withdrawal
  const claimTokens = async () => {
    try {
      setIsClaimingTokens(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get the rangeAdjusterAddress from the selected chain
      const rangeAdjusterAddress = ethers.getAddress(selectedChain.rangeAdjusterAddress);
      
      // Interface for emergency withdrawal
      const rangeAdjusterInterface = new ethers.Interface([
        'function emergencyWithdraw(uint256) external'
      ]);
      
      const rangeAdjusterContract = new ethers.Contract(
        rangeAdjusterAddress,
        rangeAdjusterInterface,
        signer
      );
      
      // Execute emergency withdrawal
      const tx = await rangeAdjusterContract.emergencyWithdraw(formData.tokenId);
      await tx.wait();
      
      toast.success('Tokens claimed successfully!');
      
      // Refresh claim status
      await checkClaimStatus();
      
    } catch (error) {
      console.error('Error claiming tokens:', error);
      toast.error('Failed to claim tokens: ' + error.message);
    } finally {
      setIsClaimingTokens(false);
    }
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };
  
  // Calculate when tokens become claimable
  const getClaimableTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const claimableTime = timestamp + 24 * 3600; // 24 hours in seconds
    const date = new Date(claimableTime * 1000);
    return date.toLocaleString();
  };
  
  // Format token amount with proper decimals
  const formatTokenAmount = (amount, decimals = 18) => {
    if (!amount) return '0';
    return ethers.formatUnits(amount, decimals);
  };
  
  // Check if this position has a pending adjustment that requires attention
  const hasPendingAdjustment = claimStatus && 
    claimStatus.state !== AdjustmentState.NONE && 
    claimStatus.state !== AdjustmentState.COMPLETED;
  
  // Check if emergency claim is available
  const canClaimEmergency = claimStatus && 
    claimStatus.isOwner && 
    claimStatus.hasTokens && 
    claimStatus.timeoutReached;
  
  return (
    <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mb-12">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-zinc-100">Emergency Token Claims</CardTitle>
        <CardDescription className="text-zinc-300">
          If an adjustment process gets stuck, recover your tokens after 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <p className="text-zinc-300">
              Check if you have unclaimed tokens from a position adjustment that didn't complete properly.
              After a 24-hour timeout period, you can recover tokens back to your wallet.
            </p>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="bg-blue-900/20 border-zinc-700 text-zinc-200 hover:bg-blue-800/30"
                onClick={checkClaimStatus}
                disabled={!formData.tokenId || !connectedAccount || isCheckingClaim}
              >
                {isCheckingClaim ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TimerReset className="h-4 w-4 mr-2" />
                )}
                {isCheckingClaim ? 'Checking...' : 'Check Claim Status'}
              </Button>
            </div>
            
            {/* Show claim status if available */}
            {claimStatus && (
              <div className="space-y-4">
                <Alert className={
                  hasPendingAdjustment
                    ? "bg-yellow-900/20 border-yellow-500/50"
                    : canClaimEmergency
                      ? "bg-green-900/20 border-green-500/50"
                      : "bg-blue-900/20 border-blue-500/50"
                }>
                  {hasPendingAdjustment && <Clock className="h-4 w-4 text-yellow-400" />}
                  {canClaimEmergency && <CheckCircle className="h-4 w-4 text-green-400" />}
                  {!hasPendingAdjustment && !canClaimEmergency && <Info className="h-4 w-4 text-blue-400" />}
                  
                  <AlertDescription className="text-zinc-200">
                    {claimStatus.state === AdjustmentState.NONE && (
                      <span>No active adjustment process for this position</span>
                    )}
                    {claimStatus.state === AdjustmentState.LIQUIDITY_REMOVED && (
                      <span>Position has active adjustment in step 1 (Liquidity removed)</span>
                    )}
                    {claimStatus.state === AdjustmentState.TOKENS_BALANCED && (
                      <span>Position has active adjustment in step 2 (Tokens balanced)</span>
                    )}
                    {claimStatus.state === AdjustmentState.COMPLETED && (
                      <span>Adjustment completed successfully</span>
                    )}
                  </AlertDescription>
                </Alert>
                
                {claimStatus.hasTokens && (
                  <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <h3 className="font-medium text-zinc-200 mb-2">Available Tokens</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-zinc-400">Token 0</p>
                        <p className="text-zinc-200">{formatTokenAmount(claimStatus.amount0)} {claimStatus.token0Symbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Token 1</p>
                        <p className="text-zinc-200">{formatTokenAmount(claimStatus.amount1)} {claimStatus.token1Symbol}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {claimStatus.timestamp > 0 && (
                  <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <h3 className="font-medium text-zinc-200 mb-2">Timing Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-zinc-400">Started At</p>
                        <p className="text-zinc-200">{formatTimestamp(claimStatus.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Claimable After</p>
                        <p className="text-zinc-200">{getClaimableTime(claimStatus.timestamp)}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-400">Status</p>
                      <p className={
                        claimStatus.timeoutReached 
                          ? "text-green-400" 
                          : "text-yellow-400"
                      }>
                        {claimStatus.timeoutReached 
                          ? "Emergency withdrawal available" 
                          : "Waiting for 24-hour timeout"}
                      </p>
                    </div>
                  </div>
                )}
                
                {canClaimEmergency && (
                  <Button
                    type="button"
                    variant="default"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    onClick={claimTokens}
                    disabled={isClaimingTokens}
                  >
                    {isClaimingTokens ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Claiming Tokens...
                      </>
                    ) : (
                      'Claim Tokens'
                    )}
                  </Button>
                )}
                
                {!claimStatus.isOwner && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">
                      You are not the owner of this position. Only the owner can claim tokens.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
          
          {/* Educational Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="about-emergency" className="border-zinc-800">
              <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
                About Emergency Token Claims
              </AccordionTrigger>
              <AccordionContent className="text-zinc-300">
                <div className="space-y-4">
                  <p>
                    When a position adjustment is in progress, it goes through three steps: removing liquidity, 
                    balancing tokens, and creating a new position. If any step fails to complete, your tokens 
                    could be stuck in the contract.
                  </p>
                  
                  <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                    <h4 className="font-medium text-zinc-100 mb-2">Emergency Withdrawal Feature:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-zinc-300">
                      <li><span className="font-medium">24-Hour Safety Timeout:</span> After 24 hours, you can recover any tokens from an incomplete adjustment</li>
                      <li><span className="font-medium">Owner Protection:</span> Only the position owner can claim tokens</li>
                      <li><span className="font-medium">Gas-Efficient:</span> Direct transfer of both tokens back to your wallet</li>
                      <li><span className="font-medium">Contract Safety:</span> This is an intentional safety mechanism built into the protocol</li>
                    </ul>
                  </div>
                  
                  <p className="text-sm text-zinc-400">
                    Note: In most cases, adjustments complete automatically without requiring emergency claims. 
                    This feature is designed as a safety net for rare situations where network issues or other 
                    problems might interrupt the normal process.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}