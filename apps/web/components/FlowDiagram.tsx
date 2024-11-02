import React from 'react';

interface FlowDiagramProps {
  template: any;
  configuration: any;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({ template, configuration }) => {
  return (
    <div className="border border-gray-600 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-2">Flow Diagram</h3>
      <div className="bg-gray-700 p-4 rounded">
        <p className="text-gray-300">Template: {template?.name || 'Sample Template'}</p>
        <p className="text-gray-300">Configuration: {JSON.stringify(configuration || { sampleKey: 'sampleValue' })}</p>
      </div>
    </div>
  );
};