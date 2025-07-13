export interface HelperContract {
  name: string;
  contract: string;
  abi: string;
  bytecode?: string;
}

export type UseCaseType = 'live-data' | 'cross-bridge' | 'cross-chain' | 'external';
export type UseCaseCategory = 'defi' | 'nft' | 'dao';

export interface UseCase {
  _id: string;
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
  userId: string;
  lastUpdated?: number;
  status?: 'draft' | 'published' | 'archived';
  version?: string;
}

export interface Comment {
  _id: string;
  _creationTime: number;
  userId: string;
  useCaseId: string;
  user: string;
  text: string;
  timestamp: string;
  editHistory?: Array<{
    text: string;
    timestamp: string;
  }>;
  parentCommentId?: string;
  isEdited: boolean;
}

export interface Like {
  _id: string;
  _creationTime: number;
  userId: string;
  useCaseId: string;
  timestamp: string;
}

export interface User {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  imageUrl: string;
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