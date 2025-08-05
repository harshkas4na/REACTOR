import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  ExternalLink, 
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

interface RSCFundingRequirementsProps {
  orgChainId?: string | number;
  desChainId?: string | number;
  connectedAccount?: string;
}

const RSCFundingRequirementsComponent = ({ 
  orgChainId, 
  desChainId, 
  connectedAccount 
}: RSCFundingRequirementsProps) => {
  const [reactAmount, setReactAmount] = useState('0.5');
  const [isSendingToFaucet, setIsSendingToFaucet] = useState(false);

  // Reactive faucet contract address on Sepolia
  const REACTIVE_FAUCET_ADDRESS = '0x9b9BB25f1A81078C544C829c5EB7822d747Cf434';
  const SEPOLIA_FAUCET_URL = 'https://sepolia-faucet.pk910.de/';

  // Determine if we're dealing with testnet or mainnet based on origin chain
  const isTestnetSetup = () => {
    const testnetChains = [11155111, 5318007]; // Sepolia, Lasna
    const orgId = typeof orgChainId === 'string' ? parseInt(orgChainId) : orgChainId;
    const desId = typeof desChainId === 'string' ? parseInt(desChainId) : desChainId;
    
    return testnetChains.includes(orgId || 0) || testnetChains.includes(desId || 0);
  };

  // Calculate SepETH needed (1 SepETH = 5 REACT)
  const calculateSepETHNeeded = (reactWanted: string) => {
    const react = parseFloat(reactWanted) || 0;
    return (react / 5).toFixed(3);
  };

  // Handle sending SepETH to REACT faucet
  const handleSendToReactiveFaucet = async () => {
    if (!connectedAccount || typeof window === 'undefined' || !window.ethereum) {
      toast.error('Please connect your wallet first');
      return;
    }

    const sepETHNeeded = calculateSepETHNeeded(reactAmount);
    if (parseFloat(sepETHNeeded) <= 0) {
      toast.error('Please enter a valid REACT amount');
      return;
    }

    setIsSendingToFaucet(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Check network
      const network = await provider.getNetwork();
      if (network.chainId.toString() !== '11155111') {
        toast.error('Please switch to Ethereum Sepolia network');
        setIsSendingToFaucet(false);
        return;
      }

      // Validate inputs
      console.log('Sending transaction:', {
        to: REACTIVE_FAUCET_ADDRESS,
        amount: sepETHNeeded,
        valueInWei: ethers.parseEther(sepETHNeeded).toString()
      });

      // Check balance with buffer for gas
      const balance = await provider.getBalance(connectedAccount);
      const sendAmount = ethers.parseEther(sepETHNeeded);
      const gasEstimate = ethers.parseEther('0.001'); // ~0.001 ETH buffer for gas
      
      if (balance < (sendAmount + gasEstimate)) {
        toast.error(`Insufficient SepETH. Need ${sepETHNeeded} SepETH + gas, have ${ethers.formatEther(balance)}`);
        setIsSendingToFaucet(false);
        return;
      }

      // Simple transaction - let MetaMask handle all gas estimation
      const txRequest = {
        to: REACTIVE_FAUCET_ADDRESS,
        value: sendAmount.toString()
      };

      console.log('Transaction request:', txRequest);
      
      const tx = await signer.sendTransaction(txRequest);

      toast.success('Transaction sent! You will receive REACT tokens shortly');
      await tx.wait();
      toast.success(`🎉 Success! You should receive ${reactAmount} REACT tokens`);

    } catch (error: any) {
      console.error('Faucet transaction error:', error);
      
      if (error.code === 4001) {
        toast.error('Transaction cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds');
      } else {
        toast.error('Transaction failed. Please try again.');
      }
    } finally {
      setIsSendingToFaucet(false);
    }
  };

  return (
    <Card className="relative bg-card/70 border-border my-4 sm:mt-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-100 mb-2 text-sm sm:text-base">
              RSC Deployment Requirements
            </h3>
            <p className="text-xs sm:text-sm text-amber-200 mb-3">
              RSC Gas: ~0.1 REACT • RSC Funding: 0.05+ REACT • Plus destination chain gas
            </p>
            
            {isTestnetSetup() ? (
              // Testnet setup (Reactive Lasna)
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-300">
                    Your RSC will deploy on <span className="font-medium">Reactive Lasna</span> (testnet)
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-amber-200 mb-2">
                    <span className="font-medium">Step 1:</span> Switch to Sepolia and get testnet ETH from{' '}
                    <a
                      href={SEPOLIA_FAUCET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:text-amber-200 underline"
                    >
                      this faucet
                      <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </a>
                  </p>
                </div>

                <div>
                  <p className="text-xs sm:text-sm text-amber-200 mb-2">
                    <span className="font-medium">Step 2:</span> Get REACT testnet tokens (1 SepETH = 5 REACT)
                  </p>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="0.5"
                      value={reactAmount}
                      onChange={(e) => setReactAmount(e.target.value)}
                      className="w-20 bg-amber-900/20 border-amber-700 text-amber-100 text-sm"
                    />
                    <span className="text-xs text-amber-300">REACT tokens</span>
                    <span className="text-xs text-amber-400">
                      (send {calculateSepETHNeeded(reactAmount)} SepETH)
                    </span>
                  </div>

                  <Button
                    onClick={handleSendToReactiveFaucet}
                    disabled={isSendingToFaucet || !connectedAccount || parseFloat(calculateSepETHNeeded(reactAmount)) <= 0}
                    size="sm"
                    className="bg-primary text-xs mr-2"
                  >
                    {isSendingToFaucet ? (
                      <div className="flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Sending...
                      </div>
                    ) : (
                      `Send ${calculateSepETHNeeded(reactAmount)} SepETH`
                    )}
                  </Button>

                  
                </div>

                

                <p className="text-xs text-amber-300">
                  Or manually send SepETH to: <code className="bg-amber-900/20 px-1 rounded text-xs">{REACTIVE_FAUCET_ADDRESS}</code>
                </p>
              </div>
            ) : (
              // Mainnet setup (Reactive Mainnet) 
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="h-3 w-3 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-purple-300">
                    Your RSC will deploy on <span className="font-medium">Reactive Mainnet</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                  <p className="text-xs text-orange-300">
                    Mainnet RSC deployment coming soon - use testnet for now
                  </p>
                </div>
                
                <div>
                  <p className="text-xs sm:text-sm text-amber-200 mb-2">
                    📝 <span className="font-medium">Note:</span> To deploy RSCs on Reactive Mainnet, you'll need REACT tokens for gas and funding.
                  </p>
                  <a
                    href="/markets"
                    className="inline-flex items-center text-xs sm:text-sm text-amber-300 hover:text-amber-200 underline"
                  >
                    See here where you can obtain REACT tokens
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RSCFundingRequirementsComponent;