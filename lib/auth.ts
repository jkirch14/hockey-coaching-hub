import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/no-access",
  },

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const raw = process.env.AUTH_EMAIL_ALLOWLIST ?? "";
      const allowlist = new Set(
        raw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );

      const existingMember = await db.teamMember.findFirst({
        where: {
          user: {
            email,
          },
        },
        select: { id: true },
      });

      const pendingInvite = await db.teamInvite.findFirst({
        where: {
          email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      const allowed =
        allowlist.has(email) ||
        !!existingMember ||
        !!pendingInvite;

      if (!allowed) return false;

      // Ensure every authorized Google user has a local Prisma User row.
      await db.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email,
          name: user.name ?? null,
          image: user.image ?? null,
        },
      });

      return true;
    },

    async jwt({ token }) {
      const email = token.email?.toLowerCase().trim();

      if (email && !(token as any).dbUserId) {
        const dbUser = await db.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (dbUser) {
          (token as any).dbUserId = dbUser.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).dbUserId;
      }

      return session;
    },
  },
});