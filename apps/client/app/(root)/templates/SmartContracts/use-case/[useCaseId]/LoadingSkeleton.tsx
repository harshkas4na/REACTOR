import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LoadingSkeleton = () => {
  return (
    <div className="relative mt-3 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-8xl mx-auto">
        {/* Back button skeleton */}
        <div className="h-10 w-32 bg-blue-900/30 rounded-md mb-8 animate-pulse" />
        
        {/* Main content card skeleton */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 w-full mb-8">
          <CardHeader className="p-6">
            <div className="h-8 bg-blue-900/40 rounded-md w-3/4 animate-pulse" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="h-4 bg-blue-900/40 rounded-md w-full animate-pulse" />
            <div className="h-4 bg-blue-900/40 rounded-md w-5/6 animate-pulse" />
            <div className="h-4 bg-blue-900/40 rounded-md w-4/6 animate-pulse" />
            
            {/* Actions skeleton */}
            <div className="flex gap-4 pt-4">
              <div className="h-10 w-24 bg-blue-900/40 rounded-md animate-pulse" />
              <div className="h-10 w-24 bg-blue-900/40 rounded-md animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs skeleton */}
        <div className="mt-8">
          <div className="h-10 bg-blue-900/30 rounded-md w-64 mb-4 animate-pulse" />
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30">
            <CardHeader className="border-b border-zinc-800">
              <div className="h-6 bg-blue-900/40 rounded-md w-48 animate-pulse" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="h-4 bg-blue-900/40 rounded-md w-full animate-pulse" />
              <div className="h-4 bg-blue-900/40 rounded-md w-5/6 animate-pulse" />
              <div className="h-4 bg-blue-900/40 rounded-md w-4/6 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;