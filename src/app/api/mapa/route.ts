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

  const [map, tokens] = await Promise.all([
    prisma.gameMap.findUnique({ where: { id: "main" } }),
    prisma.mapToken.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    map: map ?? {
      id: "main",
      backgroundUrl: null,
      bgX: 0,
      bgY: 0,
      bgW: 960,
      bgH: 640,
      cell: 64,
      showGrid: true,
    },
    tokens,
    viewerId: session.user.id ?? null,
    isMaster: session.user.role === "MASTER",
  });
}
