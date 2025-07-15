'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ActionButtons } from "./ActionButtons";
import { UseCaseToolbar } from "./UseCaseToolbar";
import type { UseCase, Comment, Like } from '@/types/use-case';

interface UseCaseCardProps {
  useCase: UseCase;
  comments: Comment[];
  likes: Like[];
  onLike: (useCaseId: string) => void;
  onComment: (useCaseId: string) => void;
}

export function UseCaseCard({ useCase, comments, likes, onLike, onComment }: UseCaseCardProps) {
  const useCaseComments = comments.filter(comment => comment.useCaseId === useCase._id);
  const useCaseLikes = likes.filter(like => like.useCaseId === useCase._id);
  
  const formatTags = (tags: string[] | string): string => {
    if (Array.isArray(tags)) {
      return tags.map(tag => `#${tag.trim()}`).join(', ');
    }
    return tags
      .split(/[,\s]+/)
      .filter(tag => tag.length > 0)
      .map(tag => `#${tag.trim()}`)
      .join(', ');
  };

  return (
    <Card className="relative h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-none border-zinc-800 hover:shadow-blue-900/20">
      <CardHeader className="bg-gradient-to-r from-primary rounded-t-lg border-b border-zinc-800">
        <CardTitle className="text-xl font-bold text-zinc-100">
          {useCase.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow p-6">
        <p className="text-zinc-300">
          {useCase.shortDescription}
        </p>
      </CardContent>
      
      {useCase.tags && (
        <CardContent className="p-6 pt-0">
          <p className="text-blue-400 text-sm break-words">
            {formatTags(useCase.tags)}
          </p>
        </CardContent>
      )}
      
      <CardFooter className="mt-auto flex justify-between items-center p-6 border-t border-zinc-800 bg-zinc-900/20">
        <ActionButtons
          useCaseId={useCase._id}
          likes={useCaseLikes}
          comments={useCaseComments}
          onLike={onLike}
          onComment={onComment}
        />
        <UseCaseToolbar useCase={useCase} />
      </CardFooter>
    </Card>
  );
}