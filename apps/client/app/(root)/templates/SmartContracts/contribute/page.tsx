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

    // Return statement part - replace the existing return in your component
return (
  <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
    <div className="relative z-20 max-w-4xl mx-auto pointer-events-auto">
      <Link href="/templates/SmartContracts">
        <Button 
          variant="outline" 
          className="relative mb-6 text-zinc-300 border-zinc-700 hover:bg-blue-900/20 hover:text-zinc-100 pointer-events-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
        </Button>
      </Link>

      <Card className="relative z-20 pointer-events-auto bg-gradient-to-br from-zinc-900/50 to-zinc-900/80 border-zinc-800 shadow-xl backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-lg border-b border-zinc-800">
          <CardTitle className="text-3xl font-bold text-zinc-100">
            Add New Use Case
          </CardTitle>
          <CardDescription className="text-zinc-300">
            {steps[currentStep]}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative p-6">
          <div className="relative z-20 flex justify-between items-center mb-8">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`relative z-20 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    index <= currentStep 
                      ? 'bg-primary text-white scale-110' 
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`relative z-10 h-1 w-full sm:w-24 transition-all duration-200 ${
                      index < currentStep ? 'bg-primary' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="relative z-20">
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-zinc-200 text-lg">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    required
                    className="relative z-20 bg-zinc-800/50 text-zinc-200 border-zinc-700 mt-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="shortDescription" className="text-zinc-200 text-lg">
                    Short Description
                  </Label>
                  <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange('shortDescription')}
                    required
                    className="relative z-20 bg-zinc-800/50 text-zinc-200 border-zinc-700 mt-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-zinc-200 text-lg">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger 
                      id="category" 
                      className="relative z-20 bg-zinc-800/50 text-zinc-200 border-zinc-700 mt-1"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="relative z-30 bg-zinc-800 border-zinc-700">
                      <SelectItem value="token" className="text-zinc-200 focus:bg-primary/20">Token</SelectItem>
                      <SelectItem value="defi" className="text-zinc-200 focus:bg-primary/20">DeFi</SelectItem>
                      <SelectItem value="nft" className="text-zinc-200 focus:bg-primary/20">NFT</SelectItem>
                      <SelectItem value="dao" className="text-zinc-200 focus:bg-primary/20">DAO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tags" className="text-zinc-200 text-lg">Tags</Label>
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
                      className="relative z-20 bg-zinc-800/50 text-zinc-200 border-zinc-700 mt-1 focus:ring-blue-500"
                    />
                    {tagsInput && (
                      <div className="absolute z-30 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-auto">
                        {tagSuggestions
                          .filter(tag => 
                            tag.toLowerCase().includes(tagsInput.toLowerCase()) && 
                            !formData.tags.includes(tag)
                          )
                          .map((tag, index) => (
                            <div
                              key={index}
                              className="px-4 py-2 cursor-pointer hover:bg-primary/20 text-zinc-200"
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
                      <span 
                        key={index} 
                        className="relative z-20 bg-primary/20 text-blue-300 px-2 py-1 rounded-full text-sm flex items-center border border-blue-500/20"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 focus:outline-none hover:text-blue-200"
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
                  <Label htmlFor="overview" className="text-zinc-200 text-lg">Overview</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveEditor('overview')}
                      className="relative z-20 w-full bg-primary text-white flex items-center justify-center gap-2 py-3"
                    >
                      <PenSquare className="h-5 w-5" />
                      {formData.overview ? 'Edit Overview' : 'Add Overview'}
                    </Button>
                  </div>
                  {formData.overview && (
                    <div 
                      className="relative z-20 mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700" 
                      data-color-mode="dark"
                    >
                      <MDMarkdown
                        source={formData.overview}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'rgb(228 228 231)'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="implementation" className="text-zinc-200 text-lg">
                    Implementation Details
                  </Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      onClick={() => setActiveEditor('implementation')}
                      className="relative z-20 w-full bg-primary text-white flex items-center justify-center gap-2 py-3"
                    >
                      <PenSquare className="h-5 w-5" />
                      {formData.implementation ? 'Edit Implementation Details' : 'Add Implementation Details'}
                    </Button>
                  </div>
                  {formData.implementation && (
                    <div 
                      className="relative z-20 mt-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700" 
                      data-color-mode="dark"
                    >
                      <MDMarkdown
                        source={formData.implementation}
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'rgb(228 228 231)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="relative z-20 space-y-8">
                {/* Reactive Template Section */}
                <div>
                  <Label htmlFor="reactiveTemplate" className="text-zinc-200 text-lg">
                    Reactive Template
                  </Label>
                  <Tabs defaultValue="code" className="relative z-20 w-full mt-2">
                    <div className='flex justify-between items-center mb-4'>
                      <TabsList className="bg-zinc-800">
                        <TabsTrigger value="code" className="data-[state=active]:bg-primary text-zinc-300">
                          Code
                        </TabsTrigger>
                        <TabsTrigger value="abi" className="data-[state=active]:bg-primary text-zinc-300">
                          ABI
                        </TabsTrigger>
                        <TabsTrigger value="bytecode" className="data-[state=active]:bg-primary text-zinc-300">
                          Bytecode
                        </TabsTrigger>
                      </TabsList>
                      <Button variant="outline" className="bg-primary text-white border-none">
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

                {/* Origin Contract Section */}
                <div>
                  <Label htmlFor="originContract" className="text-zinc-200 text-lg">
                    Origin Contract
                  </Label>
                  <Tabs defaultValue="code" className="relative z-20 w-full mt-2">
                    <TabsList className="bg-zinc-800">
                      <TabsTrigger value="code" className="data-[state=active]:bg-primary text-zinc-300">
                        Code
                      </TabsTrigger>
                      <TabsTrigger value="abi" className="data-[state=active]:bg-primary text-zinc-300">
                        ABI
                      </TabsTrigger>
                      <TabsTrigger value="bytecode" className="data-[state=active]:bg-primary text-zinc-300">
                        Bytecode
                      </TabsTrigger>
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

                {/* Destination Contract Section */}
                <div>
                  <Label htmlFor="destinationContract" className="text-zinc-200 text-lg">
                    Destination Contract
                  </Label>
                  <Tabs defaultValue="code" className="relative z-20 w-full mt-2">
                    <TabsList className="bg-zinc-800">
                      <TabsTrigger value="code" className="data-[state=active]:bg-primary text-zinc-300">
                        Code
                      </TabsTrigger>
                      <TabsTrigger value="abi" className="data-[state=active]:bg-primary text-zinc-300">
                        ABI
                      </TabsTrigger>
                      <TabsTrigger value="bytecode" className="data-[state=active]:bg-primary text-zinc-300">
                        Bytecode
                      </TabsTrigger>
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
              <div className="relative z-20 space-y-6">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-300 leading-6">
                        Submit your Foundry repository here. For guidance on the required structure, 
                        check out our official demo repository:
                      </p>
                      <a 
                        href="https://github.com/Reactive-Network/reactive-smart-contract-demos" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-20 inline-flex items-center mt-2 text-blue-400 hover:text-blue-300 transition-colors"
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
                  <Label htmlFor="githubRepo" className="text-zinc-200 text-lg">
                    GitHub Repository URL
                  </Label>
                  <Input
                    id="githubRepo"
                    type="url"
                    value={formData.githubRepo}
                    onChange={handleInputChange('githubRepo')}
                    required
                    className="relative z-20 bg-zinc-800/50 text-zinc-200 border-zinc-700 focus:ring-blue-500"
                    placeholder="https://github.com/yourusername/your-repo"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="relative z-20 flex justify-between p-6 border-t border-zinc-800">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0}
            className="text-zinc-300 border-zinc-700 hover:bg-blue-900/20 hover:text-zinc-100"
          >
            Previous
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={handleSubmit}
              className="bg-primary text-white"
            >
              Create Use Case
            </Button>
          ) : (
            <Button 
              onClick={nextStep}
              className="bg-primary text-white"
            >
              Next
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Editor page wrapper with proper z-index when active */}
      {activeEditor && (
        <div className="fixed inset-0 z-50">
          <EditorPage
            initialContent={formData[activeEditor]}
            onSave={handleEditorSave}
            onCancel={() => setActiveEditor(null)}
          />
        </div>
      )}
    </div>
  </div>
);
  }