import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/session";
import { LivroDoMestre } from "@/components/LivroDoMestre";
import { Pentagram, SigilRow } from "@/components/OccultSigils";

export const dynamic = "force-dynamic";

export default async function LivroPage() {
  await requireMaster();

  const rows = await prisma.loreEntry.findMany({
    orderBy: [{ categoria: "asc" }, { createdAt: "asc" }],
  });

  const entries = rows.map((e) => ({
    id: e.id,
    categoria: e.categoria,
    titulo: e.titulo,
    conteudo: e.conteudo,
    perigo: e.perigo,
    imagemUrl: e.imagemUrl,
    revelado: e.revelado,
  }));

  return (
    <main>
      <div className="mb-4">
        <Link href="/mestre" className="btn btn-ghost text-xs">
          ← Mesa do Mestre
        </Link>
      </div>

      <header className="tomo mb-6 rounded-md p-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-3 text-stamp">
          <Pentagram className="text-3xl" />
        </div>
        <h1 className="oculto-titulo glitch text-4xl">
          Livro das Monstruosidades
        </h1>
        <p className="typewriter mt-1 text-xs tracking-widest text-paper/60">
          Necronomicon do Mestre — o que dorme além do véu
        </p>
        <SigilRow className="mt-3 text-lg" />
        <p className="typewriter mx-auto mt-3 max-w-xl text-xs text-paper/60">
          Só o Mestre lê estas páginas (a ficha completa). Ao encontrar uma
          criatura ou NPC, use <strong>&ldquo;▶ Exibir na tela&rdquo;</strong>{" "}
          para fazê-la <strong>aparecer na tela dos jogadores</strong> — só
          imagem e nome, para saberem que algo vem, sem estudar a ficha.
        </p>
      </header>

      <LivroDoMestre entries={entries} />
    </main>
  );
}
