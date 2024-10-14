import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  useCases: defineTable({
    title: v.string(),
    shortDescription: v.string(),
    longDescription: v.string(),
    reactiveTemplate: v.string(),
    githubRepo: v.string(),
    likes: v.number(),
  })
    .searchIndex("serach_title",{searchField:'title'} )
    .searchIndex("search_shortDescription",{searchField:'shortDescription'})
  ,

  comments: defineTable({
    useCaseId: v.id("useCases"),
    user: v.id("users"),
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