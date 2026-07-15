"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  enviarNarracao,
  limparCena,
  limparNarracao,
  setCharacterOnStage,
  setLoreRevealed,
} from "@/lib/actions";
import { loreCategoryLabel } from "@/lib/lore";

interface LoreLite {
  id: string;
  titulo: string;
  categoria: string;
  imagemUrl: string | null;
  revelado: boolean;
}

interface CharLite {
  id: string;
  name: string;
  portraitUrl: string | null;
  mostrarNaMesa: boolean;
}

type Res = { ok: boolean; error?: string };

export function QuickStagePanel({
  lore,
  chars,
}: {
  lore: LoreLite[];
  chars: CharLite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [narr, setNarr] = useState("");

  const loreOn = lore.filter((e) => e.revelado);
  const charsOn = chars.filter((c) => c.mostrarNaMesa);
  const emCena = loreOn.length + charsOn.length;

  const q = query.trim().toLowerCase();
  const loreList = lore.filter(
    (e) => !q || e.titulo.toLowerCase().includes(q),
  );

  function run(fn: () => Promise<Res>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Falha.");
      else router.refresh();
    });
  }

  return (
    <section className="paper paper-edge rounded-md p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="display text-lg text-sepia-ink">🎭 Pôr em cena</h2>
          <p className="typewriter text-[0.7rem] text-sepia-dark">
            Exibe na tela de todos (imagem + nome), ao vivo.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost tap text-xs"
          disabled={pending || emCena === 0}
          onClick={() => run(limparCena)}
        >
          Limpar cena{emCena ? ` (${emCena})` : ""}
        </button>
      </div>

      {/* Em cena agora */}
      {emCena > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {loreOn.map((e) => (
            <StageChip
              key={e.id}
              label={e.titulo}
              pending={pending}
              onRemove={() => run(() => setLoreRevealed(e.id, false))}
            />
          ))}
          {charsOn.map((c) => (
            <StageChip
              key={c.id}
              label={`${c.name} · retrato`}
              pending={pending}
              onRemove={() => run(() => setCharacterOnStage(c.id, false))}
            />
          ))}
        </div>
      ) : (
        <p className="typewriter mb-3 text-xs text-sepia-dark">
          Nada em cena. Clique numa aparição abaixo para exibi-la a todos.
        </p>
      )}

      {err && <p className="typewriter mb-2 text-xs text-stamp">{err}</p>}

      {/* Aparições do Livro */}
      {lore.length === 0 ? (
        <p className="typewriter text-xs text-sepia-dark">
          O Livro está vazio.{" "}
          <a href="/mestre/livro" className="text-stamp underline">
            Catalogar aparições
          </a>
          .
        </p>
      ) : (
        <>
          <input
            className="field mb-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar aparição do Livro…"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {loreList.length === 0 ? (
              <p className="typewriter text-xs text-sepia-dark">
                Nada corresponde à busca.
              </p>
            ) : (
              loreList.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setLoreRevealed(e.id, !e.revelado))}
                  className={`flex w-full items-center gap-2 rounded border p-1.5 text-left transition-colors disabled:opacity-60 ${
                    e.revelado
                      ? "border-stamp bg-stamp/10"
                      : "border-sepia/30 hover:border-sepia"
                  }`}
                >
                  <span className="flex h-9 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-black/10">
                    {e.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.imagemUrl}
                        alt=""
                        className="h-full w-full object-cover grayscale"
                      />
                    ) : (
                      <span className="text-sepia/40">?</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="typewriter block truncate text-sm text-sepia-ink">
                      {e.titulo}
                    </span>
                    <span className="typewriter text-[0.6rem] text-sepia">
                      {loreCategoryLabel(e.categoria)}
                    </span>
                  </span>
                  <span
                    className={`typewriter shrink-0 text-xs ${e.revelado ? "text-stamp" : "text-sepia"}`}
                  >
                    {e.revelado ? "em cena ✓" : "▶ exibir"}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {/* Narração ao vivo */}
      <div className="mt-3 border-t border-sepia/25 pt-2">
        <p className="label mb-1">Narração ao vivo</p>
        <textarea
          className="field text-sm"
          rows={2}
          value={narr}
          onChange={(e) => setNarr(e.target.value)}
          placeholder="As luzes piscam três vezes. Depois, silêncio…"
        />
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary tap text-xs"
            disabled={pending || !narr.trim()}
            onClick={() =>
              run(async () => {
                const r = await enviarNarracao(narr);
                if (r.ok) setNarr("");
                return r;
              })
            }
          >
            📣 Narrar na tela
          </button>
          <button
            type="button"
            className="btn btn-ghost tap text-xs"
            disabled={pending}
            onClick={() => run(limparNarracao)}
          >
            Tirar narração
          </button>
        </div>
      </div>

      {/* Retratos dos investigadores */}
      {chars.length > 0 && (
        <div className="mt-3 border-t border-sepia/25 pt-2">
          <p className="label mb-1">Retratos dos investigadores</p>
          <div className="flex flex-wrap gap-1.5">
            {chars.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => setCharacterOnStage(c.id, !c.mostrarNaMesa))
                }
                className={`btn tap text-xs ${c.mostrarNaMesa ? "btn-primary" : "btn-dark"}`}
              >
                {c.mostrarNaMesa ? "● " : ""}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StageChip({
  label,
  pending,
  onRemove,
}: {
  label: string;
  pending: boolean;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stamp/15 px-2 py-0.5 ring-1 ring-stamp/40">
      <span className="typewriter max-w-[12rem] truncate text-xs text-sepia-ink">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        className="text-stamp hover:text-stamp-bright"
        aria-label={`Tirar ${label} de cena`}
      >
        ✕
      </button>
    </span>
  );
}
