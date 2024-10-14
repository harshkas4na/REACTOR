"use client";
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThumbsUp, MessageSquare, Code, BookOpen, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { Id } from '@/convex/_generated/dataModel';

export function UseCasesPage() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const useCases = useQuery(api.useCases.listUseCases);
  const comments = useQuery(api.useCases.listComments);
  const likes = useQuery(api.useCases.listLikes);
  const users = useQuery(api.users.listUsers);
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  const [selectedUseCase, setSelectedUseCase] = useState<Id<"useCases"> | null>(null);
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

  function getComments(useCaseId: Id<"useCases">) {
    return comments?.filter((comment) => comment.useCaseId === useCaseId) || [];
  }

  function getLikes(useCaseId: Id<"useCases">) {
    return likes?.filter((like) => like.useCaseId === useCaseId) || [];
  }

  function getUserName(userId: Id<"users">) {
    const user = users?.find(u => u._id === userId);
    return user ? user.name : "Unknown User";
  }

  const handleLike = async (useCaseId: Id<"useCases">) => {
    if (!isAuthenticated || !convexUserId) return;
    await likeUseCase({ useCaseId, userId: convexUserId });
  };

  const handleComment = async (useCaseId: Id<"useCases">) => {
    if (!isAuthenticated || !convexUserId || !newComment.trim()) return;
    await addComment({ useCaseId, userId: convexUserId, text: newComment.trim() });
    setNewComment("");
  };

  if (!useCases || !comments || !likes || !users) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">Reactive Smart Contract Use Cases</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase) => (
            <Card key={useCase._id} className="flex flex-col hover:shadow-lg transition-shadow duration-300 bg-gray-800 border-gray-700">
              <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white rounded-t-lg">
                <CardTitle className="text-xl font-bold">{useCase.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-6">
                <p className="text-gray-300">{useCase.shortDescription}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center p-6 bg-gray-700 rounded-b-lg">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 bg-gray-600 border-gray-500 text-gray-200"
                    onClick={() => handleLike(useCase._id)}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{getLikes(useCase._id).length}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1 bg-gray-600 border-gray-500 text-gray-200"
                    onClick={() => setSelectedUseCase(useCase._id)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{getComments(useCase._id).length}</span>
                  </Button>
                </div>
                <TooltipProvider>
                  <div className="flex space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                            >
                              <Code className="w-5 h-5" />
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
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Reactive Template</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                          onClick={() => window.open(useCase.githubRepo, '_blank')}
                        >
                          <BookOpen className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View GitHub Guidelines</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/use-case/${useCase._id}`}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-12 bg-gray-600 border-gray-500 text-gray-200"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View Details</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {selectedUseCase && (
        <Dialog open={!!selectedUseCase} onOpenChange={() => setSelectedUseCase(null)}>
          <DialogContent className="bg-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>{useCases.find(uc => uc._id === selectedUseCase)?.title} - Comments</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
              {getComments(selectedUseCase).map((comment) => (
                <div key={comment._id} className="mb-4">
                  <p className="font-bold">{getUserName(comment.user)}</p>
                  <p>{comment.text}</p>
                  <p className="text-xs text-gray-400">{new Date(comment.timestamp).toLocaleString()}</p>
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
              <Button onClick={() => handleComment(selectedUseCase)}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}