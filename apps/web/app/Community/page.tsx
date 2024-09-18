"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Save, Upload, ExternalLink, Github } from "lucide-react";
import Link from 'next/link';

interface EventFunctionPair {
  originEvent: string;
  destinationFunction: string;
}

interface SmartContractMetadata {
  exampleContract: string;
}

const TemplateLibraryComponent: React.FC = () => {
  const [libraryName, setLibraryName] = useState<string>('');
  const [originContractGuide, setOriginContractGuide] = useState<string>('');
  const [originMetadata, setOriginMetadata] = useState<SmartContractMetadata>({ 
    exampleContract: ''
  });
  const [destinationContractGuide, setDestinationContractGuide] = useState<string>('');
  const [destinationMetadata, setDestinationMetadata] = useState<SmartContractMetadata>({ 
    exampleContract: ''
  });
  const [isSameContract, setIsSameContract] = useState<boolean>(false);
  const [eventFunctionPairs, setEventFunctionPairs] = useState<EventFunctionPair[]>([{ originEvent: '', destinationFunction: '' }]);
  const [visualRepresentation, setVisualRepresentation] = useState<string>('');
  const [hasReactiveTemplate, setHasReactiveTemplate] = useState<boolean>(false);
  const [reactiveContractExplanation, setReactiveContractExplanation] = useState<string>('');
  const [reactiveContractCode, setReactiveContractCode] = useState<string>('');
  const [reactiveContractMetadata, setReactiveContractMetadata] = useState<string>('');
  const [hasGithubRepo, setHasGithubRepo] = useState<boolean>(false);
  const [githubRepoLink, setGithubRepoLink] = useState<string>('');

  const handleAddEventFunctionPair = () => {
    setEventFunctionPairs([...eventFunctionPairs, { originEvent: '', destinationFunction: '' }]);
  };

  const handleEventFunctionPairChange = (index: number, field: 'originEvent' | 'destinationFunction', value: string) => {
    const newPairs = eventFunctionPairs.map((pair, i) => 
      i === index ? { ...pair, [field]: value } : pair
    );
    setEventFunctionPairs(newPairs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the template library data to your backend
    console.log('Template Library submitted:', { 
      libraryName, 
      originContractGuide, 
      originMetadata, 
      destinationContractGuide, 
      destinationMetadata,
      isSameContract,
      eventFunctionPairs,
      visualRepresentation,
      hasReactiveTemplate,
      reactiveContractExplanation,
      reactiveContractCode,
      reactiveContractMetadata,
      hasGithubRepo,
      githubRepoLink
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Create Template Library</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Library Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="libraryName">Library Name</Label>
              <Input
                id="libraryName"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="Enter a name for your template library"
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GitHub Repository</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="has-github-repo"
                  checked={hasGithubRepo}
                  onCheckedChange={setHasGithubRepo}
                />
                <Label htmlFor="has-github-repo">I have a GitHub repository with all the contracts</Label>
              </div>
              {hasGithubRepo && (
                <div className="mt-4">
                  <Label htmlFor="github-repo-link">GitHub Repository Link</Label>
                  <Input
                    id="github-repo-link"
                    value={githubRepoLink}
                    onChange={(e) => setGithubRepoLink(e.target.value)}
                    placeholder="Enter the GitHub repository URL"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Origin Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={originContractGuide}
                onChange={(e) => setOriginContractGuide(e.target.value)}
                placeholder="Provide guidance for the Origin contract..."
                className="h-32 mb-4"
                required
              />
              <Label>Example Contract</Label>
              <Textarea
                value={originMetadata.exampleContract}
                onChange={(e) => setOriginMetadata({ ...originMetadata, exampleContract: e.target.value })}
                placeholder="Provide an example Origin contract..."
                className="h-32"
              />
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2">
            <Switch
              id="same-contract"
              checked={isSameContract}
              onCheckedChange={setIsSameContract}
            />
            <Label htmlFor="same-contract">Origin and Destination contracts are the same</Label>
          </div>

          {!isSameContract && (
            <Card>
              <CardHeader>
                <CardTitle>Destination Contract</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={destinationContractGuide}
                  onChange={(e) => setDestinationContractGuide(e.target.value)}
                  placeholder="Provide guidance for the Destination contract..."
                  className="h-32 mb-4"
                  required
                />
                <Label>Example Contract</Label>
                <Textarea
                  value={destinationMetadata.exampleContract}
                  onChange={(e) => setDestinationMetadata({ ...destinationMetadata, exampleContract: e.target.value })}
                  placeholder="Provide an example Destination contract..."
                  className="h-32"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Event-Function Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              {eventFunctionPairs.map((pair, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    value={pair.originEvent}
                    onChange={(e) => handleEventFunctionPairChange(index, 'originEvent', e.target.value)}
                    placeholder="Origin Event"
                  />
                  <Input
                    value={pair.destinationFunction}
                    onChange={(e) => handleEventFunctionPairChange(index, 'destinationFunction', e.target.value)}
                    placeholder="Destination Function"
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddEventFunctionPair}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Pair
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visual Representation</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => setVisualRepresentation(e.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {visualRepresentation && (
                <img src={visualRepresentation} alt="Visual Representation" className="mt-4 max-w-full h-auto" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reactive Smart Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="has-reactive-template"
                  checked={hasReactiveTemplate}
                  onCheckedChange={setHasReactiveTemplate}
                />
                <Label htmlFor="has-reactive-template">I have a Reactive Smart Contract Template ready</Label>
              </div>
              
              {hasReactiveTemplate ? (
                <>
                  <Label>Explanation</Label>
                  <Textarea
                    value={reactiveContractExplanation}
                    onChange={(e) => setReactiveContractExplanation(e.target.value)}
                    placeholder="Provide a detailed explanation of the Reactive Smart Contract..."
                    className="h-32 mb-4"
                    required
                  />
                  <Label>Code</Label>
                  <Textarea
                    value={reactiveContractCode}
                    onChange={(e) => setReactiveContractCode(e.target.value)}
                    placeholder="Paste the Reactive Smart Contract code here..."
                    className="h-64 mb-4"
                    required
                  />
                  <Label>Metadata</Label>
                  <Textarea
                    value={reactiveContractMetadata}
                    onChange={(e) => setReactiveContractMetadata(e.target.value)}
                    placeholder="Provide any additional metadata for the Reactive Smart Contract..."
                    className="h-32"
                  />
                </>
              ) : (
                <Link href="/generate" passHref>
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Generate Reactive Smart Contract
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Template Library
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TemplateLibraryComponent;