import React from 'react';

interface ExecutionStep {
  order: number;
  description: string;
}

interface PreviewExecutionProps {
  steps: ExecutionStep[];
}

export const PreviewExecution: React.FC<PreviewExecutionProps> = ({ steps }) => {
  return (
    <div className="border border-gray-600 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-2">Execution Preview</h3>
      <ol className="list-decimal list-inside text-gray-300">
        {steps.map((step) => (
          <li key={step.order} className="mb-2">
            {step.description}
          </li>
        ))}
      </ol>
    </div>
  );
};