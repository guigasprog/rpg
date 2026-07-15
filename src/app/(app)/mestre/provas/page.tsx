import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { MuralDeProvas } from "@/components/MuralDeProvas";

export const dynamic = "force-dynamic";

export default async function ProvasMestrePage() {
  await requireMaster();

  const rows = await prisma.evidence.findMany({
    orderBy: { createdAt: "asc" },
  });

  const entries = rows.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descricao: e.descricao,
    imagemUrl: e.imagemUrl,
    revelado: e.revelado,
  }));

  return (
    <main className="space-y-6">
      <div>
        <Link href="/mestre" className="btn btn-ghost text-xs">
          ← Mesa do Mestre
        </Link>
      </div>

      <header className="paper paper-edge relative overflow-hidden rounded-md p-5">
        <span className="stamp absolute -top-2 right-4 text-[0.55rem]">
          Evidências
        </span>
        <h1 className="display text-3xl text-sepia-ink">Mural de Provas</h1>
        <p className="typewriter text-sm text-sepia">
          Catalogue pistas, documentos e fotos. Revele à mesa quando os
          investigadores encontrarem — elas aparecem no mural de todos.
        </p>
      </header>

      <MuralDeProvas entries={entries} />
    </main>
  );
}
