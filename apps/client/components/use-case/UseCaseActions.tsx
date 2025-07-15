"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThumbsUp, MessageSquare, Code, BookOpen } from "lucide-react";
// import { UseCase } from "@/types/detail-useCase";
import { CodeViewDialog } from "./CodeViewDialog";
import {FaGithub } from 'react-icons/fa'


interface UseCase {
  _id: string;
  title: string;
  shortDescription: string;
  overview: string;
  githubRepo: string;
  reactiveTemplate: string;
  implementation: string;
}

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
    <div className="flex flex-col space-y-4 sm:space-y-6">
      {/* Top Row - Likes and Comments */}
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <Button
          variant="outline"
          className="flex-1 sm:flex-none items-center justify-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-gray-200 text-xs sm:text-sm py-2 px-3 sm:px-4"
          onClick={onLike}
        >
          <ThumbsUp className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{likes} Likes</span>
          <span className="sm:hidden">{likes}</span>
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none items-center justify-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-gray-200 text-xs sm:text-sm py-2 px-3 sm:px-4"
          onClick={onShowComments}
        >
          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{comments} Comments</span>
          <span className="sm:hidden">{comments}</span>
        </Button>
      </div>

      {/* Bottom Row - Code View and GitHub */}
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <div className="flex-1 sm:flex-none">
          <CodeViewDialog useCase={useCase} />
        </div>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none items-center justify-center space-x-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-gray-200 text-xs sm:text-sm py-2 px-3 sm:px-4 min-w-0"
          onClick={() => window.open(useCase.githubRepo, '_blank')}
        >
      <FaGithub size={24} />
          <span className="hidden sm:inline">View on GitHub</span>
          <span className="sm:hidden"></span>
        </Button>
      </div>
    </div>
  );
}