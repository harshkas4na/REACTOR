"use client";

import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UseCaseCard } from '@/components/use-case/UseCaseCard';
import { CommentDialog } from '@/components/use-case/CommentDialog';
import { useConvexUser } from '@/hooks/templates/useConvexUser';
import { Id } from '@/convex/_generated/dataModel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid, List } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { UseCase, Comment, Like, User } from '@/types/use-case';

const TYPE_OPTIONS = {
  'live-data': 'Live Data',
  'cross-bridge': 'Cross Bridge',
  'cross-chain': 'Cross Chain',
  'external': 'External'
} as const;

export default function DAppLibraryPage() {
  const { convexUserId, isAuthenticated } = useConvexUser();
  const [selectedUseCase, setSelectedUseCase] = useState<Id<"useCases"> | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Query all use cases and filter out those without a type
  const allUseCases = useQuery(api.useCases.listUseCases) as UseCase[] | undefined;
  const comments = useQuery(api.useCases.listComments) as Comment[] | undefined;
  const likes = useQuery(api.useCases.listLikes) as Like[] | undefined;
  const users = useQuery(api.users.listUsers) as User[] | undefined;

  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  // Filter out use cases without a type field
  const typedUseCases = allUseCases?.filter(useCase => useCase.type) || [];

  // Apply additional filters on typed use cases
  const filteredUseCases = typedUseCases.filter(useCase => {
    const matchesSearch = !searchTerm || 
      useCase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      useCase.shortDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || useCase.category === categoryFilter;
    const matchesType = typeFilter === 'all' || useCase.type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const handleLike = async (useCaseId: Id<"useCases">) => {
    if (!isAuthenticated || !convexUserId) return;
    await likeUseCase({ useCaseId, userId: convexUserId });
  };

  const handleAddComment = async (text: string) => {
    if (!isAuthenticated || !convexUserId || !selectedUseCase) return;
    await addComment({ 
      useCaseId: selectedUseCase, 
      userId: convexUserId,
      text,
      timestamp: new Date().toISOString()
    });
  };

  if (!allUseCases || !comments || !likes || !users) {
    return <LoadingSpinner />;
  }

  // Get unique types from typed use cases for the filter
  const uniqueTypes = Array.from(new Set(typedUseCases.map(uc => uc.type)));

  return (
    <div className="min-h-screen  py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">
          DApp Library
        </h1>
        
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <Input 
              type="search" 
              placeholder="Search use cases..." 
              className="w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="defi">DeFi</SelectItem>
                <SelectItem value="nft">NFT</SelectItem>
                <SelectItem value="dao">DAO</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type as string}>
                    {TYPE_OPTIONS[type as keyof typeof TYPE_OPTIONS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')}>
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-8'}>
          {filteredUseCases.map((useCase) => (
            <div key={useCase._id} className="relative">
              <Badge 
                className="absolute top-2 right-2 z-10"
                variant={
                  useCase.type === 'live-data' ? 'default' :
                  useCase.type === 'cross-bridge' ? 'secondary' :
                  useCase.type === 'cross-chain' ? 'destructive' :
                  'outline'
                }
              >
                {TYPE_OPTIONS[useCase.type as keyof typeof TYPE_OPTIONS]}
              </Badge>
              <UseCaseCard
                useCase={useCase}
                comments={comments}
                likes={likes}
                onLike={handleLike}
                onComment={(useCaseId) => setSelectedUseCase(useCaseId)}
              />
            </div>
          ))}
        </div>
      </div>

      <CommentDialog
        useCase={allUseCases.find(uc => uc._id === selectedUseCase)}
        comments={comments.filter(comment => comment.useCaseId === selectedUseCase)}
        users={users}
        isOpen={!!selectedUseCase}
        onClose={() => setSelectedUseCase(null)}
        onAddComment={handleAddComment}
      />
    </div>
  );
}