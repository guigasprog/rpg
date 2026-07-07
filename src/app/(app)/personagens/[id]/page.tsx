import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { canViewCharacter, toCharacterDTO } from "@/lib/character";
import { CharacterSheet } from "@/components/CharacterSheet";

export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireViewer();

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) notFound();

  // Autorização no servidor: jogador só vê a própria ficha.
  if (!canViewCharacter(character, viewer)) notFound();

  // Sanitização no servidor: masterNotes/occultismContent nunca vão ao
  // cliente indevidamente. O DTO já sai filtrado.
  const dto = toCharacterDTO(character, viewer);
  const isMaster = viewer.role === ROLES.MASTER;

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/personagens" className="btn btn-ghost text-xs">
          ← Voltar ao arquivo
        </Link>
        {isMaster && (
          <Link
            href={`/mestre/personagens/${dto.id}`}
            className="btn btn-dark text-xs"
          >
            Editar como Mestre
          </Link>
        )}
      </div>

      <CharacterSheet character={dto} />
    </main>
  );
}
