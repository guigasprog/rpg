import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Últimas mensagens/rolagens da mesa (chat + auditoria). Todos logados veem.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const rows = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      autorNome: true,
      autorRole: true,
      tipo: true,
      texto: true,
      createdAt: true,
    },
  });
  // devolve em ordem cronológica (mais antigo → mais novo)
  return NextResponse.json({ messages: rows.reverse() });
}
