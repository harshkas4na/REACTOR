import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UseCaseActions } from "./UseCaseActions";
import { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ExpandableContent } from './ExpandableContent';

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

const PREVIEW_LENGTH = 300; // Characters to show in preview

export function UseCaseContent({
  useCase,
  likes,
  comments,
  onLike,
  onShowComments
}: UseCaseContentProps) {
  const [showOverview, setShowOverview] = useState(false);
  
  // Create preview text
  const overviewPreview = useCase.overview 
    ? useCase.overview.slice(0, PREVIEW_LENGTH) + (useCase.overview.length > PREVIEW_LENGTH ? '...' : '')
    : '';

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-100 break-words">
          {useCase.title}
        </CardTitle>
        
        <div className="mt-4">
          <ExpandableContent 
            content={useCase.overview || 'No overview available.'} 
            previewLength={300}
            className="prose prose-sm sm:prose-base prose-invert max-w-none"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-4">

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