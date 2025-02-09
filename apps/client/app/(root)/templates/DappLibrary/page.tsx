"use client";
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UseCaseCard } from '@/components/use-case/UseCaseCard';
import { CommentDialog } from '@/components/use-case/CommentDialog';
import { useConvexUser } from '@/hooks/templates/useConvexUser';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid, List } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UseCase, Comment, Like, User } from '@/types/use-case';
import Link from 'next/link';

const TYPE_OPTIONS = {
  'live-data': 'Live Data',
  'cross-bridge': 'Cross Bridge',
  'cross-chain': 'Cross Chain',
  'external': 'External'
} as const;

// Helper function to normalize search terms
const normalizeSearchTerm = (term: string): string => {
  return term.toLowerCase().trim();
};

// Helper function to check if a search term matches any tag
const matchesTags = (tags: string[] = [], searchTerm: string): boolean => {
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  return tags.some(tag => 
    normalizeSearchTerm(tag).includes(normalizedTerm) ||
    normalizedTerm.includes(normalizeSearchTerm(tag))
  );
};

const UseCaseSkeleton = () => (
  <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6 space-y-4">
    <div className="space-y-3">
      <Skeleton className="h-6 w-3/4 bg-purple-900/50" />
      <Skeleton className="h-4 w-1/2 bg-purple-900/50" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-20 w-full bg-purple-900/50" />
    </div>
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-6 w-16 bg-purple-900/50" />
      ))}
    </div>
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-8 rounded-full bg-purple-900/50" />
      <div className="flex gap-3">
        <Skeleton className="h-8 w-16 bg-purple-900/50" />
        <Skeleton className="h-8 w-16 bg-zinc-700" />
      </div>
    </div>
  </div>
);

export default function DAppLibraryPage() {
  const { convexUserId, isAuthenticated } = useConvexUser();
  const [selectedUseCase, setSelectedUseCase] = useState<Id<"useCases"> | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch all data once
  const allUseCases = useQuery(api.useCases.listUseCases) as UseCase[] | undefined;
  const comments = useQuery(api.useCases.listComments) as Comment[] | undefined;
  const likes = useQuery(api.useCases.listLikes) as Like[] | undefined;
  const users = useQuery(api.users.listUsers) as User[] | undefined;

  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  // Memoized filtering logic
  const filteredUseCases = useMemo(() => {
    if (!allUseCases) return [];

    // Filter out use cases without a type field
    const typedUseCases = allUseCases.filter(useCase => useCase.type);

    return typedUseCases.filter(useCase => {
      const searchTerms = normalizeSearchTerm(searchTerm)
        .split(' ')
        .filter(term => term.length > 0);

      // Match search terms against title, description, and tags
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
        return (
          useCase.title?.toLowerCase().includes(term) ||
          useCase.shortDescription?.toLowerCase().includes(term) ||
          useCase.overview?.toLowerCase().includes(term) ||
          matchesTags(useCase.tags, term)
        );
      });

      const matchesCategory = categoryFilter === 'all' || useCase.category === categoryFilter;
      const matchesType = typeFilter === 'all' || useCase.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [allUseCases, searchTerm, categoryFilter, typeFilter]);

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

  // Get unique types for the filter
  const uniqueTypes = useMemo(() => {
    if (!allUseCases) return [];
    return Array.from(new Set(allUseCases.filter(uc => uc.type).map(uc => uc.type)));
  }, [allUseCases]);

  if (!allUseCases || !comments || !likes || !users) {
    return (
      <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="relative z-20 max-w-7xl mx-auto">
          {/* Initial loading skeleton */}
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-96 mx-auto mb-4 bg-purple-900/50" />
            <Skeleton className="h-6 w-2/3 mx-auto mb-6 bg-purple-900/50" />
            <Skeleton className="h-10 w-40 mx-auto bg-purple-900/50" />
          </div>
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Skeleton className="h-10 w-full sm:w-64 bg-purple-900/50" />
            <div className="flex gap-2 w-full sm:w-auto">
              <Skeleton className="h-10 w-40 bg-purple-900/50" />
              <Skeleton className="h-10 w-40 bg-purple-900/50" />
              <Skeleton className="h-10 w-10 bg-purple-900/50" />
              <Skeleton className="h-10 w-10 bg-zinc-700" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <UseCaseSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-7xl mx-auto pointer-events-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-100">
            DApp Automation Examples
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl mx-auto mb-6">
            Explore different patterns for automating DeFi operations with RSC. See how various protocols can be integrated and automated.
          </p>
          <Link href={'/templates/DappLibrary/contribute'}>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              Submit Your Use Case
            </Button>
          </Link>
        </div>
        
        {/* Filter Section */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <Input 
              type="search" 
              placeholder="Search by title, description, or tags..." 
              className="relative z-20 w-full bg-zinc-800/50 border-zinc-700 focus:border-blue-500 text-zinc-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="relative z-20 w-full sm:w-[180px] bg-zinc-800/50 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="relative z-30 bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="defi">DeFi</SelectItem>
                <SelectItem value="nft">NFT</SelectItem>
                <SelectItem value="dao">DAO</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="relative z-20 w-full sm:w-[180px] bg-zinc-800/50 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="relative z-30 bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type as string}>
                    {TYPE_OPTIONS[type as keyof typeof TYPE_OPTIONS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setViewMode('grid')}
                className={`relative z-20 border-zinc-700 ${
                  viewMode === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-100'
                } hover:bg-blue-600/20 hover:text-zinc-50`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setViewMode('list')}
                className={`relative z-20 border-zinc-700 ${
                  viewMode === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-100'
                } hover:bg-blue-600/20 hover:text-zinc-50`}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Use Cases Grid/List */}
        {filteredUseCases.length > 0 ? (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No use cases found matching your search criteria.</p>
          </div>
        )}
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