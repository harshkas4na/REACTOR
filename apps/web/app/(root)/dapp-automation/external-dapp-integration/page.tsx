'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ProgressNavigation from '@/components/external-dapp-integration/ProgressNavigation'
import TriggerSelection from '@/components/external-dapp-integration/TriggerSelection'
import TargetConfiguration from '@/components/external-dapp-integration/TargetConfiguration'
import LogicConfiguration from '@/components/external-dapp-integration/LogicConfiguration'
import ReviewAndDeploy from '@/components/external-dapp-integration/ReviewAndDeploy'
import { useAutomationContext } from '@/app/_context/AutomationContext'

const steps = ['Trigger Selection', 'Target Configuration', 'Logic Configuration', 'Review & Deploy']

export default function ExternalDAppAutomation() {
  const [currentStep, setCurrentStep] = useState(0)
  const { triggerType,setTriggerType, automations } = useAutomationContext()

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const isNextDisabled = () => {
    if (currentStep === 0 && !triggerType) return true
    if (currentStep === 2 && automations.length === 0) return true
    return currentStep === steps.length - 1
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">External DApp Automation</h1>
      
      <ProgressNavigation steps={steps} currentStep={currentStep} />

      <Card className="mt-8">
        <CardContent className="pt-6">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {currentStep === 0 && <TriggerSelection onSelect={setTriggerType}/>}
            {currentStep === 1 && <TargetConfiguration />}
            {currentStep === 2 && <LogicConfiguration />}
            {currentStep === 3 && <ReviewAndDeploy />}
          </motion.div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={prevStep} disabled={currentStep === 0} variant="outline">
            Previous
          </Button>
          <Button onClick={nextStep} disabled={isNextDisabled()}>
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Alert variant="warning" className="mt-8">
        <AlertTitle>Caution</AlertTitle>
        <AlertDescription>
          Ensure you thoroughly test your automation in a safe environment before deploying to mainnet.
        </AlertDescription>
      </Alert>
    </div>
  )
}

