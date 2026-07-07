"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLoreEntry,
  deleteLoreEntry,
  setLoreRevealed,
  updateLoreEntry,
} from "@/lib/actions";
import { LORE_CATEGORIES } from "@/lib/lore";
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

export function LivroDoMestre({ entries }: { entries: LoreEntryDTO[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<string | null>(null); // null = criando
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startNew(categoria: string) {
    setEditId(null);
    setForm({ ...EMPTY, categoria });
    setError(null);
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
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
      setForm({ ...EMPTY, categoria: form.categoria });
      setEditId(null);
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

  return (
    <div className="space-y-8">
      {/* Formulário */}
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
            <span className="label">Link da imagem (Pinterest, etc. — opcional)</span>
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
                set("perigo", Math.max(0, Math.min(3, Number(e.target.value) || 0)))
              }
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={salvar}
            disabled={pending}
          >
            {pending ? "..." : editId ? "Salvar alterações" : "Adicionar ao livro"}
          </button>
          {editId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditId(null);
                setForm({ ...EMPTY });
              }}
            >
              Cancelar edição
            </button>
          )}
          {error && <span className="typewriter text-sm text-stamp">{error}</span>}
        </div>
      </section>

      {/* Entradas por categoria */}
      {LORE_CATEGORIES.map((cat) => {
        const doCat = entries.filter((e) => e.categoria === cat.key);
        return (
          <section key={cat.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="hand-title text-2xl text-paper-light">{cat.label}</h2>
              <button
                type="button"
                className="btn btn-dark text-xs"
                onClick={() => startNew(cat.key)}
              >
                + Adicionar {cat.label.toLowerCase()}
              </button>
            </div>
            <SigilRow className="mb-4 text-base" />
            {doCat.length === 0 ? (
              <p className="typewriter text-sm text-paper/50">
                Nada catalogado ainda.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {doCat.map((e) => (
                  <MonsterCard
                    key={e.id}
                    entry={e}
                    pending={pending}
                    onEdit={() => startEdit(e)}
                    onDelete={() => remover(e.id, e.titulo)}
                    onToggleReveal={() => toggleReveal(e.id, !e.revelado)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PerigoDots({ perigo }: { perigo: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Perigo ${perigo}/3`}>
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
  onToggleReveal,
}: {
  entry: LoreEntryDTO;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleReveal: () => void;
}) {
  return (
    <article
      className={`ficha-monstro ${entry.revelado ? "revelada" : ""} rounded-md p-4`}
    >
      <div className="flex gap-3">
        <div className="rabisco flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded">
          {entry.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.imagemUrl} alt={entry.titulo} />
          ) : (
            <EldritchSketch className="text-4xl text-stamp/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="display truncate text-base text-paper-light">
              {entry.titulo}
            </h3>
            <PerigoDots perigo={entry.perigo} />
          </div>
          <p className="typewriter mt-1 text-xs leading-snug text-paper/75">
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
