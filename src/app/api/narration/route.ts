import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Narração ativa no momento (cartão exibido na tela de todos). Polling.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const atual = await prisma.broadcast.findFirst({
    where: { ativo: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, texto: true },
  });
  return NextResponse.json({ narracao: atual });
}
