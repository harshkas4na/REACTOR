"use client";
import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UseCaseContent } from "@/components/use-case/UseCaseContent";
import { CommentsDialog } from "@/components/use-case/CommentsDialog";
import { useUserSetup } from "@/hooks/templates/useUserSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import LoadingSkeleton from './LoadingSkeleton';
import DeploymentTab from '@/components/use-case/Deploymenttab';
import { ExpandableContent } from '@/components/use-case/ExpandableContent';

const MDMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

const PREVIEW_LENGTH = 500; // Characters to show in implementation preview

interface UseCaseDetailPageProps {
  params: {
    useCaseId: string;
  };
}

export default function UseCaseDetailPage({ params }: UseCaseDetailPageProps) {
  const [showComments, setShowComments] = useState(false);
  const [showImplementation, setShowImplementation] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("implementation");

  const { convexUserId, isAuthenticated } = useUserSetup();

  // Query hooks
  const useCase = useQuery(api.useCases.getUseCase, { 
    id: params.useCaseId as Id<"useCases"> 
  });
  const comments = useQuery(api.useCases.listComments);
  const likes = useQuery(api.useCases.listLikes);
  const users = useQuery(api.users.listUsers);
  
  // Mutation hooks
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  // Event handlers
  const handleLike = async () => {
    if (!isAuthenticated || !convexUserId || !useCase) return;
    await likeUseCase({ useCaseId: useCase._id, userId: convexUserId });
  };

  const handleComment = async () => {
    if (!isAuthenticated || !convexUserId || !newComment.trim() || !useCase) return;
    await addComment({ 
      useCaseId: useCase._id, 
      userId: convexUserId, 
      text: newComment.trim(),
      timestamp: new Date().toISOString() 
    });
    setNewComment("");
  };

  // Derived values
  const filteredComments = comments?.filter(
    comment => comment.useCaseId === params.useCaseId
  ) || [];
  const filteredLikes = likes?.filter(
    like => like.useCaseId === params.useCaseId
  ) || [];

  if (!useCase || !comments || !likes || !users) {
    return <LoadingSkeleton />;
  }

  // Create implementation preview
  const implementationPreview = useCase.implementation 
    ? useCase.implementation.slice(0, PREVIEW_LENGTH) + (useCase.implementation.length > PREVIEW_LENGTH ? '...' : '')
    : '';

  return (
    <div className="relative mt-3 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-8xl mx-auto pointer-events-auto">
        <div className="relative mb-8">
          <Link href="/templates/SmartContracts">
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
            </Button>
          </Link>
        </div>

        <div className="relative mb-8">
          <UseCaseContent
            useCase={useCase}
            likes={filteredLikes.length}
            comments={filteredComments.length}
            onLike={handleLike}
            onShowComments={() => setShowComments(true)}
          />
        </div>
        
        <CommentsDialog
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          comments={filteredComments}
          users={users}
          useCaseTitle={useCase.title}
          newComment={newComment}
          onCommentChange={setNewComment}
          onSubmitComment={handleComment}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-20 mt-8">
          <TabsList className="bg-blue-900/20 border border-zinc-800">
            <TabsTrigger 
              value="implementation" 
              className="data-[state=active]:bg-primary text-zinc-300"
            >
              Implementation
            </TabsTrigger>
            <TabsTrigger 
              value="deployment"
              className="data-[state=active]:bg-primary text-zinc-300"
            >
              Deployment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="implementation">
            <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-2xl font-bold text-zinc-100">
                  Implementation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <ExpandableContent 
                    content={useCase.implementation || 'No implementation details available.'} 
                    previewLength={500}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment">
            <Card className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-2xl font-bold text-zinc-100">
                  Contract Deployment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-2">Important Notes:</h3>
                    <ul className="list-disc list-inside text-zinc-300 space-y-2">
                      <li>Ensure your Destination contract includes the AbstractCallback interface</li>
                      <li>Constructor must be payable and include Callback_sender parameter</li>
                      <li>Minimum 0.1 native tokens required for successful callbacks</li>
                    </ul>
                  </div>

                  <DeploymentTab 
                    reactiveTemplate={useCase.reactiveTemplate}
                    originContract={useCase.originContract}
                    originABI={useCase.originABI}
                    originBytecode={useCase.originBytecode}
                    destinationContract={useCase.destinationContract}
                    destinationABI={useCase.destinationABI}
                    destinationBytecode={useCase.destinationBytecode}
                    reactiveABI={useCase.reactiveABI}
                    reactiveBytecode={useCase.reactiveBytecode}
                    helperContracts={useCase.helperContracts}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}