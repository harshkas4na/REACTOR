'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { SaveIcon, ImportIcon, RefreshCcw, Code2 } from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface ContractEditorProps {
  onCompile: (sourceCode: string) => void;
  compilationStatus: 'idle' | 'compiling' | 'success' | 'error';
  contractType: 'origin' | 'destination';
}

const LOCAL_STORAGE_KEY = process.env.NEXT_PUBLIC_LOCAL_STORAGE_KEY as string

export default function ContractEditor({ onCompile, compilationStatus }: ContractEditorProps) {
  const { toast } = useToast()
  const [language, setLanguage] = useState('solidity')
  const [editorContent, setEditorContent] = useState('')
  const [editorHeight, setEditorHeight] = useState('500px')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load saved contract on mount
  useEffect(() => {
    const savedContract = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedContract) {
      setEditorContent(savedContract)
    }

    // Set editor height based on viewport
    const updateEditorHeight = () => {
      const vh = window.innerHeight;
      const newHeight = vh <= 640 ? '300px' : vh <= 768 ? '400px' : '500px';
      setEditorHeight(newHeight);
    }

    updateEditorHeight();
    window.addEventListener('resize', updateEditorHeight);
    return () => window.removeEventListener('resize', updateEditorHeight);
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
      
      {/* Editor Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 mb-4 z-20">
        {/* Action Buttons Group */}
        <div className="flex flex-wrap gap-2 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleImport}
                  className="flex items-center gap-2"
                >
                  <ImportIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import a .sol file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSave}
                  className="flex items-center gap-2"
                >
                  <SaveIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save to local storage</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear the editor</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button 
            variant="default"
            size="sm"
            onClick={handleCompile}
            disabled={compilationStatus === 'compiling'}
            className="flex items-center gap-2"
          >
            <Code2 className="h-4 w-4" />
            <span>{compilationStatus === 'compiling' ? 'Compiling...' : 'Compile'}</span>
          </Button>
        </div>

        {/* Language Selector */}
        <Select 
          value={language} 
          onValueChange={setLanguage}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solidity">Solidity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Code Editor */}
      <div className="flex-grow relative w-full min-h-[300px]">
        <MonacoEditor
          height={editorHeight}
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
            fontSize: window.innerWidth < 640 ? 12 : 14,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            padding: { top: 10, bottom: 10 },
          }}
          className="rounded-md overflow-hidden border border-zinc-800"
        />
      </div>
    </div>
  )
}