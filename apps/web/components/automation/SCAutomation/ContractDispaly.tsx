import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Edit, Save, ArrowRight, ExternalLink, Download, Copy, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import Link from 'next/link';

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
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    const contractContent = editingContract ? editedContract : reactiveContract;
    try {
      await navigator.clipboard.writeText(contractContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const openInRemix = () => {
    const contractContent = editingContract ? editedContract : reactiveContract;
    
    // Base64 encode the contract content directly
    const base64Contract = btoa(contractContent);
    
    // Use a simpler URL format that just loads the contract content
    const remixUrl = `https://remix.ethereum.org/?#code=${base64Contract}`;
    
    // Open in new tab
    window.open(remixUrl, '_blank');
  };

  

  const downloadContract = () => {
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
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleShow}
              className="text-gray-300 hover:text-gray-100"
            >
              {showContract ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      {showContract && (
        <CardContent>
          {!editingContract ? (
            <>
              <div className="bg-gray-700 p-4 rounded-md">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{reactiveContract}</pre>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button onClick={onEdit} className="bg-primary hover:bg-primary-foreground">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contract
                </Button>
                <Button 
                  onClick={openInRemix} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
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
              <div className="flex justify-end space-x-2">
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
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Remix IDE
                </Button>
                <Button 
                  onClick={downloadContract} 
                  variant="outline" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download .sol File
                </Button>
              </div>
            </>
          )}
          
          <Card className="bg-gray-800 mt-4 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-gray-100">Is Your Template Complete?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                If you're satisfied with your Reactive Smart Contract template, you can proceed to the deployment guide.
                You can also open the contract in Remix IDE for testing or download it to edit in your preferred IDE.
              </p>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Need to test or modify? Use the IDE options above ↑
                </div>
                <Link href="/deployment-guide">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Proceed to Deployment Guide
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      )}
    </Card>
  );
}