"use client";

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
  const [code, setCode] = useState(value);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const handleSave = () => {
    onChange(code);
    toast.success('Code saved successfully!');
  };

  return (
    <div className="space-y-4">
      <Textarea
        className="font-mono min-h-[300px] bg-gray-800 text-gray-100 border-gray-700"
        value={code}
        onChange={handleCodeChange}
        placeholder="// Write your smart contract code here"
      />
      <Button onClick={handleSave}>Save Code</Button>
    </div>
  );
}