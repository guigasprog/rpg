import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Ordem de iniciativa do combate (maior valor primeiro). Todos veem.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const entries = await prisma.initiativeEntry.findMany({
    orderBy: [{ valor: "desc" }, { createdAt: "asc" }],
    select: { id: true, nome: true, valor: true, atual: true },
  });
  return NextResponse.json({ entries });
}
