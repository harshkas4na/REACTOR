// "use client";

// import React, { useState } from 'react';
// import { Textarea } from '@/components/ui/textarea';
// import { Button } from '@/components/ui/button';
// import { toast } from 'react-hot-toast';
// import {useAutomationContext} from "@/app/_context/AutomationContext"

// interface CodeEditorProps {
//   value: string;
//   onChange: (value: string) => void;
// }

// export default function CodeEditor({ value, onChange }: CodeEditorProps) {
//   const { reactiveContract } = useAutomationContext();
//   const [code, setCode] = useState(reactiveContract? reactiveContract : value);

//   const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//     setCode(e.target.value);
//   };

//   const handleSave = () => {
//     onChange(code);
//     toast.success('Code saved successfully!');
//   };

//   return (
//     <div className="space-y-4">
//       <Textarea
//         className="font-mono min-h-[300px] bg-gray-800 text-gray-100 border-gray-700"
//         value={code}
//         onChange={handleCodeChange}
//         placeholder=""
//       />
//       <Button onClick={handleSave}>Save Code</Button>
//     </div>
//   );
// }
import React from 'react';
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language: string;
  height: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, height }) => {
  return (
    <div className="border border-gray-600 rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage={language}
        defaultValue={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
};

export default CodeEditor;



