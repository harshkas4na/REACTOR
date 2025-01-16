"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Edit, Save, ExternalLink, Download, Copy, Check, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ContractDisplayProps {
  reactiveContract: string;
  editedContract: string;
  showContract: boolean;
  editingContract: boolean;
  onToggleShow: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onContractChange: (value: string) => void;
}

export default function ContractDisplay({
  reactiveContract,
  editedContract,
  showContract,
  editingContract,
  onToggleShow,
  onEdit,
  onSave,
  onCancelEdit,
  onContractChange,
}: ContractDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedContract, setDisplayedContract] = useState('');

  useEffect(() => {
    const contractToProcess = editingContract ? editedContract : reactiveContract;
    const processedContract = processContractForDisplay(contractToProcess);
    setDisplayedContract(processedContract);
  }, [reactiveContract, editedContract, editingContract]);

  const processContractForDisplay = (contract: string) => {
    const lines = contract.split('\n');
    let processedLines: string[] = [];
    let inMainContract = false;
    let bracketCount = 0;

    for (const line of lines) {
      if (line.includes('contract ReactiveContract')) {
        inMainContract = true;
      }

      if (inMainContract) {
        processedLines.push(line);
        bracketCount += (line.match(/{/g) || []).length;
        bracketCount -= (line.match(/}/g) || []).length;

        if (bracketCount === 0 && processedLines.length > 1) {
          break;
        }
      }
    }

    return processedLines.join('\n');
  };

  const copyToClipboard = async () => {
    const contractContent = editingContract ? editedContract : reactiveContract;
    try {
      await navigator.clipboard.writeText(contractContent);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyError('Failed to copy. Please try again.');
    }
  };

  const openInRemix = () => {
    setIsLoading(true);
    const contractContent = editingContract ? editedContract : reactiveContract;
    const base64Contract = btoa(contractContent);
    const remixUrl = `https://remix.ethereum.org/?#code=${base64Contract}`;
    window.open(remixUrl, '_blank');
    setIsLoading(false);
  };

  const downloadContract = () => {
    setIsLoading(true);
    const contractContent = editingContract ? editedContract : reactiveContract;
    const blob = new Blob([contractContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ReactiveSmartContract.sol';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setIsLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800">
      <CardHeader className="bg-gray-900/50 py-4">
        <CardTitle className="flex justify-between items-center text-zinc-100">
          <span className="text-xl font-bold">Reactive Contract</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-zinc-400 hover:text-zinc-100"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleShow}
              className="text-zinc-400 hover:text-zinc-100"
            >
              {showContract ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {showContract && (
        <CardContent className="p-0">
          {copyError && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{copyError}</AlertDescription>
            </Alert>
          )}
          <div className="relative">
            {!editingContract ? (
              <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-[500px]">
                <pre className="text-zinc-300 font-mono whitespace-pre-wrap">{displayedContract}</pre>
              </div>
            ) : (
              <div className="h-[500px] border border-zinc-800 rounded-md overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language="solidity"
                  theme="vs-dark"
                  value={editedContract}
                  onChange={(value) => onContractChange(value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    readOnly: false,
                    wordWrap: 'on',
                    wrappingIndent: 'indent',
                    automaticLayout: true,
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 m-4">
            {!editingContract ? (
              <>
                <Button onClick={onEdit} className="bg-primary hover:bg-primary/90 text-white">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contract
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download .sol File
                </Button>
              </>
            ) : (
              <>
                <Button onClick={onCancelEdit} variant="outline" className="text-zinc-300 border-zinc-600 hover:bg-zinc-800">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={onSave} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:bg-green-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-zinc-300 border-zinc-600 hover:bg-zinc-800"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download .sol File
                </Button>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

