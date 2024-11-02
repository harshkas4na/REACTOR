import { query, mutation, internalMutation } from "./_generated/server";
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
    
    // Update the likes count in the useCase document
    const useCase = await ctx.db.get(args.useCaseId);
    if (useCase) {
      await ctx.db.patch(args.useCaseId, { 
        likes: existing ? useCase.likes - 1 : useCase.likes + 1 
      });
    }
  },
});

export const addComment = mutation({
  args: { useCaseId: v.id("useCases"), userId: v.id("users"), text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("comments", {
      useCaseId: args.useCaseId,
      userId: args.userId,
      user: args.userId, // Add this field to match the schema
      text: args.text,
      timestamp: new Date().toISOString(),
    });
  },
});

export const migrateComments = internalMutation({
  handler: async (ctx) => {
    const comments = await ctx.db.query("comments").collect();
    
    for (const comment of comments) {
      if (comment.user && !comment.userId) {
        await ctx.db.patch(comment._id, {
          userId: comment.user,
          user: null,  // Set to null after migrating
        });
      }
    }
  },
});

export const createUseCase = mutation({
  args: {
    title: v.string(),
    shortDescription: v.string(),
    longDescription: v.string(),
    reactiveTemplate: v.string(),
    githubRepo: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const newUseCaseId = await ctx.db.insert("useCases", {
      title: args.title,
      shortDescription: args.shortDescription,
      longDescription: args.longDescription,
      reactiveTemplate: args.reactiveTemplate,
      githubRepo: args.githubRepo,
      category: args.category,
      tags: args.tags,
      likes: 0,
      userId: args.userId,
    });

    return newUseCaseId;
  },
});

export const searchUseCases = query({
  args: { 
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let useCasesQuery = ctx.db.query("useCases");

    if (args.searchTerm) {
      // Use the defined search index from the schema
      useCasesQuery = useCasesQuery.withSearchIndex("search_title", (q) => 
        q.search("title", args.searchTerm!)
      );
    }

    if (args.category) {
      useCasesQuery = useCasesQuery.filter(q => q.eq(q.field("category"), args.category));
    }

    return await useCasesQuery.collect();
  },
});