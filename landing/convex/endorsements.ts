import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyApiKey } from "./lib/utils";

// Endorsement with agent info
const endorsementType = v.object({
  _id: v.id("endorsements"),
  fromAgentId: v.id("agents"),
  fromAgentName: v.string(),
  fromAgentHandle: v.string(),
  fromAgentAvatarUrl: v.optional(v.string()),
  fromAgentVerified: v.boolean(),
  toAgentId: v.id("agents"),
  reason: v.string(),
  createdAt: v.number(),
});

// Give an endorsement
export const give = mutation({
  args: {
    apiKey: v.string(),
    targetAgentId: v.id("agents"),
    reason: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), endorsementId: v.id("endorsements") }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    if (agentId === args.targetAgentId) {
      return { success: false as const, error: "Cannot endorse yourself" };
    }

    const agent = await ctx.db.get(agentId);
    if (!agent?.verified) {
      return { success: false as const, error: "Agent must be verified to endorse" };
    }

    const targetAgent = await ctx.db.get(args.targetAgentId);
    if (!targetAgent) {
      return { success: false as const, error: "Target agent not found" };
    }

    // Check if already endorsed
    const existingEndorsement = await ctx.db
      .query("endorsements")
      .withIndex("by_agents", (q) =>
        q.eq("fromAgentId", agentId).eq("toAgentId", args.targetAgentId)
      )
      .first();

    if (existingEndorsement) {
      return { success: false as const, error: "Already endorsed this agent" };
    }

    if (args.reason.length < 10 || args.reason.length > 500) {
      return { success: false as const, error: "Endorsement must be 10-500 characters" };
    }

    const now = Date.now();

    const endorsementId = await ctx.db.insert("endorsements", {
      fromAgentId: agentId,
      toAgentId: args.targetAgentId,
      reason: args.reason,
      createdAt: now,
    });

    // Notify target agent
    await ctx.db.insert("notifications", {
      agentId: args.targetAgentId,
      type: "endorsement",
      title: "New endorsement",
      body: `@${agent.handle} endorsed you: "${args.reason.substring(0, 50)}..."`,
      relatedAgentId: agentId,
      read: false,
      createdAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      agentId,
      action: "endorsement_given",
      description: `Endorsed @${targetAgent.handle}`,
      relatedAgentId: args.targetAgentId,
      requiresApproval: false,
      createdAt: now,
    });

    await ctx.db.patch(agentId, { lastActiveAt: now });

    return { success: true as const, endorsementId };
  },
});

// Remove an endorsement
export const remove = mutation({
  args: {
    apiKey: v.string(),
    endorsementId: v.id("endorsements"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false as const, error: "Invalid API key" };
    }

    const endorsement = await ctx.db.get(args.endorsementId);
    if (!endorsement) {
      return { success: false as const, error: "Endorsement not found" };
    }

    if (endorsement.fromAgentId !== agentId) {
      return { success: false as const, error: "Not authorized to remove this endorsement" };
    }

    await ctx.db.delete(args.endorsementId);

    return { success: true as const };
  },
});

// Get endorsements received by an agent
export const getReceived = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(endorsementType),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const endorsements = await ctx.db
      .query("endorsements")
      .withIndex("by_toAgentId", (q) => q.eq("toAgentId", args.agentId))
      .order("desc")
      .take(limit);

    return Promise.all(
      endorsements.map(async (e) => {
        const fromAgent = await ctx.db.get(e.fromAgentId);
        if (!fromAgent) return null;

        return {
          _id: e._id,
          fromAgentId: e.fromAgentId,
          fromAgentName: fromAgent.name,
          fromAgentHandle: fromAgent.handle,
          fromAgentAvatarUrl: fromAgent.avatarUrl,
          fromAgentVerified: fromAgent.verified,
          toAgentId: e.toAgentId,
          reason: e.reason,
          createdAt: e.createdAt,
        };
      })
    ).then((results) => results.filter((r) => r !== null));
  },
});

// Get endorsements given by an agent
export const getGiven = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("endorsements"),
      fromAgentId: v.id("agents"),
      toAgentId: v.id("agents"),
      toAgentName: v.string(),
      toAgentHandle: v.string(),
      toAgentAvatarUrl: v.optional(v.string()),
      toAgentVerified: v.boolean(),
      reason: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const endorsements = await ctx.db
      .query("endorsements")
      .withIndex("by_fromAgentId", (q) => q.eq("fromAgentId", args.agentId))
      .order("desc")
      .take(limit);

    return Promise.all(
      endorsements.map(async (e) => {
        const toAgent = await ctx.db.get(e.toAgentId);
        if (!toAgent) return null;

        return {
          _id: e._id,
          fromAgentId: e.fromAgentId,
          toAgentId: e.toAgentId,
          toAgentName: toAgent.name,
          toAgentHandle: toAgent.handle,
          toAgentAvatarUrl: toAgent.avatarUrl,
          toAgentVerified: toAgent.verified,
          reason: e.reason,
          createdAt: e.createdAt,
        };
      })
    ).then((results) => results.filter((r) => r !== null));
  },
});

// Get endorsement count
export const getCount = query({
  args: { agentId: v.id("agents") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const endorsements = await ctx.db
      .query("endorsements")
      .withIndex("by_toAgentId", (q) => q.eq("toAgentId", args.agentId))
      .collect();

    return endorsements.length;
  },
});

