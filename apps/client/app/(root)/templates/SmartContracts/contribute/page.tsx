"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, PenSquare, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import EditorPage from './EditorPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeEditor from '@/components/code-editor';
import { Id } from '@/convex/_generated/dataModel';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import dynamic from 'next/dynamic';
import { MDEditorProps } from '@uiw/react-md-editor';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic<MDEditorProps>(() => import('@uiw/react-md-editor'), { ssr: false });
const MDMarkdown = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

type EditorType = 'overview' | 'implementation' | null;

const steps = ['Basic Info', 'Long Description', 'Contracts', 'GitHub & Finalize'];

const tagSuggestions = [
  "ERC20", "ERC721", "ERC1155", "Uniswap", "Aave", "Compound",
  "Yield Farming", "Staking", "Governance", "Multi-sig", "Flash Loans",
  "Oracles", "Cross-chain", "Layer 2", "Gas Optimization"
];

export default function AddUseCasePage() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const createUseCase = useMutation(api.useCases.createUseCase);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const { reactiveContract } = useAutomationContext();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    overview: "",
    implementation: "",
    reactiveTemplate: reactiveContract || "",
    reactiveABI: "",
    reactiveBytecode: "",
    originContract: "",
    originABI: "",
    originBytecode: "",
    destinationContract: "",
    destinationABI: "",
    destinationBytecode: "",
    githubRepo: "",
    category: "",
    tags: [] as string[],
  });
  
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
  const [activeEditor, setActiveEditor] = useState<EditorType>(null);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    const setupUser = async () => {
      if (isAuthenticated && user) {
        const userId = await getOrCreateUser({
          clerkId: user.id,
          name: user.fullName ?? "",
          email: user.emailAddresses[0]?.emailAddress ?? "",
          imageUrl: user.imageUrl ?? ""
        });
        setConvexUserId(userId);
      }
    };
    setupUser();
  }, [isAuthenticated, user, getOrCreateUser]);

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value);
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagsInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleEditorSave = (content: string) => {
    if (!activeEditor) return;
    setFormData(prev => ({
      ...prev,
      [activeEditor]: content
    }));
    setActiveEditor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !convexUserId) {
      toast.error("You must be logged in to create a use case.");
      return;
    }

    try {
      const useCaseData = {
        title: formData.title,
        shortDescription: formData.shortDescription,
        overview: formData.overview,
        implementation: formData.implementation,
        reactiveTemplate: formData.reactiveTemplate,
        reactiveABI: formData.reactiveABI,
        reactiveBytecode: formData.reactiveBytecode,
        originContract: formData.originContract,
        originABI: formData.originABI,
        originBytecode: formData.originBytecode,
        destinationContract: formData.destinationContract,
        destinationABI: formData.destinationABI,
        destinationBytecode: formData.destinationBytecode,
        githubRepo: formData.githubRepo,
        category: formData.category,
        tags: formData.tags,
        userId: convexUserId,
      };

      const result = await createUseCase(useCaseData);
      if (result) {
        toast.success("Use case created successfully!");
        router.push('/templates/SmartContracts');
      } else {
        throw new Error("Failed to create use case");
      }
    } catch (error) {
      toast.error("Failed to create use case. Please try again.");
      console.error("Error creating use case:", error);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  if (activeEditor) {
    return (
      <EditorPage
        initialContent={formData[activeEditor]}
        onSave={handleEditorSave}
        onCancel={() => setActiveEditor(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/templates/SmartContracts">
          <Button variant="outline" className="mb-6 hover:bg-gray-800 transition-colors duration-200">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
          </Button>
        </Link>

        <Card className="bg-gray-800 border-gray-700 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl font-bold">Add New Use Case</CardTitle>
            <CardDescription className="text-gray-200">
              {steps[currentStep]}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-8">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      index <= currentStep ? 'bg-blue-500 text-white scale-110' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 w-full sm:w-24 transition-all duration-200 ${
                        index < currentStep ? 'bg-blue-500' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-gray-200 text-lg">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    required
                    className="bg-gray-700 text-gray-200 border-gray-600 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shortDescription" className="text-gray-200 text-lg">Short Description</Label>
                  <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange('shortDescription')}
                    required
                    className="bg-gray-700 text-gray-200 border-gray-600 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-gray-200 text-lg">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger id="category" className="bg-gray-700 text-gray-200 border-gray-600 mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="defi">DeFi</SelectItem>
                      <SelectItem value="nft">NFT</SelectItem>
                      <SelectItem value="dao">DAO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tags" className="text-gray-200 text-lg">Tags</Label>
                  <div className="relative">
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={handleTagsChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagsInput.trim()) {
                          e.preventDefault();
                          addTag(tagsInput.trim());
                        }
                      }}
                      placeholder="Type a tag and press Enter"
                      className="bg-gray-700 text-gray-200 border-gray-600 mt-1"
                    />
                    {tagsInput && (
                      <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                        {tagSuggestions
                          .filter(tag => tag.toLowerCase().includes(tagsInput.toLowerCase()) && !formData.tags.includes(tag))
                          .map((tag, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-700 text-gray-200 transition-colors duration-150"
                              onClick={() => addTag(tag)}
                            >
                              {tag}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm flex items-center">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 focus:outline-none"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <Label htmlFor="overview" className="text-gray-200 text-lg">Overview</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveEditor('overview')}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 flex items-center justify-center gap-2 py-3"
                    >
                      <PenSquare className="h-5 w-5" />
                      {formData.overview ? 'Edit Overview' : 'Add Overview'}
                    </Button>
                  </div>
                  {formData.overview && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg" data-color-mode="dark">
                      <MDMarkdown
                        source={formData.overview}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'rgb(209 213 219)'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="implementation" className="text-gray-200 text-lg">Implementation Details</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveEditor('implementation')}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 flex items-center justify-center gap-2 py-3"
                    >
                      <PenSquare className="h-5 w-5" />
                      {formData.implementation ? 'Edit Implementation Details' : 'Add Implementation Details'}
                    </Button>
                  </div>
                  {formData.implementation && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg" data-color-mode="dark">
                      <MDMarkdown
                        source={formData.implementation}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'rgb(209 213 219)'
                        }}
                      />
                    </div>
                  )}
                  </div>
                </div>
              )}
  
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <Label htmlFor="reactiveTemplate" className="text-gray-200 text-lg">Reactive Template</Label>
                    <Tabs defaultValue="code" className="w-full mt-2">
                      <div className='flex justify-between items-center mb-4'>
                        <TabsList className="bg-gray-700">
                          <TabsTrigger value="code" className="data-[state=active]:bg-blue-500">Code</TabsTrigger>
                          <TabsTrigger value="abi" className="data-[state=active]:bg-blue-500">ABI</TabsTrigger>
                          <TabsTrigger value="bytecode" className="data-[state=active]:bg-blue-500">Bytecode</TabsTrigger>
                        </TabsList>
                        <Button variant="outline" className="bg-blue-500 hover:bg-blue-600 text-white">
                          <Link href="/deploy-reactive-contract">Generate Template</Link>
                        </Button>
                      </div>
                      <TabsContent value="code">
                        <CodeEditor
                          value={formData.reactiveTemplate}
                          onChange={(value) => setFormData(prev => ({ ...prev, reactiveTemplate: value as string }))}
                          language="solidity"
                          height="300px"
                        />
                      </TabsContent>
                      <TabsContent value="abi">
                        <CodeEditor
                          value={formData.reactiveABI}
                          onChange={(value) => setFormData(prev => ({ ...prev, reactiveABI: value as string }))}
                          language="json"
                          height="300px"
                        />
                      </TabsContent>
                      <TabsContent value="bytecode">
                        <CodeEditor
                          value={formData.reactiveBytecode}
                          onChange={(value) => setFormData(prev => ({ ...prev, reactiveBytecode: value as string }))}
                          language="text"
                          height="300px"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
  
                  <div>
                    <Label htmlFor="originContract" className="text-gray-200 text-lg">Origin Contract</Label>
                    <Tabs defaultValue="code" className="w-full mt-2">
                      <TabsList className="bg-gray-700">
                        <TabsTrigger value="code" className="data-[state=active]:bg-blue-500">Code</TabsTrigger>
                        <TabsTrigger value="abi" className="data-[state=active]:bg-blue-500">ABI</TabsTrigger>
                        <TabsTrigger value="bytecode" className="data-[state=active]:bg-blue-500">Bytecode</TabsTrigger>
                      </TabsList>
                      <TabsContent value="code">
                        <CodeEditor
                          value={formData.originContract}
                          onChange={(value) => setFormData(prev => ({ ...prev, originContract: value as string }))}
                          language="solidity"
                          height="200px"
                        />
                      </TabsContent>
                      <TabsContent value="abi">
                        <CodeEditor
                          value={formData.originABI}
                          onChange={(value) => setFormData(prev => ({ ...prev, originABI: value as string }))}
                          language="json"
                          height="200px"
                        />
                      </TabsContent>
                      <TabsContent value="bytecode">
                        <CodeEditor
                          value={formData.originBytecode}
                          onChange={(value) => setFormData(prev => ({ ...prev, originBytecode: value as string }))}
                          language="text"
                          height="200px"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
  
                  <div>
                    <Label htmlFor="destinationContract" className="text-gray-200 text-lg">Destination Contract</Label>
                    <Tabs defaultValue="code" className="w-full mt-2">
                      <TabsList className="bg-gray-700">
                        <TabsTrigger value="code" className="data-[state=active]:bg-blue-500">Code</TabsTrigger>
                        <TabsTrigger value="abi" className="data-[state=active]:bg-blue-500">ABI</TabsTrigger>
                        <TabsTrigger value="bytecode" className="data-[state=active]:bg-blue-500">Bytecode</TabsTrigger>
                      </TabsList>
                      <TabsContent value="code">
                        <CodeEditor
                          value={formData.destinationContract}
                          onChange={(value) => setFormData(prev => ({ ...prev, destinationContract: value as string }))}
                          language="solidity"
                          height="200px"
                        />
                      </TabsContent>
                      <TabsContent value="abi">
                        <CodeEditor
                          value={formData.destinationABI}
                          onChange={(value) => setFormData(prev => ({ ...prev, destinationABI: value as string }))}
                          language="json"
                          height="200px"
                        />
                      </TabsContent>
                      <TabsContent value="bytecode">
                        <CodeEditor
                          value={formData.destinationBytecode}
                          onChange={(value) => setFormData(prev => ({ ...prev, destinationBytecode: value as string }))}
                          language="text"
                          height="200px"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
  
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-300 leading-6">
                          Submit your Foundry repository here. For guidance on the required structure, check out our official demo repository:
                        </p>
                        <a 
                          href="https://github.com/Reactive-Network/reactive-smart-contract-demos" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                          </svg>
                          View Reactive Demo Repository
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="githubRepo" className="text-gray-200 text-lg">
                      GitHub Repository URL
                    </Label>
                    <Input
                      id="githubRepo"
                      type="url"
                      value={formData.githubRepo}
                      onChange={handleInputChange('githubRepo')}
                      required
                      className="bg-gray-700 text-gray-200 border-gray-600"
                      placeholder="https://github.com/yourusername/your-repo"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="hover:bg-gray-700 transition-colors duration-200"
              >
                Previous
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button 
                  onClick={handleSubmit}
                  className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200"
                >
                  Create Use Case
                </Button>
              ) : (
                <Button 
                  onClick={nextStep}
                  className="bg-blue-500 hover:bg-blue-600 transition-colors duration-200"
                >
                  Next
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }