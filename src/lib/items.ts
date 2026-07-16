import { rollPool } from "@/lib/dice";
import type { InventoryItem } from "@/lib/character";
import { subclassLabel } from "@/lib/game";

export interface ItemEffect {
  dPv: number;
  dSan: number;
  rolls: number[]; // dados rolados (vazio se efeito fixo/sem rolagem)
  dado: string; // código do dado ("" se sem rolagem)
  recurso: string; // "PV" | "SAN"
  usosGastos: number;
  especialista: boolean | null; // true/false quando há especialidade; null se não há
  label: string; // descrição p/ log/animação
}

// Calcula o efeito de usar um item, considerando a subclasse de quem usa.
// - Especialista (subclasse certa): gasta 1 uso, efeito = dado + base + bônus.
// - Não-especialista: gasta mais usos e efeito reduzido (metade, sem bônus).
// - Sem especialidade definida: 1 uso, efeito = dado + base.
// - Sem dado: usa os efeitos fixos (efeitoPv/efeitoSan), 1 uso (compatível).
export function computeItemEffect(
  item: InventoryItem,
  subclasse: string | null,
): ItemEffect {
  const codigo = item.dadoEfeito ?? "";
  const temDado = /^\d+d\d+$/i.test(codigo);

  if (!temDado) {
    return {
      dPv: item.efeitoPv || 0,
      dSan: item.efeitoSan || 0,
      rolls: [],
      dado: "",
      recurso: item.recurso === "SAN" ? "SAN" : "PV",
      usosGastos: 1,
      especialista: null,
      label: item.nome,
    };
  }

  const rolls = rollPool(codigo);
  const soma = rolls.reduce((s, v) => s + v, 0);
  const base = item.baseEfeito || 0;
  const temEspecialidade = !!item.especialista;
  const ehEspecialista = temEspecialidade && subclasse === item.especialista;
  const naoEspecialista = temEspecialidade && !ehEspecialista;

  let valor: number;
  let usosGastos = 1;
  if (naoEspecialista) {
    // Sem experiência: menos recompensa e gasta mais usos de uma vez.
    valor = Math.max(0, Math.floor((soma + base) / 2));
    usosGastos = Math.max(1, item.usosSemEspecialista || 5);
  } else {
    valor = soma + base + (ehEspecialista ? item.bonusEspecialista || 0 : 0);
  }

  const recurso = item.recurso === "SAN" ? "SAN" : "PV";
  const partes = [`${codigo} [${rolls.join(", ")}]`];
  if (base) partes.push(`${base >= 0 ? "+" : ""}${base}`);
  if (ehEspecialista && item.bonusEspecialista)
    partes.push(`+${item.bonusEspecialista} (${subclassLabel(item.especialista)})`);
  if (naoEspecialista) partes.push("÷2 sem especialista");

  return {
    dPv: recurso === "PV" ? valor : 0,
    dSan: recurso === "SAN" ? valor : 0,
    rolls,
    dado: codigo,
    recurso,
    usosGastos,
    especialista: ehEspecialista ? true : temEspecialidade ? false : null,
    label: `${item.nome}: ${partes.join(" ")} = ${valor} ${recurso}`,
  };
}
