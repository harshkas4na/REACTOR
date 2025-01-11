import { useEffect, useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { useMutation } from "convex/react";

export function useUserSetup() {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
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