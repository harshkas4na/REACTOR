export interface UseCase {
  _id: string;
  title: string;
  overview:string;
  implementation: string;
  reactiveTemplate: string;
  githubRepo: string;
}

export interface Comment {
  _id: string;
  useCaseId: string;
  user: string;
  text: string;
  _creationTime: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  imageUrl: string;
}