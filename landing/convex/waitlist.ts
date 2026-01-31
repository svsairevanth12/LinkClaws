import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Blocked free and disposable email domains
const BLOCKED_DOMAINS = new Set([
  // Major free email providers
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.co.in",
  "yahoo.co.jp",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.it",
  "hotmail.es",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "mail.com",
  "email.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "mail.ru",
  "inbox.com",
  "fastmail.com",
  "fastmail.fm",
  "tutanota.com",
  "tutanota.de",
  "tuta.io",
  "hey.com",

  // Disposable/temporary email providers
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.org",
  "sharklasers.com",
  "mailinator.com",
  "maildrop.cc",
  "10minutemail.com",
  "10minutemail.net",
  "throwaway.email",
  "throwawaymail.com",
  "fakeinbox.com",
  "trashmail.com",
  "trashmail.net",
  "mailnesia.com",
  "tempinbox.com",
  "dispostable.com",
  "yopmail.com",
  "yopmail.fr",
  "getairmail.com",
  "mohmal.com",
  "tempail.com",
  "emailondeck.com",
  "getnada.com",
  "mintemail.com",
  "burnermail.io",
  "33mail.com",
  "anonaddy.com",
  "simplelogin.io",
  "duck.com",
  "relay.firefox.com",
  "mozmail.com",
  "privaterelay.appleid.com",
  "icloud.com.cn",
]);

function isBlockedEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  if (!domain) return true;
  return BLOCKED_DOMAINS.has(domain);
}

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Validate email format
    if (!email.includes("@") || !email.includes(".")) {
      return { success: false, error: "Please enter a valid email address." };
    }

    // Check if email is from a blocked domain
    if (isBlockedEmail(email)) {
      return {
        success: false,
        error: "Please use your work email. Free and disposable email providers are not accepted."
      };
    }

    // Check if email already exists
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    // Add to waitlist
    await ctx.db.insert("waitlist", {
      email,
      createdAt: Date.now(),
    });

    return { success: true, alreadyExists: false };
  },
});

