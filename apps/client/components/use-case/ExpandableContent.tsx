import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';

const MDMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface ExpandableContentProps {
  content: string;
  previewLength?: number;
  className?: string;
}

export const ExpandableContent = ({ 
  content, 
  previewLength = 300,
  className = ""
}: ExpandableContentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setHasMore(content.length > previewLength);
  }, [content, previewLength]);

  const displayContent = isExpanded ? content : content.slice(0, previewLength);

  return (
    <div className="space-y-4">
      <div 
        ref={contentRef}
        className={`relative text-zinc-300 bg-blue-900/20 rounded-lg p-4 border border-zinc-800 transition-all duration-300 ease-in-out ${className}`}
        data-color-mode="dark"
      >
        <MDMarkdown
          source={displayContent + (!isExpanded && hasMore ? '...' : '')}
          style={{ 
            backgroundColor: 'transparent',
            color: 'rgb(228 228 231)',
            padding: '1rem'
          }}
        />
      </div>

      {hasMore && (
        <Button
          variant="outline"
          className="relative flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-zinc-200"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              Show Less
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Read More
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};