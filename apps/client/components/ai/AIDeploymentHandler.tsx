'use client';

import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Loader2, AlertTriangle, Rocket } from 'lucide-react';

// Import stop order deployment functions
import { 
  deployDestinationContract, 
  approveTokens, 
  deployRSC, 
  switchNetwork, 
  switchToRSCNetwork,
  getRSCNetworkForChain,
  SUPPORTED_CHAINS 
} from '@/utils/stopOrderDeployment';

interface AIDeploymentHandlerProps {
  automationConfig: any;
  onDeploymentComplete: (success: boolean, result?: any) => void;
  onCancel: () => void;
}

type DeploymentStep = 'idle' | 'deploying-destination' | 'switching-network' | 'deploying-rsc' | 'switching-back' | 'approving' | 'complete' | 'error';

export const AIDeploymentHandler: React.FC<AIDeploymentHandlerProps> = ({
  automationConfig,
  onDeploymentComplete,
  onCancel
}) => {
  const [deploymentStep, setDeploymentStep] = useState<DeploymentStep>('idle');
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);

  const handleDeployment = async () => {
    try {
      setDeploymentError(null);
      setDeploymentStep('idle');

      // Validate configuration
      if (!automationConfig.deploymentReady) {
        throw new Error('Configuration not ready for deployment');
      }

      // Get the selected chain configuration
      const selectedChain = SUPPORTED_CHAINS.find(chain => chain.id === automationConfig.chainId);
      if (!selectedChain) {
        throw new Error('Invalid chain configuration');
      }

      // Check wallet connection
      if (!window.ethereum) {
        throw new Error('Please connect your wallet');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Check if user is on correct network
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      if (currentChainId !== automationConfig.chainId) {
        throw new Error(`Please switch to ${selectedChain.name} network`);
      }

      // Step 1: Deploy Destination Contract
      setDeploymentStep('deploying-destination');
      toast.loading('Deploying destination contract...', { id: 'deployment' });
      
      const destinationAddress = await deployDestinationContract(
        selectedChain, 
        automationConfig.destinationFunding
      );

      // Step 2: Approve Token Spending
      setDeploymentStep('approving');
      toast.loading('Approving token spending...', { id: 'deployment' });
      
      // Get token address based on sellToken0 flag
      let tokenToApprove;
      if (automationConfig.sellToken0) {
        tokenToApprove = await getToken0FromPair(automationConfig.pairAddress);
      } else {
        tokenToApprove = await getToken1FromPair(automationConfig.pairAddress);
      }

      await approveTokens(
        tokenToApprove,
        destinationAddress,
        automationConfig.amount
      );

      // Step 3: Switch to RSC Network
      setDeploymentStep('switching-network');
      const rscNetwork = getRSCNetworkForChain(automationConfig.chainId);
      toast.loading(`Switching to ${rscNetwork.name}...`, { id: 'deployment' });
      
      await switchToRSCNetwork(automationConfig.chainId);

      // Step 4: Deploy RSC
      setDeploymentStep('deploying-rsc');
      toast.loading('Deploying Reactive Smart Contract...', { id: 'deployment' });
      
      const rscAddress = await deployRSC({
        pair: automationConfig.pairAddress,
        stopOrder: destinationAddress,
        client: automationConfig.clientAddress,
        token0: automationConfig.sellToken0,
        coefficient: automationConfig.coefficient,
        threshold: automationConfig.threshold
      }, selectedChain, automationConfig.rscFunding);

      // Step 5: Switch back to original network
      setDeploymentStep('switching-back');
      toast.loading(`Switching back to ${selectedChain.name}...`, { id: 'deployment' });
      
      await switchNetwork(automationConfig.chainId);

      // Deployment complete
      setDeploymentStep('complete');
      toast.success('Stop order deployed successfully!', { id: 'deployment' });

      const result = {
        destinationAddress,
        rscAddress,
        chainId: automationConfig.chainId,
        chainName: selectedChain.name
      };

      setDeploymentResult(result);
      onDeploymentComplete(true, result);

    } catch (error: any) {
      console.error('Deployment error:', error);
      setDeploymentError(error.message || 'Deployment failed');
      setDeploymentStep('error');
      toast.error(error.message || 'Deployment failed', { id: 'deployment' });
      onDeploymentComplete(false, { error: error.message });
    }
  };

  // Helper function to get token addresses from pair
  const getToken0FromPair = async (pairAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const pairContract = new ethers.Contract(
      pairAddress,
      ['function token0() view returns (address)'],
      provider
    );
    return await pairContract.token0();
  };

  const getToken1FromPair = async (pairAddress: string): Promise<string> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const pairContract = new ethers.Contract(
      pairAddress,
      ['function token1() view returns (address)'],
      provider
    );
    return await pairContract.token1();
  };

  const getStepIcon = (step: DeploymentStep) => {
    if (step === deploymentStep && deploymentStep !== 'complete' && deploymentStep !== 'error') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    }
    if (deploymentStep === 'complete' || 
        (deploymentStep === 'switching-back' && step !== 'complete') ||
        (deploymentStep === 'deploying-rsc' && (step === 'deploying-destination' || step === 'approving' || step === 'switching-network')) ||
        (deploymentStep === 'switching-network' && (step === 'deploying-destination' || step === 'approving')) ||
        (deploymentStep === 'approving' && step === 'deploying-destination')) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    return <Clock className="h-4 w-4 text-zinc-400" />;
  };

  const getStepStatus = (step: DeploymentStep): 'pending' | 'active' | 'complete' => {
    const stepOrder: DeploymentStep[] = ['deploying-destination', 'approving', 'switching-network', 'deploying-rsc', 'switching-back', 'complete'];
    const currentIndex = stepOrder.indexOf(deploymentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex || deploymentStep === 'complete') return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center space-x-2">
          <Rocket className="h-5 w-5" />
          <span>Deploy Stop Order</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Summary */}
        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
          <h3 className="text-zinc-100 font-medium mb-2">Configuration Summary</h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p><span className="font-medium">Network:</span> {SUPPORTED_CHAINS.find(c => c.id === automationConfig.chainId)?.name}</p>
            <p><span className="font-medium">Amount:</span> {automationConfig.amount}</p>
            <p><span className="font-medium">Funding:</span> {automationConfig.destinationFunding} + {automationConfig.rscFunding}</p>
          </div>
        </div>

        {/* Deployment Steps */}
        {deploymentStep !== 'idle' && (
          <div className="space-y-3">
            <h3 className="text-zinc-100 font-medium">Deployment Progress</h3>
            
            {[
              { step: 'deploying-destination' as DeploymentStep, label: 'Deploy Destination Contract' },
              { step: 'approving' as DeploymentStep, label: 'Approve Token Spending' },
              { step: 'switching-network' as DeploymentStep, label: 'Switch to RSC Network' },
              { step: 'deploying-rsc' as DeploymentStep, label: 'Deploy Reactive Smart Contract' },
              { step: 'switching-back' as DeploymentStep, label: 'Switch Back to Original Network' }
            ].map(({ step, label }) => (
              <div key={step} className="flex items-center space-x-3">
                {getStepIcon(step)}
                <span className={`text-sm ${
                  getStepStatus(step) === 'complete' ? 'text-green-400' :
                  getStepStatus(step) === 'active' ? 'text-blue-400' : 'text-zinc-400'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {deploymentError && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {deploymentStep === 'complete' && deploymentResult && (
          <Alert className="bg-green-900/20 border-green-500/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              Stop order deployed successfully! Your automation is now active and monitoring prices.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {deploymentStep === 'idle' && (
            <>
              <Button
                onClick={handleDeployment}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Stop Order
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </>
          )}
          
          {(deploymentStep === 'complete' || deploymentStep === 'error') && (
            <Button
              onClick={onCancel}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
            >
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 