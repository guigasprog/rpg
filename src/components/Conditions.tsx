"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONDITIONS, getCondition } from "@/lib/game";
import { aplicarCondicoesTick, setCharacterCondicoes } from "@/lib/actions";

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
