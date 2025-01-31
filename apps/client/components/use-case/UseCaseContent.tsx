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
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-100 break-words">
          {useCase.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-4">
          {/* Overview Toggle Button */}
          <div className="flex justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={() => setShowOverview(!showOverview)}
              className="w-full sm:w-auto text-sm sm:text-base flex items-center justify-center bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 gap-2 py-2 px-4"
            >
              {showOverview ? (
                <>
                  <span className="hidden sm:inline">Hide Overview</span>
                  <span className="sm:hidden">Hide</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Show Overview</span>
                  <span className="sm:hidden">Show</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Overview Content */}
          {showOverview && (
            <div 
              className="text-gray-100 mb-4 sm:mb-8 max-w-none overflow-x-auto" 
              data-color-mode="dark"
            >
              <div className="min-w-[300px]">
                {useCase.overview ? (
                  <MDMarkdown
                    source={useCase.overview}
                    style={{ 
                      backgroundColor: 'transparent',
                      color: 'rgb(209 213 219)',
                      padding: '0.5rem sm:1rem',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    className="prose prose-sm sm:prose-base prose-invert max-w-none"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-300">
                    No description available.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="pt-2 sm:pt-4">
            <UseCaseActions
              likes={likes}
              useCase={useCase}
              comments={comments}
              onLike={onLike}
              onShowComments={onShowComments}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}