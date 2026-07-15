import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { EvidenceCanvas } from "@/components/EvidenceCanvas";

export const dynamic = "force-dynamic";

export default async function ProvasPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

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

  const initial = {
    evidences,
    notes: notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    links,
    viewerId: viewer.id,
    isMaster,
  };

  return (
    <main className="space-y-4">
      <header className="paper paper-edge relative overflow-hidden rounded-md p-5">
        <span className="stamp absolute -top-2 right-4 text-[0.55rem]">
          Evidências
        </span>
        <h1 className="display text-3xl text-sepia-ink">Quadro de Provas</h1>
        <p className="typewriter text-sm text-sepia">
          A mesa de investigação. Arraste as pistas, ligue-as com barbante para
          amarrar um fato e anote em conjunto — tudo compartilhado, ao vivo.
        </p>
        {isMaster && (
          <div className="mt-3">
            <Link href="/mestre/provas" className="btn btn-dark tap text-xs">
              Gerenciar / revelar provas
            </Link>
          </div>
        )}
      </header>

      <EvidenceCanvas initial={initial} />
    </main>
  );
}
