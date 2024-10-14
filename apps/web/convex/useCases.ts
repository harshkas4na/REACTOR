import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listUseCases = query({
  handler: async (ctx) => {
    return await ctx.db.query("useCases").collect();
  },
});

export const listComments = query({
  handler: async (ctx) => {
    return await ctx.db.query("comments").collect();
  },
});

export const listLikes = query({
  handler: async (ctx) => {
    return await ctx.db.query("likes").collect();
  },
});

export const getUseCase = query({
  args: { id: v.id("useCases") },
  handler: async (ctx, args) => {
    const useCase = await ctx.db.get(args.id);
    if (!useCase) return null;
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_useCase", (q) => q.eq("useCaseId", args.id))
      .collect();
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_useCase_and_user", (q) => q.eq("useCaseId", args.id))
      .collect();
    return { ...useCase, comments, likesCount: likes.length };
  },
});

export const likeUseCase = mutation({
  args: { useCaseId: v.id("useCases"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_useCase_and_user", (q) =>
        q.eq("useCaseId", args.useCaseId).eq("userId", args.userId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("likes", { useCaseId: args.useCaseId, userId: args.userId });
    }
  },
});

export const addComment = mutation({
  args: { useCaseId: v.id("useCases"), userId: v.id("users"), text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("comments", {
      useCaseId: args.useCaseId,
      user: args.userId,
      text: args.text,
      timestamp: new Date().toISOString(),
    });
  },
});

export const createUseCase = mutation({
  args: {
    title: v.string(),
    shortDescription: v.string(),
    longDescription: v.string(),
    reactiveTemplate: v.string(),
    githubRepo: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const newUseCaseId = await ctx.db.insert("useCases", {
      title: args.title,
      shortDescription: args.shortDescription,
      longDescription: args.longDescription,
      reactiveTemplate: args.reactiveTemplate,
      githubRepo: args.githubRepo,
      likes: 0,
    });

    return newUseCaseId;
  },
});