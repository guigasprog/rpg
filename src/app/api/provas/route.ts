import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Estado do quadro de provas revelado (evidências + anotações + ligações).
// Consumido por polling pelo quadro interativo (colaborativo, ao vivo).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const evidences = await prisma.evidence.findMany({
    where: { revelado: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      imagemUrl: true,
      x: true,
      y: true,
    },
  });
  const ids = evidences.map((e) => e.id);

  const [notes, links] = await Promise.all([
    prisma.evidenceNote.findMany({
      where: { evidenceId: { in: ids } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        evidenceId: true,
        autorId: true,
        autorNome: true,
        texto: true,
        contra: true,
        createdAt: true,
      },
    }),
    prisma.evidenceLink.findMany({
      where: { fromId: { in: ids }, toId: { in: ids } },
      select: { id: true, fromId: true, toId: true, label: true, autorId: true },
    }),
  ]);

  return NextResponse.json({
    evidences,
    notes,
    links,
    viewerId: session.user.id ?? null,
    isMaster: session.user.role === "MASTER",
  });
}
