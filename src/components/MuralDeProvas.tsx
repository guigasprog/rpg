"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEvidence,
  deleteEvidence,
  setEvidenceRevealed,
  updateEvidence,
} from "@/lib/actions";

export interface EvidenceDTO {
  id: string;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  revelado: boolean;
}

const EMPTY = { titulo: "", descricao: "", imagemUrl: "" };

export function MuralDeProvas({ entries }: { entries: EvidenceDTO[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const reveladas = entries.filter((e) => e.revelado).length;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function abrirNovo() {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
    setErr(null);
  }

  function abrirEdicao(e: EvidenceDTO) {
    setEditId(e.id);
    setForm({
      titulo: e.titulo,
      descricao: e.descricao,
      imagemUrl: e.imagemUrl ?? "",
    });
    setShowForm(true);
    setErr(null);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fechar() {
    setEditId(null);
    setForm({ ...EMPTY });
    setShowForm(false);
    setErr(null);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Falha.");
      else router.refresh();
    });
  }

  function salvar() {
    setErr(null);
    start(async () => {
      const r = editId
        ? await updateEvidence(editId, form)
        : await createEvidence(form);
      if (!r.ok) {
        setErr(r.error ?? "Falha ao salvar.");
        return;
      }
      fechar();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="typewriter text-xs text-sepia-dark">
          {entries.length} prova(s) · {reveladas} revelada(s) à mesa
        </p>
        <button
          type="button"
          className="btn btn-primary tap text-xs"
          onClick={abrirNovo}
        >
          ＋ Nova prova
        </button>
      </div>

      {showForm && (
        <section className="paper paper-edge rounded-md p-4">
          <h2 className="display mb-3 text-lg text-sepia-ink">
            {editId ? "Reescrever prova" : "Nova prova"}
          </h2>
          <div className="grid gap-3">
            <label className="block">
              <span className="label">Título</span>
              <input
                className="field mt-1"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex.: Carta rasgada; Foto da vítima; Endereço na Rua 9"
              />
            </label>
            <label className="block">
              <span className="label">
                Link da imagem (documento/foto — opcional)
              </span>
              <input
                className="field mt-1"
                value={form.imagemUrl}
                onChange={(e) => set("imagemUrl", e.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="label">Descrição / o que se lê</span>
              <textarea
                className="field mt-1"
                rows={3}
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={salvar}
              disabled={pending}
            >
              {pending ? "..." : editId ? "Salvar" : "Adicionar ao mural"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={fechar}>
              {editId ? "Cancelar edição" : "Fechar"}
            </button>
            {err && (
              <span className="typewriter text-sm text-stamp">{err}</span>
            )}
          </div>
        </section>
      )}
      {!showForm && err && (
        <p className="typewriter text-sm text-stamp">{err}</p>
      )}

      {entries.length === 0 ? (
        <p className="typewriter text-sm text-paper/50">
          Nenhuma prova no mural ainda.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((e) => (
            <article
              key={e.id}
              className={`paper paper-edge relative rounded-md p-4 ${e.revelado ? "ring-1 ring-stamp" : ""}`}
            >
              {e.revelado && (
                <span className="absolute -right-1 -top-1 rounded bg-stamp px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-paper-light shadow">
                  Na mesa
                </span>
              )}
              <div className="flex gap-3">
                {e.imagemUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomUrl(e.imagemUrl)}
                    className="paper-edge h-20 w-16 shrink-0 overflow-hidden rounded bg-black/10"
                    title="Ampliar"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imagemUrl}
                      alt=""
                      className="h-full w-full object-cover grayscale"
                    />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="display text-base leading-tight text-sepia-ink">
                    {e.titulo}
                  </h3>
                  {e.descricao && (
                    <p className="typewriter mt-1 whitespace-pre-wrap text-xs leading-snug text-sepia">
                      {e.descricao}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setEvidenceRevealed(e.id, !e.revelado))}
                  className={`btn text-xs ${e.revelado ? "btn-primary" : "btn-dark"}`}
                  title={
                    e.revelado
                      ? "Recolher (some do mural dos jogadores)"
                      : "Revelar aos jogadores"
                  }
                >
                  {e.revelado ? "Revelada ✓" : "▶ Revelar à mesa"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => abrirEdicao(e)}
                  className="btn btn-ghost text-xs"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Apagar a prova "${e.titulo}"?`))
                      run(() => deleteEvidence(e.id));
                  }}
                  className="btn btn-ghost text-xs"
                >
                  Apagar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

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
