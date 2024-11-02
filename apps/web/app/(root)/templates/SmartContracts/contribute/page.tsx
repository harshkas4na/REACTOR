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
import { ArrowLeft, Save, PenSquare } from "lucide-react";
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import EditorPage from './EditorPage';
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";

import {useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeEditor from '@/components/code-editor';
import { Id } from '@/convex/_generated/dataModel';

const steps = ['Basic Info', 'Long Description', 'Reactive Template', 'GitHub & Finalize'];

export default function AddUseCasePage() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const createUseCase = useMutation(api.useCases.createUseCase);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    longDescription: "",
    reactiveTemplate: "",
    githubRepo: "",
    category: "",
    tags: [] as string[],
  });
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const editor = useCreateBlockNote();

  useEffect(() => {
    if (formData.longDescription) {
      try {
        const parsedContent = JSON.parse(formData.longDescription);
        editor.replaceBlocks(editor.document, parsedContent);
      } catch (error) {
        console.error("Error parsing editor content:", error);
      }
    }
  }, [formData.longDescription, editor]);

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
    const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setFormData(prev => ({
      ...prev,
      tags: tagsArray
    }));
  };

  const handleEditorSave = (content: string) => {
    setFormData(prev => ({
      ...prev,
      longDescription: content
    }));
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !convexUserId) {
      toast.error("You must be logged in to create a use case.");
      return;
    }

    try {
      await createUseCase({
        ...formData,
        userId: convexUserId
      });
      toast.success("Use case created successfully!");
      router.push('/templates/SmartContracts');
    } catch (error) {
      toast.error("Failed to create use case. Please try again.");
      console.error("Error creating use case:", error);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  if (isEditing) {
    return (
      <EditorPage
        initialContent={formData.longDescription}
        onSave={handleEditorSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/templates/SmartContracts">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
          </Button>
        </Link>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white">
            <CardTitle className="text-3xl font-bold">Add New Use Case</CardTitle>
            <CardDescription className="text-gray-200">
              {steps[currentStep]}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 w-16 ${
                        index < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-gray-200">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleInputChange('title')}
                    required
                    className="bg-gray-700 text-gray-200 border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="shortDescription" className="text-gray-200">Short Description</Label>
                  <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange('shortDescription')}
                    required
                    className="bg-gray-700 text-gray-200 border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-gray-200">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger id="category" className="bg-gray-700 text-gray-200 border-gray-600">
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
                  <Label htmlFor="tags" className="text-gray-200">Tags</Label>
                  <Input
                    id="tags"
                    value={tagsInput}
                    onChange={handleTagsChange}
                    placeholder="Enter tags separated by commas"
                    className="bg-gray-700 text-gray-200 border-gray-600"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <Label htmlFor="longDescription" className="text-gray-200">Long Description</Label>
                <div className="mt-2">
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <PenSquare className="h-4 w-4" />
                    {formData.longDescription ? 'Edit Description' : 'Add Description'}
                  </Button>
                </div>
                {formData.longDescription && (
                  <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    <BlockNoteView editor={editor} theme="dark" />
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <Label htmlFor="reactiveTemplate" className="text-gray-200">Reactive Template</Label>
                <Tabs defaultValue="code" className="w-full mt-2">
                  <TabsList>
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="code">
                    <CodeEditor
                      value={formData.reactiveTemplate}
                      onChange={(value) => setFormData(prev => ({ ...prev, reactiveTemplate: value }))}
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded p-4 bg-gray-700 text-gray-200">
                      <pre>{formData.reactiveTemplate}</pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <Label htmlFor="githubRepo" className="text-gray-200">GitHub Repository URL</Label>
                <Input
                  id="githubRepo"
                  type="url"
                  value={formData.githubRepo}
                  onChange={handleInputChange('githubRepo')}
                  required
                  className="bg-gray-700 text-gray-200 border-gray-600"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              Previous
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleSubmit}>
                Create Use Case
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}