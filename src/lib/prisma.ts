import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";

// SQLite usa caminho relativo (file:./dev.db), que o CLI resolve a partir de
// prisma/, mas o runtime do Next resolve de outro diretório. Tornamos o
// caminho absoluto e estável no runtime. Para Postgres (produção), a URL é
// usada como está.
function resolveDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:")) return url;
  const file = url.slice("file:".length).replace(/^\.\//, "");
  const abs = path.join(process.cwd(), "prisma", path.basename(file));
  return "file:" + abs.replace(/\\/g, "/");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
