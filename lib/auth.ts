import "server-only";

import { getServerSession } from "next-auth/next";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import type { NextAuthOptions, Session } from "next-auth";

// ─── Dev credentials provider ─────────────────────────────────────────────────
// In development, any email is accepted (no password, no OTP) so you can test
// the full Control Room → Publish → Public page flow without OAuth credentials.
// Remove this provider (or gate it behind NODE_ENV !== "production") before
// shipping a real OAuth-only login.
const devCredentialsProvider = CredentialsProvider({
  id: "dev-email",
  name: "Email (dev)",
  credentials: {
    email: { label: "Email", type: "email" },
  },
  async authorize(credentials) {
    if (!credentials?.email) return null;

    const email = credentials.email.toLowerCase().trim();

    // Find or create the user so every dev-login gets a real DB record
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split("@")[0],
        emailVerified: new Date(),
      },
    });

    return { id: user.id, email: user.email, name: user.name ?? email };
  },
});

// ─── Auth options ──────────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,

  providers: [
    // Dev-only: sign in with just an email — no password, no OTP needed
    devCredentialsProvider,

    // Production: Google OAuth (requires AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET in .env)
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as Session["user"] & { id: string }).id = token.sub;

        const user = await db.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });

        (session.user as Session["user"] & { role?: string }).role = user?.role;
      }
      return session;
    },
  },

  debug: env.NODE_ENV === "development",
};

// NextAuth v4 route handlers
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Compatibility shim — mimics the NextAuth v5 `auth()` call used across API routes.
// Returns the session or null, with user.id populated from the JWT sub claim.
export async function auth(): Promise<
  (Session & { user: { id: string; role?: string } }) | null
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as Session & { user: { id: string; role?: string } };
}

// Kept for completeness — not used directly outside of route handlers.
export const { handlers, signIn, signOut } = (() => {
  const h = NextAuth(authOptions);
  return {
    handlers: { GET: h, POST: h },
    signIn: () => Promise.resolve(undefined as never),
    signOut: () => Promise.resolve(undefined as never),
  };
})();
