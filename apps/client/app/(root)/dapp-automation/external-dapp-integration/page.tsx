'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react'
import ProgressNavigation from '@/components/external-dapp-integration/ProgressNavigation'
import TriggerSelection from '@/components/external-dapp-integration/TriggerSelection'
import TargetConfiguration from '@/components/external-dapp-integration/TargetConfiguration'
import LogicConfiguration from '@/components/external-dapp-integration/LogicConfiguration'
import ReviewAndDeploy from '@/components/external-dapp-integration/ReviewAndDeploy'
import { useAutomationContext } from '@/app/_context/AutomationContext'
import { useWeb3 } from '@/app/_context/Web3Context'

const getSteps = (triggerType: string) => {
  const commonSteps = ['Target Configuration', 'Logic Configuration', 'Review & Deploy']
  switch (triggerType) {
    case 'custom':
      return ['Custom Contract Setup', ...commonSteps]
    case 'protocol':
      return ['Protocol Setup', ...commonSteps]
    case 'blockchain':
      return ['Blockchain Event Setup', ...commonSteps]
    default:
      return ['Trigger Selection', ...commonSteps]
  }
}

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export default function ExternalDAppAutomation() {
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    triggerType,
    automations,
    originAddress,
    destinationAddress,
    setTriggerType
  } = useAutomationContext()
  
  const { account } = useWeb3()

  const steps = getSteps(triggerType)

  useEffect(() => {
    setError(null)
  }, [currentStep])

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Trigger Selection
        return triggerType as ("custom" | "protocol" | "blockchain"|'') !== ''
      case 1: // Target Configuration
        return destinationAddress !== ''
      case 2: // Logic Configuration
        return automations.length > 0
      case 3: // Review & Deploy
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep === steps.length - 1 && !account) {
      setError('Please connect your wallet to deploy')
      return
    }
    
    if (canProceedToNext()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    } else {
      setError(getErrorMessage())
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const getErrorMessage = (): string => {
    switch (currentStep) {
      case 0:
        return 'Please complete the trigger selection'
      case 1:
        return 'Please enter destination contract address'
      case 2:
        return 'Please add at least one automation'
      default:
        return ''
    }
  }

  const renderStepContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageTransition}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 0 && (
            <TriggerSelection onSelect={(type: string) => setTriggerType(type as "custom" | "protocol" | "blockchain")} />
          )}
          {currentStep === 1 && (
            <TargetConfiguration />
          )}
          {currentStep === 2 && (
            <LogicConfiguration />
          )}
          {currentStep === 3 && (
            <ReviewAndDeploy />
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            External DApp Automation
          </h1>
          <p className="text-zinc-400 text-center text-lg">
            Create automated interactions between smart contracts and DApps.
          </p>
        </div>
  
        <ProgressNavigation steps={steps} currentStep={currentStep} />
  
        <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 backdrop-blur-sm mt-8">
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
          
          <CardFooter className="flex justify-between p-6 border-t border-zinc-800">
            <Button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              variant="outline"
              className="flex items-center border-blue-500/20 hover:bg-blue-900/20 text-zinc-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
  
            <Button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="flex items-center bg-primary hover:bg-primary/90 text-white"
            >
              {currentStep === steps.length - 1 ? 'Deploy' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
  
        {error && (
          <Alert 
            variant="destructive" 
            className="mt-4 bg-red-900/20 border-red-500/50"
          >
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertTitle className="text-red-300">Error</AlertTitle>
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}
  
        <Alert 
          variant="warning" 
          className="mt-8 bg-yellow-900/20 border-yellow-500/50"
        >
          <AlertTitle className="text-yellow-300">Caution</AlertTitle>
          <AlertDescription className="text-yellow-200">
            Please ensure you thoroughly test your automation in a test environment before deploying to mainnet.
            Make sure you understand the risks and implications of automated smart contract interactions.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

