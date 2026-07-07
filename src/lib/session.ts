import { auth } from "@/auth";
import type { Viewer } from "@/lib/character";
import { ROLES } from "@/lib/roles";

// Obtém o viewer autenticado (ou null). Usado em server components/actions.
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role ?? ROLES.PLAYER };
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Não autenticado.");
  return viewer;
}

export async function requireMaster(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== ROLES.MASTER) throw new Error("Acesso restrito ao Mestre.");
  return viewer;
}
