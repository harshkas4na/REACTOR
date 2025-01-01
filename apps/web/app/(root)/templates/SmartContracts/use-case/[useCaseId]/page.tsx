"use client";

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UseCaseHeader } from "@/components/use-case/UseCaseHeader";
import { UseCaseContent } from "@/components/use-case/UseCaseContent";
import { CommentsDialog } from "@/components/use-case/CommentsDialog";
import { useUserSetup } from "@/hooks/templates/useUserSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from "@blocknote/mantine";
import { DeploymentTab } from '@/components/use-case/Deploymenttab';
import Link from 'next/link';

interface UseCaseDetailPageProps {
  params: {
    useCaseId: string;
  };
}

export default function UseCaseDetailPage({ params }: UseCaseDetailPageProps) {
  // State hooks
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("implementation");

  // User setup hook
  const { convexUserId, isAuthenticated } = useUserSetup();

  // Create editors - these must be called in the same order every render
  const overviewEditor = useCreateBlockNote();
  const implementationEditor = useCreateBlockNote();

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

  // Effect hooks
  useEffect(() => {
    if (useCase?.overview) {
      try {
        const parsedContent = JSON.parse(useCase.overview);
        overviewEditor.replaceBlocks(overviewEditor.document, parsedContent);
      } catch (error) {
        console.error("Error parsing overview content:", error);
        overviewEditor.replaceBlocks(overviewEditor.document, [
          { type: "paragraph", content: useCase.overview }
        ]);
      }
    }
  }, [useCase?.overview, overviewEditor]);

  useEffect(() => {
    if (useCase?.implementation) {
      try {
        const parsedContent = JSON.parse(useCase.implementation);
        implementationEditor.replaceBlocks(implementationEditor.document, parsedContent);
      } catch (error) {
        console.error("Error parsing implementation content:", error);
        implementationEditor.replaceBlocks(implementationEditor.document, [
          { type: "paragraph", content: useCase.implementation }
        ]);
      }
    }
  }, [useCase?.implementation, implementationEditor]);

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
    return <div className="text-center text-gray-100 mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-8xl mx-auto">
        <UseCaseHeader />
        <UseCaseContent
          useCase={useCase}
          likes={filteredLikes.length}
          comments={filteredComments.length}
          onLike={handleLike}
          onShowComments={() => setShowComments(true)}
        />
        
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList>
            <TabsTrigger value="implementation">Implementation</TabsTrigger>
            <TabsTrigger value="deployment">Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="implementation">
            <Card className="bg-gray-800 border-gray-700 mb-8">
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
          </TabsContent>

          <TabsContent value="deployment">
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-100">Template Deployment</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-300 mb-4">
                  To deploy this Reactive Smart Contract template, please ensure you have followed these guidelines:
                </p>
                <ul className="list-disc list-inside text-gray-300 mb-4">
                  <li>Include AbstractCallback interface on your Destination contract.</li>
                  <li>Pass Callback_sender inside the AbstractCallback at the constructor, make constructor payable.</li>
                  <li>While deploying, ensure that you are sending at least 0.1 sepETH or the native currency of that chain (for callbacks to happen successfully).</li>
                </ul>
                <p className="text-gray-300 mb-4">
                Use <Link href="/smart-contract-deployer" className='text-blue-500 hover:text-blue-400'>This</Link> to deploy your own origin and destination contracts.
                </p>
                <p className="text-gray-300 mb-4">
                  Before deployment, please verify that your events' topic_0 match those in our template.
                </p>
                <DeploymentTab 
                  reactiveTemplate={useCase.reactiveTemplate}
                  originContract={useCase.originContract}
                  destinationContract={useCase.destinationContract}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-gray-800 border-gray-700 mt-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-100">Benefits and Use Case Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-gray-100 mb-2">Benefits</h3>
            <ul className="list-disc list-inside text-gray-300 mb-4">
              <li>Improved efficiency and automation</li>
              <li>Enhanced transparency and accountability</li>
              <li>Real-time adaptability to changing conditions</li>
              <li>Reduced operational costs</li>
            </ul>
            <h3 className="text-xl font-semibold text-gray-100 mt-4 mb-2">Use Case Scenarios</h3>
            <p className="text-gray-300">
              This Reactive Smart Contract solution can be applied in various scenarios, 
              including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2">
              <li>Large-scale enterprise operations</li>
              <li>Startup ecosystems looking for innovative solutions</li>
              <li>Government and public sector initiatives</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}