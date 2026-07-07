"use client";

import { useState } from "react";
import { rollDamage, type DamageResult } from "@/lib/dice";
import { DiceIcon } from "@/components/icons";

interface Props {
  dieCode: string;
  combate: number;
  advantage: boolean; // Combatente: rola 2× e usa o maior
}

export function WeaponRoller({ dieCode, combate, advantage }: Props) {
  const [res, setRes] = useState<DamageResult | null>(null);

  function roll() {
    setRes(rollDamage(dieCode, combate, advantage));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={roll}
        className="btn btn-dark tap px-3 py-1.5 text-xs"
      >
        <span className="inline-flex items-center gap-1">
          <DiceIcon /> Dano
        </span>
      </button>
      {res && (
        <span className="ink-reveal typewriter text-xs text-sepia-ink">
          [{res.rolls.join(", ")}]
          {res.discarded && (
            <span className="text-sepia/60"> (desc. {res.discarded.join(", ")})</span>
          )}{" "}
          + {res.combate} = <strong className="text-stamp">{res.total}</strong>
          {advantage && <span className="text-sepia"> ⚔️ vantagem</span>}
        </span>
      )}
    </div>
  );
}
