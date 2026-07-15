import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Últimas mensagens/rolagens da mesa (chat + auditoria), filtradas pela ótica
// do viewer: rolagens ocultas (só Mestre + autor) e sussurros (autor, alvo e
// Mestre) não vazam para os demais.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const uid = session.user.id;
  const isMaster = session.user.role === ROLES.MASTER;

  const rows = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      autorNome: true,
      autorRole: true,
      autorId: true,
      tipo: true,
      texto: true,
      personagem: true,
      destinoUserId: true,
      secreta: true,
      createdAt: true,
    },
  });

  const visiveis = rows.filter((m) => {
    if (isMaster) return true;
    if (m.secreta) return m.autorId === uid;
    if (m.destinoUserId) return m.autorId === uid || m.destinoUserId === uid;
    return true;
  });

  // devolve em ordem cronológica (mais antigo → mais novo)
  return NextResponse.json({ messages: visiveis.reverse() });
}
