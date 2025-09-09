// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// This 'export default' is the crucial part that was missing.
export default defineSchema({
  userContracts: defineTable({
    userAddress: v.string(),
    callbackContract: v.string(),
    rscContract: v.string(),
    chainId: v.string(),
  }).index("by_userAddress", ["userAddress"]),
});