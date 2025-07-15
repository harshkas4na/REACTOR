'use client';

import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare } from "lucide-react";
import type { Like, Comment } from '@/types/use-case';

interface ActionButtonsProps {
  useCaseId: string;
  likes: Like[];
  comments: Comment[];
  onLike: (useCaseId: string) => void;
  onComment: (useCaseId: string) => void;
}

export function ActionButtons({ useCaseId, likes, comments, onLike, onComment }: ActionButtonsProps) {
  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-1 hover:bg-primary/80 bg-primary text-gray-200"
        onClick={() => onLike(useCaseId)}
      >
        <ThumbsUp className="w-4 h-4" />
        <span>{likes.length}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-1 bg-primary hover:bg-primary/80 text-gray-200"
        onClick={() => onComment(useCaseId)}
      >
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length}</span>
      </Button>
    </div>
  );
}