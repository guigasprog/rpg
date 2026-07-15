"use client";

import { useState } from "react";
import { roll2d6, type RollResult } from "@/lib/dice";
import { ATTRIBUTES, OUTCOME_LABEL } from "@/lib/game";
import { registrarRolagem } from "@/lib/actions";
import { DiceIcon } from "@/components/icons";

interface Props {
  attrs: {
    attrInvestigar: number;
    attrCombate: number;
    attrLabia: number;
    attrMente: number;
  };
  focos?: string[]; // Especialista: atributos com rerrolagem 1×/cena
  personagem?: string; // nome do personagem que rola (mostrado no chat)
}

const OUTCOME_COLOR: Record<string, string> = {
  TOTAL: "text-emerald-800",
  PARCIAL: "text-amber-700",
  FALHA: "text-stamp",
};

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function DiceRoller({ attrs, focos = [], personagem }: Props) {
  const [result, setResult] = useState<RollResult | null>(null);
  const [used, setUsed] = useState<string>("");
  const [lastKey, setLastKey] = useState<string>("");
  const [rerrolagemOk, setRerrolagemOk] = useState(true);

  function doRoll(key: string, label: string) {
    const mod = attrs[key as keyof typeof attrs] ?? 0;
    const r = roll2d6(mod);
    setResult(r);
    setUsed(label);
    setLastKey(key);
    void registrarRolagem(
      `🎲 ${label} (2d6 ${fmt(mod)}): [${r.dice.join(", ")}] = ${r.total} — ${OUTCOME_LABEL[r.outcome]}`,
      personagem,
    );
  }

  function rerolar() {
    if (!rerrolagemOk) return;
    const mod = attrs[lastKey as keyof typeof attrs] ?? 0;
    const r = roll2d6(mod);
    setResult(r);
    setRerrolagemOk(false);
    void registrarRolagem(
      `🎲 ${used} rerrolado (foco): [${r.dice.join(", ")}] = ${r.total} — ${OUTCOME_LABEL[r.outcome]}`,
      personagem,
    );
  }

  const temFoco = focos.length > 0;
  const podeRerolar = temFoco && focos.includes(lastKey) && rerrolagemOk && !!result;

  return (
    <div className="rounded border border-sepia/30 bg-black/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="display flex items-center gap-2 text-sm text-sepia-ink">
          <DiceIcon className="text-base" /> Mesa de rolagem (2d6)
        </h3>
        {temFoco && (
          <button
            type="button"
            className="btn btn-dark px-2 py-1 text-[0.65rem]"
            onClick={() => setRerrolagemOk(true)}
            title="Restaura a rerrolagem de foco (nova cena)"
          >
            ↻ Nova cena
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {ATTRIBUTES.map((a) => {
          const foco = focos.includes(a.key);
          return (
            <button
              key={a.key}
              type="button"
              className={`btn tap px-3 py-1.5 text-xs ${foco ? "btn-primary" : "btn-dark"}`}
              onClick={() => doRoll(a.key, a.label)}
              title={foco ? "Atributo de foco (permite rerrolagem)" : undefined}
            >
              {foco ? "★ " : ""}
              {a.code} {fmt(attrs[a.key as keyof typeof attrs])}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="ink-reveal mt-3 flex flex-wrap items-center gap-3 border-t border-sepia/20 pt-3">
          <div className="flex gap-1">
            {result.dice.map((d, i) => (
              <span
                key={i}
                className="attr-stamp flex h-9 w-9 items-center justify-center bg-paper-light typewriter text-base"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="typewriter text-sm text-sepia-ink">
            {result.dice[0]} + {result.dice[1]} {fmt(result.modifier)} ={" "}
            <strong>{result.total}</strong>
            <span className="text-sepia"> ({used})</span>
          </div>
          <div
            className={`display ml-auto text-sm ${OUTCOME_COLOR[result.outcome]}`}
          >
            {OUTCOME_LABEL[result.outcome]}
          </div>
        </div>
      )}

      {podeRerolar && (
        <button
          type="button"
          className="btn btn-primary tap mt-3 text-xs"
          onClick={rerolar}
        >
          ↺ Rerrolar (foco) — 1×/cena
        </button>
      )}
      {temFoco && !rerrolagemOk && (
        <p className="typewriter mt-2 text-[0.65rem] text-sepia">
          Rerrolagem de foco já usada nesta cena.
        </p>
      )}
    </div>
  );
}
