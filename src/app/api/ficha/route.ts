import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeMaxPv, computeMaxSan } from "@/lib/game";
import { parseInventory, parseStringArray } from "@/lib/character";

export const dynamic = "force-dynamic";

// Ficha rápida (combate) de um personagem — para o painel do token no mapa.
// Não inclui ocultismo nem notas do Mestre.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "sem id" }, { status: 400 });

  const ch = await prisma.character.findUnique({ where: { id } });
  if (!ch) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: ch.id,
    ownerId: ch.ownerId,
    name: ch.name,
    classe: ch.classe,
    subclasse: ch.subclasse,
    nivel: ch.nivel,
    attrInvestigar: ch.attrInvestigar,
    attrCombate: ch.attrCombate,
    attrLabia: ch.attrLabia,
    attrMente: ch.attrMente,
    especialistaFocos: parseStringArray(ch.especialistaFocos).slice(0, 2),
    pvAtual: ch.pvAtual,
    pvMax: computeMaxPv(ch.attrCombate, ch.classe, ch.nivel, ch.subclasse),
    sanAtual: ch.sanAtual,
    sanMax: computeMaxSan(ch.attrMente, ch.classe, ch.nivel, ch.subclasse),
    condicoes: parseStringArray(ch.condicoes),
    inventory: parseInventory(ch.inventory),
  });
}
