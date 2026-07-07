// Regras do sistema caseiro (2d6).

export const ATTRIBUTES = [
  { key: "attrInvestigar", code: "INV", label: "Investigar" },
  { key: "attrCombate", code: "COM", label: "Combate" },
  { key: "attrLabia", code: "LAB", label: "Lábia" },
  { key: "attrMente", code: "MEN", label: "Mente" },
] as const;

export type AttributeKey = (typeof ATTRIBUTES)[number]["key"];

// Point-buy: 4 atributos de -2 a 3, somando exatamente 5.
export const ATTR_MIN = -2;
export const ATTR_MAX = 3;
export const ATTR_TOTAL_POINTS = 5;

export const BASE_PV = 10;
export const BASE_SAN = 10;

// Faixa aceita para os valores ATUAIS (permite sobrevida e negativos).
export const RESOURCE_ATUAL_MIN = -99;
export const RESOURCE_ATUAL_MAX = 999;

export const MAX_LEVEL = 25;
export const MILESTONE_STEP = 5;

// ---------------- Classes ----------------

export const CLASSES = {
  ESPECIALISTA: "ESPECIALISTA",
  COMBATENTE: "COMBATENTE",
  OCULTISTA: "OCULTISTA",
} as const;

export type ClassKey = keyof typeof CLASSES;

export interface ClassInfo {
  label: string;
  descricao: string;
  pvPorNivel: number;
  sanPorNivel: number;
}

export const CLASS_INFO: Record<string, ClassInfo> = {
  COMBATENTE: {
    label: "Combatente",
    descricao: "Corpo à prova de balas (quase). +1 dado de dano.",
    pvPorNivel: 2,
    sanPorNivel: 1,
  },
  ESPECIALISTA: {
    label: "Especialista",
    descricao: "Foco em 2 atributos. O cérebro por trás do caso.",
    pvPorNivel: 1,
    sanPorNivel: 2,
  },
  OCULTISTA: {
    label: "Ocultista",
    descricao: "Fez um pacto com o Irreal. Mente blindada, corpo frágil.",
    pvPorNivel: 1,
    sanPorNivel: 3,
  },
};

// Classes escolhíveis na criação (Ocultista só via Proposta do Além).
export const STARTER_CLASSES: ClassKey[] = ["ESPECIALISTA", "COMBATENTE"];

export function classLabel(classe: string): string {
  return CLASS_INFO[classe]?.label ?? classe;
}

// ---------------- Subclasses (liberadas pelo GM) ----------------

export interface SubclassInfo {
  key: string;
  classe: ClassKey;
  label: string;
  descricao: string;
  pvPorNivel?: number; // delta somado ao ganho da classe
  sanPorNivel?: number;
  habilidades: string[];
}

export const SUBCLASSES: Record<string, SubclassInfo[]> = {
  COMBATENTE: [
    { key: "brigao", classe: "COMBATENTE", label: "Brigão", descricao: "Punho, cotovelo e cabeçada.", pvPorNivel: 1, habilidades: ["+1 no dano corpo a corpo.", "Não sente o primeiro soco da briga."] },
    { key: "atirador", classe: "COMBATENTE", label: "Atirador", descricao: "Respira, mira, aperta.", habilidades: ["Rerrola o resultado 1 em armas de fogo.", "Tiro certeiro: +2 no acerto à distância se mirar."] },
    { key: "guardiao", classe: "COMBATENTE", label: "Guardião", descricao: "O muro entre o grupo e o fim.", pvPorNivel: 2, habilidades: ["Reduz 1 de todo dano recebido.", "Intercepta um golpe destinado a um aliado adjacente."] },
    { key: "carrasco", classe: "COMBATENTE", label: "Carrasco", descricao: "Termina o que começa.", pvPorNivel: 1, habilidades: ["Executa alvo abaixo de 1/4 do PV.", "Sua presença com a lâmina intimida."] },
    { key: "veterano", classe: "COMBATENTE", label: "Veterano de Guerra", descricao: "Já viu pior. Bem pior.", pvPorNivel: 1, sanPorNivel: 1, habilidades: ["Sangue-frio sob fogo (rerrola medo).", "Conhece e improvisa com qualquer arma."] },
    { key: "capanga", classe: "COMBATENTE", label: "Capanga", descricao: "Luta sujo porque funciona.", pvPorNivel: 1, habilidades: ["Golpe baixo: vantagem 1×/cena.", "Aguenta apanhar calado."] },
  ],
  ESPECIALISTA: [
    { key: "investigador", classe: "ESPECIALISTA", label: "Investigador", descricao: "A cena fala com quem sabe ouvir.", habilidades: ["Dedução: Falha vira Parcial em INV 1×/cena.", "Reconstrói a cena do crime de relance."] },
    { key: "negociador", classe: "ESPECIALISTA", label: "Negociador", descricao: "Toda porta tem uma senha falada.", sanPorNivel: 1, habilidades: ["Vantagem em interações sociais tensas.", "Sempre tem um contato a um telefonema."] },
    { key: "erudito", classe: "ESPECIALISTA", label: "Erudito", descricao: "Enterrado em livros que ninguém lê.", sanPorNivel: 1, habilidades: ["'Já li sobre isso' 1×/sessão.", "Decifra idiomas mortos e cifras."] },
    { key: "legista", classe: "ESPECIALISTA", label: "Legista", descricao: "Os mortos não mentem para você.", habilidades: ["Estabiliza um personagem em PV negativo.", "Autópsia revela a verdadeira causa."] },
    { key: "infiltrador", classe: "ESPECIALISTA", label: "Infiltrador", descricao: "Estava lá o tempo todo. Ninguém viu.", pvPorNivel: 1, habilidades: ["Disfarce impecável sob pressão.", "Abre qualquer fechadura comum."] },
    { key: "cetico", classe: "ESPECIALISTA", label: "Cético", descricao: "Deve ter uma explicação. Deve.", habilidades: ["Resiste ao medo (rerrola SAN 1×/cena).", "Explica o inexplicável… quase sempre."] },
  ],
  OCULTISTA: [
    { key: "vidente", classe: "OCULTISTA", label: "Vidente", descricao: "Enxerga o fio antes de ser cortado.", sanPorNivel: 1, habilidades: ["Presságio: 1 pergunta ao Irreal por sessão.", "Sente a morte se aproximando."] },
    { key: "conjurador", classe: "OCULTISTA", label: "Conjurador", descricao: "Conhece o Verbo — e o preço.", habilidades: ["O Verbo: gasta SAN por um efeito sobrenatural.", "Traça círculos de proteção."] },
    { key: "pactuario", classe: "OCULTISTA", label: "Pactuário", descricao: "Poder emprestado tem juros.", pvPorNivel: 2, sanPorNivel: -1, habilidades: ["Invoca o poder da entidade patrona.", "A dívida sempre cobra — no pior momento."] },
    { key: "exorcista", classe: "OCULTISTA", label: "Exorcista", descricao: "Empurra o Irreal de volta.", sanPorNivel: 1, habilidades: ["Bane entidades menores.", "Reconhece possessão à primeira vista."] },
    { key: "necromante", classe: "OCULTISTA", label: "Necromante", descricao: "A carne ainda tem o que dizer.", habilidades: ["Fala com os mortos (custo de SAN).", "A matéria morta obedece por um tempo."] },
    { key: "profeta", classe: "OCULTISTA", label: "Profeta do Fim", descricao: "Viu o que vem — e não dá pra desver.", habilidades: ["Visões do que está por vir.", "Fanáticos passam a segui-lo."] },
  ],
};

export function subclassesFor(classe: string): SubclassInfo[] {
  return SUBCLASSES[classe] ?? [];
}

export function getSubclass(key?: string | null): SubclassInfo | null {
  if (!key) return null;
  for (const list of Object.values(SUBCLASSES)) {
    const found = list.find((s) => s.key === key);
    if (found) return found;
  }
  return null;
}

export function subclassLabel(key?: string | null): string {
  return getSubclass(key)?.label ?? "";
}

// Fórmula de recursos. Nível 0 = só base + atributo (pessoa comum).
// A subclasse soma um pequeno delta por nível ao ganho da classe.
export function computeMaxPv(
  attrCombate: number,
  classe: string,
  nivel: number,
  subclasse?: string | null,
): number {
  const perLevel =
    (CLASS_INFO[classe]?.pvPorNivel ?? 1) + (getSubclass(subclasse)?.pvPorNivel ?? 0);
  const n = Math.max(0, nivel);
  return Math.max(1, BASE_PV + attrCombate + perLevel * n);
}

export function computeMaxSan(
  attrMente: number,
  classe: string,
  nivel: number,
  subclasse?: string | null,
): number {
  const perLevel =
    (CLASS_INFO[classe]?.sanPorNivel ?? 1) + (getSubclass(subclasse)?.sanPorNivel ?? 0);
  const n = Math.max(0, nivel);
  return Math.max(1, BASE_SAN + attrMente + perLevel * n);
}

export function levelLabel(nivel: number): string {
  return nivel <= 0 ? "Comum" : `Nível ${nivel}`;
}

// Habilidades de assinatura (níveis marco). GM adjudica os efeitos.
export interface Milestone {
  level: number;
  nome: string;
  desc: string;
}

export const CLASS_MILESTONES: Record<string, Milestone[]> = {
  COMBATENTE: [
    { level: 5, nome: "Instinto de Rua", desc: "Rerrola 1 dado de dano por cena." },
    { level: 10, nome: "Ossos Duros", desc: "+5 PV; ignora o primeiro dano leve da cena." },
    { level: 15, nome: "Segunda Natureza", desc: "Ataca duas vezes ao tirar 10+." },
    { level: 20, nome: "Veterano", desc: "Imune a medo comum." },
    { level: 25, nome: "Última Trincheira", desc: "Age +1 turno em PV negativo antes de cair." },
  ],
  ESPECIALISTA: [
    { level: 5, nome: "Olho Clínico", desc: "Falha vira Parcial 1×/cena num atributo de foco." },
    { level: 10, nome: "Repertório", desc: "Ganha +1 atributo de foco." },
    { level: 15, nome: "Preparado", desc: "Começa cada sessão com um item improvisado útil." },
    { level: 20, nome: "Mente Afiada", desc: "Rerrola testes de MEN/INV 1×/cena." },
    { level: 25, nome: "Autoridade no Assunto", desc: "Sucesso Total automático 1×/sessão num foco." },
  ],
  OCULTISTA: [
    { level: 5, nome: "Primeiro Sussurro", desc: "Faz 1 pergunta ao Irreal por sessão." },
    { level: 10, nome: "Pacto Menor", desc: "Gasta SAN para rerrolar qualquer dado." },
    { level: 15, nome: "Visão do Véu", desc: "Enxerga e detecta entidades do Irreal." },
    { level: 20, nome: "Verbo Proibido", desc: "Conjura um efeito sobrenatural (custo de SAN)." },
    { level: 25, nome: "Comunhão", desc: "Dialoga de igual com o Irreal." },
  ],
};

export function unlockedMilestones(classe: string, nivel: number): Milestone[] {
  return (CLASS_MILESTONES[classe] ?? []).filter((m) => m.level <= nivel);
}

// ---------------- Proposta do Além ----------------

export const PROPOSTA = {
  NENHUMA: "NENHUMA",
  PENDENTE: "PENDENTE",
  ACEITA: "ACEITA",
  RECUSADA: "RECUSADA",
} as const;

// ---------------- Dados de dano ----------------

// "" = item sem dano (não é arma).
export const WEAPON_DICE = ["", "1d3", "1d4", "1d6", "1d8", "1d10", "1d12", "2d6"] as const;

// ---------------- Recursos iniciais / ocultismo ----------------

export const OCCULTISM_MAX_LEVEL = 3;

export const OCCULTISM_LEVELS = [
  { level: 0, label: "Ignorância", hint: "Uma pessoa comum. O véu está intacto." },
  { level: 1, label: "Suspeita", hint: "Coincidências demais. Algo range no escuro." },
  { level: 2, label: "Contato", hint: "Você viu. Não dá mais para desver." },
  { level: 3, label: "Imerso", hint: "O Irreal te conhece pelo nome." },
] as const;

// ---------------- Resolução 2d6 ----------------

export type DiceOutcome = "TOTAL" | "PARCIAL" | "FALHA";

export function resolveOutcome(total: number): DiceOutcome {
  if (total >= 10) return "TOTAL";
  if (total >= 7) return "PARCIAL";
  return "FALHA";
}

export const OUTCOME_LABEL: Record<DiceOutcome, string> = {
  TOTAL: "Sucesso Total",
  PARCIAL: "Sucesso Parcial",
  FALHA: "Falha",
};
