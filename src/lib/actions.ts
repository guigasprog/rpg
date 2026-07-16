"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getViewer, requireMaster } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import {
  TRAUMAS,
  computeMaxPv,
  computeMaxSan,
  getCondition,
  getSubclass,
  MAX_LEVEL,
  OCCULTISM_MAX_LEVEL,
  OUTCOME_LABEL,
  PROPOSTA,
  SUBCLASS_LEVEL,
} from "@/lib/game";
import { parseRollCommand } from "@/lib/dice";
import { parseInventory, parseStringArray } from "@/lib/character";
import { computeItemEffect, type ItemEffect } from "@/lib/items";
import {
  createCharacterSchema,
  createPlayerSchema,
  evidenceSchema,
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

  // Foto travada: só o Mestre troca.
  const podeTrocarFoto = isMaster || !character.retratoTravado;

  // Sem clamp: PV/SAN atuais aceitam sobrevida (> máx) e negativos.
  await prisma.character.update({
    where: { id },
    data: {
      name: d.name !== undefined ? d.name : undefined,
      occupation:
        d.occupation !== undefined ? d.occupation || null : undefined,
      appearance: d.appearance !== undefined ? d.appearance || null : undefined,
      portraitUrl:
        d.portraitUrl !== undefined && podeTrocarFoto
          ? d.portraitUrl || null
          : undefined,
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

// Usar um item consumível EM OUTRO personagem (aliado): aplica o efeito no
// alvo e gasta 1 uso do inventário de quem usou.
export async function usarItemNoAliado(
  userId: string,
  allyId: string,
  itemIndex: number,
  input: unknown,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");

  const user = await prisma.character.findUnique({ where: { id: userId } });
  if (!user) return fail("Personagem não encontrado.");

  const isOwner = user.ownerId === viewer.id;
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isOwner && !isMaster) return fail("Sem permissão.");

  const parsed = playerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const d = parsed.data;
  if (!d.inventory) return fail("Inventário ausente.");

  const item = d.inventory[itemIndex];
  if (!item) return fail("Item inválido.");
  if (item.usos <= 0) return fail("Este item não tem usos restantes.");

  const efeitoPv = item.efeitoPv ?? 0;
  const efeitoSan = item.efeitoSan ?? 0;

  // Gasta 1 uso no inventário de quem usou e persiste os campos do jogador.
  const inv = d.inventory.map((x, i) =>
    i === itemIndex ? { ...x, usos: Math.max(0, x.usos - 1) } : x,
  );
  await prisma.character.update({
    where: { id: userId },
    data: {
      appearance: d.appearance !== undefined ? d.appearance || null : undefined,
      portraitUrl:
        d.portraitUrl !== undefined ? d.portraitUrl || null : undefined,
      playerNotes:
        d.playerNotes !== undefined ? d.playerNotes || null : undefined,
      inventory: JSON.stringify(inv),
      pvAtual: d.pvAtual,
      sanAtual: d.sanAtual,
    },
  });

  // Aplica o efeito no aliado (sem clamp: aceita sobrevida/negativo).
  const ally = await prisma.character.findUnique({ where: { id: allyId } });
  if (!ally) return fail("Aliado não encontrado.");
  await prisma.character.update({
    where: { id: allyId },
    data: {
      pvAtual: ally.pvAtual + efeitoPv,
      sanAtual: ally.sanAtual + efeitoSan,
    },
  });

  revalidateCharacter(userId);
  revalidateCharacter(allyId);
  return { ok: true };
}

// Jogador (dono) escolhe a subclasse ao atingir o nível 5. GM pode trocar.
export async function chooseSubclass(
  id: string,
  subclasseKey: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");

  const character = await prisma.character.findUnique({ where: { id } });
  if (!character) return fail("Personagem não encontrado.");

  const isOwner = character.ownerId === viewer.id;
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isOwner && !isMaster) return fail("Sem permissão.");

  const sc = getSubclass(subclasseKey);
  if (!sc || sc.classe !== character.classe) {
    return fail("Essa subclasse não pertence à sua classe.");
  }
  if (character.nivel < SUBCLASS_LEVEL) {
    return fail(`Subclasses abrem no nível ${SUBCLASS_LEVEL}.`);
  }
  if (!isMaster && character.subclasse) {
    return fail("Você já seguiu um rumo. Fale com o Mestre para mudar.");
  }

  // Concede o item de assinatura (sem duplicar).
  const inv = parseInventory(character.inventory);
  if (sc.item && !inv.some((i) => i.nome === sc.item!.nome)) {
    inv.push({
      nome: sc.item.nome,
      dano: sc.item.dano ?? "",
      qtd: sc.item.qtd ?? 1,
      usos: sc.item.usos ?? 1,
      efeitoPv: sc.item.efeitoPv ?? 0,
      efeitoSan: sc.item.efeitoSan ?? 0,
      dadoEfeito: sc.item.dadoEfeito ?? "",
      baseEfeito: sc.item.baseEfeito ?? 0,
      recurso: sc.item.recurso ?? "PV",
      especialista: sc.item.especialista ?? "",
      bonusEspecialista: sc.item.bonusEspecialista ?? 0,
      usosSemEspecialista: sc.item.usosSemEspecialista ?? 5,
    });
  }

  await prisma.character.update({
    where: { id },
    data: {
      subclasse: subclasseKey,
      inventory: JSON.stringify(inv),
      pvMax: computeMaxPv(
        character.attrCombate,
        character.classe,
        character.nivel,
        subclasseKey,
      ),
      sanMax: computeMaxSan(
        character.attrMente,
        character.classe,
        character.nivel,
        subclasseKey,
      ),
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

// GM duplica uma entrada (variação de um monstro/NPC). A cópia nasce fora de
// cena e com o título marcado, pronta para ser ajustada.
export async function duplicateLoreEntry(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const orig = await prisma.loreEntry.findUnique({ where: { id } });
  if (!orig) return fail("Entrada não encontrada.");
  const titulo = `${orig.titulo} (cópia)`.slice(0, 160);
  const entry = await prisma.loreEntry.create({
    data: {
      categoria: orig.categoria,
      titulo,
      conteudo: orig.conteudo,
      perigo: orig.perigo,
      imagemUrl: orig.imagemUrl,
      revelado: false,
    },
  });
  revalidatePath("/mestre/livro");
  revalidatePath("/mestre");
  return { ok: true, id: entry.id };
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
  revalidatePath("/mestre");
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
  revalidatePath("/mestre");
  revalidatePath("/manual");
  return { ok: true, id };
}

// ---------------- Mural de Provas / Pistas ----------------

function revalidateProvas() {
  revalidatePath("/mestre/provas");
  revalidatePath("/provas");
}

export async function createEvidence(input: unknown): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { titulo, descricao, imagemUrl } = parsed.data;
  const ev = await prisma.evidence.create({
    data: {
      titulo,
      descricao: descricao || "",
      imagemUrl: imagemUrl || null,
    },
  });
  revalidateProvas();
  return { ok: true, id: ev.id };
}

export async function updateEvidence(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { titulo, descricao, imagemUrl } = parsed.data;
  await prisma.evidence.update({
    where: { id },
    data: {
      titulo,
      descricao: descricao || "",
      imagemUrl: imagemUrl || null,
    },
  });
  revalidateProvas();
  return { ok: true, id };
}

export async function deleteEvidence(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.evidence.delete({ where: { id } });
  revalidateProvas();
  return { ok: true };
}

export async function setEvidenceRevealed(
  id: string,
  revelado: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.evidence.update({ where: { id }, data: { revelado } });
  revalidateProvas();
  return { ok: true, id };
}

// --- Quadro interativo (colaborativo: Mestre e jogadores) ---

// Só provas reveladas ficam no quadro; o Mestre pode agir mesmo nas ocultas.
async function podeMexerNoQuadro(evidenceId: string, isMaster: boolean) {
  const ev = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    select: { revelado: true },
  });
  if (!ev) return false;
  return isMaster || ev.revelado;
}

export async function moveEvidence(
  id: string,
  x: number,
  y: number,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!(await podeMexerNoQuadro(id, isMaster))) return fail("Sem permissão.");
  await prisma.evidence.update({
    where: { id },
    data: { x: Math.trunc(Number(x) || 0), y: Math.trunc(Number(y) || 0) },
  });
  revalidateProvas();
  return { ok: true, id };
}

export async function addEvidenceNote(
  evidenceId: string,
  texto: string,
  contra: boolean,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return fail("Não autenticado.");
  const isMaster = session.user.role === ROLES.MASTER;
  if (!(await podeMexerNoQuadro(evidenceId, isMaster)))
    return fail("Sem permissão.");
  const t = (texto ?? "").trim();
  if (!t) return fail("Escreva a anotação.");
  if (t.length > 1000) return fail("Anotação muito longa.");
  await prisma.evidenceNote.create({
    data: {
      evidenceId,
      autorId: session.user.id ?? null,
      autorNome: session.user.name ?? "?",
      texto: t,
      contra: !!contra,
    },
  });
  revalidateProvas();
  return { ok: true };
}

export async function deleteEvidenceNote(id: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const nota = await prisma.evidenceNote.findUnique({ where: { id } });
  if (!nota) return fail("Anotação não encontrada.");
  if (viewer.role !== ROLES.MASTER && nota.autorId !== viewer.id)
    return fail("Só o autor ou o Mestre pode apagar.");
  await prisma.evidenceNote.delete({ where: { id } });
  revalidateProvas();
  return { ok: true };
}

export async function linkEvidence(
  fromId: string,
  toId: string,
  label: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  if (fromId === toId) return fail("Ligue duas provas diferentes.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (
    !(await podeMexerNoQuadro(fromId, isMaster)) ||
    !(await podeMexerNoQuadro(toId, isMaster))
  )
    return fail("Sem permissão.");
  const existe = await prisma.evidenceLink.findFirst({
    where: {
      OR: [
        { fromId, toId },
        { fromId: toId, toId: fromId },
      ],
    },
  });
  if (existe) return fail("Essas provas já estão ligadas.");
  await prisma.evidenceLink.create({
    data: {
      fromId,
      toId,
      label: (label ?? "").trim().slice(0, 200),
      autorId: viewer.id,
    },
  });
  revalidateProvas();
  return { ok: true };
}

export async function updateEvidenceLink(
  id: string,
  label: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  await prisma.evidenceLink.update({
    where: { id },
    data: { label: (label ?? "").trim().slice(0, 200) },
  });
  revalidateProvas();
  return { ok: true, id };
}

export async function deleteEvidenceLink(id: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const link = await prisma.evidenceLink.findUnique({ where: { id } });
  if (!link) return fail("Ligação não encontrada.");
  if (viewer.role !== ROLES.MASTER && link.autorId !== viewer.id)
    return fail("Só o autor ou o Mestre pode remover.");
  await prisma.evidenceLink.delete({ where: { id } });
  revalidateProvas();
  return { ok: true };
}

// GM tira tudo de cena de uma vez (aparições do Livro + retratos na mesa).
export async function limparCena(): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.$transaction([
    prisma.loreEntry.updateMany({
      where: { revelado: true },
      data: { revelado: false },
    }),
    prisma.character.updateMany({
      where: { mostrarNaMesa: true },
      data: { mostrarNaMesa: false },
    }),
  ]);
  revalidatePath("/mestre");
  revalidatePath("/mestre/livro");
  revalidatePath("/manual");
  return { ok: true };
}

// GM define as condições/estados de um personagem (lista de chaves válidas).
export async function setCharacterCondicoes(
  id: string,
  keys: string[],
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const validas = Array.from(
    new Set(
      (Array.isArray(keys) ? keys : []).filter((k) => !!getCondition(k)),
    ),
  );
  await prisma.character.update({
    where: { id },
    data: { condicoes: JSON.stringify(validas) },
  });
  revalidateCharacter(id);
  revalidatePath("/mestre");
  return { ok: true, id };
}

// Sofre um trauma permanente (sorteado). Mestre ou dono. Devolve o trauma.
export interface TraumaResult extends ActionResult {
  trauma?: { key: string; label: string; desc: string };
}

export async function sofrerTrauma(id: string): Promise<TraumaResult> {
  const session = await auth();
  if (!session?.user) return fail("Não autenticado.");
  const isMaster = session.user.role === ROLES.MASTER;
  const ch = await prisma.character.findUnique({ where: { id } });
  if (!ch) return fail("Personagem não encontrado.");
  if (!isMaster && ch.ownerId !== session.user.id)
    return fail("Só o seu próprio personagem.");
  const atuais = parseStringArray(ch.traumas);
  const disponiveis = TRAUMAS.filter((t) => !atuais.includes(t.key));
  const pool = disponiveis.length > 0 ? disponiveis : TRAUMAS;
  const sorteado = pool[Math.floor(Math.random() * pool.length)];
  const novos = [...atuais, sorteado.key];
  await prisma.character.update({
    where: { id },
    data: { traumas: JSON.stringify(novos) },
  });
  // Registra no chat (dramatiza o colapso).
  await prisma.message.create({
    data: {
      autorNome: session.user.name ?? "?",
      autorRole: session.user.role ?? ROLES.PLAYER,
      autorId: session.user.id ?? null,
      tipo: "ROLL",
      texto: `🕳️ Colapso — novo trauma: ${sorteado.label}`,
      personagem: ch.name,
    },
  });
  revalidateCharacter(id);
  revalidateMapa();
  return {
    ok: true,
    id,
    trauma: { key: sorteado.key, label: sorteado.label, desc: sorteado.desc },
  };
}

export async function removerTrauma(
  id: string,
  key: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const ch = await prisma.character.findUnique({ where: { id } });
  if (!ch) return fail("Personagem não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && ch.ownerId !== viewer.id) return fail("Sem permissão.");
  const novos = parseStringArray(ch.traumas).filter((k) => k !== key);
  await prisma.character.update({
    where: { id },
    data: { traumas: JSON.stringify(novos) },
  });
  revalidateCharacter(id);
  return { ok: true, id };
}

// GM aplica UMA rodada dos efeitos das condições ativas (soma PV/SAN e ajusta).
export async function aplicarCondicoesTick(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const ch = await prisma.character.findUnique({ where: { id } });
  if (!ch) return fail("Personagem não encontrado.");
  const ativas = parseStringArray(ch.condicoes);
  let dPv = 0;
  let dSan = 0;
  for (const k of ativas) {
    const c = getCondition(k);
    if (c?.efeitoPv) dPv += c.efeitoPv;
    if (c?.efeitoSan) dSan += c.efeitoSan;
  }
  if (dPv === 0 && dSan === 0) {
    return fail("Nenhuma condição ativa tem efeito por rodada.");
  }
  await prisma.character.update({
    where: { id },
    data: { pvAtual: ch.pvAtual + dPv, sanAtual: ch.sanAtual + dSan },
  });
  revalidateCharacter(id);
  revalidatePath("/mestre");
  return { ok: true, id };
}

// ---------------- Relógios de Tensão ----------------

function revalidateClocks() {
  revalidatePath("/mestre");
}

export async function createClock(
  titulo: string,
  segmentos: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const t = (titulo ?? "").trim().slice(0, 120);
  if (!t) return fail("Dê um nome ao relógio.");
  const seg = Math.max(2, Math.min(12, Math.trunc(segmentos) || 6));
  await prisma.clock.create({ data: { titulo: t, segmentos: seg } });
  revalidateClocks();
  return { ok: true };
}

export async function avancarClock(
  id: string,
  delta: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const c = await prisma.clock.findUnique({ where: { id } });
  if (!c) return fail("Relógio não encontrado.");
  const novo = Math.max(0, Math.min(c.segmentos, c.preenchido + Math.trunc(delta)));
  await prisma.clock.update({ where: { id }, data: { preenchido: novo } });
  revalidateClocks();
  return { ok: true, id };
}

export async function setClockVisivel(
  id: string,
  visivel: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.clock.update({ where: { id }, data: { visivel } });
  revalidateClocks();
  return { ok: true, id };
}

export async function deleteClock(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.clock.delete({ where: { id } });
  revalidateClocks();
  return { ok: true };
}

// ---------------- Mapa de combate ----------------

function revalidateMapa() {
  revalidatePath("/mapa");
}

const MAP_ID = "main";

// Garante que o mapa singleton exista e devolve-o.
export async function ensureMap() {
  return prisma.gameMap.upsert({
    where: { id: MAP_ID },
    update: {},
    create: { id: MAP_ID },
  });
}

export async function updateMapSettings(input: {
  backgroundUrl?: string;
  cell?: number;
  cols?: number;
  rows?: number;
  showGrid?: boolean;
}): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const clampCell = (n: number) => Math.max(16, Math.min(240, Math.trunc(n) || 64));
  const clampDim = (n: number) => Math.max(1, Math.min(80, Math.trunc(n) || 1));
  const cell = input.cell !== undefined ? clampCell(input.cell) : undefined;
  const cols = input.cols !== undefined ? clampDim(input.cols) : undefined;
  const rows = input.rows !== undefined ? clampDim(input.rows) : undefined;
  await prisma.gameMap.upsert({
    where: { id: MAP_ID },
    update: {
      backgroundUrl:
        input.backgroundUrl !== undefined
          ? input.backgroundUrl.trim() || null
          : undefined,
      cell,
      cols,
      rows,
      showGrid: input.showGrid,
    },
    create: {
      id: MAP_ID,
      backgroundUrl: input.backgroundUrl?.trim() || null,
      cell: cell ?? 64,
      cols: cols ?? 20,
      rows: rows ?? 14,
      showGrid: input.showGrid ?? true,
    },
  });
  revalidateMapa();
  return { ok: true };
}

export async function setMapFog(ativo: boolean): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.gameMap.upsert({
    where: { id: MAP_ID },
    update: { fog: ativo },
    create: { id: MAP_ID, fog: ativo },
  });
  revalidateMapa();
  return { ok: true };
}

// Substitui o conjunto de células reveladas (chaves "col,row").
export async function setRevelado(keys: string[]): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const limpas = Array.from(
    new Set((Array.isArray(keys) ? keys : []).filter((k) => /^\d+,\d+$/.test(k))),
  ).slice(0, 5000);
  await prisma.gameMap.upsert({
    where: { id: MAP_ID },
    update: { revelado: JSON.stringify(limpas) },
    create: { id: MAP_ID, revelado: JSON.stringify(limpas) },
  });
  revalidateMapa();
  return { ok: true };
}

// Jogador/Mestre coloca (ou reposiciona) o token de um personagem no mapa.
// x/y opcionais: quando o token é solto arrastando, vêm já ajustados à grade.
export async function addMyToken(
  characterId: string,
  x?: number,
  y?: number,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const ch = await prisma.character.findUnique({ where: { id: characterId } });
  if (!ch) return fail("Personagem não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && ch.ownerId !== viewer.id)
    return fail("Só o seu próprio personagem.");
  const temPos = x !== undefined && y !== undefined;
  const existe = await prisma.mapToken.findFirst({ where: { characterId } });
  if (existe) {
    if (temPos) {
      await prisma.mapToken.update({
        where: { id: existe.id },
        data: { x: Math.trunc(x!) || 0, y: Math.trunc(y!) || 0 },
      });
      revalidateMapa();
    }
    return { ok: true, id: existe.id };
  }
  const map = await ensureMap();
  const n = await prisma.mapToken.count();
  await prisma.mapToken.create({
    data: {
      nome: ch.name,
      imageUrl: ch.portraitUrl,
      characterId: ch.id,
      ownerId: ch.ownerId,
      x: temPos ? Math.trunc(x!) || 0 : (n % 8) * map.cell,
      y: temPos ? Math.trunc(y!) || 0 : Math.floor(n / 8) * map.cell,
    },
  });
  revalidateMapa();
  return { ok: true };
}

const LADOS_VALIDOS = ["ALIADO", "INIMIGO", "NEUTRO"];

// Mestre adiciona um token avulso (inimigo/PNJ), com imagem, lado e posição
// opcionais (posição usada ao colar/copiar).
export async function addMapTokenCustom(
  nome: string,
  imageUrl: string,
  lado: string = "INIMIGO",
  x?: number,
  y?: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const n = (nome ?? "").trim().slice(0, 80);
  const map = await ensureMap();
  const count = await prisma.mapToken.count();
  const temPos = x !== undefined && y !== undefined;
  // Sem nome → entra como inimigo.
  const ladoFinal = n === "" ? "INIMIGO" : LADOS_VALIDOS.includes(lado) ? lado : "INIMIGO";
  await prisma.mapToken.create({
    data: {
      nome: n,
      imageUrl: (imageUrl ?? "").trim() || null,
      lado: ladoFinal,
      x: temPos ? Math.trunc(x!) || 0 : (count % 8) * map.cell,
      y: temPos ? Math.trunc(y!) || 0 : Math.floor(count / 8) * map.cell,
    },
  });
  revalidateMapa();
  return { ok: true };
}

// Mestre puxa um token a partir de uma entrada do Livro (monstro/PNJ).
export async function addMapTokenFromLore(
  loreId: string,
  x?: number,
  y?: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const entry = await prisma.loreEntry.findUnique({ where: { id: loreId } });
  if (!entry) return fail("Entrada não encontrada.");
  const map = await ensureMap();
  const count = await prisma.mapToken.count();
  const temPos = x !== undefined && y !== undefined;
  await prisma.mapToken.create({
    data: {
      nome: entry.titulo.slice(0, 80),
      imageUrl: entry.imagemUrl,
      lado: "INIMIGO",
      x: temPos ? Math.trunc(x!) || 0 : (count % 8) * map.cell,
      y: temPos ? Math.trunc(y!) || 0 : Math.floor(count / 8) * map.cell,
    },
  });
  revalidateMapa();
  return { ok: true };
}

// Define o lado do token (aliado/inimigo/neutro). Mestre ou dono.
export async function setTokenLado(
  id: string,
  lado: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  if (!LADOS_VALIDOS.includes(lado)) return fail("Lado inválido.");
  const tk = await prisma.mapToken.findUnique({ where: { id } });
  if (!tk) return fail("Token não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && tk.ownerId !== viewer.id)
    return fail("Você só altera o seu token.");
  await prisma.mapToken.update({ where: { id }, data: { lado } });
  revalidateMapa();
  return { ok: true, id };
}

export async function moveMapToken(
  id: string,
  x: number,
  y: number,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const tk = await prisma.mapToken.findUnique({ where: { id } });
  if (!tk) return fail("Token não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && tk.ownerId !== viewer.id)
    return fail("Você só move o seu token.");
  await prisma.mapToken.update({
    where: { id },
    data: { x: Math.trunc(x) || 0, y: Math.trunc(y) || 0 },
  });
  revalidateMapa();
  return { ok: true, id };
}

const STATUS_VALIDOS = [
  "",
  "MORTO",
  "INCONSCIENTE",
  "FERIDO",
  "ENVENENADO",
  "ATORDOADO",
  "FUGINDO",
  "ALVO",
];

// Marcador de status do token (morto, ferido...). Mestre ou dono.
export async function setTokenStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  if (!STATUS_VALIDOS.includes(status)) return fail("Status inválido.");
  const tk = await prisma.mapToken.findUnique({ where: { id } });
  if (!tk) return fail("Token não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && tk.ownerId !== viewer.id)
    return fail("Você só altera o seu token.");
  await prisma.mapToken.update({ where: { id }, data: { status } });
  revalidateMapa();
  return { ok: true, id };
}

// Redimensiona um token (px). 0 volta ao tamanho de um quadro. Mestre ou dono.
export async function resizeMapToken(
  id: string,
  size: number,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const tk = await prisma.mapToken.findUnique({ where: { id } });
  if (!tk) return fail("Token não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && tk.ownerId !== viewer.id)
    return fail("Você só altera o seu token.");
  const s = Math.max(0, Math.min(2000, Math.trunc(size) || 0));
  await prisma.mapToken.update({ where: { id }, data: { size: s } });
  revalidateMapa();
  return { ok: true, id };
}

export async function removeMapToken(id: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const tk = await prisma.mapToken.findUnique({ where: { id } });
  if (!tk) return fail("Token não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && tk.ownerId !== viewer.id)
    return fail("Você só remove o seu token.");
  await prisma.mapToken.delete({ where: { id } });
  revalidateMapa();
  return { ok: true };
}

// Ajuste rápido de PV/SAN (dano/cura) — usado na ficha rápida do mapa.
// Mestre em qualquer um; jogador só no próprio personagem. Sem clamp
// (aceita sobrevida e negativos, como o resto do sistema).
export async function ajustarRecursos(
  id: string,
  dPv: number,
  dSan: number,
): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("Não autenticado.");
  const ch = await prisma.character.findUnique({ where: { id } });
  if (!ch) return fail("Personagem não encontrado.");
  const isMaster = viewer.role === ROLES.MASTER;
  if (!isMaster && ch.ownerId !== viewer.id)
    return fail("Só o seu próprio personagem.");
  await prisma.character.update({
    where: { id },
    data: {
      pvAtual: ch.pvAtual + (Math.trunc(dPv) || 0),
      sanAtual: ch.sanAtual + (Math.trunc(dSan) || 0),
    },
  });
  revalidateCharacter(id);
  revalidateMapa();
  return { ok: true, id };
}

// Usa um item do personagem: rola o efeito (se tiver dado), escala pela classe
// (especialista vs. não), gasta os usos e registra no chat. Devolve o efeito.
export interface UsoItemResult extends ActionResult {
  efeito?: ItemEffect;
  nome?: string;
}

export async function usarItemRapido(
  characterId: string,
  index: number,
): Promise<UsoItemResult> {
  const session = await auth();
  if (!session?.user) return fail("Não autenticado.");
  const isMaster = session.user.role === ROLES.MASTER;
  const ch = await prisma.character.findUnique({ where: { id: characterId } });
  if (!ch) return fail("Personagem não encontrado.");
  if (!isMaster && ch.ownerId !== session.user.id)
    return fail("Só o seu próprio personagem.");
  const inv = parseInventory(ch.inventory);
  const it = inv[index];
  if (!it) return fail("Item inválido.");
  if (it.usos <= 0) return fail("Sem usos restantes.");

  const efeito = computeItemEffect(it, ch.subclasse);
  const gasto = Math.min(efeito.usosGastos, it.usos);
  const novoInv = inv.map((x, i) =>
    i === index ? { ...x, usos: Math.max(0, x.usos - gasto) } : x,
  );
  await prisma.character.update({
    where: { id: characterId },
    data: {
      inventory: JSON.stringify(novoInv),
      pvAtual: ch.pvAtual + efeito.dPv,
      sanAtual: ch.sanAtual + efeito.dSan,
    },
  });

  // Log no chat (mostra o personagem vinculado).
  const usoTxt = gasto > 1 ? ` · ${gasto} usos` : "";
  await prisma.message.create({
    data: {
      autorNome: session.user.name ?? "?",
      autorRole: session.user.role ?? ROLES.PLAYER,
      autorId: session.user.id ?? null,
      tipo: "ROLL",
      texto: `🧪 ${efeito.label}${usoTxt}`,
      personagem: ch.name,
    },
  });

  revalidateCharacter(characterId);
  revalidateMapa();
  return { ok: true, id: characterId, efeito, nome: it.nome };
}

export async function limparTokens(): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.mapToken.deleteMany({});
  revalidateMapa();
  return { ok: true };
}

// ---------------- Chat / Auditoria ----------------

export async function enviarMensagem(texto: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return fail("Não autenticado.");
  const autorId = session.user.id ?? null;
  const autorNome = session.user.name ?? "?";
  const autorRole = session.user.role ?? ROLES.PLAYER;
  const t = (texto ?? "").trim();
  if (!t) return fail("Mensagem vazia.");
  if (t.length > 500) return fail("Mensagem muito longa.");

  // Sussurro: "@usuario mensagem" ou "/w usuario mensagem" (privado ao alvo).
  const whisper = t.match(/^(?:@|\/w\s+)(\S+)\s+([\s\S]+)$/);
  if (whisper) {
    const alvoNome = whisper[1];
    const corpo = whisper[2].trim();
    if (!corpo) return fail("Escreva a mensagem do sussurro.");
    const alvo = await prisma.user.findUnique({
      where: { username: alvoNome },
      select: { id: true, username: true },
    });
    if (!alvo) return fail(`Usuário "@${alvoNome}" não encontrado.`);
    await prisma.message.create({
      data: {
        autorNome,
        autorRole,
        autorId,
        tipo: "CHAT",
        texto: `🤫 (para @${alvo.username}) ${corpo}`,
        destinoUserId: alvo.id,
      },
    });
    return { ok: true };
  }

  if (t.startsWith("!")) {
    // Rolagem oculta: "!s..." (só o Mestre e o autor veem).
    let rest = t.slice(1);
    let secreta = false;
    if (rest[0] === "s" || rest[0] === "S") {
      secreta = true;
      rest = rest.slice(1).trim();
    }
    const ch = await prisma.character.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        attrInvestigar: true,
        attrCombate: true,
        attrLabia: true,
        attrMente: true,
      },
    });
    const roll = parseRollCommand(
      rest,
      ch
        ? {
            attrInvestigar: ch.attrInvestigar,
            attrCombate: ch.attrCombate,
            attrLabia: ch.attrLabia,
            attrMente: ch.attrMente,
          }
        : undefined,
    );
    if (!roll) {
      return fail("Comando inválido. Ex.: !2d6+inv · !1d20 · !2d6+3 · !s2d6");
    }
    const critTxt =
      roll.crit === "SUCESSO"
        ? " ✦CRÍTICO"
        : roll.crit === "FALHA"
          ? " ✦DESASTRE"
          : "";
    const fim = roll.outcome ? ` — ${OUTCOME_LABEL[roll.outcome]}` : "";
    const selo = secreta ? "🔒 " : "🎲 ";
    const texto2 = `${selo}${roll.expr}: [${roll.rolls.join(", ")}] = ${roll.total}${fim}${critTxt}`;
    await prisma.message.create({
      data: {
        autorNome,
        autorRole,
        autorId,
        tipo: "ROLL",
        texto: texto2,
        personagem: ch?.name ?? null,
        total: roll.total,
        secreta,
      },
    });
  } else {
    await prisma.message.create({
      data: { autorNome, autorRole, autorId, tipo: "CHAT", texto: t },
    });
  }
  return { ok: true };
}

// Registra uma rolagem feita na ficha (rolador/dano) no log da mesa.
export async function registrarRolagem(
  texto: string,
  personagem?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return fail("Não autenticado.");
  const t = (texto ?? "").trim().slice(0, 300);
  if (!t) return fail("Vazio.");
  await prisma.message.create({
    data: {
      autorNome: session.user.name ?? "?",
      autorRole: session.user.role ?? ROLES.PLAYER,
      autorId: session.user.id ?? null,
      tipo: "ROLL",
      texto: t,
      personagem: personagem?.trim() ? personagem.trim().slice(0, 120) : null,
    },
  });
  return { ok: true };
}

// ---------------- Iniciativa de combate (só GM edita) ----------------

export async function addIniciativa(
  nome: string,
  valor: number,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const n = (nome ?? "").trim().slice(0, 80);
  if (!n) return fail("Informe um nome.");
  await prisma.initiativeEntry.create({
    data: { nome: n, valor: Math.trunc(Number(valor) || 0) },
  });
  return { ok: true };
}

export async function removerIniciativa(id: string): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.initiativeEntry.delete({ where: { id } });
  return { ok: true };
}

export async function limparIniciativa(): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.initiativeEntry.deleteMany({});
  return { ok: true };
}

// Avança o marcador de turno para o próximo da ordem (valor desc).
export async function avancarTurno(): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  const lista = await prisma.initiativeEntry.findMany({
    orderBy: [{ valor: "desc" }, { createdAt: "asc" }],
  });
  if (lista.length === 0) return { ok: true };
  const idxAtual = lista.findIndex((e) => e.atual);
  const prox = idxAtual < 0 ? 0 : (idxAtual + 1) % lista.length;
  await prisma.initiativeEntry.updateMany({ data: { atual: false } });
  await prisma.initiativeEntry.update({
    where: { id: lista[prox].id },
    data: { atual: true },
  });
  return { ok: true };
}

// GM trava/destrava a foto do personagem (jogador não troca quando travada).
export async function setRetratoTravado(
  id: string,
  travado: boolean,
): Promise<ActionResult> {
  try {
    await requireMaster();
  } catch (e) {
    return fail((e as Error).message);
  }
  await prisma.character.update({
    where: { id },
    data: { retratoTravado: travado },
  });
  revalidateCharacter(id);
  return { ok: true, id };
}
