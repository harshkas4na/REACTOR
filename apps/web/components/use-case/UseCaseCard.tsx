'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ActionButtons } from "./ActionButtons";
import { UseCaseToolbar } from "./UseCaseToolbar";
import type { UseCase, Comment, Like } from '@/types/use-case';
import { Id } from '@/convex/_generated/dataModel';

interface UseCaseCardProps {
  useCase: UseCase;
  comments: Comment[];
  likes: Like[];
  onLike: (useCaseId: Id<"useCases">) => void;
  onComment: (useCaseId: Id<"useCases">) => void;
}

export function UseCaseCard({ useCase, comments, likes, onLike, onComment }: UseCaseCardProps) {
  const useCaseComments = comments.filter(comment => comment.useCaseId === useCase._id);
  const useCaseLikes = likes.filter(like => like.useCaseId === useCase._id);

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300 bg-gray-800 border-gray-700">
      <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white rounded-t-lg">
        <CardTitle className="text-xl font-bold">{useCase.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-6">
        <p className="text-gray-300">{useCase.shortDescription}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-6 bg-gray-700 rounded-b-lg">
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