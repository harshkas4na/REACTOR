import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MDEditorProps } from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import rehypeSanitize from "rehype-sanitize";

const MDEditor = dynamic<MDEditorProps>(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface EditorPageProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const EditorPage = ({ initialContent = '', onSave, onCancel }: EditorPageProps) => {
  const [content, setContent] = useState<string>(initialContent);

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleSave = () => {
    onSave(content);
  };

  return (
    <div 
      className="min-h-screen  p-4" 
      data-color-mode="dark"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            className="text-zinc-300 border-zinc-700 hover:bg-blue-900/20 hover:text-zinc-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary/90 z-10 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
        
        <div className="min-h-[calc(100vh-200px)] rounded-lg overflow-hidden">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={800}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
            preview="live"
            className="!bg-zinc-900 border border-zinc-700"
            style={{
              backgroundColor: '#18181B', // Solid zinc-900 color
            }}
            data-color-mode="dark"
            textareaProps={{
              style: {
                backgroundColor: '#18181B',
                color: '#e4e4e7',
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;