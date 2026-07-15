import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { CombatMap } from "@/components/CombatMap";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  const [map, tokens, chars] = await Promise.all([
    prisma.gameMap.findUnique({ where: { id: "main" } }),
    prisma.mapToken.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.character.findMany({
      where: isMaster ? {} : { ownerId: viewer.id, arquivado: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, portraitUrl: true },
    }),
  ]);

  const initial = {
    map: map ?? {
      id: "main",
      backgroundUrl: null,
      bgX: 0,
      bgY: 0,
      bgW: 960,
      bgH: 640,
      cell: 64,
      showGrid: true,
    },
    tokens,
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
            ? "Defina a imagem de fundo, o tamanho da célula e posicione o mapa."
            : ""}
        </p>
      </header>

      <CombatMap initial={initial} chars={chars} />
    </main>
  );
}
