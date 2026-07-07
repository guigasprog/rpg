"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getViewer, requireMaster } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import {
  computeMaxPv,
  computeMaxSan,
  getSubclass,
  MAX_LEVEL,
  OCCULTISM_MAX_LEVEL,
  PROPOSTA,
} from "@/lib/game";
import {
  createCharacterSchema,
  createPlayerSchema,
  loreEntrySchema,
  masterUpdateSchema,
  occultOfferSchema,
  playerUpdateSchema,
} from "@/lib/validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidateCharacter(id: string) {
  revalidatePath(`/personagens/${id}`);
  revalidatePath(`/mestre/personagens/${id}`);
  revalidatePath("/personagens");
  revalidatePath("/mestre");
}

// ---------------- Personagens ----------------

export async function createCharacter(input: unknown): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");

  const parsed = createCharacterSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  let ownerId = viewer.id;
  if (data.ownerId && viewer.role === ROLES.MASTER) {
    ownerId = data.ownerId;
  }

  // Nível 0 (Comum): máximos = base + atributo.
  const pvMax = computeMaxPv(data.attrCombate, data.classe, 0);
  const sanMax = computeMaxSan(data.attrMente, data.classe, 0);
  const focos = data.classe === "ESPECIALISTA" ? data.especialistaFocos : [];

  const character = await prisma.character.create({
    data: {
      name: data.name,
      playerName: data.playerName,
      ownerId,
      occupation: data.occupation || null,
      appearance: data.appearance || null,
      portraitUrl: data.portraitUrl || null,
      classe: data.classe,
      nivel: 0,
      especialistaFocos: JSON.stringify(focos ?? []),
      attrInvestigar: data.attrInvestigar,
      attrCombate: data.attrCombate,
      attrLabia: data.attrLabia,
      attrMente: data.attrMente,
      pvAtual: pvMax,
      pvMax,
      sanAtual: sanMax,
      sanMax,
      inventory: JSON.stringify(data.inventory ?? []),
      playerNotes: data.playerNotes || null,
      occultismUnlocked: false,
      propostaStatus: PROPOSTA.NENHUMA,
    },
  });

  revalidatePath("/personagens");
  revalidatePath("/mestre");
  return { ok: true, id: character.id };
}

// Jogador edita a própria ficha (campos permitidos). GM também pode usar.
export async function updateCharacterAsPlayer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  const isOwner = character.ownerId === viewer.id;
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isOwner && !isMaster) return fail("Sem permissão.");

  const parsed = playerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const d = parsed.data;

  // Sem clamp: PV/SAN atuais aceitam sobrevida (> máx) e negativos.
  await prisma.character.update({
    where: { id },
    data: {
      appearance: d.appearance !== undefined ? d.appearance || null : undefined,
      portraitUrl:
        d.portraitUrl !== undefined ? d.portraitUrl || null : undefined,
      playerNotes:
        d.playerNotes !== undefined ? d.playerNotes || null : undefined,
      inventory:
        d.inventory !== undefined ? JSON.stringify(d.inventory) : undefined,
      pvAtual: d.pvAtual,
      sanAtual: d.sanAtual,
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

// Edição total pelo GM.
export async function updateCharacterAsMaster(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  const parsed = masterUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const d = parsed.data;

  // Recalcula os máximos a partir dos valores efetivos (novos ou atuais).
  const attrCombate = d.attrCombate ?? character.attrCombate;
  const attrMente = d.attrMente ?? character.attrMente;
  const classe = d.classe ?? character.classe;
  const nivel = d.nivel ?? character.nivel;

  // Subclasse efetiva: deve pertencer à classe; senão é limpa.
  let subclasse =
    d.subclasse !== undefined ? d.subclasse || null : character.subclasse;
  if (subclasse) {
    const sc = getSubclass(subclasse);
    if (!sc || sc.classe !== classe) {
      if (d.subclasse) {
        return fail("Essa subclasse não pertence à classe escolhida.");
      }
      subclasse = null; // classe mudou e invalidou a subclasse anterior
    }
  }

  const pvMax = computeMaxPv(attrCombate, classe, nivel, subclasse);
  const sanMax = computeMaxSan(attrMente, classe, nivel, subclasse);

  await prisma.character.update({
    where: { id },
    data: {
      name: d.name,
      playerName: d.playerName,
      occupation: d.occupation !== undefined ? d.occupation || null : undefined,
      appearance: d.appearance !== undefined ? d.appearance || null : undefined,
      portraitUrl:
        d.portraitUrl !== undefined ? d.portraitUrl || null : undefined,
      classe: d.classe,
      subclasse,
      nivel: d.nivel,
      especialistaFocos:
        d.especialistaFocos !== undefined
          ? JSON.stringify(d.especialistaFocos)
          : undefined,
      attrInvestigar: d.attrInvestigar,
      attrCombate: d.attrCombate,
      attrLabia: d.attrLabia,
      attrMente: d.attrMente,
      pvMax,
      sanMax,
      pvAtual: d.pvAtual,
      sanAtual: d.sanAtual,
      inventory:
        d.inventory !== undefined ? JSON.stringify(d.inventory) : undefined,
      playerNotes:
        d.playerNotes !== undefined ? d.playerNotes || null : undefined,
      masterNotes:
        d.masterNotes !== undefined ? d.masterNotes || null : undefined,
      occultismContent:
        d.occultismContent !== undefined
          ? d.occultismContent || null
          : undefined,
      occultismLevel: d.occultismLevel,
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

export async function deleteCharacter(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.character.delete({ where: { id } });
  revalidatePath("/mestre");
  revalidatePath("/personagens");
  return { ok: true };
}

export async function setCharacterLevel(
  id: string,
  nivel: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const clamped = Math.max(0, Math.min(MAX_LEVEL, Math.trunc(nivel)));
  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  await prisma.character.update({
    where: { id },
    data: {
      nivel: clamped,
      pvMax: computeMaxPv(character.attrCombate, character.classe, clamped),
      sanMax: computeMaxSan(character.attrMente, character.classe, clamped),
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

// ---------------- Ocultismo (só GM) ----------------

export async function setOccultismUnlocked(
  id: string,
  unlocked: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  await prisma.character.update({
    where: { id },
    data: {
      occultismUnlocked: unlocked,
      occultismUnlockedAt: unlocked
        ? (character.occultismUnlockedAt ?? new Date())
        : character.occultismUnlockedAt,
      occultismLevel:
        unlocked && character.occultismLevel === 0
          ? 1
          : character.occultismLevel,
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

export async function setOccultismLevel(
  id: string,
  level: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const clamped = Math.max(0, Math.min(OCCULTISM_MAX_LEVEL, Math.trunc(level)));

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  await prisma.character.update({
    where: { id },
    data: {
      occultismLevel: clamped,
      occultismUnlocked: clamped > 0 ? true : character.occultismUnlocked,
      occultismUnlockedAt:
        clamped > 0
          ? (character.occultismUnlockedAt ?? new Date())
          : character.occultismUnlockedAt,
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

// ---------------- Proposta do Além ----------------

// GM dispara o convite (pré-requisito: Ocultismo liberado).
export async function sendOccultOffer(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }

  const parsed = occultOfferSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");
  if (!character.occultismUnlocked && character.occultismLevel < 1) {
    return fail("Libere o Ocultismo (nível ≥ 1) antes de enviar a proposta.");
  }
  if (character.classe === "OCULTISTA") {
    return fail("Este personagem já é Ocultista.");
  }

  await prisma.character.update({
    where: { id },
    data: {
      propostaStatus: PROPOSTA.PENDENTE,
      propostaTexto: parsed.data.texto,
    },
  });

  revalidateCharacter(id);
  return { ok: true, id };
}

// GM cancela/limpa a proposta.
export async function clearOccultOffer(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.character.update({
    where: { id },
    data: { propostaStatus: PROPOSTA.NENHUMA, propostaTexto: null },
  });
  revalidateCharacter(id);
  return { ok: true, id };
}

// Jogador (dono) ou GM responde à proposta pendente.
export async function respondOccultOffer(
  id: string,
  accept: boolean,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  const isOwner = character.ownerId === viewer.id;
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isOwner && !isMaster) return fail("Sem permissão.");
  if (character.propostaStatus !== PROPOSTA.PENDENTE) {
    return fail("Não há proposta pendente.");
  }

  if (accept) {
    // Aceitar: vira Ocultista, revela o Ocultismo e recalcula os máximos.
    const nivel = character.nivel;
    await prisma.character.update({
      where: { id },
      data: {
        classe: "OCULTISTA",
        subclasse: null, // subclasse anterior não vale para Ocultista
        propostaStatus: PROPOSTA.ACEITA,
        occultismUnlocked: true,
        occultismLevel: Math.max(1, character.occultismLevel),
        occultismUnlockedAt: character.occultismUnlockedAt ?? new Date(),
        pvMax: computeMaxPv(character.attrCombate, "OCULTISTA", nivel, null),
        sanMax: computeMaxSan(character.attrMente, "OCULTISTA", nivel, null),
      },
    });
  } else {
    await prisma.character.update({
      where: { id },
      data: { propostaStatus: PROPOSTA.RECUSADA },
    });
  }

  revalidateCharacter(id);
  return { ok: true, id };
}

// ---------------- Usuários (só GM cria jogadores) ----------------

export async function createPlayerAccount(input: unknown): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }

  const parsed = createPlayerSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { username, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return fail("Já existe um usuário com esse nome.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, role },
  });

  revalidatePath("/mestre");
  return { ok: true, id: user.id };
}

// GM redefine a senha de um usuário (a senha original, com hash, não é
// recuperável — só é possível definir uma nova).
export async function resetPlayerPassword(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  if (typeof newPassword !== "string" || newPassword.trim().length < 4) {
    return fail("A nova senha deve ter ao menos 4 caracteres.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Usuário não encontrado.");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/mestre");
  return { ok: true, id: userId };
}

// GM apaga uma conta. Os personagens dela são DESVINCULADOS (ownerId → null),
// não apagados (onDelete: SetNull no schema).
export async function deletePlayerAccount(userId: string): Promise<ActionResult> {
  let viewer;
  try {
    viewer = await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  if (viewer.id === userId) {
    return fail("Você não pode apagar a própria conta.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Usuário não encontrado.");

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/mestre");
  revalidatePath("/personagens");
  return { ok: true };
}

// ---------------- Livro do Mestre (só GM) ----------------

export async function createLoreEntry(input: unknown): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const parsed = loreEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { imagemUrl, ...rest } = parsed.data;
  const entry = await prisma.loreEntry.create({
    data: { ...rest, imagemUrl: imagemUrl || null },
  });
  revalidatePath("/mestre/livro");
  return { ok: true, id: entry.id };
}

export async function updateLoreEntry(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const parsed = loreEntrySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { imagemUrl, ...rest } = parsed.data;
  await prisma.loreEntry.update({
    where: { id },
    data: { ...rest, imagemUrl: imagemUrl || null },
  });
  revalidatePath("/mestre/livro");
  return { ok: true, id };
}

// GM libera/oculta uma entrada como card de combate para os jogadores.
export async function setLoreRevealed(
  id: string,
  revelado: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.loreEntry.update({ where: { id }, data: { revelado } });
  revalidatePath("/mestre/livro");
  revalidatePath("/manual");
  return { ok: true, id };
}

export async function deleteLoreEntry(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.loreEntry.delete({ where: { id } });
  revalidatePath("/mestre/livro");
  return { ok: true };
}

// GM arquiva/desarquiva um dossiê (arquivado = invisível/inativo ao jogador).
export async function setCharacterArchived(
  id: string,
  arquivado: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.character.update({ where: { id }, data: { arquivado } });
  revalidateCharacter(id);
  return { ok: true, id };
}

// GM exibe/oculta o retrato do personagem na tela de todos (só a imagem).
export async function setCharacterOnStage(
  id: string,
  mostrar: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.character.update({
    where: { id },
    data: { mostrarNaMesa: mostrar },
  });
  revalidateCharacter(id);
  revalidatePath("/manual");
  return { ok: true, id };
}
