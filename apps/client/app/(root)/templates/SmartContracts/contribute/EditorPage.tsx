import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MDEditorProps } from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import rehypeSanitize from "rehype-sanitize";

// Dynamically import MDEditor to avoid SSR issues
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
    <div className="min-h-screen bg-gray-900 p-4" data-color-mode="dark">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={onCancel} className="text-gray-200 hover:bg-gray-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
        
        <div className="min-h-[calc(100vh-200px)]">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={800}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
            preview="live"
            className="!bg-gray-800"
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;