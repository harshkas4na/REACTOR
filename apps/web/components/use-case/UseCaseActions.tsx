"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThumbsUp, MessageSquare, Code, BookOpen } from "lucide-react";
import { UseCase } from "@/types/detail-useCase";
import { CodeViewDialog } from "./CodeViewDialog";

interface UseCaseActionsProps {
  useCase: UseCase;
  likes: number;
  comments: number;
  onLike: () => void;
  onShowComments: () => void;
}

export function UseCaseActions({
  useCase,
  likes,
  comments,
  onLike,
  onShowComments
}: UseCaseActionsProps) {
  return (
    <>
      <div className="flex space-x-4 mb-6">
        <Button
          variant="outline"
          className="flex items-center space-x-2 bg-gray-700 text-gray-200"
          onClick={onLike}
        >
          <ThumbsUp className="h-4 w-4" />
          <span>{likes} Likes</span>
        </Button>
        <Button
          variant="outline"
          className="flex items-center space-x-2 bg-gray-700 text-gray-200"
          onClick={onShowComments}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{comments} Comments</span>
        </Button>
      </div>
      <div className="flex space-x-4">
        <CodeViewDialog useCase={useCase} />
        <Button
          variant="outline"
          className="flex items-center space-x-2 bg-gray-700 text-gray-200"
          onClick={() => window.open(useCase.githubRepo, '_blank')}
        >
          <BookOpen className="h-4 w-4" />
          <span>View on GitHub</span>
        </Button>
      </div>
    </>
  );
}