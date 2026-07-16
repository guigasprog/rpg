import { resolveOutcome, type DiceOutcome } from "@/lib/game";

export type Crit = "SUCESSO" | "FALHA" | null;

export interface RollResult {
  dice: [number, number];
  modifier: number;
  total: number;
  outcome: DiceOutcome;
  crit: Crit; // dois 6 = crítico de sucesso; dois 1 = desastre
}

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function roll2d6(modifier = 0): RollResult {
  const dice: [number, number] = [d6(), d6()];
  const total = dice[0] + dice[1] + modifier;
  const crit: Crit =
    dice[0] === 6 && dice[1] === 6
      ? "SUCESSO"
      : dice[0] === 1 && dice[1] === 1
        ? "FALHA"
        : null;
  return { dice, modifier, total, outcome: resolveOutcome(total), crit };
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

// Rola um código de dado (ex.: "1d6", "2d4"); [] se inválido/vazio.
export function rollPool(code: string): number[] {
  const parsed = parseDie(code);
  if (!parsed) return [];
  return rollDie(parsed.qtd, parsed.faces);
}

// ---------------- Comando de rolagem no chat ----------------
// Aceita: 1d6, 2d6+3, 2d6+inv, 1d20, 2d6-1 (atributos: inv/com/lab/men).

export interface CommandRoll {
  expr: string;
  rolls: number[];
  faces: number;
  modifier: number;
  modLabel: string;
  total: number;
  outcome: DiceOutcome | null;
  crit: Crit;
}

const ATTR_MAP: Record<string, string> = {
  inv: "attrInvestigar",
  com: "attrCombate",
  lab: "attrLabia",
  men: "attrMente",
};

export function parseRollCommand(
  cmd: string,
  attrs?: Record<string, number>,
): CommandRoll | null {
  const m = /^(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+|inv|com|lab|men))?$/i.exec(
    cmd.trim(),
  );
  if (!m) return null;
  const qtd = Number(m[1]);
  const faces = Number(m[2]);
  if (qtd < 1 || qtd > 50 || faces < 2 || faces > 1000) return null;

  let modifier = 0;
  let modLabel = "";
  if (m[3] && m[4]) {
    const sign = m[3] === "-" ? -1 : 1;
    const token = m[4].toLowerCase();
    if (/^\d+$/.test(token)) {
      modifier = sign * Number(token);
      modLabel = ` ${m[3]}${token}`;
    } else {
      const val = attrs?.[ATTR_MAP[token]] ?? 0;
      modifier = sign * val;
      modLabel = ` ${m[3]}${token.toUpperCase()}(${val})`;
    }
  }

  const rolls = rollDie(qtd, faces);
  const diceSum = rolls.reduce((s, v) => s + v, 0);
  const total = diceSum + modifier;
  const outcome = qtd === 2 && faces === 6 ? resolveOutcome(total) : null;
  // Crítico: todos os dados no valor máximo; desastre: todos em 1.
  const crit: Crit = rolls.every((v) => v === faces)
    ? "SUCESSO"
    : rolls.every((v) => v === 1)
      ? "FALHA"
      : null;

  return {
    expr: `${qtd}d${faces}${modLabel}`.trim(),
    rolls,
    faces,
    modifier,
    modLabel,
    total,
    outcome,
    crit,
  };
}

export interface DamageResult {
  dieCode: string;
  rolls: number[]; // dados usados (do conjunto escolhido)
  discarded: number[] | null; // conjunto descartado (vantagem do Combatente)
  combate: number;
  diceSum: number;
  total: number;
  advantage: boolean;
  crit: boolean; // todos os dados no valor máximo
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
    crit: rolls.every((v) => v === parsed.faces),
  };
}
