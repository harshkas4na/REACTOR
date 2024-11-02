import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  useCases: defineTable({
    title: v.string(),
    shortDescription: v.string(),
    overview: v.string(),
    implementation: v.string(),
    reactiveTemplate: v.string(),
    githubRepo: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    likes: v.number(),
    userId: v.id("users"),
  })
    .searchIndex("search_title", { searchField: 'title' })
    .searchIndex("search_shortDescription", { searchField: 'shortDescription' })
    .searchIndex("search_category", { searchField: 'category' })
    .index("by_user", ["userId"]),

    comments: defineTable({
      useCaseId: v.id("useCases"),
      userId: v.union(v.id("users"), v.null()),  // Allow null temporarily
      user: v.union(v.id("users"), v.null()),    // Add this field temporarily
      text: v.string(),
      timestamp: v.string(),
    }).index("by_useCase", ["useCaseId"]),

  users: defineTable({
    name: v.string(),
    clerkId: v.string(),
    email: v.string(),
    imageUrl: v.string(),
  }).index("by_clerkId", ["clerkId"]),

  likes: defineTable({
    useCaseId: v.id("useCases"),
    userId: v.id("users"),
  }).index("by_useCase_and_user", ["useCaseId", "userId"]),
});