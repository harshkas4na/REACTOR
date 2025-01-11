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
    <Card className="mt-8 bg-gray-800 border-gray-700 overflow-hidden">
      <CardHeader className="bg-gray-900 py-4">
        <CardTitle className="flex justify-between items-center text-gray-100">
          <span className="text-xl font-bold">Reactive Contract</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-gray-300 hover:text-gray-100 transition-colors"
              aria-label={copied ? "Copied" : "Copy to clipboard"}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleShow}
              className="text-gray-300 hover:text-gray-100 transition-colors"
              aria-label={showContract ? "Hide contract" : "Show contract"}
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
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{displayedContract}</pre>
              </div>
            ) : (
              <div className="h-[500px] border border-gray-700 rounded-md overflow-hidden">
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
                <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contract
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download .sol File
                </Button>
              </>
            ) : (
              <>
                <Button onClick={onCancelEdit} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 text-white transition-colors">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 transition-colors"
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

