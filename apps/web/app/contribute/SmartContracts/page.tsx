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

export default function AddUseCasePage() {
  const router = useRouter();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const createUseCase = useMutation(api.useCases.createUseCase);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [reactiveTemplate, setReactiveTemplate] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [convexUserId, setConvexUserId] = useState(null);

  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !convexUserId) {
      toast.error("You must be logged in to create a use case.");
      return;
    }

    try {
      await createUseCase({
        title,
        shortDescription,
        longDescription,
        reactiveTemplate,
        githubRepo,
        userId: convexUserId
      });
      toast.success("Use case created successfully!");
      router.push('/Templates/SmartContracts');
    } catch (error) {
      toast.error("Failed to create use case. Please try again.");
      console.error("Error creating use case:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/Templates/SmartContracts">
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-gray-700 text-gray-200 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="shortDescription" className="text-gray-200">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  required
                  className="bg-gray-700 text-gray-200 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="longDescription" className="text-gray-200">Long Description</Label>
                <Textarea
                  id="longDescription"
                  value={longDescription}
                  onChange={(e) => setLongDescription(e.target.value)}
                  required
                  className="bg-gray-700 text-gray-200 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="reactiveTemplate" className="text-gray-200">Reactive Template</Label>
                <Textarea
                  id="reactiveTemplate"
                  value={reactiveTemplate}
                  onChange={(e) => setReactiveTemplate(e.target.value)}
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
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
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