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

// ---------------- Subclasses ----------------
// Destravam no NÍVEL 5: o jogador escolhe o rumo dentro da própria classe.
// Cada subclasse dá deltas de PV/SAN, habilidades e um ITEM DE ASSINATURA
// (adicionado ao inventário com quantidade/usos).

export const SUBCLASS_LEVEL = 5;

export interface SubclassItem {
  nome: string;
  dano?: string; // "" = sem dano
  qtd?: number; // padrão 1
  usos?: number; // padrão 1
  efeitoPv?: number; // aplicado ao PV ao usar
  efeitoSan?: number; // aplicado à Sanidade ao usar
}

export interface SubclassInfo {
  key: string;
  classe: ClassKey;
  label: string;
  descricao: string;
  pvPorNivel?: number; // delta somado ao ganho da classe
  sanPorNivel?: number;
  habilidades: string[];
  item?: SubclassItem; // item de assinatura ao escolher
}

export const SUBCLASSES: Record<string, SubclassInfo[]> = {
  COMBATENTE: [
    { key: "brigao", classe: "COMBATENTE", label: "Brigão", descricao: "Punho, cotovelo e cabeçada.", pvPorNivel: 2, habilidades: ["+1 no dano corpo a corpo.", "Não sente o primeiro soco da briga."], item: { nome: "Soqueira de Ferro", dano: "1d4", qtd: 1, usos: 99 } },
    { key: "atirador", classe: "COMBATENTE", label: "Atirador", descricao: "Respira, mira, aperta.", habilidades: ["Rerrola o resultado 1 em armas de fogo.", "Tiro certeiro: +2 no acerto à distância se mirar."], item: { nome: "Rifle de Ferrolho", dano: "2d6", qtd: 1, usos: 5 } },
    { key: "guardiao", classe: "COMBATENTE", label: "Guardião", descricao: "O muro entre o grupo e o fim.", pvPorNivel: 3, habilidades: ["Reduz 1 de todo dano recebido.", "Intercepta um golpe destinado a um aliado adjacente."], item: { nome: "Escudo de Aço", dano: "", qtd: 1, usos: 99 } },
    { key: "carrasco", classe: "COMBATENTE", label: "Carrasco", descricao: "Termina o que começa.", pvPorNivel: 1, habilidades: ["Executa alvo abaixo de 1/4 do PV.", "Sua presença com a lâmina intimida."], item: { nome: "Machadinha", dano: "1d8", qtd: 1, usos: 99 } },
    { key: "veterano", classe: "COMBATENTE", label: "Veterano de Guerra", descricao: "Já viu pior. Bem pior.", pvPorNivel: 1, sanPorNivel: 1, habilidades: ["Sangue-frio sob fogo (rerrola medo).", "Conhece e improvisa com qualquer arma."], item: { nome: "Granada", dano: "2d6", qtd: 2, usos: 1 } },
    { key: "capanga", classe: "COMBATENTE", label: "Capanga", descricao: "Luta sujo porque funciona.", pvPorNivel: 1, habilidades: ["Golpe baixo: vantagem 1×/cena.", "Aguenta apanhar calado."], item: { nome: "Cassetete", dano: "1d6", qtd: 1, usos: 99 } },
  ],
  ESPECIALISTA: [
    { key: "detetive", classe: "ESPECIALISTA", label: "Detetive", descricao: "A cena do crime fala com quem sabe ouvir.", sanPorNivel: 1, habilidades: ["Dedução: Falha vira Parcial em INV 1×/cena.", "Reconstrói a cena de relance."], item: { nome: "Lupa & Distintivo", dano: "", qtd: 1, usos: 99 } },
    { key: "medico", classe: "ESPECIALISTA", label: "Médico", descricao: "Segura a vida com as próprias mãos.", pvPorNivel: 1, sanPorNivel: 1, habilidades: ["Estabiliza um personagem em PV negativo.", "Diagnostica males e venenos."], item: { nome: "Kit Médico", dano: "", qtd: 1, usos: 3, efeitoPv: 4 } },
    { key: "policial", classe: "ESPECIALISTA", label: "Policial", descricao: "A lei — ou o que sobrou dela.", pvPorNivel: 2, habilidades: ["Autoridade legal impõe respeito.", "Algema, prende e interroga."], item: { nome: "Revólver .38", dano: "2d6", qtd: 1, usos: 6 } },
    { key: "tecnico", classe: "ESPECIALISTA", label: "Técnico", descricao: "Toda fechadura e todo circuito têm um jeito.", sanPorNivel: 1, habilidades: ["Abre fechaduras e burla alarmes.", "Conserta e improvisa aparelhos."], item: { nome: "Kit de Gazuas & Ferramentas", dano: "", qtd: 1, usos: 99 } },
    { key: "reporter", classe: "ESPECIALISTA", label: "Repórter", descricao: "Fareja a história antes de todo mundo.", sanPorNivel: 1, habilidades: ["Sempre tem um contato a um telefonema.", "Registra provas no calor do momento."], item: { nome: "Câmera 35mm", dano: "", qtd: 1, usos: 24 } },
    { key: "erudito", classe: "ESPECIALISTA", label: "Erudito", descricao: "Enterrado em livros que ninguém mais lê.", sanPorNivel: 1, habilidades: ["'Já li sobre isso' 1×/sessão.", "Decifra idiomas mortos e cifras."], item: { nome: "Grimório de Bolso", dano: "", qtd: 1, usos: 99 } },
  ],
  OCULTISTA: [
    { key: "vidente", classe: "OCULTISTA", label: "Vidente", descricao: "Enxerga o fio antes de ser cortado.", sanPorNivel: 1, habilidades: ["Presságio: 1 pergunta ao Irreal por sessão.", "Sente a morte se aproximando."], item: { nome: "Cartas de Tarô", dano: "", qtd: 1, usos: 99 } },
    { key: "conjurador", classe: "OCULTISTA", label: "Conjurador", descricao: "Conhece o Verbo — e o preço.", habilidades: ["O Verbo: gasta SAN por um efeito sobrenatural.", "Traça círculos de proteção."], item: { nome: "Giz Ritual", dano: "", qtd: 1, usos: 5 } },
    { key: "pactuario", classe: "OCULTISTA", label: "Pactuário", descricao: "Poder emprestado tem juros.", pvPorNivel: 2, sanPorNivel: -1, habilidades: ["Invoca o poder da entidade patrona.", "A dívida sempre cobra — no pior momento."], item: { nome: "Selo do Pacto", dano: "", qtd: 1, usos: 99 } },
    { key: "exorcista", classe: "OCULTISTA", label: "Exorcista", descricao: "Empurra o Irreal de volta.", sanPorNivel: 1, habilidades: ["Bane entidades menores.", "Reconhece possessão à primeira vista."], item: { nome: "Água Benta", dano: "", qtd: 3, usos: 1, efeitoSan: 3 } },
    { key: "necromante", classe: "OCULTISTA", label: "Necromante", descricao: "A carne ainda tem o que dizer.", habilidades: ["Fala com os mortos (custo de SAN).", "A matéria morta obedece por um tempo."], item: { nome: "Faca Ritual", dano: "1d6", qtd: 1, usos: 99 } },
    { key: "profeta", classe: "OCULTISTA", label: "Profeta do Fim", descricao: "Viu o que vem — e não dá pra desver.", habilidades: ["Visões do que está por vir.", "Fanáticos passam a segui-lo."], item: { nome: "Panfletos do Juízo", dano: "", qtd: 10, usos: 1 } },
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

// ---------------- Condições / estados ----------------

export interface ConditionInfo {
  key: string;
  label: string;
  desc: string;
  // "tick" opcional aplicado ao apertar "aplicar efeito" (por rodada).
  efeitoPv?: number;
  efeitoSan?: number;
  irreal?: boolean; // estado sobrenatural (estiliza diferente)
}

export const CONDITIONS: ConditionInfo[] = [
  {
    key: "FERIDO",
    label: "Ferido",
    desc: "Machucado. Desvantagem em esforços físicos até tratar.",
  },
  {
    key: "SANGRANDO",
    label: "Sangrando",
    desc: "Perde 2 PV a cada rodada até estancar.",
    efeitoPv: -2,
  },
  {
    key: "ENVENENADO",
    label: "Envenenado",
    desc: "Perde 1 PV por rodada; a mente também turva.",
    efeitoPv: -1,
  },
  {
    key: "ATORDOADO",
    label: "Atordoado",
    desc: "Perde a próxima ação. O mundo gira.",
  },
  {
    key: "EM_PANICO",
    label: "Em Pânico",
    desc: "Só consegue fugir ou se esconder. Perde 1 de Sanidade por rodada.",
    efeitoSan: -1,
  },
  {
    key: "AMALDICOADO",
    label: "Amaldiçoado",
    desc: "Algo o marcou. O Mestre sabe o quê.",
    irreal: true,
  },
  {
    key: "ENLOUQUECENDO",
    label: "Enlouquecendo",
    desc: "A mente se desfia. Perde 2 de Sanidade por rodada.",
    efeitoSan: -2,
    irreal: true,
  },
  {
    key: "POSSUIDO",
    label: "Possuído",
    desc: "A mente já não é bem sua. O Mestre pode conduzir.",
    irreal: true,
  },
  {
    key: "MARCADO",
    label: "Marcado pelo Além",
    desc: "O Irreal conhece seu endereço. Aparições o procuram.",
    irreal: true,
  },
];

export function getCondition(key: string): ConditionInfo | undefined {
  return CONDITIONS.find((c) => c.key === key);
}

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
