"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";

interface RSCFundingRequirementsProps {
  orgChainId?: string | number;
  desChainId?: string | number;
  connectedAccount?: string;
}

export default function RSCFundingRequirementsComponent({
  orgChainId,
  desChainId,
  connectedAccount,
}: RSCFundingRequirementsProps) {
  const [reactAmount, setReactAmount] = useState("0.5");
  const [isSendingToFaucet, setIsSendingToFaucet] = useState(false);

  const REACTIVE_FAUCET_ADDRESS =
    "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434";
  const SEPOLIA_FAUCET_URL = "https://sepolia-faucet.pk910.de/";

  const isTestnetSetup = () => {
    const testnetChains = [11155111, 5318007]; // Sepolia, Lasna
    const orgId =
      typeof orgChainId === "string" ? parseInt(orgChainId) : orgChainId;
    const desId =
      typeof desChainId === "string" ? parseInt(desChainId) : desChainId;

    return (
      testnetChains.includes(orgId || 0) || testnetChains.includes(desId || 0)
    );
  };

  const calculateSepETHNeeded = (reactWanted: string) => {
    const react = parseFloat(reactWanted) || 0;
    return (react / 5).toFixed(3);
  };

  const handleSendToReactiveFaucet = async () => {
    if (!connectedAccount || typeof window === "undefined" || !window.ethereum) {
      toast.error("Please connect your wallet first");
      return;
    }

    const sepETHNeeded = calculateSepETHNeeded(reactAmount);
    if (parseFloat(sepETHNeeded) <= 0) {
      toast.error("Please enter a valid REACT amount");
      return;
    }

    setIsSendingToFaucet(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const network = await provider.getNetwork();
      if (network.chainId.toString() !== "11155111") {
        toast.error("Please switch to Ethereum Sepolia network");
        setIsSendingToFaucet(false);
        return;
      }

      const balance = await provider.getBalance(connectedAccount);
      const sendAmount = ethers.parseEther(sepETHNeeded);
      const gasEstimate = ethers.parseEther("0.001");

      if (balance < sendAmount + gasEstimate) {
        toast.error(
          `Insufficient SepETH. Need ${sepETHNeeded} SepETH + gas, have ${ethers.formatEther(
            balance
          )}`
        );
        setIsSendingToFaucet(false);
        return;
      }

      const txRequest = {
        to: REACTIVE_FAUCET_ADDRESS,
        value: sendAmount.toString(),
      };

      const tx = await signer.sendTransaction(txRequest);

      toast.success("Transaction sent! You will receive REACT tokens shortly");
      await tx.wait();
      toast.success(`🎉 Success! You should receive ${reactAmount} REACT tokens`);
    } catch (error: any) {
      console.error("Faucet transaction error:", error);
      if (error.code === 4001) {
        toast.error("Transaction cancelled");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds");
      } else {
        toast.error("Transaction failed. Please try again.");
      }
    } finally {
      setIsSendingToFaucet(false);
    }
  };

  return (
    <Card className="relative bg-card/70 border-border my-4 sm:mt-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>

          {/* Text + Actions */}
          <div className="flex-1">
            <h3 className="font-medium text-amber-100 mb-2 text-base sm:text-lg">
              RSC Deployment Requirements
            </h3>
            <p className="text-xs sm:text-sm text-amber-200 mb-3">
              RSC Gas: ~0.1 REACT • RSC Funding: 0.05+ REACT • Plus destination
              chain gas
            </p>

            {isTestnetSetup() ? (
              <div className="space-y-4">
                {/* Info */}
                <div className="flex items-start sm:items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-[2px]" />
                  <p className="text-xs sm:text-sm text-blue-300">
                    Your RSC will deploy on{" "}
                    <span className="font-medium">Reactive Lasna</span>{" "}
                    (testnet)
                  </p>
                </div>

                {/* Step 1 */}
                <p className="text-xs sm:text-sm text-amber-200">
                  <span className="font-medium">Step 1:</span> Switch to Sepolia
                  and get testnet ETH from{" "}
                  <a
                    href={SEPOLIA_FAUCET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:text-amber-200 underline inline-flex items-center gap-1"
                  >
                    this faucet
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>

                {/* Step 2 */}
                <div>
                  <p className="text-xs sm:text-sm text-amber-200 mb-2">
                    <span className="font-medium">Step 2:</span> Get REACT
                    testnet tokens (1 SepETH = 5 REACT)
                  </p>

                  {/* Input + amount display */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
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

                  {/* Send button */}
                  <Button
                    onClick={handleSendToReactiveFaucet}
                    disabled={
                      isSendingToFaucet ||
                      !connectedAccount ||
                      parseFloat(calculateSepETHNeeded(reactAmount)) <= 0
                    }
                    size="sm"
                    className="bg-primary text-xs"
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

                {/* Manual address */}
                <p className="text-xs text-amber-300 break-all">
                  Or manually send SepETH to:{" "}
                  <code className="bg-amber-900/20 px-1 rounded">
                    {REACTIVE_FAUCET_ADDRESS}
                  </code>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start sm:items-center gap-2">
                  <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-[2px]" />
                  <p className="text-xs sm:text-sm text-purple-300">
                    Your RSC will deploy on{" "}
                    <span className="font-medium">Reactive Mainnet</span>
                  </p>
                </div>

                <div className="flex items-start sm:items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-[2px]" />
                  <p className="text-xs sm:text-sm text-orange-300">
                    Mainnet RSC deployment coming soon - use testnet for now
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-amber-200">
                  📝 <span className="font-medium">Note:</span> To deploy RSCs
                  on Reactive Mainnet, you'll need REACT tokens for gas and
                  funding.
                </p>
                <a
                  href="/markets"
                  className="inline-flex items-center text-xs sm:text-sm text-amber-300 hover:text-amber-200 underline gap-1"
                >
                  See here where you can obtain REACT tokens
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
