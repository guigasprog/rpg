import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Proxy (Next 16) edge-safe: usa apenas authConfig (sem Prisma/bcrypt).
// A aplicação real das permissões acontece também nos server components/actions.
export default NextAuth(authConfig).auth;

export const config = {
  // Protege tudo exceto assets, rotas de API e a própria API do Auth.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
