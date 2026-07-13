"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CharacterDTO, InventoryItem } from "@/lib/character";
import {
  clearOccultOffer,
  deleteCharacter,
  sendOccultOffer,
  setOccultismLevel,
  updateCharacterAsMaster,
} from "@/lib/actions";
import {
  ATTRIBUTES,
  CLASS_INFO,
  MAX_LEVEL,
  OCCULTISM_LEVELS,
  OCCULTISM_MAX_LEVEL,
  PROPOSTA,
  WEAPON_DICE,
  computeMaxPv,
  computeMaxSan,
  getSubclass,
  subclassesFor,
} from "@/lib/game";
import { OccultismToggle } from "@/components/OccultismToggle";

interface Props {
  character: CharacterDTO;
}

const ALL_CLASSES = ["ESPECIALISTA", "COMBATENTE", "OCULTISTA"] as const;

export function MasterEditForm({ character }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: character.name,
    playerName: character.playerName,
    occupation: character.occupation ?? "",
    appearance: character.appearance ?? "",
    portraitUrl: character.portraitUrl ?? "",
    classe: character.classe,
    subclasse: character.subclasse ?? "",
    nivel: character.nivel,
    focos: character.especialistaFocos,
    attrInvestigar: character.attrInvestigar,
    attrCombate: character.attrCombate,
    attrLabia: character.attrLabia,
    attrMente: character.attrMente,
    pvAtual: character.pvAtual,
    sanAtual: character.sanAtual,
    playerNotes: character.playerNotes ?? "",
    masterNotes: character.masterNotes ?? "",
    occultismContent: character.occultismContent ?? "",
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(
    character.inventory,
  );
  const [newItem, setNewItem] = useState("");
  const [newDano, setNewDano] = useState("");
  const [offerText, setOfferText] = useState(character.propostaTexto ?? "");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function attrNum(v: string) {
    return Math.max(-2, Math.min(3, Math.trunc(Number(v) || 0)));
  }

  const pvMaxPreview = useMemo(
    () => computeMaxPv(form.attrCombate, form.classe, form.nivel, form.subclasse),
    [form.attrCombate, form.classe, form.nivel, form.subclasse],
  );
  const sanMaxPreview = useMemo(
    () => computeMaxSan(form.attrMente, form.classe, form.nivel, form.subclasse),
    [form.attrMente, form.classe, form.nivel, form.subclasse],
  );

  function changeClasse(nova: string) {
    setForm((f) => {
      const aindaVale = subclassesFor(nova).some((s) => s.key === f.subclasse);
      return { ...f, classe: nova, subclasse: aindaVale ? f.subclasse : "" };
    });
  }

  const subAtual = getSubclass(form.subclasse);

  function toggleFoco(key: string) {
    setForm((f) => {
      const has = f.focos.includes(key);
      if (has) return { ...f, focos: f.focos.filter((k) => k !== key) };
      if (f.focos.length >= 2) return f;
      return { ...f, focos: [...f.focos, key] };
    });
  }

  function addItem() {
    if (!newItem.trim()) return;
    setInventory((p) => [
      ...p,
      { nome: newItem.trim(), dano: newDano, qtd: 1, usos: 1, efeitoPv: 0, efeitoSan: 0 },
    ]);
    setNewItem("");
    setNewDano("");
  }

  function save() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await updateCharacterAsMaster(character.id, {
        name: form.name,
        playerName: form.playerName,
        occupation: form.occupation,
        appearance: form.appearance,
        portraitUrl: form.portraitUrl,
        classe: form.classe,
        subclasse: form.subclasse,
        nivel: form.nivel,
        especialistaFocos: form.focos,
        attrInvestigar: form.attrInvestigar,
        attrCombate: form.attrCombate,
        attrLabia: form.attrLabia,
        attrMente: form.attrMente,
        pvAtual: form.pvAtual,
        sanAtual: form.sanAtual,
        inventory,
        playerNotes: form.playerNotes,
        masterNotes: form.masterNotes,
        occultismContent: form.occultismContent,
      });
      if (!res.ok) {
        setError(res.error ?? "Falha ao salvar.");
        return;
      }
      setMsg("Dossiê atualizado.");
      router.refresh();
    });
  }

  function changeOccultLevel(level: number) {
    startTransition(async () => {
      const res = await setOccultismLevel(character.id, level);
      if (!res.ok) setError(res.error ?? "Falha.");
      else router.refresh();
    });
  }

  function sendOffer() {
    setError(null);
    startTransition(async () => {
      const res = await sendOccultOffer(character.id, { texto: offerText });
      if (!res.ok) {
        setError(res.error ?? "Falha ao enviar proposta.");
        return;
      }
      setMsg("Proposta enviada.");
      router.refresh();
    });
  }

  function clearOffer() {
    startTransition(async () => {
      const res = await clearOccultOffer(character.id);
      if (!res.ok) setError(res.error ?? "Falha.");
      else router.refresh();
    });
  }

  function removeCharacter() {
    if (!confirm(`Excluir permanentemente o dossiê de ${character.name}?`)) return;
    startTransition(async () => {
      const res = await deleteCharacter(character.id);
      if (!res.ok) {
        setError(res.error ?? "Falha ao excluir.");
        return;
      }
      router.push("/mestre");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Identificação */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-3 text-lg text-sepia-ink">Identificação</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <input className="field mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Jogador">
            <input className="field mt-1" value={form.playerName} onChange={(e) => set("playerName", e.target.value)} />
          </Field>
          <Field label="Ocupação">
            <input className="field mt-1" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
          </Field>
          <Field label="URL do retrato">
            <input className="field mt-1" value={form.portraitUrl} onChange={(e) => set("portraitUrl", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Aparência">
              <textarea className="field mt-1" rows={2} value={form.appearance} onChange={(e) => set("appearance", e.target.value)} />
            </Field>
          </div>
        </div>
      </section>

      {/* Classe & Nível */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-3 text-lg text-sepia-ink">Classe & Nível</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Classe">
            <select className="field mt-1" value={form.classe} onChange={(e) => changeClasse(e.target.value)}>
              {ALL_CLASSES.map((c) => (
                <option key={c} value={c}>{CLASS_INFO[c].label}</option>
              ))}
            </select>
          </Field>
          <Field label={`Nível (0–${MAX_LEVEL})`}>
            <input type="number" min={0} max={MAX_LEVEL} className="field mt-1" value={form.nivel} onChange={(e) => set("nivel", Math.max(0, Math.min(MAX_LEVEL, Math.trunc(Number(e.target.value) || 0))))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Subclasse (liberada pelo Mestre)">
              <select className="field mt-1" value={form.subclasse} onChange={(e) => set("subclasse", e.target.value)}>
                <option value="">— nenhuma —</option>
                {subclassesFor(form.classe).map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </Field>
            {subAtual && (
              <div className="mt-2 rounded border border-sepia/30 bg-black/5 p-2">
                <p className="typewriter text-xs text-sepia-ink">{subAtual.descricao}</p>
                <ul className="mt-1 list-disc pl-4">
                  {subAtual.habilidades.map((h, i) => (
                    <li key={i} className="typewriter text-[0.7rem] text-sepia">{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {form.classe === "ESPECIALISTA" && (
          <div className="mt-3">
            <label className="label">Focos do Especialista (até 2)</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ATTRIBUTES.map((a) => (
                <button key={a.key} type="button" onClick={() => toggleFoco(a.key)} data-active={form.focos.includes(a.key)} className="folder-tab px-3 py-1 text-xs">
                  {a.code}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="typewriter mt-3 text-xs text-sepia-dark">
          Máximos derivados: PV {pvMaxPreview} · SAN {sanMaxPreview}
          {" "}(recalculados ao salvar).
        </p>
      </section>

      {/* Atributos */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-3 text-lg text-sepia-ink">Atributos (-2 a 3)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ATTRIBUTES.map((a) => (
            <Field key={a.key} label={`${a.label} (${a.code})`}>
              <input
                type="number"
                min={-2}
                max={3}
                className="field mt-1 text-center"
                value={form[a.key as keyof typeof form] as number}
                onChange={(e) => set(a.key as keyof typeof form, attrNum(e.target.value) as never)}
              />
            </Field>
          ))}
        </div>
      </section>

      {/* Recursos atuais */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-3 text-lg text-sepia-ink">Recursos atuais</h2>
        <p className="typewriter mb-3 text-xs text-sepia-dark">
          Aceitam sobrevida (&gt; máx) e negativos. Os máximos são derivados.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="PV atual">
            <input type="number" className="field mt-1" value={form.pvAtual} onChange={(e) => set("pvAtual", Math.trunc(Number(e.target.value) || 0))} />
          </Field>
          <Field label={`PV máx (${pvMaxPreview})`}>
            <input className="field mt-1 opacity-60" value={pvMaxPreview} readOnly />
          </Field>
          <Field label="SAN atual">
            <input type="number" className="field mt-1" value={form.sanAtual} onChange={(e) => set("sanAtual", Math.trunc(Number(e.target.value) || 0))} />
          </Field>
          <Field label={`SAN máx (${sanMaxPreview})`}>
            <input className="field mt-1 opacity-60" value={sanMaxPreview} readOnly />
          </Field>
        </div>
      </section>

      {/* Inventário + notas */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-3 text-lg text-sepia-ink">Inventário & Anotações</h2>
        {inventory.length > 0 && (
          <ul className="mb-3 space-y-1">
            {inventory.map((it, i) => (
              <li key={i} className="flex items-center justify-between border-b border-dashed border-sepia/30 py-1">
                <span className="typewriter text-sm text-sepia-ink">
                  — {it.nome}
                  {it.qtd > 1 ? <span className="text-sepia"> ×{it.qtd}</span> : null}
                  {it.dano ? <span className="ml-2 text-xs text-stamp">({it.dano})</span> : null}
                  <span className="ml-2 text-[0.65rem] text-sepia-dark">usos: {it.usos}</span>
                </span>
                <button type="button" className="text-stamp" onClick={() => setInventory((p) => p.filter((_, j) => j !== i))}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1">
            <label className="label">Item</label>
            <input className="field mt-1" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
          </div>
          <div>
            <label className="label">Dano</label>
            <select className="field mt-1" value={newDano} onChange={(e) => setNewDano(e.target.value)}>
              {WEAPON_DICE.map((d) => (<option key={d} value={d}>{d === "" ? "— sem dano —" : d}</option>))}
            </select>
          </div>
          <button type="button" className="btn btn-dark" onClick={addItem}>+ Adicionar</button>
        </div>
        <Field label="Anotações do jogador">
          <textarea className="field mt-1" rows={2} value={form.playerNotes} onChange={(e) => set("playerNotes", e.target.value)} />
        </Field>
        <div className="mt-3">
          <Field label="Anotações privadas do Mestre (nunca visíveis ao jogador)">
            <textarea className="field mt-1 border-stamp/40" rows={3} value={form.masterNotes} onChange={(e) => set("masterNotes", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Ocultismo */}
      <section className="paper paper-edge irreal rounded-md p-5">
        <h2 className="display mb-3 text-lg text-stamp">Ocultismo</h2>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <OccultismToggle characterId={character.id} unlocked={character.occultismUnlocked} />
          <div className="flex items-center gap-1">
            <span className="label mr-1">Nível:</span>
            {Array.from({ length: OCCULTISM_MAX_LEVEL + 1 }, (_, i) => i).map((lvl) => (
              <button key={lvl} type="button" onClick={() => changeOccultLevel(lvl)} disabled={pending} data-active={character.occultismLevel === lvl} className="folder-tab px-3 py-1 text-xs">
                {lvl}
              </button>
            ))}
          </div>
        </div>
        <p className="typewriter mb-3 text-xs text-sepia">
          {OCCULTISM_LEVELS.find((l) => l.level === character.occultismLevel)?.hint ?? ""}
        </p>
        <Field label="Conteúdo revelado (verdade, criaturas, rituais...)">
          <textarea className="field mt-1" rows={5} value={form.occultismContent} onChange={(e) => set("occultismContent", e.target.value)} />
        </Field>
      </section>

      {/* Proposta do Além */}
      <section className="paper paper-edge rounded-md p-5">
        <h2 className="display mb-1 text-lg text-sepia-ink">Proposta do Além</h2>
        <p className="typewriter mb-3 text-xs text-sepia-dark">
          Status: <strong>{character.propostaStatus}</strong>
          {character.classe === "OCULTISTA" && " · já é Ocultista"}
        </p>
        {character.classe !== "OCULTISTA" && (
          <>
            <Field label="Convite do Além (aparece na ficha do jogador)">
              <textarea className="field mt-1" rows={3} value={offerText} onChange={(e) => setOfferText(e.target.value)} placeholder="Uma voz oferece o impossível em troca de..." />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={sendOffer} disabled={pending}>
                Enviar proposta
              </button>
              {character.propostaStatus !== PROPOSTA.NENHUMA && (
                <button type="button" className="btn btn-ghost" onClick={clearOffer} disabled={pending}>
                  Limpar proposta
                </button>
              )}
            </div>
            <p className="typewriter mt-2 text-[0.65rem] text-sepia">
              Requer Ocultismo liberado (nível ≥ 1). O jogador aceita/recusa na ficha.
            </p>
          </>
        )}
      </section>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar dossiê"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={removeCharacter} disabled={pending}>
          Excluir dossiê
        </button>
        {msg && <span className="typewriter text-sm text-sepia">{msg}</span>}
        {error && <span className="typewriter text-sm text-stamp">{error}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
