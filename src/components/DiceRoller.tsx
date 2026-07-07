"use client";

import { useState } from "react";
import { roll2d6, type RollResult } from "@/lib/dice";
import { ATTRIBUTES, OUTCOME_LABEL } from "@/lib/game";
import { DiceIcon } from "@/components/icons";

interface Props {
  attrs: {
    attrInvestigar: number;
    attrCombate: number;
    attrLabia: number;
    attrMente: number;
  };
}

const OUTCOME_COLOR: Record<string, string> = {
  TOTAL: "text-emerald-800",
  PARCIAL: "text-amber-700",
  FALHA: "text-stamp",
};

export function DiceRoller({ attrs }: Props) {
  const [result, setResult] = useState<RollResult | null>(null);
  const [used, setUsed] = useState<string>("");

  function doRoll(key: string, label: string) {
    const mod = attrs[key as keyof typeof attrs] ?? 0;
    setResult(roll2d6(mod));
    setUsed(label);
  }

  return (
    <div className="rounded border border-sepia/30 bg-black/5 p-4">
      <h3 className="display mb-2 flex items-center gap-2 text-sm text-sepia-ink">
        <DiceIcon className="text-base" /> Mesa de rolagem (2d6)
      </h3>
      <div className="flex flex-wrap gap-2">
        {ATTRIBUTES.map((a) => (
          <button
            key={a.key}
            type="button"
            className="btn btn-dark px-3 py-1.5 text-xs"
            onClick={() => doRoll(a.key, a.label)}
          >
            {a.code} +{attrs[a.key as keyof typeof attrs]}
          </button>
        ))}
      </div>

      {result && (
        <div className="ink-reveal mt-3 flex items-center gap-3 border-t border-sepia/20 pt-3">
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
            {result.dice[0]} + {result.dice[1]} + {result.modifier} ={" "}
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
    </div>
  );
}
