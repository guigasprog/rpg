import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { CreateCharacterForm } from "@/components/CreateCharacterForm";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const viewer = await requireViewer();
  const isMaster = viewer.role === ROLES.MASTER;

  // GM pode escolher a conta dona; jogador cria só para si.
  const players = isMaster
    ? await prisma.user.findMany({
        orderBy: { username: "asc" },
        select: { id: true, username: true },
      })
    : [];

  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="display mb-4 text-2xl text-paper-light">
        Abrir novo dossiê
      </h1>
      <CreateCharacterForm
        isMaster={isMaster}
        players={players}
        selfId={viewer.id}
      />
    </main>
  );
}
