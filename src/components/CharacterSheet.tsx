"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CharacterDTO, InventoryItem } from "@/lib/character";
import {
  chooseSubclass,
  respondOccultOffer,
  setRetratoTravado,
  updateCharacterAsPlayer,
  usarItemNoAliado,
} from "@/lib/actions";
import {
  ATTRIBUTES,
  BASE_PV,
  BASE_SAN,
  CLASS_INFO,
  OCCULTISM_LEVELS,
  PROPOSTA,
  SUBCLASS_LEVEL,
  WEAPON_DICE,
  classLabel,
  getSubclass,
  levelLabel,
  subclassLabel,
  subclassesFor,
  unlockedMilestones,
} from "@/lib/game";
import { ResourceMeter } from "@/components/ResourceMeter";
import { ConditionBadges } from "@/components/Conditions";
import { DiceRoller } from "@/components/DiceRoller";
import { WeaponRoller } from "@/components/WeaponRoller";
import {
  EyeIcon,
  FingerprintIcon,
  LockIcon,
  MagnifierIcon,
} from "@/components/icons";

interface Ally {
  id: string;
  name: string;
}

interface Props {
  character: CharacterDTO;
  party?: Ally[];
}

type TabId = "id" | "attrs" | "resources" | "inventory" | "notes" | "occultism";

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function CharacterSheet({ character, party = [] }: Props) {
  const router = useRouter();
  const canEdit = character.canEditAsPlayer;

  const [tab, setTab] = useState<TabId>("id");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Modo edição: por padrão a ficha é só leitura; o jogador liga para editar.
  const [editando, setEditando] = useState(false);
  const editing = canEdit && editando;

  const [name, setName] = useState(character.name);
  const [occupation, setOccupation] = useState(character.occupation ?? "");
  const [appearance, setAppearance] = useState(character.appearance ?? "");
  const [portraitUrl, setPortraitUrl] = useState(character.portraitUrl ?? "");
  const [playerNotes, setPlayerNotes] = useState(character.playerNotes ?? "");
  const [inventory, setInventory] = useState<InventoryItem[]>(
    character.inventory,
  );
  const [pvAtual, setPvAtual] = useState(character.pvAtual);
  const [sanAtual, setSanAtual] = useState(character.sanAtual);

  // "Sujo" = há edições locais não salvas (comparado ao que veio do servidor).
  const invServidor = JSON.stringify(character.inventory);
  const invLocal = JSON.stringify(inventory);
  const dirty =
    (name.trim() !== "" && name.trim() !== character.name) ||
    occupation !== (character.occupation ?? "") ||
    appearance !== (character.appearance ?? "") ||
    portraitUrl !== (character.portraitUrl ?? "") ||
    playerNotes !== (character.playerNotes ?? "") ||
    pvAtual !== character.pvAtual ||
    sanAtual !== character.sanAtual ||
    invLocal !== invServidor;

  // Payload comum enviado ao servidor (nome nunca vai vazio).
  const basePayload = () => ({
    name: name.trim() || character.name,
    occupation,
    appearance,
    portraitUrl,
    playerNotes,
  });

  // Sincroniza o estado local quando os dados do servidor mudam (ex.: um
  // aliado usou um item em você, ou o Mestre editou). Só roda quando os
  // valores do servidor mudam — se você estiver editando (dirty), o auto-
  // refresh nem dispara, então suas edições ficam preservadas.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setName(character.name);
    setOccupation(character.occupation ?? "");
    setAppearance(character.appearance ?? "");
    setPortraitUrl(character.portraitUrl ?? "");
    setPlayerNotes(character.playerNotes ?? "");
    setInventory(character.inventory);
    setPvAtual(character.pvAtual);
    setSanAtual(character.sanAtual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character.name,
    character.occupation,
    character.appearance,
    character.portraitUrl,
    character.playerNotes,
    character.pvAtual,
    character.sanAtual,
    invServidor,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Polling ~5s: recarrega os dados do servidor, mas só quando não há edição
  // pendente nem salvamento em curso (não atrapalha quem está mexendo).
  useEffect(() => {
    if (dirty || saving) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [dirty, saving, router]);

  // Auto-save: qualquer alteração é salva sozinha (debounce ~800ms). Sem botão.
  useEffect(() => {
    if (!canEdit || !dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      const res = await updateCharacterAsPlayer(character.id, {
        ...basePayload(),
        inventory,
        pvAtual,
        sanAtual,
      });
      setSaving(false);
      if (res.ok) {
        setMsg("Salvo.");
        router.refresh();
      } else {
        setMsg(res.error ?? "Falha ao salvar.");
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dirty,
    name,
    occupation,
    appearance,
    portraitUrl,
    playerNotes,
    pvAtual,
    sanAtual,
    invLocal,
  ]);

  // Usar item: aplica o efeito (PV/SAN), gasta 1 uso e SALVA automaticamente.
  async function usarItem(i: number) {
    const it = inventory[i];
    if (!it || it.usos <= 0 || saving) return;
    const novoInv = inventory.map((x, j) =>
      j === i ? { ...x, usos: Math.max(0, x.usos - 1) } : x,
    );
    const novoPv = pvAtual + (it.efeitoPv || 0);
    const novoSan = sanAtual + (it.efeitoSan || 0);
    // Atualiza a UI na hora.
    setInventory(novoInv);
    setPvAtual(novoPv);
    setSanAtual(novoSan);
    // Persiste com os valores calculados (evita estado defasado).
    setSaving(true);
    setMsg(null);
    const res = await updateCharacterAsPlayer(character.id, {
      ...basePayload(),
      inventory: novoInv,
      pvAtual: novoPv,
      sanAtual: novoSan,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg(res.error ?? "Falha ao usar o item.");
      return;
    }
    setMsg(`${it.nome} usado.`);
    router.refresh();
  }

  // Usar item em um aliado: aplica o efeito no alvo e gasta 1 uso (salva).
  async function usarNoAliado(i: number, allyId: string) {
    const it = inventory[i];
    if (!it || it.usos <= 0 || saving) return;
    setSaving(true);
    setMsg(null);
    const res = await usarItemNoAliado(character.id, allyId, i, {
      ...basePayload(),
      inventory,
      pvAtual,
      sanAtual,
    });
    setSaving(false);
    if (!res.ok) {
      setMsg(res.error ?? "Falha ao usar no aliado.");
      return;
    }
    setInventory((prev) =>
      prev.map((x, j) => (j === i ? { ...x, usos: Math.max(0, x.usos - 1) } : x)),
    );
    const alvo = party.find((p) => p.id === allyId);
    setMsg(`${it.nome} usado em ${alvo?.name ?? "aliado"}.`);
    router.refresh();
  }

  const combatente = character.classe === "COMBATENTE";
  const pvPerLevel = CLASS_INFO[character.classe]?.pvPorNivel ?? 1;
  const sanPerLevel = CLASS_INFO[character.classe]?.sanPorNivel ?? 1;
  const pvBreak =
    `${BASE_PV} base ${fmtSigned(character.attrCombate)} COM` +
    (character.nivel > 0 ? ` +${pvPerLevel * character.nivel} nível` : "");
  const sanBreak =
    `${BASE_SAN} base ${fmtSigned(character.attrMente)} MEN` +
    (character.nivel > 0 ? ` +${sanPerLevel * character.nivel} nível` : "");

  const milestones = unlockedMilestones(character.classe, character.nivel);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "id", label: "Identificação", icon: <FingerprintIcon /> },
    { id: "attrs", label: "Atributos", icon: <MagnifierIcon /> },
    { id: "resources", label: "Recursos", icon: <EyeIcon /> },
    { id: "inventory", label: "Inventário", icon: null },
    { id: "notes", label: "Anotações", icon: null },
  ];

  const irreal = character.canSeeOccultism && tab === "occultism";
  const showProposta =
    canEdit &&
    character.propostaStatus === PROPOSTA.PENDENTE &&
    character.classe !== "OCULTISTA";
  // Nível 5+ sem subclasse → o jogador escolhe o rumo.
  const showSubclass =
    canEdit && character.nivel >= SUBCLASS_LEVEL && !character.subclasse;

  return (
    <div className={irreal ? "irreal rounded-md" : ""}>
      {/* Cabeçalho: classe + nível */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`badge ${
            character.classe === "OCULTISTA" ? "badge-ocultista" : "badge-classe"
          }`}
        >
          {classLabel(character.classe)}
        </span>
        {character.subclasse && (
          <span className="badge badge-classe">
            {subclassLabel(character.subclasse)}
          </span>
        )}
        <span className="badge badge-nivel">{levelLabel(character.nivel)}</span>
        <ConditionBadges condicoes={character.condicoes} />
        {milestones.length > 0 && (
          <span className="typewriter text-xs text-paper/60">
            {milestones.length} habilidade(s) de marco
          </span>
        )}
        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <span className="typewriter text-xs text-sepia">
              {editing
                ? saving
                  ? "salvando…"
                  : dirty
                    ? "alterações pendentes…"
                    : msg || "✓ salvo"
                : "somente leitura"}
            </span>
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className={`btn tap px-3 py-1 text-xs ${editing ? "btn-primary" : "btn-dark"}`}
              title={editing ? "Sair do modo edição" : "Entrar no modo edição"}
            >
              {editing ? "✓ Concluir" : "✎ Editar ficha"}
            </button>
          </div>
        )}
      </div>

      {showProposta && <PropostaPrompt character={character} />}
      {showSubclass && <SubclassPrompt character={character} />}

      {/* Abas do fichário (roláveis no mobile) */}
      <div className="flex flex-nowrap items-end gap-1 overflow-x-auto sm:flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className="folder-tab tap shrink-0 px-3 py-2 text-xs"
          >
            <span className="inline-flex items-center gap-1">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
        {character.canSeeOccultism && (
          <button
            type="button"
            data-active={tab === "occultism"}
            data-locked="true"
            onClick={() => setTab("occultism")}
            className="folder-tab tap shrink-0 px-3 py-2 text-xs"
          >
            <span className="inline-flex items-center gap-1">
              <LockIcon /> Ocultismo
            </span>
          </button>
        )}
      </div>

      <div className="paper paper-edge folder-open rounded-b-md rounded-tr-md p-4 sm:p-6">
        {tab === "id" && (
          <IdentificationTab
            character={character}
            editing={editing}
            name={name}
            setName={setName}
            occupation={occupation}
            setOccupation={setOccupation}
            appearance={appearance}
            setAppearance={setAppearance}
            portraitUrl={portraitUrl}
            setPortraitUrl={setPortraitUrl}
          />
        )}

        {tab === "attrs" && (
          <div>
            <SectionTitle>Atributos</SectionTitle>
            <p className="typewriter mb-4 text-xs text-sepia-dark">
              De -2 a 3. Travados após a criação — só o Mestre reajusta.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ATTRIBUTES.map((a) => {
                const val = (character as unknown as Record<string, number>)[
                  a.key
                ];
                const foco = character.especialistaFocos.includes(a.key);
                return (
                  <div key={a.key} className="text-center">
                    <div
                      className={`attr-stamp mx-auto flex h-16 w-16 items-center justify-center bg-paper-light ${
                        foco ? "ring-2 ring-stamp" : ""
                      }`}
                    >
                      <span className="typewriter text-2xl">
                        {fmtSigned(val)}
                      </span>
                    </div>
                    <div className="display mt-2 text-sm text-sepia-ink">
                      {a.label}
                    </div>
                    <div className="typewriter text-[0.65rem] text-sepia">
                      {a.code}
                      {foco ? " · foco" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6">
              <DiceRoller
                attrs={{
                  attrInvestigar: character.attrInvestigar,
                  attrCombate: character.attrCombate,
                  attrLabia: character.attrLabia,
                  attrMente: character.attrMente,
                }}
                focos={
                  character.classe === "ESPECIALISTA"
                    ? character.especialistaFocos
                    : []
                }
                personagem={character.name}
              />
            </div>
            {milestones.length > 0 && (
              <div className="mt-6">
                <h3 className="display mb-2 text-sm text-sepia-ink">
                  Habilidades de {classLabel(character.classe)}
                </h3>
                <ul className="space-y-1">
                  {milestones.map((m) => (
                    <li
                      key={m.level}
                      className="typewriter border-b border-dashed border-sepia/30 py-1 text-sm text-sepia-ink"
                    >
                      <strong>Nv {m.level} — {m.nome}:</strong> {m.desc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {getSubclass(character.subclasse) && (
              <div className="mt-6">
                <h3 className="display mb-2 text-sm text-sepia-ink">
                  Subclasse — {subclassLabel(character.subclasse)}
                </h3>
                <p className="typewriter mb-1 text-xs text-sepia">
                  {getSubclass(character.subclasse)!.descricao}
                </p>
                <ul className="space-y-1">
                  {getSubclass(character.subclasse)!.habilidades.map((h, i) => (
                    <li
                      key={i}
                      className="typewriter border-b border-dashed border-sepia/30 py-1 text-sm text-sepia-ink"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "resources" && (
          <div>
            <SectionTitle>Recursos</SectionTitle>
            <div className="space-y-6">
              <ResourceControl
                label="Pontos de Vida"
                kind="pv"
                current={pvAtual}
                max={character.pvMax}
                breakdown={pvBreak}
                canEdit={canEdit}
                onChange={setPvAtual}
              />
              <ResourceControl
                label="Sanidade"
                kind="san"
                current={sanAtual}
                max={character.sanMax}
                breakdown={sanBreak}
                canEdit={canEdit}
                onChange={setSanAtual}
              />
              <p className="typewriter text-xs text-sepia-dark">
                Pode passar do máximo (sobrevida) e ficar negativo. O máximo só
                muda via atributo/classe/nível (Mestre).
              </p>
            </div>
          </div>
        )}

        {tab === "inventory" && (
          <InventoryTab
            inventory={inventory}
            setInventory={setInventory}
            editing={editing}
            canUse={canEdit}
            combate={character.attrCombate}
            combatente={combatente}
            personagem={character.name}
            onUsar={usarItem}
            party={party}
            onUsarAliado={usarNoAliado}
          />
        )}

        {tab === "notes" && (
          <div>
            <SectionTitle>Anotações do Investigador</SectionTitle>
            {editing ? (
              <textarea
                className="field min-h-40"
                value={playerNotes}
                onChange={(e) => setPlayerNotes(e.target.value)}
                placeholder="Pistas, suspeitas, nomes rabiscados às pressas..."
              />
            ) : (
              <p className="typewriter whitespace-pre-wrap text-sepia-ink">
                {playerNotes || "Sem anotações."}
              </p>
            )}
          </div>
        )}

        {tab === "occultism" && character.canSeeOccultism && (
          <OccultismTab character={character} />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="display mb-4 text-xl text-sepia-ink">{children}</h2>;
}

function PropostaPrompt({ character }: { character: CharacterDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondOccultOffer(character.id, accept);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="irreal glitch mb-4 rounded-md border border-stamp/60 bg-ink-soft p-4">
      <h3 className="display mb-1 text-sm text-stamp-bright">
        Uma proposta ecoa do outro lado…
      </h3>
      <p className="typewriter mb-3 whitespace-pre-wrap text-sm text-paper">
        {character.propostaTexto}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary tap"
          onClick={() => respond(true)}
          disabled={pending}
        >
          Aceitar o pacto
        </button>
        <button
          type="button"
          className="btn btn-ghost tap"
          onClick={() => respond(false)}
          disabled={pending}
        >
          Recusar
        </button>
      </div>
      <p className="typewriter mt-2 text-[0.65rem] text-paper/50">
        Aceitar torna você Ocultista e abre o que estava selado.
      </p>
      {error && <p className="typewriter mt-1 text-xs text-stamp">{error}</p>}
    </div>
  );
}

function SubclassPrompt({ character }: { character: CharacterDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const opcoes = subclassesFor(character.classe);

  function escolher(key: string) {
    setError(null);
    startTransition(async () => {
      const res = await chooseSubclass(character.id, key);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-4 rounded-md border border-stamp/50 bg-ink-soft p-4">
      <h3 className="display mb-1 text-sm text-stamp-bright">
        Nível {character.nivel}: escolha seu rumo
      </h3>
      <p className="typewriter mb-3 text-xs text-paper/70">
        Uma especialização de {classLabel(character.classe)} — novos efeitos,
        valores e um item de assinatura. A escolha é sua (o Mestre pode mudar
        depois).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => escolher(s.key)}
            disabled={pending}
            className="rounded border border-sepia/40 bg-black/20 p-2.5 text-left transition-colors hover:border-stamp disabled:opacity-50"
          >
            <div className="display text-sm text-paper-light">{s.label}</div>
            <div className="typewriter text-[0.7rem] text-paper/60">
              {s.descricao}
            </div>
            {s.item && (
              <div className="typewriter mt-1 text-[0.65rem] text-stamp">
                + {s.item.nome}
              </div>
            )}
          </button>
        ))}
      </div>
      {error && <p className="typewriter mt-2 text-xs text-stamp">{error}</p>}
    </div>
  );
}

function IdentificationTab({
  character,
  editing,
  name,
  setName,
  occupation,
  setOccupation,
  appearance,
  setAppearance,
  portraitUrl,
  setPortraitUrl,
}: {
  character: CharacterDTO;
  editing: boolean;
  name: string;
  setName: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  appearance: string;
  setAppearance: (v: string) => void;
  portraitUrl: string;
  setPortraitUrl: (v: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const travado = character.retratoTravado;
  const isMaster = character.canEditAsMaster;
  const podeTrocarFoto = editing && (isMaster || !travado);

  function toggleTrava() {
    startTransition(async () => {
      const res = await setRetratoTravado(character.id, !travado);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
      <div>
        <div className="relative paper-edge flex aspect-[3/4] items-center justify-center overflow-hidden rounded bg-black/10">
          {portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitUrl}
              alt={character.name}
              className="h-full w-full object-cover grayscale"
            />
          ) : (
            <FingerprintIcon className="text-5xl text-sepia/50" />
          )}
          {isMaster ? (
            <button
              type="button"
              onClick={toggleTrava}
              disabled={pending}
              title={travado ? "Destravar a foto" : "Travar a foto (jogador não troca)"}
              className="absolute right-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-sm"
            >
              {travado ? "🔒" : "🔓"}
            </button>
          ) : (
            travado && (
              <span
                className="absolute right-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 text-sm"
                title="Foto travada pelo Mestre"
              >
                🔒
              </span>
            )
          )}
        </div>
        {podeTrocarFoto ? (
          <input
            className="field mt-2 text-xs"
            value={portraitUrl}
            onChange={(e) => setPortraitUrl(e.target.value)}
            placeholder="URL do retrato"
          />
        ) : editing && travado ? (
          <p className="typewriter mt-2 text-[0.65rem] text-sepia">
            🔒 Foto travada pelo Mestre.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Nome</label>
          {editing ? (
            <input
              className="field mt-1 text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (!name.trim()) setName(character.name);
              }}
              placeholder="Nome do investigador"
            />
          ) : (
            <p className="display text-2xl text-sepia-ink">{character.name}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jogador</label>
            <p className="typewriter text-sepia-ink">{character.playerName}</p>
          </div>
          <div>
            <label className="label">Ocupação</label>
            {editing ? (
              <input
                className="field mt-1"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Ex.: Detetive particular"
              />
            ) : (
              <p className="typewriter text-sepia-ink">
                {character.occupation || "—"}
              </p>
            )}
          </div>
          <div>
            <label className="label">Classe</label>
            <p className="typewriter text-sepia-ink">
              {classLabel(character.classe)}
            </p>
          </div>
          <div>
            <label className="label">Nível</label>
            <p className="typewriter text-sepia-ink">
              {levelLabel(character.nivel)}
            </p>
          </div>
        </div>
        <div>
          <label className="label">Aparência</label>
          {editing ? (
            <textarea
              className="field mt-1"
              rows={4}
              value={appearance}
              onChange={(e) => setAppearance(e.target.value)}
            />
          ) : (
            <p className="typewriter whitespace-pre-wrap text-sepia-ink">
              {appearance || "—"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceControl({
  label,
  kind,
  current,
  max,
  breakdown,
  canEdit,
  onChange,
}: {
  label: string;
  kind: "pv" | "san";
  current: number;
  max: number;
  breakdown: string;
  canEdit: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <ResourceMeter
        kind={kind}
        current={current}
        max={max}
        breakdown={breakdown}
      />
      {canEdit && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="btn btn-dark tap px-3 py-1 text-sm"
            onClick={() => onChange(current - 1)}
            aria-label={`Reduzir ${label}`}
          >
            −
          </button>
          <input
            type="number"
            className="field w-24 text-center"
            value={current}
            onChange={(e) => onChange(Math.trunc(Number(e.target.value) || 0))}
          />
          <button
            type="button"
            className="btn btn-dark tap px-3 py-1 text-sm"
            onClick={() => onChange(current + 1)}
            aria-label={`Aumentar ${label}`}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryTab({
  inventory,
  setInventory,
  editing,
  canUse,
  combate,
  combatente,
  personagem,
  onUsar,
  party,
  onUsarAliado,
}: {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  editing: boolean;
  canUse: boolean;
  combate: number;
  combatente: boolean;
  personagem: string;
  onUsar: (i: number) => void;
  party: Ally[];
  onUsarAliado: (i: number, allyId: string) => void;
}) {
  const [alvoIdx, setAlvoIdx] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [dano, setDano] = useState("");
  const [qtd, setQtd] = useState(1);
  const [usos, setUsos] = useState(1);
  const [efeitoPv, setEfeitoPv] = useState(0);
  const [efeitoSan, setEfeitoSan] = useState(0);

  function add() {
    if (!nome.trim()) return;
    setInventory((p) => [
      ...p,
      { nome: nome.trim(), dano, qtd, usos, efeitoPv, efeitoSan },
    ]);
    setNome("");
    setDano("");
    setQtd(1);
    setUsos(1);
    setEfeitoPv(0);
    setEfeitoSan(0);
  }

  return (
    <div>
      <SectionTitle>Inventário</SectionTitle>
      {inventory.length === 0 && (
        <p className="typewriter text-sm text-sepia-dark">Bolsos vazios.</p>
      )}
      <ul className="space-y-2">
        {inventory.map((item, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-sepia/30 py-2"
          >
            <span className="typewriter text-sepia-ink">
              — {item.nome}
              {item.qtd > 1 ? (
                <span className="text-sepia"> ×{item.qtd}</span>
              ) : null}
              {item.dano ? (
                <span className="ml-2 text-xs text-stamp">({item.dano})</span>
              ) : null}
              {(item.efeitoPv !== 0 || item.efeitoSan !== 0) && (
                <span className="ml-2 text-[0.65rem] text-emerald-800">
                  {item.efeitoPv !== 0
                    ? `${item.efeitoPv > 0 ? "+" : ""}${item.efeitoPv} PV`
                    : ""}
                  {item.efeitoPv !== 0 && item.efeitoSan !== 0 ? " · " : ""}
                  {item.efeitoSan !== 0
                    ? `${item.efeitoSan > 0 ? "+" : ""}${item.efeitoSan} SAN`
                    : ""}
                </span>
              )}
              <span
                className={`ml-2 text-[0.65rem] ${item.usos <= 0 ? "text-stamp" : "text-sepia-dark"}`}
              >
                usos: {item.usos}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {canUse &&
                item.usos > 0 &&
                (() => {
                  const temEfeito =
                    item.efeitoPv !== 0 || item.efeitoSan !== 0;
                  const podeAlvo = temEfeito && party.length > 0;
                  return (
                    <button
                      type="button"
                      className="btn btn-primary tap px-2 py-1 text-xs"
                      onClick={() =>
                        podeAlvo
                          ? setAlvoIdx(alvoIdx === i ? null : i)
                          : onUsar(i)
                      }
                      title={
                        podeAlvo
                          ? "Usar em você ou num aliado"
                          : temEfeito
                            ? "Usar: aplica o efeito e gasta 1 uso"
                            : "Usar (−1 uso)"
                      }
                    >
                      {podeAlvo ? "Usar…" : "Usar"}
                    </button>
                  );
                })()}
              {item.dano ? (
                <WeaponRoller
                  dieCode={item.dano}
                  combate={combate}
                  advantage={combatente}
                  nome={item.nome}
                  personagem={personagem}
                />
              ) : null}
              {editing && (
                <button
                  type="button"
                  className="tap text-stamp hover:underline"
                  onClick={() =>
                    setInventory((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label={`Remover ${item.nome}`}
                >
                  ✕
                </button>
              )}
            </div>
            {alvoIdx === i && (
              <div className="mt-1 flex w-full flex-wrap items-center gap-1 border-t border-dashed border-sepia/20 pt-2">
                <span className="label mr-1">Usar em:</span>
                <button
                  type="button"
                  className="btn btn-dark tap px-2 py-1 text-[0.65rem]"
                  onClick={() => {
                    onUsar(i);
                    setAlvoIdx(null);
                  }}
                >
                  Você
                </button>
                {party.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="btn btn-dark tap px-2 py-1 text-[0.65rem]"
                    onClick={() => {
                      onUsarAliado(i, a.id);
                      setAlvoIdx(null);
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1">
            <label className="label">Item</label>
            <input
              className="field mt-1"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Revólver .38"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
          </div>
          <div>
            <label className="label">Dano</label>
            <select
              className="field mt-1"
              value={dano}
              onChange={(e) => setDano(e.target.value)}
            >
              {WEAPON_DICE.map((d) => (
                <option key={d} value={d}>
                  {d === "" ? "— sem dano —" : d}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="label">Qtd</label>
            <input
              type="number"
              min={1}
              className="field mt-1"
              value={qtd}
              onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="w-20">
            <label className="label">Usos</label>
            <input
              type="number"
              min={0}
              className="field mt-1"
              value={usos}
              onChange={(e) => setUsos(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="w-20">
            <label className="label">Efeito PV</label>
            <input
              type="number"
              className="field mt-1"
              value={efeitoPv}
              onChange={(e) => setEfeitoPv(Math.trunc(Number(e.target.value) || 0))}
            />
          </div>
          <div className="w-20">
            <label className="label">Efeito SAN</label>
            <input
              type="number"
              className="field mt-1"
              value={efeitoSan}
              onChange={(e) =>
                setEfeitoSan(Math.trunc(Number(e.target.value) || 0))
              }
            />
          </div>
          <button type="button" className="btn btn-dark tap" onClick={add}>
            + Adicionar
          </button>
        </div>
      )}
      <p className="typewriter mt-3 text-[0.65rem] text-sepia">
        Ao clicar em Usar, o efeito de PV/SAN é aplicado, gasta 1 uso e salva
        automaticamente. {combatente ? "Combatente rola o dado de dano 2× e usa o maior." : ""}
      </p>
    </div>
  );
}

function OccultismTab({ character }: { character: CharacterDTO }) {
  const level = OCCULTISM_LEVELS.find((l) => l.level === character.occultismLevel);
  return (
    <div className="ink-reveal">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display glitch text-xl text-stamp-bright">
          <LockIcon className="mr-1 inline" /> Ocultismo
        </h2>
        <span className="stamp text-[0.6rem]">Irreal</span>
      </div>

      <div className="mb-4">
        <span className="label">Exposição ao Irreal</span>
        <div className="mt-1 flex items-center gap-2">
          {OCCULTISM_LEVELS.map((l) => (
            <span
              key={l.level}
              className={`h-2 flex-1 rounded ${
                l.level <= character.occultismLevel ? "bg-stamp" : "bg-sepia/20"
              }`}
            />
          ))}
        </div>
        <p className="typewriter mt-1 text-sm text-sepia-ink">
          Nível {character.occultismLevel} — {level?.label}
        </p>
        <p className="typewriter text-xs text-sepia">{level?.hint}</p>
      </div>

      <div>
        <span className="label">Conhecimento proibido</span>
        <p className="typewriter mt-1 whitespace-pre-wrap leading-relaxed text-sepia-ink">
          {character.occultismContent ||
            "A página estava ali o tempo todo. Só agora você consegue lê-la — mas ainda está em branco."}
        </p>
      </div>

      {character.occultismUnlockedAt && (
        <p className="typewriter mt-4 text-xs text-sepia">
          Véu rompido em{" "}
          {new Date(character.occultismUnlockedAt).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}
