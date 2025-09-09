// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Define the 'userContracts' table
  userContracts: defineTable({
    // The user's wallet address
    userAddress: v.string(),
    // The address of the callback contract (on Sepolia)
    callbackContract: v.string(),
    // The address of the reactive contract (on Lasna)
    rscContract: v.string(),
    // The chain ID where the primary contract is deployed
    chainId: v.string(),
  })
  // Create an index on 'userAddress' for fast lookups
  .index("by_userAddress", ["userAddress"]),
});