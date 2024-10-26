import { Id } from '@/convex/_generated/dataModel';

export interface UseCase {
  _id: Id<"useCases">;
  title: string;
  shortDescription: string;
  reactiveTemplate: string;
  githubRepo: string;
}

export interface Comment {
  _id: Id<"comments">;
  useCaseId: Id<"useCases">;
  user: Id<"users">;
  text: string;
  timestamp: number;
}

export interface Like {
  _id: Id<"likes">;
  useCaseId: Id<"useCases">;
  userId: Id<"users">;
}

export interface User {
  _id: Id<"users">;
  name: string;
  clerkId: string;
  email: string;
  imageUrl: string;
}


