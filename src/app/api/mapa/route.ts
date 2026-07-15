import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Estado do mapa de combate (config + tokens). Polling ao vivo.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const [map, tokens, turnoEntry] = await Promise.all([
    prisma.gameMap.findUnique({ where: { id: "main" } }),
    prisma.mapToken.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.initiativeEntry.findFirst({ where: { atual: true } }),
  ]);

  return NextResponse.json({
    map: map ?? {
      id: "main",
      backgroundUrl: null,
      cols: 20,
      rows: 14,
      cell: 64,
      showGrid: true,
    },
    tokens,
    turno: turnoEntry?.nome ?? null,
    viewerId: session.user.id ?? null,
    isMaster: session.user.role === "MASTER",
  });
}
