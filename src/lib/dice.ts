import { resolveOutcome, type DiceOutcome } from "@/lib/game";

export interface RollResult {
  dice: [number, number];
  modifier: number;
  total: number;
  outcome: DiceOutcome;
}

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function roll2d6(modifier = 0): RollResult {
  const dice: [number, number] = [d6(), d6()];
  const total = dice[0] + dice[1] + modifier;
  return { dice, modifier, total, outcome: resolveOutcome(total) };
}

// ---------------- Dano ----------------

export function parseDie(code: string): { qtd: number; faces: number } | null {
  const m = /^(\d+)d(\d+)$/i.exec(code.trim());
  if (!m) return null;
  const qtd = Number(m[1]);
  const faces = Number(m[2]);
  if (qtd < 1 || qtd > 20 || faces < 2 || faces > 100) return null;
  return { qtd, faces };
}

function rollDie(qtd: number, faces: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < qtd; i++) out.push(Math.floor(Math.random() * faces) + 1);
  return out;
}

export interface DamageResult {
  dieCode: string;
  rolls: number[]; // dados usados (do conjunto escolhido)
  discarded: number[] | null; // conjunto descartado (vantagem do Combatente)
  combate: number;
  diceSum: number;
  total: number;
  advantage: boolean;
}

// Dano = dado(s) da arma + Combate. Combatente rola o conjunto 2× e usa o maior.
export function rollDamage(
  dieCode: string,
  combate: number,
  advantage = false,
): DamageResult | null {
  const parsed = parseDie(dieCode);
  if (!parsed) return null;

  const setA = rollDie(parsed.qtd, parsed.faces);
  const sumA = setA.reduce((s, v) => s + v, 0);

  let rolls = setA;
  let discarded: number[] | null = null;
  let diceSum = sumA;

  if (advantage) {
    const setB = rollDie(parsed.qtd, parsed.faces);
    const sumB = setB.reduce((s, v) => s + v, 0);
    if (sumB > sumA) {
      rolls = setB;
      discarded = setA;
      diceSum = sumB;
    } else {
      discarded = setB;
    }
  }

  return {
    dieCode,
    rolls,
    discarded,
    combate,
    diceSum,
    total: diceSum + combate,
    advantage,
  };
}
