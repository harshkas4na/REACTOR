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
  args: {
    useCaseId: v.id("useCases"),
    userId: v.id("users"),
    text: v.string(),
    timestamp: v.string() // Add this if you want to handle timestamp on client
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      useCaseId: args.useCaseId,
      userId: args.userId,
      text: args.text,
      timestamp: args.timestamp,
      user: args.userId // Assuming this is how you want to store the user reference
    });
    return commentId;
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
    overview: v.string(),
    implementation: v.string(),
    reactiveTemplate: v.string(),
    reactiveABI: v.string(),
    reactiveBytecode: v.string(),
    originContract: v.string(),
    originABI: v.string(),
    originBytecode: v.string(),
    destinationContract: v.string(),
    destinationABI: v.string(),
    destinationBytecode: v.string(),
    githubRepo: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const newUseCaseId = await ctx.db.insert("useCases", {
      title: args.title,
      shortDescription: args.shortDescription,
      overview: args.overview,
      implementation: args.implementation,
      reactiveTemplate: args.reactiveTemplate,
      reactiveABI: args.reactiveABI,
      reactiveBytecode: args.reactiveBytecode,
      originContract: args.originContract,
      originABI: args.originABI,
      originBytecode: args.originBytecode,
      destinationContract: args.destinationContract,
      destinationABI: args.destinationABI,
      destinationBytecode: args.destinationBytecode,
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
    if (args.searchTerm && args.category) {
      // If both filters are present, search by title and filter results
      const results = await ctx.db
        .query("useCases")
        .withSearchIndex("search_title", (q) => 
          q.search("title", args.searchTerm!)
        )
        .collect();
      
      return results.filter(useCase => useCase.category === args.category);
    } 
    
    if (args.searchTerm) {
      // Only search term present
      return await ctx.db
        .query("useCases")
        .withSearchIndex("search_title", (q) => 
          q.search("title", args.searchTerm!)
        )
        .collect();
    }
    
    if (args.category) {
      // Only category filter present
      return await ctx.db
        .query("useCases")
        .withSearchIndex("search_category", (q) => 
          q.search("category", String(args.category))
        )
        .collect();
    }
    
    // No filters, return all
    return await ctx.db.query("useCases").collect();
  },
});