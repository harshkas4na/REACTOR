import { Id } from '@/convex/_generated/dataModel';

interface HelperContract {
  name: string;
  contract: string;
  abi: string;
  bytecode?: string;
}

export type UseCaseType = 'live-data' | 'cross-bridge' | 'cross-chain' | 'external';
export type UseCaseCategory = 'defi' | 'nft' | 'dao';

export interface UseCase {
  _id: Id<"useCases">;
  _creationTime: number;
  title: string;
  shortDescription: string;
  overview: string;
  implementation: string;
  reactiveTemplate: string;
  reactiveABI: string;
  reactiveBytecode: string;
  originContract: string;
  originABI: string;
  originBytecode: string;
  destinationContract: string;
  destinationABI: string;
  destinationBytecode: string;
  helperContracts?: HelperContract[];
  type?: UseCaseType;
  githubRepo: string;
  category: UseCaseCategory;
  tags: string[];
  likes: number;
  userId: Id<"users">;
  lastUpdated?: number;
  status?: 'draft' | 'published' | 'archived';
  version?: string;
}

export interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  userId: Id<"users">;
  useCaseId: Id<"useCases">;
  user: Id<"users">;
  text: string;
  timestamp: string;
  editHistory?: Array<{
    text: string;
    timestamp: string;
  }>;
  parentCommentId?: Id<"comments">;
  isEdited: boolean;
}

export interface Like {
  _id: Id<"likes">;
  _creationTime: number;
  userId: Id<"users">;
  useCaseId: Id<"useCases">;
  timestamp: string;
}

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  imageUrl: string;
  clerkId: string;
  role?: 'user' | 'admin' | 'moderator';
  bio?: string;
  website?: string;
  social?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  lastActive?: number;
}

export interface UseCaseStats {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeSpent: number;
  deploymentCount: number;
  forkCount: number;
}