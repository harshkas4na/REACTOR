// UseCaseContent.tsx
"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UseCaseActions } from "./UseCaseActions";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Id } from '@/convex/_generated/dataModel';

interface UseCase {
  _id: Id<"useCases">;
  title: string;
  shortDescription: string;
  overview: string;
  reactiveTemplate: string;
  githubRepo: string;
  implementation: string;
}

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
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (useCase.overview) {
      try {
        // Try to parse as JSON first
        const parsedContent = JSON.parse(useCase.overview);
        editor.replaceBlocks(editor.document, parsedContent);
      } catch (error) {
        // If JSON parsing fails, create a simple text block
        editor.replaceBlocks(editor.document, [
          { type: "paragraph", content: useCase.overview }

        ]);
      }
    }
  }, [useCase.overview, editor]);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-100">
          {useCase.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className=" text-gray-100 mb-8 max-w-none">
          {useCase.overview ? (
            <BlockNoteView 
              editor={editor} 
              theme="dark"
              editable={false}
            />
          ) : (
            <p className="text-gray-300">No description available.</p>
          )}
        </div>
        <UseCaseActions
          likes={likes}
          useCase={useCase}
          comments={comments}
          onLike={onLike}
          onShowComments={onShowComments}
        />
      </CardContent>
    </Card>
  );
}