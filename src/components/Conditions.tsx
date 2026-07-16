"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONDITIONS, getCondition, getTrauma } from "@/lib/game";
import {
  aplicarCondicoesTick,
  removerTrauma,
  setCharacterCondicoes,
  sofrerTrauma,
} from "@/lib/actions";

export function TraumaBadges({ traumas }: { traumas: string[] }) {
  if (!traumas || traumas.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {traumas.map((k) => {
        const t = getTrauma(k);
        if (!t) return null;
        return (
          <span
            key={k}
            title={t.desc}
            className="badge badge-ocultista"
            style={{ opacity: 0.95 }}
          >
            🕳️ {t.label}
          </span>
        );
      })}
    </span>
  );
}

export function ConditionBadges({ condicoes }: { condicoes: string[] }) {
  if (!condicoes || condicoes.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {condicoes.map((k) => {
        const c = getCondition(k);
        if (!c) return null;
        return (
          <span
            key={k}
            title={c.desc}
            className={`badge ${c.irreal ? "badge-ocultista" : "badge-classe"}`}
          >
            {c.irreal ? "☠ " : ""}
            {c.label}
          </span>
        );
      })}
    </span>
  );
}

export function TraumaManager({
  characterId,
  traumas,
}: {
  characterId: string;
  traumas: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {traumas.length === 0 && (
          <span className="typewriter text-xs text-sepia-dark">
            Nenhum trauma.
          </span>
        )}
        {traumas.map((k) => {
          const t = getTrauma(k);
          if (!t) return null;
          return (
            <span
              key={k}
              title={t.desc}
              className="inline-flex items-center gap-1 rounded-full bg-stamp/15 px-2 py-0.5 text-xs text-sepia-ink ring-1 ring-stamp/40"
            >
              🕳️ {t.label}
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removerTrauma(characterId, k))}
                className="text-stamp"
                aria-label={`Remover ${t.label}`}
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => sofrerTrauma(characterId))}
        className="btn btn-dark tap mt-2 text-xs"
        title="Sorteia um trauma permanente"
      >
        🕳️ Sofrer trauma
      </button>
    </div>
  );
}

export function ConditionsManager({
  characterId,
  condicoes,
}: {
  characterId: string;
  condicoes: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ativos = new Set(condicoes);
  const temEfeito = condicoes.some((k) => {
    const c = getCondition(k);
    return c && (c.efeitoPv || c.efeitoSan);
  });

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Falha.");
      else router.refresh();
    });
  }

  function toggle(key: string) {
    const next = ativos.has(key)
      ? condicoes.filter((k) => k !== key)
      : [...condicoes, key];
    run(() => setCharacterCondicoes(characterId, next));
  }

  const resumo = (["efeitoPv", "efeitoSan"] as const).map((campo) => {
    const soma = condicoes.reduce((acc, k) => {
      const v = getCondition(k)?.[campo];
      return acc + (typeof v === "number" ? v : 0);
    }, 0);
    return soma;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {CONDITIONS.map((c) => {
          const on = ativos.has(c.key);
          return (
            <button
              key={c.key}
              type="button"
              disabled={pending}
              onClick={() => toggle(c.key)}
              title={c.desc}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 ${
                on
                  ? c.irreal
                    ? "border-stamp bg-stamp/20 text-stamp-bright"
                    : "border-sepia-ink bg-sepia-ink/15 text-sepia-ink"
                  : "border-sepia/30 text-sepia hover:border-sepia"
              }`}
            >
              {on ? "✓ " : ""}
              {c.label}
            </button>
          );
        })}
      </div>
      {temEfeito && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => aplicarCondicoesTick(characterId))}
            className="btn btn-dark tap text-xs"
            title="Aplica os efeitos de PV/SAN das condições ativas (uma rodada)"
          >
            ⏱ Aplicar rodada
          </button>
          <span className="typewriter text-[0.7rem] text-sepia-dark">
            {resumo[0] !== 0 ? `${resumo[0]} PV` : ""}
            {resumo[0] !== 0 && resumo[1] !== 0 ? " · " : ""}
            {resumo[1] !== 0 ? `${resumo[1]} SAN` : ""} por rodada
          </span>
        </div>
      )}
      {err && <p className="typewriter mt-1 text-xs text-stamp">{err}</p>}
    </div>
  );
}
