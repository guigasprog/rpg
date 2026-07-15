import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { EvidenceBoard } from "@/components/EvidenceBoard";

export const dynamic = "force-dynamic";

export default async function ProvasPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  const rows = await prisma.evidence.findMany({
    where: { revelado: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, titulo: true, descricao: true, imagemUrl: true },
  });

  return (
    <main className="space-y-6">
      <header className="paper paper-edge relative overflow-hidden rounded-md p-5">
        <span className="stamp absolute -top-2 right-4 text-[0.55rem]">
          Evidências
        </span>
        <h1 className="display text-3xl text-sepia-ink">Mural de Provas</h1>
        <p className="typewriter text-sm text-sepia">
          Tudo o que a investigação revelou até agora. Clique numa imagem para
          ampliar.
        </p>
        {isMaster && (
          <div className="mt-3">
            <Link href="/mestre/provas" className="btn btn-dark tap text-xs">
              Gerenciar mural
            </Link>
          </div>
        )}
      </header>

      <EvidenceBoard items={rows} />
    </main>
  );
}
