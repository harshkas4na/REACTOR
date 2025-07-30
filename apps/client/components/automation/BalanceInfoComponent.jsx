// BalanceInfoComponent.jsx
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Function to get the correct RSC network details based on source chain ID
function getRSCNetworkForChain(sourceChainId) {
  // Production chains use Reactive Mainnet
  if (sourceChainId === '1' || sourceChainId === '43114') {
    return {
      chainId: '1597',
      name: 'Reactive Mainnet',
      rpcUrl: 'https://mainnet-rpc.rnk.dev/',
      currencySymbol: 'REACT'
    };
  } 
  // Testnets use Lasna
  else {
    return {
      chainId: '5318007',
      name: 'Lasna Testnet',
      rpcUrl: 'https://lasna-rpc.rnk.dev/',
      currencySymbol: 'Lasna'
    };
  }
}

export default function BalanceInfoComponent({
  formData,
  connectedAccount,
  pairInfo,
  setIsValid,
  selectedChain
}) {
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);


  // Determine RSC network details based on source chain
  const rscNetwork = getRSCNetworkForChain(formData.chainId);

  // Modify your existing useEffect at the top level
useEffect(() => {
  // If chain selection changes, set network switching state
  if (formData.chainId) {
    setIsNetworkSwitching(true);
    
    // Wait a reasonable time for the network switch to complete
    const timer = setTimeout(() => {
      refreshBalances().then(() => {
        setIsNetworkSwitching(false);
      }).catch(() => {
        setIsNetworkSwitching(false);
      });
    }, 2000); // 2 seconds delay to allow network switch
    
    return () => clearTimeout(timer);
  } else {
    refreshBalances();
  }
}, [formData.chainId, formData.pairAddress, formData.clientAddress, formData.amount, formData.threshold, formData.sellToken0, formData.destinationFunding, formData.rscFunding, connectedAccount, pairInfo]);

  // Check balances function
  const checkBalances = async () => {
    if (!window.ethereum) throw new Error('No wallet detected');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check balance on current chain
      const currentNetwork = await provider.getNetwork();
      const currentChainId = currentNetwork.chainId.toString();
      const nativeBalance = await provider.getBalance(userAddress);
      
      // If not on any network we care about
      if (currentChainId !== formData.chainId && currentChainId !== rscNetwork.chainId) {
        return {
          isSourceChain: false,
          isRscChain: false,
          wrongNetwork: true,
          currentChainId,
          sourceChainId: formData.chainId,
          rscChainId: rscNetwork.chainId
        };
      }
      
      // If we're on the source chain
      if (currentChainId === formData.chainId) {
        // Add 10% to account for gas
        const destinationFunding = ethers.parseEther(formData.destinationFunding || (selectedChain?.defaultFunding || '0.03'));
        const requiredBalance = destinationFunding + (destinationFunding * BigInt(10)) / BigInt(100);
        const hasEnoughForDestination = nativeBalance >= requiredBalance;
        
        // Check token balance if pair info is available
        let tokenBalance = null;
        let hasEnoughTokens = false;
        let decimals = 18;
        
        if (pairInfo) {
          const tokenToSell = formData.sellToken0 ? pairInfo.token0 : pairInfo.token1;
          const tokenSymbol = formData.sellToken0 ? pairInfo.token0Symbol : pairInfo.token1Symbol;
          
          try {
            const tokenContract = new ethers.Contract(
              tokenToSell,
              ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
              provider
            );
            
            decimals = await tokenContract.decimals();
            tokenBalance = await tokenContract.balanceOf(userAddress);
            const requiredTokenAmount = ethers.parseUnits(formData.amount || '0', decimals);
            
            hasEnoughTokens = tokenBalance >= requiredTokenAmount;
          } catch (error) {
            console.error("Error checking token balance:", error);
          }
        }
        
        return {
          isSourceChain: true,
          isRscChain: false,
          wrongNetwork: false,
          nativeBalance: ethers.formatEther(nativeBalance),
          requiredNativeBalance: ethers.formatEther(requiredBalance),
          nativeSymbol: selectedChain?.nativeCurrency || 'ETH',
          hasEnoughForDestination,
          tokenBalance: tokenBalance ? ethers.formatUnits(tokenBalance, decimals) : null,
          hasEnoughTokens,
          tokenSymbol: formData.sellToken0 ? pairInfo?.token0Symbol : pairInfo?.token1Symbol
        };
      }
      
      // If we're on the RSC network (either REACT or Lasna)
      if (currentChainId === rscNetwork.chainId) {
        // Add 10% to account for gas
        const rscFunding = ethers.parseEther(formData.rscFunding || "0.05");
        const requiredBalance = rscFunding + (rscFunding * BigInt(10)) / BigInt(100);
        const hasEnoughForRSC = nativeBalance >= requiredBalance;
        
        return {
          isSourceChain: false,
          isRscChain: true,
          wrongNetwork: false,
          nativeBalance: ethers.formatEther(nativeBalance),
          requiredNativeBalance: ethers.formatEther(requiredBalance),
          nativeSymbol: rscNetwork.currencySymbol,
          hasEnoughForRSC
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking balances:", error);
      throw error;
    }
  };

  // Function to refresh balance data
  const refreshBalances = async () => {
    if (!formData.chainId || !connectedAccount) {
      setIsValid(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const info = await checkBalances();
      setBalanceInfo(info);
      setLastRefreshed(new Date());
      
      // Check if all conditions are met
      if (info) {
        let hasRequiredBalances = false;
        
        if (info.wrongNetwork) {
          hasRequiredBalances = false;
        } else if (info.isSourceChain) {
          hasRequiredBalances = info.hasEnoughForDestination && (!info.tokenBalance || info.hasEnoughTokens);
        } else if (info.isRscChain) {
          hasRequiredBalances = info.hasEnoughForRSC;
        }
          
        const formIsValid = 
          !!formData.chainId && 
          !!formData.pairAddress && 
          !!formData.clientAddress && 
          !!formData.threshold && 
          !!formData.amount && 
          parseFloat(formData.amount) > 0 &&
          !!formData.destinationFunding &&
          parseFloat(formData.destinationFunding) > 0 &&
          !!formData.rscFunding &&
          parseFloat(formData.rscFunding) > 0 &&
          !!pairInfo &&
          hasRequiredBalances;
          
        setIsValid(formIsValid);
      } else {
        setIsValid(false);
      }

      toast.success('Balance information refreshed');
    } catch (error) {
      console.error("Error refreshing balances:", error);
      setIsValid(false);
      toast.error('Failed to refresh balance information');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check balances when relevant form data changes
  useEffect(() => {
    refreshBalances();
  }, [formData.chainId, formData.pairAddress, formData.clientAddress, formData.amount, formData.threshold, formData.sellToken0, formData.destinationFunding, formData.rscFunding, connectedAccount, pairInfo]);
  
  if (!formData.chainId || !connectedAccount) {
    return (
      <Alert className="bg-yellow-900/20 border-yellow-500/50">
        <AlertCircle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-200">
          Please connect your wallet and select a blockchain network.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Alert className="bg-blue-900/20 border-blue-500/50">
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
          <AlertDescription className="text-blue-200">
            Checking your balances...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  
if (isNetworkSwitching) {
  return (
    <div className="space-y-2">
      <Alert className="bg-blue-900/20 border-blue-500/50">
        <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
        <AlertDescription className="text-blue-200">
          Switching networks... Please confirm in your wallet and wait a moment.
        </AlertDescription>
      </Alert>
    </div>
  );
}

  return (
    <div className="space-y-4">
      {balanceInfo && (
        <>
          {/* Balance Summary Card */}
          <Card className="bg-blue-900/20 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-zinc-100">Balance Summary</h3>
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-7 bg-blue-900/30 border-blue-500/30 text-blue-300 hover:bg-blue-800/40"
                  onClick={() => setShowDetail(!showDetail)}
                >
                  {showDetail ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
              
              {balanceInfo.wrongNetwork ? (
                <Alert className="bg-yellow-900/20 border-yellow-500/50 mt-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    You're on the wrong network. Please switch to {selectedChain?.name} to check source chain balances or {rscNetwork.name} to check RSC balances.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {/* Source Chain Balance Status */}
                  {balanceInfo.isSourceChain && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {balanceInfo.hasEnoughForDestination ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm text-zinc-200">
                          {selectedChain?.name} Balance
                        </span>
                      </div>
                      <span className={`text-sm ${balanceInfo.hasEnoughForDestination ? 'text-green-400' : 'text-red-400'}`}>
                        {balanceInfo.nativeBalance} {balanceInfo.nativeSymbol}
                      </span>
                    </div>
                  )}
                  
                  {/* Token Balance Status (if on source chain) */}
                  {balanceInfo.isSourceChain && balanceInfo.tokenBalance !== null && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {balanceInfo.hasEnoughTokens ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm text-zinc-200">
                          {balanceInfo.tokenSymbol} Balance
                        </span>
                      </div>
                      <span className={`text-sm ${balanceInfo.hasEnoughTokens ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(balanceInfo.tokenBalance).toLocaleString(undefined, {maximumFractionDigits: 6})}
                      </span>
                    </div>
                  )}
                  
                  {/* RSC Network Balance Status */}
                  {balanceInfo.isRscChain && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {balanceInfo.hasEnoughForRSC ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className="text-sm text-zinc-200">
                          {rscNetwork.name} Balance
                        </span>
                      </div>
                      <span className={`text-sm ${balanceInfo.hasEnoughForRSC ? 'text-green-400' : 'text-red-400'}`}>
                        {balanceInfo.nativeBalance} {balanceInfo.nativeSymbol}
                      </span>
                    </div>
                  )}
                
                  {/* Detailed Information */}
                  {showDetail && (
                    <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-3">
                      <h4 className="text-xs font-medium text-zinc-300">Required Amounts:</h4>
                      
                      {balanceInfo.isSourceChain && (
                        <div className="grid grid-cols-2 text-xs gap-y-2">
                          <span className="text-zinc-300">For destination contract:</span>
                          <span className="text-right text-zinc-200">
                            {balanceInfo.requiredNativeBalance} {balanceInfo.nativeSymbol}
                          </span>
                          
                          {balanceInfo.tokenBalance !== null && (
                            <>
                              <span className="text-zinc-300">Tokens to sell:</span>
                              <span className="text-right text-zinc-200">
                                {formData.amount} {balanceInfo.tokenSymbol}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {balanceInfo.isRscChain && (
                        <div className="grid grid-cols-2 text-xs gap-y-2">
                          <span className="text-zinc-300">For RSC contract:</span>
                          <span className="text-right text-zinc-200">
                            {balanceInfo.requiredNativeBalance} {balanceInfo.nativeSymbol}
                          </span>
                        </div>
                      )}
                      
                      {lastRefreshed && (
                        <div className="text-xs text-zinc-400 italic mt-2">
                          Last updated: {lastRefreshed.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Warning Alerts */}
          {balanceInfo.isSourceChain && !balanceInfo.hasEnoughForDestination && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                You need at least {balanceInfo.requiredNativeBalance} {balanceInfo.nativeSymbol} on {
                  selectedChain?.name
                } for the destination contract.
              </AlertDescription>
            </Alert>
          )}
          
          {balanceInfo.isSourceChain && balanceInfo.tokenBalance !== null && !balanceInfo.hasEnoughTokens && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                You don't have enough {balanceInfo.tokenSymbol} tokens to sell {formData.amount || '0'}.
              </AlertDescription>
            </Alert>
          )}
          
          {balanceInfo.isRscChain && !balanceInfo.hasEnoughForRSC && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                You need at least {balanceInfo.requiredNativeBalance} {balanceInfo.nativeSymbol} on {rscNetwork.name} for the RSC contract.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
      
      {/* Refresh Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full bg-blue-900/20 border-blue-500/20 text-blue-400 hover:bg-blue-800/30"
        onClick={refreshBalances}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-2" /> Refresh Balance Info
          </>
        )}
      </Button>
    </div>
  );
}