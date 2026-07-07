import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { toCharacterDTO } from "@/lib/character";
import { MasterEditForm } from "@/components/MasterEditForm";

export const dynamic = "force-dynamic";

export default async function MasterCharacterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireMaster();

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) notFound();

  // Como MASTER, o DTO inclui masterNotes e occultismContent.
  const dto = toCharacterDTO(character, viewer);

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/mestre" className="btn btn-ghost text-xs">
          ← Mesa do Mestre
        </Link>
        <Link
          href={`/personagens/${dto.id}`}
          className="btn btn-dark text-xs"
        >
          Ver como ficha
        </Link>
      </div>

      <h1 className="display mb-1 text-2xl text-paper-light">{dto.name}</h1>
      <p className="typewriter mb-5 text-sm text-paper/60">
        Edição total — jogador: {dto.playerName}
      </p>

      <MasterEditForm character={dto} />
    </main>
  );
}
