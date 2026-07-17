import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/character";

export const dynamic = "force-dynamic";

// Estado do mapa de combate (config + tokens). Polling ao vivo.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const isMaster = session.user.role === "MASTER";
  const [map, tokens, turnoEntry, scenes] = await Promise.all([
    prisma.gameMap.findUnique({ where: { id: "main" } }),
    prisma.mapToken.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.initiativeEntry.findFirst({ where: { atual: true } }),
    isMaster
      ? prisma.mapScene.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, nome: true },
        })
      : Promise.resolve([]),
  ]);

  const mapDto = map
    ? {
        id: map.id,
        backgroundUrl: map.backgroundUrl,
        cols: map.cols,
        rows: map.rows,
        cell: map.cell,
        showGrid: map.showGrid,
        fog: map.fog,
        revelado: parseStringArray(map.revelado),
      }
    : {
        id: "main",
        backgroundUrl: null,
        cols: 20,
        rows: 14,
        cell: 64,
        showGrid: true,
        fog: false,
        revelado: [] as string[],
      };

  return NextResponse.json({
    map: mapDto,
    tokens,
    turno: turnoEntry?.nome ?? null,
    scenes,
    viewerId: session.user.id ?? null,
    isMaster,
  });
}
