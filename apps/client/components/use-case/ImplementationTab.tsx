import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlockNoteView } from "@blocknote/mantine";
import { Copy, Check } from 'lucide-react';
import CodeEditor from '@/components/code-editor';

export const ImplementationTab = ({ useCase, implementationEditor }: { useCase: any, implementationEditor: any }) => {
  const [copiedStates, setCopiedStates] = useState({
    reactive: false,
    origin: false,
    destination: false
  });

  const handleCopy = (type: string) => {
    navigator.clipboard.writeText(useCase[`${type}Contract`]);
    setCopiedStates(prev => ({ ...prev, [type]: true }));
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-100">Implementation Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-gray-300">
            {useCase.implementation ? (
              <BlockNoteView editor={implementationEditor} theme="dark" editable={false} />
            ) : (
              <p>No implementation details available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-100">Contract Templates</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="reactive" className="w-full">
            <TabsList className="bg-gray-700 mb-4">
              <TabsTrigger value="reactive" className="data-[state=active]:bg-blue-500">Reactive</TabsTrigger>
              <TabsTrigger value="origin" className="data-[state=active]:bg-blue-500">Origin</TabsTrigger>
              <TabsTrigger value="destination" className="data-[state=active]:bg-blue-500">Destination</TabsTrigger>
            </TabsList>
            {['reactive', 'origin', 'destination'].map((type) => (
              <TabsContent key={type} value={type}>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(type)}
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                  >
                    {copiedStates[type as keyof typeof copiedStates] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="ml-2">{copiedStates[type as keyof typeof copiedStates] ? 'Copied!' : 'Copy Code'}</span>
                  </Button>
                </div>
                <CodeEditor
                  value={useCase[`${type}Contract`]}
                  language="solidity"
                  height="300px"
                  onChange={() => {}}
                  readOnly={true}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

