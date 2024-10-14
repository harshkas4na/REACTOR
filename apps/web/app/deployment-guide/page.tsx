"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Edit } from "lucide-react";
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DeploymentGuideComponent() {
  const { reactiveContract, setReactiveContract } = useAutomationContext();
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContract, setEditedContract] = useState(reactiveContract);

  const handleCopy = () => {
    navigator.clipboard.writeText(reactiveContract);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    setReactiveContract(editedContract);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-100 mb-8">Deploy Your Reactive Smart Contract</h1>

        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-100">Step 1: Clone the Foundry Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">First, clone the basic Reactive Smart Contract repository:</p>
            <pre className="bg-gray-700 p-4 rounded-md text-gray-300 overflow-x-auto">
              git clone https://github.com/harshkas4na/ReactiveBaseSetup.git
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-100">Step 2: Copy Your Generated Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">Copy your generated Reactive Smart Contract:</p>
            <div className="flex justify-between items-center">
              <Button onClick={handleCopy} className="bg-primary hover:bg-primary-foreground">
                {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {isCopied ? 'Copied!' : 'Copy Contract'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                    View Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-gray-100 w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader className="p-4 border-b border-gray-700">
                    <DialogTitle>Your Reactive Smart Contract</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="flex-grow p-4">
                    {isEditing ? (
                      <Textarea
                        value={editedContract}
                        onChange={(e) => setEditedContract(e.target.value)}
                        className="min-h-[50vh] w-full bg-gray-700 text-gray-100 border-gray-600 resize-none"
                      />
                    ) : (
                        <Textarea disabled={true}  className=" p-4 min-h-[50vh] w-full  rounded-md text-gray-100 whitespace-pre-wrap">
                          {reactiveContract}
                        </Textarea>
                    
                      
                    )}
                  </ScrollArea>
                  <div className="p-4 border-t border-gray-700 mt-auto">
                    {isEditing ? (
                      <div className="flex justify-end space-x-2">
                        <Button onClick={() => setIsEditing(false)} variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary-foreground">
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsEditing(true)} className="w-full bg-primary hover:bg-primary-foreground">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Contract
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-gray-100">Step 3: Add Your Contract to the Foundry Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-4">Paste your copied contract into a new file in the Foundry project:</p>
            <pre className="bg-gray-700 p-4 rounded-md text-gray-300 overflow-x-auto">
              cd reactive-smart-contract
              nano src/ReactiveSmartContract.sol
              # Paste your contract here
              # Save and exit (Ctrl+X, Y, Enter in nano)
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              Now that you've added your Reactive Smart Contract to the Foundry project, you're ready to compile and deploy it. 
              Follow the Foundry documentation for detailed instructions on how to compile, test, and deploy your smart contract.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}