"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UseCaseActions } from "./UseCaseActions";
import { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { MDEditorProps } from '@uiw/react-md-editor';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic<MDEditorProps>(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

const MDMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

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
  const [showOverview, setShowOverview] = useState(false);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-100">
          {useCase.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setShowOverview(!showOverview)}
          >
            {showOverview ? (
              <>
                Hide Overview
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show Overview
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>

          {showOverview && (
            <div className="text-gray-100 mb-8 max-w-none" data-color-mode="dark">
              {useCase.overview ? (
                <MDMarkdown
                  source={useCase.overview}
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'rgb(209 213 219)',
                    padding: '1rem'
                  }}
                />
              ) : (
                <p className="text-gray-300">No description available.</p>
              )}
            </div>
          )}

          <UseCaseActions
            likes={likes}
            useCase={useCase}
            comments={comments}
            onLike={onLike}
            onShowComments={onShowComments}
          />
        </div>
      </CardContent>
    </Card>
  );
}