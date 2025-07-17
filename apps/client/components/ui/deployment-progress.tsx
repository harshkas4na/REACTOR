// components/ui/deployment-progress.tsx
import React from 'react';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';

interface DeploymentStep {
  id: string;
  label: string;
  description?: string;
}

interface DeploymentProgressProps {
  steps: DeploymentStep[];
  currentStep: string;
  completedSteps: string[];
  isLoading?: boolean;
}

export const DeploymentProgress: React.FC<DeploymentProgressProps> = ({
  steps,
  currentStep,
  completedSteps,
  isLoading = false
}) => {
  const getStepIcon = (stepId: string) => {
    if (completedSteps.includes(stepId)) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
    if (stepId === currentStep && isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
    }
    return <Clock className="h-4 w-4 text-zinc-400" />;
  };

  const getStepStatus = (stepId: string): 'complete' | 'active' | 'pending' => {
    if (completedSteps.includes(stepId)) return 'complete';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-zinc-100 font-medium">Deployment Progress</h3>
      {steps.map((step) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex items-center space-x-3">
            {getStepIcon(step.id)}
            <div className="flex-1">
              <span className={`text-sm ${
                status === 'complete' ? 'text-green-400' :
                status === 'active' ? 'text-blue-400' : 'text-zinc-400'
              }`}>
                {step.label}
              </span>
              {step.description && status === 'active' && (
                <p className="text-xs text-zinc-500 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};