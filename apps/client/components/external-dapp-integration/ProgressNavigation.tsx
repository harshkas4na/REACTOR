import { Check } from 'lucide-react'

interface ProgressNavigationProps {
  steps: string[]
  currentStep: number
}

export default function ProgressNavigation({ steps, currentStep }: ProgressNavigationProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              index < currentStep ? 'bg-green-500 text-white' :
              index === currentStep ? 'bg-blue-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {index < currentStep ? (
                <Check className="h-6 w-6" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`h-1 w-full ${
                index < currentStep ? 'bg-green-500' :
                index === currentStep ? 'bg-blue-500' :
                'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <span key={step} className={`text-sm ${
            index <= currentStep ? 'text-blue-500 font-medium' : 'text-gray-500'
          }`}>
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

