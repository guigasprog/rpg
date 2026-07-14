import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { ResourceMeter } from "@/components/ResourceMeter";
import { OccultismToggle } from "@/components/OccultismToggle";
import { OnStageToggle } from "@/components/OnStageToggle";
import { ArchiveToggle } from "@/components/ArchiveToggle";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";
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

  const [characters, players, iniciativaCount] = await Promise.all([
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
    prisma.initiativeEntry.count(),
  ]);

  const jogadores = players.filter((p) => p.role !== "MASTER").length;
  const occultUnlocked = characters.filter((c) => c.occultismUnlocked).length;
  const propostasPend = characters.filter(
    (c) => c.propostaStatus === PROPOSTA.PENDENTE,
  ).length;
  const naMesa = characters.filter((c) => c.mostrarNaMesa).length;
  const ativos = characters.filter((c) => !c.arquivado).length;

  const tiles = [
    { n: ativos, label: "Investigadores ativos" },
    { n: jogadores, label: "Jogadores" },
    { n: occultUnlocked, label: "Ocultismo liberado" },
    { n: iniciativaCount, label: "Em combate" },
    { n: propostasPend, label: "Propostas pendentes", alerta: propostasPend > 0 },
    { n: naMesa, label: "Na mesa (retrato)" },
  ];

  return (
    <main className="space-y-8">
      {/* Cabeçalho + atalhos */}
      <div className="paper paper-edge relative overflow-hidden rounded-md p-5">
        <span className="stamp absolute -top-2 right-4 text-[0.55rem]">
          Confidencial
        </span>
        <h1 className="display text-3xl text-sepia-ink">Mesa do Mestre</h1>
        <p className="typewriter text-sm text-sepia">
          Toda a mesa sob os holofotes. Nada escapa daqui.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/mestre/livro" className="btn btn-primary tap text-xs">
            📖 Livro das Monstruosidades
          </Link>
          <Link href="/manual" className="btn btn-dark tap text-xs">
            📰 Manual da mesa
          </Link>
          <Link href="/personagens/novo" className="btn btn-dark tap text-xs">
            + Novo dossiê
          </Link>
        </div>
      </div>

      {/* Tiles de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`paper paper-edge rounded-md p-3 text-center ${t.alerta ? "ring-1 ring-stamp" : ""}`}
          >
            <div
              className={`display text-3xl ${t.alerta ? "text-stamp" : "text-sepia-ink"}`}
            >
              {t.n}
            </div>
            <div className="typewriter text-[0.62rem] leading-tight text-sepia-dark">
              {t.label}
            </div>
          </div>
        ))}
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
              <div
                key={c.id}
                className={`paper paper-edge rounded-md p-4 ${c.arquivado ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-3">
                    <div className="paper-edge h-16 w-14 shrink-0 overflow-hidden rounded bg-black/10">
                      {c.portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.portraitUrl}
                          alt={c.name}
                          className="h-full w-full object-cover grayscale"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg text-sepia/40">
                          ?
                        </span>
                      )}
                    </div>
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

                {/* Ações de jogo */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <OccultismToggle
                    characterId={c.id}
                    unlocked={c.occultismUnlocked}
                  />
                  <OnStageToggle
                    characterId={c.id}
                    mostrarNaMesa={c.mostrarNaMesa}
                  />
                </div>
                {/* Gestão do dossiê */}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-sepia/25 pt-2">
                  <ArchiveToggle characterId={c.id} arquivado={c.arquivado} />
                  <DeleteCharacterButton characterId={c.id} nome={c.name} />
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
