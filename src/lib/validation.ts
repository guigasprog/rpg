import { z } from "zod";
import {
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL_POINTS,
  MAX_LEVEL,
  RESOURCE_ATUAL_MAX,
  RESOURCE_ATUAL_MIN,
} from "@/lib/game";

const attr = z.coerce.number().int().min(ATTR_MIN).max(ATTR_MAX);

const attributesShape = {
  attrInvestigar: attr,
  attrCombate: attr,
  attrLabia: attr,
  attrMente: attr,
};

const attrKey = z.enum([
  "attrInvestigar",
  "attrCombate",
  "attrLabia",
  "attrMente",
]);

// Código de dado: "1d6", "2d6"... ou vazio (item sem dano).
const dieCode = z
  .string()
  .trim()
  .max(10)
  .regex(/^(\d+d\d+)?$/i, "Dado inválido (use algo como 1d6).");

const inventoryItem = z.object({
  nome: z.string().trim().min(1).max(200),
  dano: dieCode.optional().default(""),
  qtd: z.coerce.number().int().min(1).max(999).default(1),
  usos: z.coerce.number().int().min(0).max(999).default(1),
  efeitoPv: z.coerce.number().int().min(-99).max(99).default(0),
  efeitoSan: z.coerce.number().int().min(-99).max(99).default(0),
});

export const inventoryArray = z.array(inventoryItem).max(100);

const atualResource = z.coerce
  .number()
  .int()
  .min(RESOURCE_ATUAL_MIN)
  .max(RESOURCE_ATUAL_MAX);

// Valida a regra de point-buy (soma exata; sem regra de "um zero").
export function validatePointBuy(a: {
  attrInvestigar: number;
  attrCombate: number;
  attrLabia: number;
  attrMente: number;
}): string | null {
  const sum = a.attrInvestigar + a.attrCombate + a.attrLabia + a.attrMente;
  if (sum !== ATTR_TOTAL_POINTS) {
    return `Os atributos devem somar exatamente ${ATTR_TOTAL_POINTS} pontos (atual: ${sum}).`;
  }
  return null;
}

// Criação de personagem (jogador ou GM).
export const createCharacterSchema = z
  .object({
    name: z.string().trim().min(1, "Nome do personagem é obrigatório.").max(120),
    playerName: z.string().trim().min(1, "Nome do jogador é obrigatório.").max(120),
    occupation: z.string().trim().max(200).optional().or(z.literal("")),
    appearance: z.string().trim().max(2000).optional().or(z.literal("")),
    portraitUrl: z.string().trim().max(2000).optional().or(z.literal("")),
    classe: z.enum(["ESPECIALISTA", "COMBATENTE"]),
    especialistaFocos: z.array(attrKey).max(2).optional().default([]),
    ...attributesShape,
    inventory: inventoryArray.default([]),
    playerNotes: z.string().max(5000).optional().or(z.literal("")),
    ownerId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const err = validatePointBuy(data);
    if (err) ctx.addIssue({ code: "custom", message: err });
  });

// Campos que o jogador pode editar na própria ficha.
export const playerUpdateSchema = z.object({
  appearance: z.string().trim().max(2000).optional().or(z.literal("")),
  portraitUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  inventory: inventoryArray.optional(),
  playerNotes: z.string().max(5000).optional().or(z.literal("")),
  // Recursos "atuais": aceitam sobrevida (> máx) e negativos (< 0).
  pvAtual: atualResource.optional(),
  sanAtual: atualResource.optional(),
});

// Edição total do GM.
export const masterUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    playerName: z.string().trim().min(1).max(120).optional(),
    occupation: z.string().trim().max(200).optional().or(z.literal("")),
    appearance: z.string().trim().max(2000).optional().or(z.literal("")),
    portraitUrl: z.string().trim().max(2000).optional().or(z.literal("")),
    classe: z.enum(["ESPECIALISTA", "COMBATENTE", "OCULTISTA"]).optional(),
    subclasse: z.string().trim().max(40).optional().or(z.literal("")),
    nivel: z.coerce.number().int().min(0).max(MAX_LEVEL).optional(),
    especialistaFocos: z.array(attrKey).max(2).optional(),
    attrInvestigar: attr.optional(),
    attrCombate: attr.optional(),
    attrLabia: attr.optional(),
    attrMente: attr.optional(),
    pvAtual: atualResource.optional(),
    sanAtual: atualResource.optional(),
    inventory: inventoryArray.optional(),
    playerNotes: z.string().max(5000).optional().or(z.literal("")),
    masterNotes: z.string().max(10000).optional().or(z.literal("")),
    occultismContent: z.string().max(20000).optional().or(z.literal("")),
    occultismLevel: z.coerce.number().int().min(0).max(3).optional(),
  })
  .strict();

export const createPlayerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Usuário deve ter ao menos 3 caracteres.")
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use apenas letras, números, . _ -"),
  password: z.string().min(4, "Senha deve ter ao menos 4 caracteres.").max(200),
  role: z.enum(["PLAYER", "MASTER"]).default("PLAYER"),
});

export const occultOfferSchema = z.object({
  texto: z.string().trim().min(1, "Escreva o convite do Além.").max(2000),
});

export const loreEntrySchema = z.object({
  categoria: z.enum(["MONSTRO", "LOCAL", "RITUAL_PNJ"]),
  titulo: z.string().trim().min(1, "Título obrigatório.").max(160),
  conteudo: z.string().trim().min(1, "Escreva o conteúdo.").max(8000),
  perigo: z.coerce.number().int().min(0).max(3).default(0),
  imagemUrl: z.string().trim().max(2000).optional().or(z.literal("")),
});
