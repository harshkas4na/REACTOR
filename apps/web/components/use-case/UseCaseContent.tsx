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
  longDescription: string;
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
    if (useCase.longDescription) {
      try {
        const parsedContent = JSON.parse(useCase.longDescription);
        editor.replaceBlocks(editor.document, parsedContent);
      } catch (error) {
        console.error("Error parsing content:", error);
        // If parsing fails, set the longDescription as plain text
        editor.replaceBlocks(editor.document, [{ type: "paragraph", content: useCase.longDescription }]);
      }
    }
  }, [useCase.longDescription, editor]);

  return (
    <Card className="bg-gray-800 border-gray-700 mb-8">
      <CardHeader className="bg-gradient-to-r from-primary to-primary-foreground text-white">
        <CardTitle className="text-3xl font-bold">{useCase.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-gray-300 mb-4">
          {useCase.longDescription ? (
            <BlockNoteView editor={editor} theme="dark" editable={false} />
          ) : (
            <p>No description available.</p>
          )}
        </div>
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