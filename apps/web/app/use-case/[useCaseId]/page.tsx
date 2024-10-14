"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThumbsUp, MessageSquare, Code, BookOpen, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';

type UseCaseDetailPageProps = {
  params: {
    useCaseId: string;
  };
};

export default function UseCaseDetailPage({ params }: UseCaseDetailPageProps) {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const useCase = useQuery(api.useCases.getUseCase, { id: params.useCaseId as Id<"useCases"> });
  const comments0 = useQuery(api.useCases.listComments);
  const likes0 = useQuery(api.useCases.listLikes);
  const users = useQuery(api.users.listUsers);
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);

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

  function getUserName(userId: Id<"users">) {
    const user = users?.find(u => u._id === userId);
    return user ? user.name : "Unknown User";
  }

  const handleLike = async () => {
    if (!isAuthenticated || !convexUserId || !useCase) return;
    await likeUseCase({ useCaseId: useCase._id, userId: convexUserId });
  };

  const handleComment = async () => {
    if (!isAuthenticated || !convexUserId || !newComment.trim() || !useCase) return;
    await addComment({ useCaseId: useCase._id, userId: convexUserId, text: newComment.trim() });
    setNewComment("");
  };
  function getComments(useCaseId: string) {
    return comments0?.filter((comment) => comment.useCaseId === useCaseId) || [];
  }

  function getLikes(useCaseId: string) {
    return likes0?.filter((like) => like.useCaseId === useCaseId) || [];
  }
  console.log(useCase);
  const comments=getComments(params.useCaseId);
  const likes=getLikes(params.useCaseId);
  

  if (!useCase || !comments || !likes || !users) {
    return <div className="text-center text-gray-100 mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/Templates/SmartContracts">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Use Cases
          </Button>
        </Link>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white">
            <CardTitle className="text-3xl font-bold">{useCase.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-300 mb-4">{useCase.longDescription}</p>
            <div className="flex space-x-4 mb-6">
              <Button
                variant="outline"
                className="flex items-center space-x-2 bg-gray-700 text-gray-200"
                onClick={handleLike}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{likes.length} Likes</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2 bg-gray-700 text-gray-200"
                onClick={() => setShowComments(true)}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{comments.length} Comments</span>
              </Button>
            </div>
            <div className="flex space-x-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 bg-gray-700 text-gray-200">
                    <Code className="h-4 w-4" />
                    <span>View Reactive Template</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-gray-800 text-gray-100">
                  <DialogHeader>
                    <DialogTitle>{useCase.title} - Reactive Template</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
                    <pre className="text-sm text-gray-300">
                      <code>{useCase.reactiveTemplate}</code>
                    </pre>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="flex items-center space-x-2 bg-gray-700 text-gray-200"
                onClick={() => window.open(useCase.githubRepo, '_blank')}
              >
                <BookOpen className="h-4 w-4" />
                <span>View on GitHub</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-100">Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-300">
              This Reactive Smart Contract implementation leverages real-time data processing and autonomous decision-making to optimize the {useCase.title.toLowerCase()} process. It utilizes a combination of state management, actions, views, and reactions to create a responsive and efficient system.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-100">Benefits</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="list-disc list-inside text-gray-300">
              <li>Improved efficiency and automation</li>
              <li>Enhanced transparency and accountability</li>
              <li>Real-time adaptability to changing conditions</li>
              <li>Reduced operational costs</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-100">Use Case Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-300">
              This Reactive Smart Contract solution can be applied in various scenarios, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2">
              <li>Large-scale enterprise operations</li>
              <li>Startup ecosystems looking for innovative solutions</li>
              <li>Government and public sector initiatives</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {showComments && (
        <Dialog open={showComments} onOpenChange={setShowComments}>
          <DialogContent className="bg-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>{useCase.title} - Comments</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
              {comments.map((comment) => (
                <div key={comment._id} className="mb-4">
                  <p className="font-bold">{getUserName(comment.user)}</p>
                  <p>{comment.text}</p>
                  <p className="text-xs text-gray-400">{new Date(comment._creationTime).toLocaleString()}</p>
                </div>
              ))}
            </ScrollArea>
            <div className="mt-4 flex space-x-2">
              <Input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleComment}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}