'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Comment, UseCase, User } from '@/types/use-case';
import { Id } from '@/convex/_generated/dataModel';

interface CommentDialogProps {
  useCase: UseCase | undefined;
  comments: Comment[];
  users: User[];
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (text: string) => void;
}

export function CommentDialog({ useCase, comments, users, isOpen, onClose, onAddComment }: CommentDialogProps) {
  const [newComment, setNewComment] = useState("");

  const getUserName = (userId: Id<"users">) => {
    const user = users.find(u => u._id === userId);
    return user ? user.name : "Unknown User";
  };

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle>{useCase?.title} - Comments</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 p-4 bg-gray-900">
          {comments.map((comment) => (
            <div key={comment._id} className="mb-4">
              <p className="font-bold">{getUserName(comment.user)}</p>
              <p>{comment.text}</p>
              <p className="text-xs text-gray-400">
                {new Date(comment.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </ScrollArea>
        <div className="mt-4 flex space-x-2">
          <Input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSubmit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}