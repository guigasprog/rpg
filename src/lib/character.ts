import type { Character } from "@prisma/client";
import { ROLES } from "@/lib/roles";
import { computeMaxPv, computeMaxSan } from "@/lib/game";

export interface Viewer {
  id: string;
  role: string;
}

export interface InventoryItem {
  nome: string;
  dano: string; // "" = item sem dano
  qtd: number;
  usos: number;
  efeitoPv: number; // aplicado ao PV ao usar (pode ser negativo)
  efeitoSan: number; // aplicado à Sanidade ao usar
}

// DTO seguro enviado ao cliente. Campos sensíveis só existem quando permitidos.
export interface CharacterDTO {
  id: string;
  name: string;
  playerName: string;
  ownerId: string | null;
  arquivado: boolean;
  portraitUrl: string | null;
  occupation: string | null;
  appearance: string | null;

  classe: string;
  subclasse: string | null;
  nivel: number;
  especialistaFocos: string[];

  attrInvestigar: number;
  attrCombate: number;
  attrLabia: number;
  attrMente: number;

  pvAtual: number;
  pvMax: number;
  sanAtual: number;
  sanMax: number;

  inventory: InventoryItem[];
  playerNotes: string | null;

  occultismUnlocked: boolean;
  occultismLevel: number;
  occultismUnlockedAt: string | null;

  propostaStatus: string;
  propostaTexto: string | null;

  // Presentes SOMENTE quando o viewer tem direito.
  masterNotes?: string | null;
  occultismContent?: string | null;

  // Flags de UI (não substituem checagens de servidor).
  canEditAsPlayer: boolean;
  canEditAsMaster: boolean;
  canSeeOccultism: boolean;
}

export function parseInventory(raw: string | null): InventoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const num = (v: unknown, def: number) =>
      typeof v === "number" && Number.isFinite(v) ? v : def;
    return parsed
      .map((x): InventoryItem | null => {
        // Compatibilidade: formato antigo (string) ou sem qtd/usos → padrão 1.
        if (typeof x === "string")
          return { nome: x, dano: "", qtd: 1, usos: 1, efeitoPv: 0, efeitoSan: 0 };
        if (x && typeof x === "object" && typeof x.nome === "string") {
          return {
            nome: x.nome,
            dano: typeof x.dano === "string" ? x.dano : "",
            qtd: num(x.qtd, 1),
            usos: num(x.usos, 1),
            efeitoPv: num(x.efeitoPv, 0),
            efeitoSan: num(x.efeitoSan, 0),
          };
        }
        return null;
      })
      .filter((x): x is InventoryItem => x !== null);
  } catch {
    return [];
  }
}

function parseFocos(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string").slice(0, 2)
      : [];
  } catch {
    return [];
  }
}

export function canViewCharacter(character: Character, viewer: Viewer): boolean {
  if (viewer.role === ROLES.MASTER) return true;
  // Jogador: só a própria ficha, e desde que não esteja arquivada.
  return character.ownerId === viewer.id && !character.arquivado;
}

/**
 * Converte um registro do banco em DTO já filtrado pela ótica do viewer.
 *
 * REGRA DE SEGURANÇA: masterNotes nunca sai para ninguém além do MASTER;
 * occultismContent só sai para o MASTER ou para o dono cujo personagem esteja
 * com occultismUnlocked = true. Filtramos aqui, no servidor.
 *
 * Os MÁXIMOS de PV/SAN são derivados da fórmula (atributo + classe + nível),
 * não do valor armazenado — garante coerência mesmo se o banco divergir.
 */
export function toCharacterDTO(character: Character, viewer: Viewer): CharacterDTO {
  const isMaster = viewer.role === ROLES.MASTER;
  const isOwner = character.ownerId === viewer.id;
  const canSeeOccultism = isMaster || (isOwner && character.occultismUnlocked);

  const pvMax = computeMaxPv(
    character.attrCombate,
    character.classe,
    character.nivel,
    character.subclasse,
  );
  const sanMax = computeMaxSan(
    character.attrMente,
    character.classe,
    character.nivel,
    character.subclasse,
  );

  const dto: CharacterDTO = {
    id: character.id,
    name: character.name,
    playerName: character.playerName,
    ownerId: character.ownerId,
    arquivado: character.arquivado,
    portraitUrl: character.portraitUrl,
    occupation: character.occupation,
    appearance: character.appearance,

    classe: character.classe,
    subclasse: character.subclasse,
    nivel: character.nivel,
    especialistaFocos: parseFocos(character.especialistaFocos),

    attrInvestigar: character.attrInvestigar,
    attrCombate: character.attrCombate,
    attrLabia: character.attrLabia,
    attrMente: character.attrMente,

    pvAtual: character.pvAtual,
    pvMax,
    sanAtual: character.sanAtual,
    sanMax,

    inventory: parseInventory(character.inventory),
    playerNotes: character.playerNotes,

    occultismUnlocked: character.occultismUnlocked,
    occultismLevel: character.occultismLevel,
    occultismUnlockedAt: character.occultismUnlockedAt
      ? character.occultismUnlockedAt.toISOString()
      : null,

    propostaStatus: character.propostaStatus,
    propostaTexto: character.propostaTexto,

    canEditAsPlayer: isOwner || isMaster,
    canEditAsMaster: isMaster,
    canSeeOccultism,
  };

  if (isMaster) {
    dto.masterNotes = character.masterNotes;
  }
  if (canSeeOccultism) {
    dto.occultismContent = character.occultismContent;
  }

  return dto;
}
