import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { ResourceMeter } from "@/components/ResourceMeter";
import { FolderIcon, LockIcon, MagnifierIcon } from "@/components/icons";
import {
  classLabel,
  computeMaxPv,
  computeMaxSan,
  levelLabel,
} from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function CharactersPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  const characters = await prisma.character.findMany({
    where: isMaster ? {} : { ownerId: viewer.id, arquivado: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      playerName: true,
      occupation: true,
      classe: true,
      subclasse: true,
      nivel: true,
      arquivado: true,
      attrCombate: true,
      attrMente: true,
      pvAtual: true,
      sanAtual: true,
      occultismUnlocked: true,
    },
  });

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display flex items-center gap-2 text-2xl text-paper-light">
            <MagnifierIcon className="text-stamp-bright" />
            {isMaster ? "Todos os Dossiês" : "Seus Dossiês"}
          </h1>
          <p className="typewriter text-sm text-paper/60">
            {isMaster
              ? "Cada pasta é um investigador da mesa."
              : "Abra uma pasta para consultar sua ficha."}
          </p>
        </div>
        <Link href="/personagens/novo" className="btn btn-primary">
          + Novo dossiê
        </Link>
      </div>

      {characters.length === 0 ? (
        <div className="paper paper-edge rounded-md p-8 text-center">
          <p className="typewriter text-sepia-ink">
            Nenhuma pasta neste arquivo ainda.
          </p>
          <br />
          <Link href="/personagens/novo" className="btn btn-dark mt-4">
            Abrir o primeiro dossiê
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {characters.map((c) => (
            <Link
              key={c.id}
              href={`/personagens/${c.id}`}
              className="paper paper-edge group relative block rounded-md p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="display truncate text-lg text-sepia-ink">
                    <FolderIcon className="mr-1 inline text-sepia" />
                    {c.name}
                  </h2>
                  <p className="typewriter truncate text-xs text-sepia-dark">
                    {c.occupation || "Ocupação desconhecida"}
                  </p>
                  <p className="typewriter mt-0.5 truncate text-xs text-sepia">
                    Jogador: {c.playerName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span
                      className={`badge ${c.classe === "OCULTISTA" ? "badge-ocultista" : "badge-classe"}`}
                    >
                      {classLabel(c.classe)}
                    </span>
                    <span className="badge badge-nivel">
                      {levelLabel(c.nivel)}
                    </span>
                    {c.arquivado && (
                      <span className="badge badge-ocultista">arquivado</span>
                    )}
                  </div>
                </div>
                {c.occultismUnlocked && (
                  <LockIcon
                    className="shrink-0 text-lg text-stamp"
                    aria-label="Ocultismo liberado"
                  />
                )}
              </div>

              <div className="mt-4 space-y-2">
                <ResourceMeter
                  kind="pv"
                  current={c.pvAtual}
                  max={computeMaxPv(c.attrCombate, c.classe, c.nivel, c.subclasse)}
                  compact
                />
                <ResourceMeter
                  kind="san"
                  current={c.sanAtual}
                  max={computeMaxSan(c.attrMente, c.classe, c.nivel, c.subclasse)}
                  compact
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
