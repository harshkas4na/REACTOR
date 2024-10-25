"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Edit, Save, ArrowRight } from "lucide-react";
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
  return (
    <Card className="mt-8 bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-gray-100">
          <span>Reactive Contract</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleShow}
            className="text-gray-300 hover:text-gray-100"
          >
            {showContract ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </CardTitle>
      </CardHeader>
      {showContract && (
        <CardContent>
          {!editingContract ? (
            <>
              <div className="bg-gray-700 p-4 rounded-md">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{reactiveContract}</pre>
              </div>
              <Button onClick={onEdit} className="mt-4 bg-primary hover:bg-primary-foreground">
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
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
                If you need to make changes, you can edit the contract using the "View Contract" button below.
              </p>
              <div className="mt-4 flex justify-between">
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