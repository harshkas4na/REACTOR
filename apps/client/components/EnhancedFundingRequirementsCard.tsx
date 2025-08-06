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
} from "lucide-react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";

const mockProps = {
  connectedChain: {
    id: "11155111", // Sepolia
    name: "Ethereum Sepolia",
    nativeCurrency: "ETH",
  },
  connectedAccount:
    "0x742d35Cc6234C4532D9f4854BA6C1234567891011",
};

export default function EnhancedFundingRequirementsCard({
  connectedChain = mockProps.connectedChain,
  connectedAccount = mockProps.connectedAccount,
}) {
  const [reactAmount, setReactAmount] = useState("0.5");
  const [isSendingToFaucet, setIsSendingToFaucet] = useState(false);

  const REACTIVE_FAUCET_ADDRESS =
    "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434";
  const SEPOLIA_FAUCET_URL =
    "https://sepolia-faucet.pk910.de/";

  const isSepoliaNetwork = connectedChain?.id === "11155111";
  const isMainnetOrAvalanche =
    connectedChain?.id === "1" || connectedChain?.id === "43114";

  const calculateSepETHNeeded = (reactWanted: string) => {
    const react = parseFloat(reactWanted) || 0;
    return (react / 5).toFixed(3);
  };

  const handleSendToReactiveFaucet = async () => {
    if (
      !connectedAccount ||
      typeof window === "undefined" ||
      !window.ethereum
    ) {
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
      toast.success(
        "Transaction sent! You will receive REACT tokens shortly"
      );
      await tx.wait();
      toast.success(
        `🎉 Success! You should receive ${reactAmount} REACT tokens`
      );
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

  const TestnetCard = () => (
    <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-4 sm:mt-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-100 mb-2 text-base sm:text-lg">
              Testnet Setup Costs
            </h3>
            <p className="text-xs sm:text-sm text-amber-200 mb-3">
              RSC Monitoring: 0.05 REACT • Callback Execution: 0.03 SepETH •
              Plus gas fees
            </p>

            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-amber-200">
                <span className="font-medium">Step 1:</span> Get Sepolia ETH
                from{" "}
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

              <div>
                <p className="text-xs sm:text-sm text-amber-200 mb-2">
                  <span className="font-medium">Step 2:</span> Get REACT testnet
                  tokens (1 SepETH = 5 REACT)
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="0.5"
                    value={reactAmount}
                    onChange={(e) => setReactAmount(e.target.value)}
                    className="w-20 bg-amber-900/20 border-amber-700 text-amber-100 text-sm"
                  />
                  <span className="text-xs text-amber-300">
                    REACT tokens
                  </span>
                  <span className="text-xs text-amber-400">
                    (send {calculateSepETHNeeded(reactAmount)} SepETH)
                  </span>
                </div>

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

                <p className="text-xs mt-2 text-amber-300 break-all">
                  Or manually send SepETH to:{" "}
                  <code className="bg-amber-900/20 px-1 rounded">
                    {REACTIVE_FAUCET_ADDRESS}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MainnetCard = () => (
    <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-4 sm:mt-6">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-amber-600/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-amber-100 mb-2 text-base sm:text-lg">
              Protection Setup Costs
            </h3>
            <p className="text-xs sm:text-sm text-amber-200 mb-3">
              RSC Monitoring: 0.05 REACT • Callback Execution: 0.03{" "}
              {connectedChain?.nativeCurrency || "ETH"} • Plus gas fees
            </p>

            {isMainnetOrAvalanche && (
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0 mt-[2px]" />
                <p className="text-xs text-orange-300">
                  {connectedChain?.name} support coming soon - switch to
                  Sepolia for testing
                </p>
              </div>
            )}

            <p className="text-xs sm:text-sm text-amber-200">
              📝 <span className="font-medium">Note:</span> To fund a Reactive
              Smart Contract, you will need gas on the Reactive Network.
            </p>
            <a
              href="/markets"
              className="inline-flex items-center gap-1 text-xs sm:text-sm text-amber-300 hover:text-amber-200 underline"
            >
              See here where you can obtain REACT tokens
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return isSepoliaNetwork ? <TestnetCard /> : <MainnetCard />;
}
