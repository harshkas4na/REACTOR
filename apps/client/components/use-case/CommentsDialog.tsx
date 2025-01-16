"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Id } from '@/convex/_generated/dataModel';
interface Comment {
  _id: Id<"comments">;
  useCaseId: Id<"useCases">;
  userId: Id<"users"> | null;  // Update to allow null
  text: string;
  timestamp: string;
}

interface User {
  _id: Id<"users">;
  name: string;
}

interface CommentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  
  comments: Comment[];
  users: User[];
  useCaseTitle: string;
  newComment: string;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
}

export function CommentsDialog({
  isOpen,
  onClose,
  comments,
  users,
  useCaseTitle,
  newComment,
  onCommentChange,
  onSubmitComment
}: CommentsDialogProps) {
  const getUserName = (userId: Id<"users"> | null) => {
    if (!userId) return "Unknown User";
    const user = users.find(u => u._id === userId);
    return user ? user.name : "Unknown User";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black text-gray-100">
        <DialogHeader>
          <DialogTitle>{useCaseTitle} - Comments</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-black">
        {comments.map((comment) => (
      <div key={comment._id} className="mb-4">
              <p className="font-bold">
              {comment.userId ? getUserName(comment.userId) : "Unknown User"}
              </p>
              <p>{comment.text}</p>
              <p className="text-xs text-gray-400">
                {comment.timestamp.toLocaleString()}
              </p>
            </div>
          ))}
        </ScrollArea>
        <div className="mt-4 flex space-x-2">
          <Input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => onCommentChange(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={onSubmitComment}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}