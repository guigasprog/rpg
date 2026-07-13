import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { ResourceMeter } from "@/components/ResourceMeter";
import { OccultismToggle } from "@/components/OccultismToggle";
import { OnStageToggle } from "@/components/OnStageToggle";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { AccountActions } from "@/components/AccountActions";
import { CreatePlayerForm } from "@/components/CreatePlayerForm";
import {
  classLabel,
  computeMaxPv,
  computeMaxSan,
  levelLabel,
  PROPOSTA,
} from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function MasterDashboard() {
  const viewer = await requireMaster();

  const [characters, players] = await Promise.all([
    prisma.character.findMany({
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { username: true } } },
    }),
    prisma.user.findMany({
      orderBy: { username: "asc" },
      select: {
        id: true,
        username: true,
        role: true,
        _count: { select: { characters: true } },
      },
    }),
  ]);

  return (
    <main className="space-y-8">
      <div>
        <h1 className="display text-2xl text-paper-light">Mesa do Mestre</h1>
        <p className="typewriter text-sm text-paper/60">
          Toda a mesa sob os holofotes. Nada escapa daqui.
        </p>
        <Link href="/mestre/livro" className="btn btn-primary mt-3 inline-block text-xs">
          📖 Livro das Monstruosidades
        </Link>
      </div>

      <section>
        <h2 className="display mb-3 text-lg text-paper-light">
          Investigadores ({characters.length})
        </h2>
        {characters.length === 0 ? (
          <p className="typewriter text-paper/60">Nenhum dossiê aberto ainda.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {characters.map((c) => (
              <div key={c.id} className="paper paper-edge rounded-md p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="display truncate text-lg text-sepia-ink">
                      {c.name}
                    </h3>
                    <p className="typewriter truncate text-xs text-sepia">
                      {c.playerName} · conta:{" "}
                      {c.owner?.username ?? "— desvinculado —"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={`badge ${c.classe === "OCULTISTA" ? "badge-ocultista" : "badge-classe"}`}
                      >
                        {classLabel(c.classe)}
                      </span>
                      <span className="badge badge-nivel">
                        {levelLabel(c.nivel)}
                      </span>
                      {c.propostaStatus === PROPOSTA.PENDENTE && (
                        <span className="badge badge-ocultista">
                          proposta pendente
                        </span>
                      )}
                      {c.arquivado && (
                        <span className="badge badge-nivel">arquivado</span>
                      )}
                    </div>
                    <p className="typewriter mt-1 text-[0.7rem] text-sepia-dark">
                      Exposição ao Irreal: nível {c.occultismLevel}
                      {c.occultismUnlockedAt
                        ? ` · desde ${new Date(c.occultismUnlockedAt).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/mestre/personagens/${c.id}`}
                    className="btn btn-dark shrink-0 text-xs"
                  >
                    Editar
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
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

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OccultismToggle
                    characterId={c.id}
                    unlocked={c.occultismUnlocked}
                  />
                  <OnStageToggle
                    characterId={c.id}
                    mostrarNaMesa={c.mostrarNaMesa}
                  />
                  <ArchiveToggle
                    characterId={c.id}
                    arquivado={c.arquivado}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <CreatePlayerForm />
      </section>

      <section>
        <h2 className="display mb-3 text-lg text-paper-light">
          Contas ({players.length})
        </h2>
        <div className="paper paper-edge overflow-x-auto rounded-md">
          <table className="w-full min-w-[32rem] text-left">
            <thead>
              <tr className="border-b border-sepia/30 text-sepia-dark">
                <th className="label p-3">Usuário</th>
                <th className="label p-3">Papel</th>
                <th className="label p-3">Fichas</th>
                <th className="label p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-sepia/15 align-top">
                  <td className="typewriter p-3 text-sepia-ink">
                    {p.username}
                  </td>
                  <td className="typewriter p-3 text-sepia-ink">
                    {p.role === "MASTER" ? "Mestre" : "Jogador"}
                  </td>
                  <td className="typewriter p-3 text-sepia-ink">
                    {p._count.characters}
                  </td>
                  <td className="p-3">
                    <AccountActions
                      userId={p.id}
                      username={p.username}
                      isSelf={p.id === viewer.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
