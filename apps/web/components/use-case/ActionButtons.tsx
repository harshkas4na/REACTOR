'use client';

import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageSquare } from "lucide-react";
import type { Like, Comment } from '@/types/use-case';
import { Id } from '@/convex/_generated/dataModel';

interface ActionButtonsProps {
  useCaseId: Id<"useCases">;
  likes: Like[];
  comments: Comment[];
  onLike: (useCaseId: Id<"useCases">) => void;
  onComment: (useCaseId: Id<"useCases">) => void;
}

export function ActionButtons({ useCaseId, likes, comments, onLike, onComment }: ActionButtonsProps) {
  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-1 bg-gray-600 border-gray-500 text-gray-200"
        onClick={() => onLike(useCaseId)}
      >
        <ThumbsUp className="w-4 h-4" />
        <span>{likes.length}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center space-x-1 bg-gray-600 border-gray-500 text-gray-200"
        onClick={() => onComment(useCaseId)}
      >
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length}</span>
      </Button>
    </div>
  );
}