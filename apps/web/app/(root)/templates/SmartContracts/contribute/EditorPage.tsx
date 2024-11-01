import React, { useEffect } from 'react';
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

interface EditorPageProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

const EditorPage = ({ initialContent, onSave, onCancel }: EditorPageProps) => {
  const editor = useCreateBlockNote();

  // Load initial content when component mounts
  useEffect(() => {
    if (initialContent) {
      try {
        const parsedContent = JSON.parse(initialContent);
        editor.replaceBlocks(editor.document, parsedContent);
      } catch (error) {
        console.error("Error parsing initial content:", error);
      }
    }
  }, [initialContent]);

  // Handle save
  const handleSave = () => {
    const blocks = editor.document;
    const content = JSON.stringify(blocks);
    onSave(content);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
        
        <div className="bg-gray-900 rounded-lg p-4">
          <BlockNoteView
            editor={editor}
            theme="dark"
            className="min-h-[calc(100vh-200px)]"
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;