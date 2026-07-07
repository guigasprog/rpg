import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { EncounterBanner } from "@/components/EncounterBanner";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // Aparições disparadas pelo Mestre: monstros/NPCs (imagem+nome) e
  // personagens "mostrados à mesa" (só a imagem).
  const [lore, naMesa] = await Promise.all([
    prisma.loreEntry.findMany({
      where: { revelado: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, titulo: true, imagemUrl: true },
    }),
    prisma.character.findMany({
      where: { mostrarNaMesa: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, portraitUrl: true },
    }),
  ]);
  const encounters = [
    ...lore.map((e) => ({
      id: `lore-${e.id}`,
      titulo: e.titulo,
      imagemUrl: e.imagemUrl,
    })),
    ...naMesa.map((c) => ({
      id: `char-${c.id}`,
      titulo: c.name,
      imagemUrl: c.portraitUrl,
      soImagem: true,
    })),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <EncounterBanner items={encounters} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
      <footer className="typewriter border-t border-sepia/30 px-4 py-4 text-center text-xs text-paper/40">
        Arquivo Sombrio — mantenha o véu intacto.
      </footer>
    </div>
  );
}
