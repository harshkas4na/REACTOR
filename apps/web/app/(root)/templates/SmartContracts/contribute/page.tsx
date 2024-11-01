"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/convex/_generated/api';
import { PenSquare } from "lucide-react";
import EditorPage from './EditorPage';
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

type EditorContent = {
  type: string;
  content: Array<{
    type: string;
    text: string;
    styles?: Record<string, boolean>;
  }>;
  children: any[];
  // Add other properties as needed based on your BlockNote structure
}[];

export default function AddUseCasePage() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const createUseCase = useMutation(api.useCases.createUseCase);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  // State management
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    longDescription: "",
    reactiveTemplate: "",
    githubRepo: "",
  });
  const [editorContent, setEditorContent] = useState(null);
  const [convexUserId, setConvexUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Create editor instance
  const editor = useCreateBlockNote({
  });

  // Load editor content when available
  useEffect(() => {
  if (formData.longDescription) {
    try {
      const parsedContent = JSON.parse(formData.longDescription);
      editor.replaceBlocks(editor.document, parsedContent);
    } catch (error) {
      console.error("Error parsing editor content:", error);
    }
  }
}, [formData.longDescription]);

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

  // Handle form input changes
  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Handle editor content save
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
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
              </div>
              {formData.longDescription && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <BlockNoteView editor={editor} theme="dark" />
                </div>
              )}
              <div>
                <Label htmlFor="reactiveTemplate" className="text-gray-200">Reactive Template</Label>
                <Textarea
                  id="reactiveTemplate"
                  value={formData.reactiveTemplate}
                  onChange={handleInputChange('reactiveTemplate')}
                  required
                  className="bg-gray-700 text-gray-200 border-gray-600 font-mono"
                  rows={10}
                />
              </div>
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
              <Button type="submit" className="w-full">
                Create Use Case
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}