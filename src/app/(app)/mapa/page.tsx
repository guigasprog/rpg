import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { CombatMap } from "@/components/CombatMap";
import { parseStringArray } from "@/lib/character";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  const [map, tokens, chars, turnoEntry, loreRows] = await Promise.all([
    prisma.gameMap.findUnique({ where: { id: "main" } }),
    prisma.mapToken.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.character.findMany({
      where: isMaster ? {} : { ownerId: viewer.id, arquivado: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, portraitUrl: true },
    }),
    prisma.initiativeEntry.findFirst({ where: { atual: true } }),
    isMaster
      ? prisma.loreEntry.findMany({
          orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
          select: { id: true, titulo: true, imagemUrl: true, categoria: true },
        })
      : Promise.resolve([]),
  ]);
  const scenes = isMaster
    ? await prisma.mapScene.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, nome: true },
      })
    : [];

  const initial = {
    map: map
      ? {
          id: map.id,
          backgroundUrl: map.backgroundUrl,
          cols: map.cols,
          rows: map.rows,
          cell: map.cell,
          showGrid: map.showGrid,
          fog: map.fog,
          revelado: parseStringArray(map.revelado),
        }
      : {
          id: "main",
          backgroundUrl: null,
          cols: 20,
          rows: 14,
          cell: 64,
          showGrid: true,
          fog: false,
          revelado: [] as string[],
        },
    tokens,
    turno: turnoEntry?.nome ?? null,
    scenes,
    viewerId: viewer.id,
    isMaster,
  };

  return (
    <main className="space-y-4">
      <header className="paper paper-edge relative overflow-hidden rounded-md p-5">
        <span className="stamp absolute -top-2 right-4 text-[0.55rem]">
          Tático
        </span>
        <h1 className="display text-3xl text-sepia-ink">Mapa de Combate</h1>
        <p className="typewriter text-sm text-sepia">
          Mesa tática ao vivo. Coloque seu token e mova-o pela grade.{" "}
          {isMaster
            ? "Defina o campo X×Y e a imagem de fundo — ela se encaixa nos quadros."
            : ""}
        </p>
      </header>

      {/* Full-bleed: usa a largura toda da tela (desktop). */}
      <div className="mx-[calc(50%-50vw)] w-screen px-4">
        <CombatMap initial={initial} chars={chars} lore={loreRows} />
      </div>
    </main>
  );
}
