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
import type { UseCase, Comment, Like, User } from '@/types/use-case';

export default function UseCasesPage() {
  const { convexUserId, isAuthenticated } = useConvexUser();
  const useCases = useQuery(api.useCases.listUseCases) as UseCase[] | undefined;
  const comments = useQuery(api.useCases.listComments) as Comment[] | undefined;
  const likes = useQuery(api.useCases.listLikes) as Like[] | undefined;
  const users = useQuery(api.users.listUsers) as User[] | undefined;
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  const [selectedUseCase, setSelectedUseCase] = useState<Id<"useCases"> | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleLike = async (useCaseId: Id<"useCases">) => {
    if (!isAuthenticated || !convexUserId) return;
    await likeUseCase({ useCaseId, userId: convexUserId });
  };

  const searchResults = useQuery(api.useCases.searchUseCases, {
    searchTerm: searchTerm || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter
  });

  const handleAddComment = async (text: string) => {
    if (!isAuthenticated || !convexUserId || !selectedUseCase) return;
    await addComment({ 
      useCaseId: selectedUseCase, 
      userId: convexUserId,
      text,
      timestamp: new Date().toISOString()
    });
  };

  const filteredUseCases = (searchResults || []).filter(useCase => !useCase.type);

  if (!useCases || !comments || !likes || !users) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-7xl mx-auto pointer-events-auto">
        <h1 className="relative text-4xl font-bold text-center mb-12 text-gray-100">
          Reactive Smart Contracts Library
        </h1>
        
        <div className="relative z-20 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:w-auto">
            <Input 
              type="search" 
              placeholder="Search use cases..." 
              className="relative z-20 w-full bg-zinc-800/50 border-zinc-700 focus:border-blue-500 text-zinc-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative z-20 flex gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="relative z-20 w-full sm:w-[180px] bg-zinc-800/50 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="relative z-30 bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-zinc-100 focus:bg-blue-600/20">All Categories</SelectItem>
                <SelectItem value="defi" className="text-zinc-100 focus:bg-blue-600/20">DeFi</SelectItem>
                <SelectItem value="nft" className="text-zinc-100 focus:bg-blue-600/20">NFT</SelectItem>
                <SelectItem value="dao" className="text-zinc-100 focus:bg-blue-600/20">DAO</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode('grid')}
              className="relative z-20 border-zinc-700 text-zinc-100 hover:bg-blue-600/20 hover:text-zinc-50"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode('list')}
              className="relative z-20 border-zinc-700 text-zinc-100 hover:bg-blue-600/20 hover:text-zinc-50"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className={
          `relative z-20 ${viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' 
            : 'space-y-8'}`
        }>
          {filteredUseCases.map((useCase) => (
            <div key={useCase._id} className="relative z-20 pointer-events-auto">
              <UseCaseCard
                useCase={useCase as UseCase}
                comments={comments}
                likes={likes}
                onLike={handleLike}
                onComment={(useCaseId) => setSelectedUseCase(useCaseId)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dialog with higher z-index */}
      <CommentDialog
        useCase={useCases.find(uc => uc._id === selectedUseCase)}
        comments={comments.filter(comment => comment.useCaseId === selectedUseCase)}
        users={users}
        isOpen={!!selectedUseCase}
        onClose={() => setSelectedUseCase(null)}
        onAddComment={handleAddComment}
      />
    </div>
  );
}