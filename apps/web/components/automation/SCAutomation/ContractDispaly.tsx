import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Edit, Save, ExternalLink, Download, Copy, Check, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <Card className="mt-8 bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-gray-100">
          <span>Reactive Contract</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-gray-300 hover:text-gray-100"
              aria-label={copied ? "Copied" : "Copy to clipboard"}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleShow}
              className="text-gray-300 hover:text-gray-100"
              aria-label={showContract ? "Hide contract" : "Show contract"}
            >
              {showContract ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      {showContract && (
        <CardContent>
          {copyError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{copyError}</AlertDescription>
            </Alert>
          )}
          {!editingContract ? (
            <>
              <div className="bg-gray-700 p-4 rounded-md">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{reactiveContract}</pre>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={onEdit} className="bg-primary hover:bg-primary-foreground">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contract
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download .sol File
                </Button>
              </div>
            </>
          ) : (
            <>
              <Textarea
                value={editedContract}
                onChange={(e) => onContractChange(e.target.value)}
                className="h-64 mb-4 bg-gray-700 text-gray-100 border-gray-600"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={onCancelEdit} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                  Cancel
                </Button>
                <Button onClick={onSave} className="bg-primary hover:bg-primary-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download .sol File
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}