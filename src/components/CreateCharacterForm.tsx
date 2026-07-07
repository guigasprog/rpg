"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacter } from "@/lib/actions";
import {
  ATTRIBUTES,
  ATTR_MAX,
  ATTR_MIN,
  ATTR_TOTAL_POINTS,
  BASE_PV,
  BASE_SAN,
  CLASS_INFO,
  STARTER_CLASSES,
  WEAPON_DICE,
  type ClassKey,
} from "@/lib/game";
import { validatePointBuy } from "@/lib/validation";

interface PlayerOption {
  id: string;
  username: string;
}

interface Props {
  isMaster: boolean;
  players: PlayerOption[];
  selfId: string;
}

type Attrs = Record<string, number>;
interface Item {
  nome: string;
  dano: string;
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function CreateCharacterForm({ isMaster, players, selfId }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [appearance, setAppearance] = useState("");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [ownerId, setOwnerId] = useState(selfId);
  const [classe, setClasse] = useState<ClassKey>("ESPECIALISTA");
  const [focos, setFocos] = useState<string[]>([]);
  const [playerNotes, setPlayerNotes] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState("");
  const [newDano, setNewDano] = useState("");

  const [attrs, setAttrs] = useState<Attrs>({
    attrInvestigar: 2,
    attrCombate: 1,
    attrLabia: 2,
    attrMente: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const spent = useMemo(
    () => Object.values(attrs).reduce((s, v) => s + v, 0),
    [attrs],
  );
  const remaining = ATTR_TOTAL_POINTS - spent;

  const pointBuyError = validatePointBuy({
    attrInvestigar: attrs.attrInvestigar,
    attrCombate: attrs.attrCombate,
    attrLabia: attrs.attrLabia,
    attrMente: attrs.attrMente,
  });

  const pvPreview = Math.max(1, BASE_PV + attrs.attrCombate);
  const sanPreview = Math.max(1, BASE_SAN + attrs.attrMente);

  function adjust(key: string, delta: number) {
    setAttrs((prev) => {
      const next = prev[key] + delta;
      if (next < ATTR_MIN || next > ATTR_MAX) return prev;
      if (delta > 0 && remaining <= 0) return prev;
      return { ...prev, [key]: next };
    });
  }

  function toggleFoco(key: string) {
    setFocos((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 2) return prev;
      return [...prev, key];
    });
  }

  function addItem() {
    if (!newItem.trim()) return;
    setItems((p) => [...p, { nome: newItem.trim(), dano: newDano }]);
    setNewItem("");
    setNewDano("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pointBuyError) {
      setError(pointBuyError);
      return;
    }
    setSaving(true);
    const res = await createCharacter({
      name,
      playerName,
      occupation,
      appearance,
      portraitUrl,
      classe,
      especialistaFocos: classe === "ESPECIALISTA" ? focos : [],
      inventory: items,
      playerNotes,
      ownerId: isMaster ? ownerId : undefined,
      ...attrs,
    });
    if (!res.ok) {
      setSaving(false);
      setError(res.error ?? "Falha ao criar o dossiê.");
      return;
    }
    // Carimba "NOVO REGISTRO" antes de abrir a ficha (igual ao login).
    setSaved(true);
    setTimeout(() => {
      router.push(`/personagens/${res.id}`);
      router.refresh();
    }, 850);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper paper-edge folder-open relative rounded-md p-4 sm:p-6"
    >
      {saved && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="stamp stamp-slam text-2xl">Novo Registro</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="display mb-2 text-lg text-sepia-ink">
          Identificação
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nome do personagem</label>
            <input
              className="field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Nome do jogador (pessoa real)</label>
            <input
              className="field mt-1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
            />
          </div>
        </div>

        {isMaster && players.length > 0 && (
          <div>
            <label className="label">Conta dona da ficha</label>
            <select
              className="field mt-1"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Ocupação civil</label>
          <input
            className="field mt-1"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Todos começam como pessoas comuns..."
          />
        </div>

        <div>
          <label className="label">Aparência / Retrato (texto)</label>
          <textarea
            className="field mt-1"
            rows={2}
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
          />
        </div>

        <div>
          <label className="label">URL do retrato (opcional)</label>
          <input
            className="field mt-1"
            value={portraitUrl}
            onChange={(e) => setPortraitUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </fieldset>

      {/* Classe */}
      <fieldset className="mt-6">
        <legend className="display mb-2 text-lg text-sepia-ink">Classe</legend>
        <p className="typewriter mb-3 text-xs text-sepia-dark">
          Todos começam no Nível 0 (Comum). A classe define a progressão.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STARTER_CLASSES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setClasse(c)}
              data-active={classe === c}
              className="folder-tab rounded-md px-3 py-3 text-left"
            >
              <div className="display text-sm text-sepia-ink">
                {CLASS_INFO[c].label}
              </div>
              <div className="typewriter text-[0.7rem] text-sepia-dark">
                {CLASS_INFO[c].descricao}
              </div>
            </button>
          ))}
        </div>

        {classe === "ESPECIALISTA" && (
          <div className="mt-3">
            <label className="label">
              Focos do Especialista (escolha até 2)
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ATTRIBUTES.map((a) => (
                <button
                  type="button"
                  key={a.key}
                  onClick={() => toggleFoco(a.key)}
                  data-active={focos.includes(a.key)}
                  className="folder-tab tap px-3 py-1 text-xs"
                >
                  {a.code}
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>

      {/* Atributos */}
      <fieldset className="mt-6">
        <legend className="display mb-2 text-lg text-sepia-ink">
          Atributos
        </legend>
        <p className="typewriter mb-3 text-xs text-sepia-dark">
          Distribua {ATTR_TOTAL_POINTS} pontos (de {ATTR_MIN} a {ATTR_MAX} cada).
        </p>

        <div className="mb-3 flex items-center gap-2">
          <span className="label">Pontos restantes:</span>
          <span
            className={`typewriter text-lg ${
              remaining === 0 ? "text-sepia-ink" : "text-stamp"
            }`}
          >
            {remaining}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ATTRIBUTES.map((a) => (
            <div
              key={a.key}
              className="flex items-center justify-between rounded border border-sepia/30 bg-black/5 px-3 py-2"
            >
              <div>
                <div className="display text-sm text-sepia-ink">{a.label}</div>
                <div className="typewriter text-[0.65rem] text-sepia">
                  {a.code}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap px-2.5 py-1 text-sm"
                  onClick={() => adjust(a.key, -1)}
                  aria-label={`Reduzir ${a.label}`}
                >
                  −
                </button>
                <span className="attr-stamp flex h-9 w-9 items-center justify-center bg-paper-light typewriter text-lg">
                  {fmtSigned(attrs[a.key])}
                </span>
                <button
                  type="button"
                  className="btn btn-dark tap px-2.5 py-1 text-sm"
                  onClick={() => adjust(a.key, 1)}
                  aria-label={`Aumentar ${a.label}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="typewriter mt-3 text-xs text-sepia-dark">
          Prévia (Nível 0): PV {pvPreview} · Sanidade {sanPreview}
        </p>
      </fieldset>

      {/* Inventário */}
      <fieldset className="mt-6 space-y-3">
        <legend className="display mb-2 text-lg text-sepia-ink">
          Inventário inicial
        </legend>
        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-dashed border-sepia/30 py-1"
              >
                <span className="typewriter text-sm text-sepia-ink">
                  — {it.nome}
                  {it.dano ? (
                    <span className="ml-2 text-xs text-stamp">({it.dano})</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="tap text-stamp"
                  onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1">
            <label className="label">Item</label>
            <input
              className="field mt-1"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Ex.: Faca"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
            />
          </div>
          <div>
            <label className="label">Dano</label>
            <select
              className="field mt-1"
              value={newDano}
              onChange={(e) => setNewDano(e.target.value)}
            >
              {WEAPON_DICE.map((d) => (
                <option key={d} value={d}>
                  {d === "" ? "— sem dano —" : d}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-dark tap" onClick={addItem}>
            + Adicionar
          </button>
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <label className="label">Anotações do investigador</label>
        <textarea
          className="field mt-1"
          rows={2}
          value={playerNotes}
          onChange={(e) => setPlayerNotes(e.target.value)}
        />
      </fieldset>

      {error && <p className="typewriter mt-4 text-sm text-stamp">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="btn btn-primary tap"
          disabled={saving || !!pointBuyError}
        >
          {saving ? "Arquivando..." : "Arquivar dossiê"}
        </button>
        <button
          type="button"
          className="btn btn-ghost tap"
          onClick={() => router.back()}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
