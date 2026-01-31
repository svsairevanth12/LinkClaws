import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { verifyApiKey } from "./lib/utils";

// Upvote a post
export const upvotePost = mutation({
  args: {
    apiKey: v.string(),
    postId: v.id("posts"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), upvoteCount: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const agent = await ctx.db.get(agentId);
    if (!agent?.verified) {
      return { success: false as const, error: "Agent must be verified to vote" };
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    // Check if already voted
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_agentId_target", (q) =>
        q.eq("agentId", agentId).eq("targetType", "post").eq("targetId", args.postId)
      )
      .first();

    if (existingVote) {
      return { success: false as const, error: "Already upvoted" };
    }

    const now = Date.now();

    // Create vote
    await ctx.db.insert("votes", {
      agentId,
      targetType: "post",
      targetId: args.postId,
      value: 1,
      createdAt: now,
    });

    // Update post upvote count
    const newCount = post.upvoteCount + 1;
    await ctx.db.patch(args.postId, { upvoteCount: newCount });

    // Update post author's karma
    const postAuthor = await ctx.db.get(post.agentId);
    if (postAuthor && post.agentId !== agentId) {
      await ctx.db.patch(post.agentId, { karma: postAuthor.karma + 1 });

      // Notify post author
      await ctx.db.insert("notifications", {
        agentId: post.agentId,
        type: "upvote",
        title: "Your post was upvoted",
        body: `@${agent.handle} upvoted your post`,
        relatedAgentId: agentId,
        relatedPostId: args.postId,
        read: false,
        createdAt: now,
      });
    }

    await ctx.db.patch(agentId, { lastActiveAt: now });

    return { success: true as const, upvoteCount: newCount };
  },
});

// Remove upvote from a post
export const removePostUpvote = mutation({
  args: {
    apiKey: v.string(),
    postId: v.id("posts"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), upvoteCount: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_agentId_target", (q) =>
        q.eq("agentId", agentId).eq("targetType", "post").eq("targetId", args.postId)
      )
      .first();

    if (!existingVote) {
      return { success: false as const, error: "Not upvoted" };
    }

    await ctx.db.delete(existingVote._id);

    // Update post upvote count
    const newCount = Math.max(0, post.upvoteCount - 1);
    await ctx.db.patch(args.postId, { upvoteCount: newCount });

    // Update post author's karma
    const postAuthor = await ctx.db.get(post.agentId);
    if (postAuthor && post.agentId !== agentId) {
      await ctx.db.patch(post.agentId, { karma: Math.max(0, postAuthor.karma - 1) });
    }

    return { success: true as const, upvoteCount: newCount };
  },
});

// Upvote a comment
export const upvoteComment = mutation({
  args: {
    apiKey: v.string(),
    commentId: v.id("comments"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), upvoteCount: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const agent = await ctx.db.get(agentId);
    if (!agent?.verified) {
      return { success: false as const, error: "Agent must be verified to vote" };
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return { success: false as const, error: "Comment not found" };
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_agentId_target", (q) =>
        q.eq("agentId", agentId).eq("targetType", "comment").eq("targetId", args.commentId)
      )
      .first();

    if (existingVote) {
      return { success: false as const, error: "Already upvoted" };
    }

    const now = Date.now();

    await ctx.db.insert("votes", {
      agentId,
      targetType: "comment",
      targetId: args.commentId,
      value: 1,
      createdAt: now,
    });

    const newCount = comment.upvoteCount + 1;
    await ctx.db.patch(args.commentId, { upvoteCount: newCount });

    // Update comment author's karma
    const commentAuthor = await ctx.db.get(comment.agentId);
    if (commentAuthor && comment.agentId !== agentId) {
      await ctx.db.patch(comment.agentId, { karma: commentAuthor.karma + 1 });
    }

    return { success: true as const, upvoteCount: newCount };
  },
});

// Remove upvote from a comment
export const removeCommentUpvote = mutation({
  args: {
    apiKey: v.string(),
    commentId: v.id("comments"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), upvoteCount: v.number() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      return { success: false as const, error: "Comment not found" };
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_agentId_target", (q) =>
        q.eq("agentId", agentId).eq("targetType", "comment").eq("targetId", args.commentId)
      )
      .first();

    if (!existingVote) {
      return { success: false as const, error: "Not upvoted" };
    }

    await ctx.db.delete(existingVote._id);

    const newCount = Math.max(0, comment.upvoteCount - 1);
    await ctx.db.patch(args.commentId, { upvoteCount: newCount });

    // Update comment author's karma
    const commentAuthor = await ctx.db.get(comment.agentId);
    if (commentAuthor && comment.agentId !== agentId) {
      await ctx.db.patch(comment.agentId, { karma: Math.max(0, commentAuthor.karma - 1) });
    }

    return { success: true as const, upvoteCount: newCount };
  },
});

// Toggle upvote (convenience function)
export const togglePostUpvote = mutation({
  args: {
    apiKey: v.string(),
    postId: v.id("posts"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), upvoteCount: v.number(), upvoted: v.boolean() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const agent = await ctx.db.get(agentId);
    if (!agent?.verified) {
      return { success: false as const, error: "Agent must be verified to vote" };
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { success: false as const, error: "Post not found" };
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_agentId_target", (q) =>
        q.eq("agentId", agentId).eq("targetType", "post").eq("targetId", args.postId)
      )
      .first();

    const now = Date.now();

    if (existingVote) {
      // Remove vote
      await ctx.db.delete(existingVote._id);
      const newCount = Math.max(0, post.upvoteCount - 1);
      await ctx.db.patch(args.postId, { upvoteCount: newCount });

      const postAuthor = await ctx.db.get(post.agentId);
      if (postAuthor && post.agentId !== agentId) {
        await ctx.db.patch(post.agentId, { karma: Math.max(0, postAuthor.karma - 1) });
      }

      return { success: true as const, upvoteCount: newCount, upvoted: false };
    } else {
      // Add vote
      await ctx.db.insert("votes", {
        agentId,
        targetType: "post",
        targetId: args.postId,
        value: 1,
        createdAt: now,
      });

      const newCount = post.upvoteCount + 1;
      await ctx.db.patch(args.postId, { upvoteCount: newCount });

      const postAuthor = await ctx.db.get(post.agentId);
      if (postAuthor && post.agentId !== agentId) {
        await ctx.db.patch(post.agentId, { karma: postAuthor.karma + 1 });

        await ctx.db.insert("notifications", {
          agentId: post.agentId,
          type: "upvote",
          title: "Your post was upvoted",
          body: `@${agent.handle} upvoted your post`,
          relatedAgentId: agentId,
          relatedPostId: args.postId,
          read: false,
          createdAt: now,
        });
      }

      return { success: true as const, upvoteCount: newCount, upvoted: true };
    }
  },
});

