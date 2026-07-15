"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLoreEntry,
  deleteLoreEntry,
  duplicateLoreEntry,
  setLoreRevealed,
  updateLoreEntry,
} from "@/lib/actions";
import { LORE_CATEGORIES, loreCategoryLabel } from "@/lib/lore";
import { EldritchSketch, SigilRow } from "@/components/OccultSigils";

export interface LoreEntryDTO {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  perigo: number;
  imagemUrl: string | null;
  revelado: boolean;
}

const EMPTY = {
  categoria: "MONSTRO",
  titulo: "",
  conteudo: "",
  perigo: 0,
  imagemUrl: "",
};

const PERIGO_LABEL = [
  "Inofensivo",
  "Cautela",
  "Perigoso",
  "Letal — não-arquivável",
];

function perigoLabel(n: number): string {
  return PERIGO_LABEL[Math.max(0, Math.min(3, n))] ?? "—";
}

export function LivroDoMestre({ entries }: { entries: LoreEntryDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null); // null = criando
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filtros do catálogo.
  const [query, setQuery] = useState("");
  const [filtroCat, setFiltroCat] = useState<string>("ALL");
  const [soEmCena, setSoEmCena] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startNew(categoria: string) {
    setEditId(null);
    setForm({ ...EMPTY, categoria });
    setError(null);
    setShowForm(true);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(e: LoreEntryDTO) {
    setEditId(e.id);
    setForm({
      categoria: e.categoria,
      titulo: e.titulo,
      conteudo: e.conteudo,
      perigo: e.perigo,
      imagemUrl: e.imagemUrl ?? "",
    });
    setError(null);
    setShowForm(true);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fecharForm() {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(false);
    setError(null);
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = editId
        ? await updateLoreEntry(editId, form)
        : await createLoreEntry(form);
      if (!res.ok) {
        setError(res.error ?? "Falha ao salvar.");
        return;
      }
      fecharForm();
      router.refresh();
    });
  }

  function remover(id: string, titulo: string) {
    if (!confirm(`Apagar a entrada "${titulo}"?`)) return;
    startTransition(async () => {
      const res = await deleteLoreEntry(id);
      if (!res.ok) setError(res.error ?? "Falha.");
      else router.refresh();
    });
  }

  function toggleReveal(id: string, revelado: boolean) {
    startTransition(async () => {
      const res = await setLoreRevealed(id, revelado);
      if (!res.ok) setError(res.error ?? "Falha.");
      else router.refresh();
    });
  }

  function duplicar(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await duplicateLoreEntry(id);
      if (!res.ok) setError(res.error ?? "Falha ao duplicar.");
      else router.refresh();
    });
  }

  const emCenaTotal = entries.filter((e) => e.revelado).length;

  // Contagem por categoria (respeitando a busca, mas não o filtro de categoria).
  const q = query.trim().toLowerCase();
  const matchesQuery = (e: LoreEntryDTO) =>
    !q ||
    e.titulo.toLowerCase().includes(q) ||
    e.conteudo.toLowerCase().includes(q);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of LORE_CATEGORIES) m[c.key] = 0;
    for (const e of entries) if (e.categoria in m) m[e.categoria]++;
    return m;
  }, [entries]);

  const filtered = entries.filter(
    (e) =>
      matchesQuery(e) &&
      (filtroCat === "ALL" || e.categoria === filtroCat) &&
      (!soEmCena || e.revelado),
  );

  const catsToShow =
    filtroCat === "ALL"
      ? LORE_CATEGORIES
      : LORE_CATEGORIES.filter((c) => c.key === filtroCat);

  const tiles = [
    { n: entries.length, label: "Entradas no livro" },
    { n: emCenaTotal, label: "Em cena agora", alerta: emCenaTotal > 0 },
    ...LORE_CATEGORIES.map((c) => ({
      n: countByCat[c.key] ?? 0,
      label: c.label,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`tomo rounded-md p-3 text-center ${
              "alerta" in t && t.alerta ? "ring-1 ring-stamp" : ""
            }`}
          >
            <div
              className={`display text-2xl ${
                "alerta" in t && t.alerta ? "text-stamp-bright" : "text-paper-light"
              }`}
            >
              {t.n}
            </div>
            <div className="typewriter text-[0.6rem] leading-tight text-paper/60">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {/* Barra de ferramentas */}
      <div className="tomo flex flex-wrap items-center gap-2 rounded-md p-3">
        <input
          className="field min-w-[10rem] flex-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nome ou descrição…"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFiltroCat("ALL")}
            data-active={filtroCat === "ALL"}
            className="folder-tab px-3 py-1 text-xs"
          >
            Todas
          </button>
          {LORE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFiltroCat(c.key)}
              data-active={filtroCat === c.key}
              className="folder-tab px-3 py-1 text-xs"
            >
              {c.label} ({countByCat[c.key] ?? 0})
            </button>
          ))}
        </div>
        <label className="typewriter flex items-center gap-1 text-xs text-paper/70">
          <input
            type="checkbox"
            checked={soEmCena}
            onChange={(e) => setSoEmCena(e.target.checked)}
          />
          só em cena
        </label>
        <button
          type="button"
          className="btn btn-primary tap ml-auto text-xs"
          onClick={() => startNew(filtroCat === "ALL" ? "MONSTRO" : filtroCat)}
        >
          ＋ Nova entrada
        </button>
      </div>

      {/* Formulário (recolhível) */}
      {showForm && (
        <section className="tomo rounded-md p-5">
          <h2 className="hand-title mb-3 text-2xl text-stamp-bright">
            {editId ? "Reescrever entrada" : "Nova entrada"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Categoria</span>
              <select
                className="field mt-1"
                value={form.categoria}
                onChange={(e) => set("categoria", e.target.value)}
              >
                {LORE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Título</span>
              <input
                className="field mt-1"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex.: Os Sedentos (Vampiros)"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">
                Link da imagem (Pinterest, etc. — opcional)
              </span>
              <input
                className="field mt-1"
                value={form.imagemUrl}
                onChange={(e) => set("imagemUrl", e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Descrição / ficha</span>
              <textarea
                className="field mt-1"
                rows={4}
                value={form.conteudo}
                onChange={(e) => set("conteudo", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">Perigo (0–3)</span>
              <input
                type="number"
                min={0}
                max={3}
                className="field mt-1 w-24"
                value={form.perigo}
                onChange={(e) =>
                  set(
                    "perigo",
                    Math.max(0, Math.min(3, Number(e.target.value) || 0)),
                  )
                }
              />
              <span className="typewriter ml-2 text-xs text-paper/60">
                {perigoLabel(form.perigo)}
              </span>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={salvar}
              disabled={pending}
            >
              {pending
                ? "..."
                : editId
                  ? "Salvar alterações"
                  : "Adicionar ao livro"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={fecharForm}>
              {editId ? "Cancelar edição" : "Fechar"}
            </button>
            {error && (
              <span className="typewriter text-sm text-stamp">{error}</span>
            )}
          </div>
        </section>
      )}
      {!showForm && error && (
        <p className="typewriter text-sm text-stamp">{error}</p>
      )}

      {/* Catálogo por categoria */}
      {filtered.length === 0 ? (
        <p className="typewriter text-sm text-paper/50">
          {q || soEmCena
            ? "Nada corresponde à busca."
            : "Nada catalogado ainda."}
        </p>
      ) : (
        catsToShow.map((cat) => {
          const doCat = filtered.filter((e) => e.categoria === cat.key);
          if (doCat.length === 0) return null;
          return (
            <section key={cat.key}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="hand-title text-2xl text-paper-light">
                  {cat.label}{" "}
                  <span className="typewriter text-sm text-paper/40">
                    ({doCat.length})
                  </span>
                </h2>
                <button
                  type="button"
                  className="btn btn-dark text-xs"
                  onClick={() => startNew(cat.key)}
                >
                  + Adicionar
                </button>
              </div>
              <SigilRow className="mb-4 text-base" />
              <div className="grid gap-4 sm:grid-cols-2">
                {doCat.map((e) => (
                  <MonsterCard
                    key={e.id}
                    entry={e}
                    pending={pending}
                    onEdit={() => startEdit(e)}
                    onDelete={() => remover(e.id, e.titulo)}
                    onDuplicate={() => duplicar(e.id)}
                    onToggleReveal={() => toggleReveal(e.id, !e.revelado)}
                    onZoom={() => e.imagemUrl && setZoomUrl(e.imagemUrl)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Lightbox da imagem */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full object-contain grayscale"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded bg-ink/80 px-3 py-1 text-paper-light"
            onClick={() => setZoomUrl(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function PerigoDots({ perigo }: { perigo: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Perigo ${perigo}/3 — ${perigoLabel(perigo)}`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i <= perigo ? "perigo-on" : "perigo-off"
          }`}
        />
      ))}
    </span>
  );
}

function MonsterCard({
  entry,
  pending,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleReveal,
  onZoom,
}: {
  entry: LoreEntryDTO;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleReveal: () => void;
  onZoom: () => void;
}) {
  return (
    <article
      className={`ficha-monstro ${entry.revelado ? "revelada" : ""} relative rounded-md p-4`}
    >
      {entry.revelado && (
        <span className="absolute -right-1 -top-1 rounded bg-stamp px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-paper-light shadow">
          Em cena
        </span>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onZoom}
          disabled={!entry.imagemUrl}
          className="rabisco flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded disabled:cursor-default"
          title={entry.imagemUrl ? "Ampliar imagem" : undefined}
          aria-label={entry.imagemUrl ? "Ampliar imagem" : "Sem imagem"}
        >
          {entry.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.imagemUrl} alt={entry.titulo} />
          ) : (
            <EldritchSketch className="text-4xl text-stamp/60" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="display text-base leading-tight text-paper-light">
              {entry.titulo}
            </h3>
            <PerigoDots perigo={entry.perigo} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="badge badge-classe text-[0.6rem]">
              {loreCategoryLabel(entry.categoria)}
            </span>
            <span
              className={`typewriter text-[0.6rem] ${entry.perigo >= 2 ? "text-stamp" : "text-paper/50"}`}
            >
              {perigoLabel(entry.perigo)}
            </span>
          </div>
          <p className="typewriter mt-1.5 text-xs leading-snug text-paper/75">
            {entry.conteudo}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleReveal}
          disabled={pending}
          className={`btn text-xs ${entry.revelado ? "btn-primary" : "btn-dark"}`}
          title={
            entry.revelado
              ? "Tirar de cena (some da tela dos jogadores)"
              : "Fazer aparecer na tela dos jogadores (só imagem + nome)"
          }
        >
          {entry.revelado ? "Em cena ✓" : "▶ Exibir na tela"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={pending}
          className="btn btn-ghost text-xs"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={pending}
          className="btn btn-ghost text-xs"
          title="Criar uma variação a partir desta entrada"
        >
          Duplicar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="btn btn-ghost text-xs"
        >
          Apagar
        </button>
      </div>
    </article>
  );
}
