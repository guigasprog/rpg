import type { NextAuthConfig } from "next-auth";
import { ROLES } from "@/lib/roles";

// Configuração "edge-safe" (sem Prisma/bcrypt) — usada pelo middleware
// e estendida em src/auth.ts com o provider de credenciais.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = (user as { role?: string }).role ?? ROLES.PLAYER;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as string) ?? ROLES.PLAYER;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      if (path.startsWith("/login")) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/personagens", nextUrl));
        }
        return true;
      }

      // Área do Mestre: só MASTER.
      if (path.startsWith("/mestre")) {
        return isLoggedIn && auth!.user.role === ROLES.MASTER;
      }

      // Demais rotas cobertas pelo matcher exigem login.
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
