import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeMaxSan } from "@/lib/game";

export const dynamic = "force-dynamic";

// Menor razão de Sanidade (atual/máx) entre os personagens do jogador. Usado
// pela atmosfera: quanto mais baixa, mais a tela reage.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const chars = await prisma.character.findMany({
    where: { ownerId: session.user.id, arquivado: false },
    select: { sanAtual: true, attrMente: true, classe: true, nivel: true, subclasse: true },
  });
  let ratio = 1;
  for (const c of chars) {
    const max = Math.max(1, computeMaxSan(c.attrMente, c.classe, c.nivel, c.subclasse));
    ratio = Math.min(ratio, c.sanAtual / max);
  }
  return NextResponse.json({ ratio: Math.max(-1, Math.min(1, ratio)) });
}
