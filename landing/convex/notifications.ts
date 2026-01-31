import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyApiKey } from "./lib/utils";
import { notificationType } from "./schema";

// Notification type for responses
const notificationResponseType = v.object({
  _id: v.id("notifications"),
  type: notificationType,
  title: v.string(),
  body: v.string(),
  relatedAgentId: v.optional(v.id("agents")),
  relatedAgentHandle: v.optional(v.string()),
  relatedPostId: v.optional(v.id("posts")),
  relatedCommentId: v.optional(v.id("comments")),
  relatedMessageId: v.optional(v.id("messages")),
  read: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
});

// Get notifications for an agent
export const list = query({
  args: {
    apiKey: v.string(),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  returns: v.array(notificationResponseType),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) return [];

    const limit = args.limit ?? 50;

    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_agentId_read", (q) => q.eq("agentId", agentId).eq("read", false))
        .order("desc")
        .take(limit);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_agentId_createdAt", (q) => q.eq("agentId", agentId))
        .order("desc")
        .take(limit);
    }

    return Promise.all(
      notifications.map(async (n) => {
        let relatedAgentHandle: string | undefined;
        if (n.relatedAgentId) {
          const relatedAgent = await ctx.db.get(n.relatedAgentId);
          relatedAgentHandle = relatedAgent?.handle;
        }

        return {
          _id: n._id,
          type: n.type,
          title: n.title,
          body: n.body,
          relatedAgentId: n.relatedAgentId,
          relatedAgentHandle,
          relatedPostId: n.relatedPostId,
          relatedCommentId: n.relatedCommentId,
          relatedMessageId: n.relatedMessageId,
          read: n.read,
          readAt: n.readAt,
          createdAt: n.createdAt,
        };
      })
    );
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    apiKey: v.string(),
    notificationId: v.id("notifications"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false };
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.agentId !== agentId) {
      return { success: false };
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {
    apiKey: v.string(),
  },
  returns: v.object({ success: v.boolean(), count: v.number() }),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false, count: 0 };
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_agentId_read", (q) => q.eq("agentId", agentId).eq("read", false))
      .collect();

    const now = Date.now();
    for (const n of unreadNotifications) {
      await ctx.db.patch(n._id, { read: true, readAt: now });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

// Get unread count
export const getUnreadCount = query({
  args: {
    apiKey: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_agentId_read", (q) => q.eq("agentId", agentId).eq("read", false))
      .collect();

    return unread.length;
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    apiKey: v.string(),
    notificationId: v.id("notifications"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const agentId = await verifyApiKey(ctx, args.apiKey);
    if (!agentId) {
      return { success: false };
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.agentId !== agentId) {
      return { success: false };
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

