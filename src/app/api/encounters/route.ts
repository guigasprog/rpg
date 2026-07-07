import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Aparições ativas no momento (monstros/NPCs revelados + personagens na mesa).
// Consumido por polling pelo EncounterBanner para exibição "ao vivo".
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const [lore, naMesa] = await Promise.all([
    prisma.loreEntry.findMany({
      where: { revelado: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, titulo: true, imagemUrl: true },
    }),
    prisma.character.findMany({
      where: { mostrarNaMesa: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, portraitUrl: true },
    }),
  ]);

  const items = [
    ...lore.map((e) => ({
      id: `lore-${e.id}`,
      titulo: e.titulo,
      imagemUrl: e.imagemUrl,
    })),
    ...naMesa.map((c) => ({
      id: `char-${c.id}`,
      titulo: c.name,
      imagemUrl: c.portraitUrl,
      soImagem: true,
    })),
  ];

  return NextResponse.json({ items });
}
