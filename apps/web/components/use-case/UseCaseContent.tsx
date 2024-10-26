"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UseCase } from "@/types/detail-useCase";
import { UseCaseActions } from "./UseCaseActions";

interface UseCaseContentProps {
  useCase: UseCase;
  likes: number;
  comments: number;
  onLike: () => void;
  onShowComments: () => void;
}

export function UseCaseContent({
  useCase,
  likes,
  comments,
  onLike,
  onShowComments
}: UseCaseContentProps) {
  return (
    <Card className="bg-gray-800 border-gray-700 mb-8">
      <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white">
        <CardTitle className="text-3xl font-bold">{useCase.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-gray-300 mb-4">{useCase.longDescription}</p>
        <UseCaseActions 
          useCase={useCase}
          likes={likes}
          comments={comments}
          onLike={onLike}
          onShowComments={onShowComments}
        />
      </CardContent>
    </Card>
  );
}
