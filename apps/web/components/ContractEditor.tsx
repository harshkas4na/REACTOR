'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface ContractEditorProps {
  onCompile: (sourceCode: string) => void;
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error';
  contractType: 'origin' | 'destination';
}

const LOCAL_STORAGE_KEY = 'savedContract'

export default function ContractEditor({ onCompile, compilationStatus }: ContractEditorProps) {
  const { toast } = useToast()
  const [language, setLanguage] = useState('solidity')
  const [editorContent, setEditorContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load saved contract on mount
  useEffect(() => {
    const savedContract = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedContract) {
      setEditorContent(savedContract)
    }
  }, [])

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.sol')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a Solidity (.sol) file",
      })
      return
    }

    try {
      const content = await file.text()
      setEditorContent(content)
      toast({
        title: "File Imported",
        description: `Successfully imported ${file.name}`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Failed to read the file content",
      })
    }
  }

  const handleSave = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, editorContent)
      toast({
        title: "Contract Saved",
        description: "Your contract has been saved to local storage",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save the contract",
      })
    }
  }

  const handleReset = () => {
    setEditorContent('')
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    toast({
      title: "Editor Reset",
      description: "The editor has been cleared",
    })
  }

  const handleCompile = () => {
    if (!editorContent.trim()) {
      toast({
        variant: "destructive",
        title: "Compilation Failed",
        description: "Please enter some code before compiling",
      })
      return
    }
    onCompile(editorContent)
  }

  return (
    <div className="h-full flex flex-col">
      <input
        type="file"
        ref={fileInputRef}
        accept=".sol"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleImport}>Import</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import a .sol file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleSave}>Save</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save to local storage</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleReset}>Reset</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear the editor</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            variant="default"
            onClick={handleCompile}
            disabled={compilationStatus === 'compiling'}
          >
            {compilationStatus === 'compiling' ? 'Compiling...' : 'Compile'}
          </Button>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solidity">Solidity</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-grow">
        <MonacoEditor
          height="500px"
          language={language}
          theme="vs-dark"
          value={editorContent}
          onChange={(value) => setEditorContent(value || '')}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}