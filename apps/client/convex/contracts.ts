// convex/contracts.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Retrieves the stored contract addresses for a given user wallet address.
 * This is now a public query.
 */
export const get = query({
  // Add an argument to accept the user's wallet address
  args: {
    userAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Return null if no address is provided
    if (!args.userAddress) {
      return null;
    }

    // Query the database using the provided address
    const contracts = await ctx.db
      .query("userContracts")
      .withIndex("by_userAddress", (q) =>
        q.eq("userAddress", args.userAddress.toLowerCase())
      )
      .unique();

    return contracts;
  },
});

/**
 * Stores or updates the contract addresses for a user.
 * This is now a public mutation. Anyone can call it, but they can only
 * write data for the address they provide.
 */
export const store = mutation({
  args: {
    userAddress: v.string(),
    callbackContract: v.string(),
    rscContract: v.string(),
    chainId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedUserAddress = args.userAddress.toLowerCase().trim();

    // Check if contracts for this user already exist
    const existingContracts = await ctx.db
      .query("userContracts")
      .withIndex("by_userAddress", (q) => q.eq("userAddress", normalizedUserAddress))
      .unique();

    if (existingContracts) {
      // If they exist, update them
      await ctx.db.patch(existingContracts._id, {
        callbackContract: args.callbackContract,
        rscContract: args.rscContract,
        chainId: args.chainId,
      });
      return existingContracts._id;
    } else {
      // If they don't exist, create a new entry
      const contractId = await ctx.db.insert("userContracts", {
        userAddress: normalizedUserAddress,
        callbackContract: args.callbackContract,
        rscContract: args.rscContract,
        chainId: args.chainId,
      });
      return contractId;
    }
  },
});