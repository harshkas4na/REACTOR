import { Id } from '@/convex/_generated/dataModel';

export interface UseCase {
  _id: Id<"useCases">;
  title: string;
  overview:string;
  implementation: string;
  reactiveTemplate: string;
  githubRepo: string;
}

export interface Comment {
  _id: Id<"comments">;
  useCaseId: string;
  user: Id<"users">;
  text: string;
  _creationTime: number;
}

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl: string;
}