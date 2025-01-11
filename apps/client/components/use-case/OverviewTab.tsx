import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlockNoteView } from "@blocknote/mantine";

export const OverviewTab = ({ useCase, overviewEditor }: { useCase: any, overviewEditor: any }) => {
  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-100">Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-gray-300">
            {useCase.overview ? (
              <BlockNoteView editor={overviewEditor} theme="dark" editable={false} />
            ) : (
              <p>No overview available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-100">Benefits and Use Cases</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="benefits">
              <AccordionTrigger className="text-gray-100">Benefits</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                <ul className="list-disc list-inside">
                  <li>Improved efficiency and automation</li>
                  <li>Enhanced transparency and accountability</li>
                  <li>Real-time adaptability to changing conditions</li>
                  <li>Reduced operational costs</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="use-cases">
              <AccordionTrigger className="text-gray-100">Use Case Scenarios</AccordionTrigger>
              <AccordionContent className="text-gray-300">
                <p>This Reactive Smart Contract solution can be applied in various scenarios, including:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Large-scale enterprise operations</li>
                  <li>Startup ecosystems looking for innovative solutions</li>
                  <li>Government and public sector initiatives</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-100">Technical Requirements</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-1 rounded-lg">
            <div className="bg-gray-800 rounded-lg p-4">
              <ul className="list-disc list-inside text-gray-300">
                <li>Solidity version 0.8.0 or higher</li>
                <li>Compatible with EVM-based blockchains</li>
                <li>Minimum of 1 GB RAM for optimal performance</li>
                <li>Internet connection for real-time updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

