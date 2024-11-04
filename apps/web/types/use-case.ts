import { Id } from '@/convex/_generated/dataModel';

export interface UseCase {
  _id: Id<"useCases">;
  _creationTime: number;
  title: string;
  shortDescription: string;
  overview: string;
  implementation: string;
  reactiveTemplate: string;
  githubRepo: string;
  category: string;
  tags: string[];
  likes: number;
  userId: Id<"users">;
}

export interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  userId: Id<"users">;
  useCaseId: Id<"useCases">;
  user: Id<"users">;  // Changed from Id<"users"> | null to Id<"users">
  text: string;
  timestamp: Date;
}

export interface Like {
  _id: Id<"likes">;
  _creationTime: number;
  userId: Id<"users">;
  useCaseId: Id<"useCases">;
}

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
}