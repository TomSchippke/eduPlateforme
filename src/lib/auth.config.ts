import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

/**
 * Auth config split from the main auth.ts to be usable in middleware
 * without importing Prisma (which doesn't work in edge runtime).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname === "/login";
      const isOnApi = nextUrl.pathname.startsWith("/api");

      if (isOnLogin) {
        if (isLoggedIn) {
          const role = (auth?.user as { role?: string })?.role;
          const redirectUrl = role === "PROF" ? "/prof/dashboard" : "/eleve/dashboard";
          return Response.redirect(new URL(redirectUrl, nextUrl));
        }
        return true;
      }

      if (isOnApi) {
        return true; // API routes handle their own auth
      }

      if (!isLoggedIn) {
        return false; // Redirect to login
      }

      // Role-based route protection
      const role = (auth?.user as { role?: string })?.role;
      const isOnProf = nextUrl.pathname.startsWith("/prof");
      const isOnEleve = nextUrl.pathname.startsWith("/eleve");

      if (isOnProf && role !== "PROF") {
        return Response.redirect(new URL("/eleve/dashboard", nextUrl));
      }

      if (isOnEleve && role !== "ELEVE") {
        return Response.redirect(new URL("/prof/dashboard", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.tenantId = (user as { tenantId: string }).tenantId;
        token.firstName = (user as { firstName: string }).firstName;
        token.lastName = (user as { lastName: string }).lastName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).firstName = token.firstName as string;
        (session.user as any).lastName = token.lastName as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        identifiant: { label: "Identifiant", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            identifiant: z.string().min(2),
            password: z.string().min(4),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        // Dynamic import to avoid edge runtime issues
        const { prisma } = await import("@/lib/db");
        const bcrypt = await import("bcryptjs");

        const user = await prisma.user.findUnique({
          where: { identifiant: parsed.data.identifiant },
        });

        if (!user || !user.isActive) return null;

        const passwordMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          identifiant: user.identifiant,
          role: user.role,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
};
