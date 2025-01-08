// app/(routes)/external-dapp-automation/page.tsx

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

const steps = [
  'Trigger Selection',
  'Target Configuration',
  'Logic Configuration',
  'Review & Deploy'
]

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
    isOriginVerified,
    isDestinationVerified,
    setTriggerType
  } = useAutomationContext()
  
  const { account } = useWeb3()

  useEffect(() => {
    setError(null)
  }, [currentStep])

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Trigger Selection
        return triggerType && originAddress && isOriginVerified;
      case 1: // Target Configuration
        return destinationAddress && isDestinationVerified;
      case 2: // Logic Configuration
        return automations.length > 0;
      case 3: // Review & Deploy
        return true;
      default:
        return false;
    }
  }

  const handleNext = () => {
    if (currentStep === 3 && !account) {
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
        if (!triggerType) return 'Please select a trigger type'
        if (!originAddress) return 'Please enter origin contract address'
        if (!isOriginVerified) return 'Please verify the origin contract'
        return ''
      case 1:
        if (!destinationAddress) return 'Please enter destination contract address'
        if (!isDestinationVerified) return 'Please verify the destination contract'
        return ''
      case 2:
        if (automations.length === 0) return 'Please add at least one automation'
        return ''
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
            <TriggerSelection onSelect={setTriggerType} />
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          External DApp Automation
        </h1>
        <p className="text-gray-600 text-center">
          Create automated interactions between smart contracts and DApps.
        </p>
      </div>

      <ProgressNavigation steps={steps} currentStep={currentStep} />

      <Card className="mt-8">
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
        
        <CardFooter className="flex justify-between mt-6">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            variant="outline"
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="flex items-center"
          >
            {currentStep === steps.length - 1 ? 'Deploy' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert variant="warning" className="mt-8">
        <AlertTitle>Caution</AlertTitle>
        <AlertDescription>
          Please ensure you thoroughly test your automation in a test environment before deploying to mainnet.
          Make sure you understand the risks and implications of automated smart contract interactions.
        </AlertDescription>
      </Alert>
    </div>
  )
}