import { useEffect, useState } from 'react';
import { useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Id } from '@/convex/_generated/dataModel';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useConvexUser() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    const setupUser = async () => {
      if (isAuthenticated && user) {
        const userId = await getOrCreateUser({ 
          clerkId: user.id, 
          name: user.fullName ?? "", 
          email: user.emailAddresses[0]?.emailAddress ?? "",
          imageUrl: user.imageUrl ?? ""
        });
        setConvexUserId(userId);
      }
    };
    setupUser();
  }, [isAuthenticated, user, getOrCreateUser]);

  return { convexUserId, isAuthenticated };
}