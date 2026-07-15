"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMapTokenCustom,
  addMyToken,
  ajustarRecursos,
  limparTokens,
  moveMapToken,
  removeMapToken,
  setTokenLado,
  updateMapSettings,
} from "@/lib/actions";
import {
  ATTRIBUTES,
  classLabel,
  levelLabel,
  subclassLabel,
} from "@/lib/game";
import { ResourceMeter } from "@/components/ResourceMeter";
import { ConditionBadges } from "@/components/Conditions";

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

interface FichaRapida {
  id: string;
  ownerId: string | null;
  name: string;
  classe: string;
  subclasse: string | null;
  nivel: number;
  attrInvestigar: number;
  attrCombate: number;
  attrLabia: number;
  attrMente: number;
  pvAtual: number;
  pvMax: number;
  sanAtual: number;
  sanMax: number;
  condicoes: string[];
  inventory: {
    nome: string;
    dano: string;
    qtd: number;
    usos: number;
    efeitoPv: number;
    efeitoSan: number;
  }[];
}

interface MapCfg {
  id: string;
  backgroundUrl: string | null;
  cols: number;
  rows: number;
  cell: number;
  showGrid: boolean;
}
interface Token {
  id: string;
  nome: string;
  imageUrl: string | null;
  characterId: string | null;
  ownerId: string | null;
  lado: string;
  x: number;
  y: number;
}

const LADOS = [
  { key: "ALIADO", label: "Aliado", cor: "#4ade80" },
  { key: "INIMIGO", label: "Inimigo", cor: "#b0332c" },
  { key: "NEUTRO", label: "Neutro", cor: "#e0c060" },
];

function ladoCor(lado: string): string {
  return LADOS.find((l) => l.key === lado)?.cor ?? "#e0c060";
}
interface CharLite {
  id: string;
  name: string;
  portraitUrl: string | null;
}
interface MapData {
  map: MapCfg;
  tokens: Token[];
  viewerId: string | null;
  isMaster: boolean;
}

const POLL_MS = 4000;

export function CombatMap({
  initial,
  chars,
}: {
  initial: MapData;
  chars: CharLite[];
}) {
  const [data, setData] = useState<MapData>(initial);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(
    () => {
      const m: Record<string, { x: number; y: number }> = {};
      initial.tokens.forEach((t) => (m[t.id] = { x: t.x, y: t.y }));
      return m;
    },
  );
  const [view, setView] = useState({ scale: 1, tx: 24, ty: 24 });
  const [sel, setSel] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ficha, setFicha] = useState<FichaRapida | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [qtd, setQtd] = useState(1);

  const [bgUrlInput, setBgUrlInput] = useState(initial.map.backgroundUrl ?? "");
  const [cellInput, setCellInput] = useState(initial.map.cell);
  const [colsInput, setColsInput] = useState(initial.map.cols);
  const [rowsInput, setRowsInput] = useState(initial.map.rows);
  const [tkNome, setTkNome] = useState("");
  const [tkImg, setTkImg] = useState("");
  const [tkLado, setTkLado] = useState("INIMIGO");

  const isMaster = data.isMaster;
  const cell = data.map.cell;
  const areaW = data.map.cols * cell;
  const areaH = data.map.rows * cell;

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "pan" | "token";
    id?: string;
    canMove?: boolean;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    moved?: boolean;
  } | null>(null);
  const pinnedRef = useRef<Set<string>>(new Set());

  const puxar = useCallback(async () => {
    try {
      const res = await fetch("/api/mapa", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as MapData;
      setData(d);
      setPos((prev) => {
        const m: Record<string, { x: number; y: number }> = {};
        d.tokens.forEach((t) => {
          m[t.id] =
            pinnedRef.current.has(t.id) || dragRef.current?.id === t.id
              ? (prev[t.id] ?? { x: t.x, y: t.y })
              : { x: t.x, y: t.y };
        });
        return m;
      });
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, [puxar]);

  const zoom = useCallback((f: number, cx?: number, cy?: number) => {
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.2, v.scale * f));
      const rect = wrapRef.current?.getBoundingClientRect();
      const px = cx ?? (rect ? rect.width / 2 : 0);
      const py = cy ?? (rect ? rect.height / 2 : 0);
      const wx = (px - v.tx) / v.scale;
      const wy = (py - v.ty) / v.scale;
      return { scale, tx: px - wx * scale, ty: py - wy * scale };
    });
  }, []);

  // Zoom com a roda SOMENTE sobre o mapa (não rola a página).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoom]);

  const run = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
      setErro(null);
      const r = await fn();
      if (!r.ok) setErro(r.error ?? "Falha.");
      puxar();
    },
    [puxar],
  );

  // Delete/Backspace remove o token selecionado (que você controla).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!sel) return;
      const tk = data.tokens.find((t) => t.id === sel);
      if (!tk) return;
      if (!(isMaster || tk.ownerId === data.viewerId)) return;
      e.preventDefault();
      const id = sel;
      setSel(null);
      void run(() => removeMapToken(id));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, data, isMaster, run]);

  function worldDelta(dx: number, dy: number) {
    return { dx: dx / view.scale, dy: dy / view.scale };
  }

  function onDownToken(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    const canMove = isMaster || t.ownerId === data.viewerId;
    if (canMove) (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    dragRef.current = {
      kind: "token",
      id: t.id,
      canMove,
      startX: e.clientX,
      startY: e.clientY,
      ox: p.x,
      oy: p.y,
      moved: false,
    };
  }

  function onDownBg(e: React.PointerEvent) {
    setSel(null);
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      ox: view.tx,
      oy: view.ty,
    };
  }

  function onMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "pan") {
      setView((v) => ({
        ...v,
        tx: d.ox + (e.clientX - d.startX),
        ty: d.oy + (e.clientY - d.startY),
      }));
    } else if (d.kind === "token" && d.id && d.canMove) {
      if (Math.abs(e.clientX - d.startX) > 2 || Math.abs(e.clientY - d.startY) > 2)
        d.moved = true;
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      const id = d.id;
      setPos((m) => ({ ...m, [id]: { x: d.ox + dx, y: d.oy + dy } }));
    }
  }

  function onUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "token" && d.id) {
      if (d.canMove && d.moved) {
        const p = pos[d.id];
        if (p) {
          const sx = Math.round(p.x / cell) * cell;
          const sy = Math.round(p.y / cell) * cell;
          const id = d.id;
          setPos((m) => ({ ...m, [id]: { x: sx, y: sy } }));
          pinnedRef.current.add(id);
          setTimeout(() => pinnedRef.current.delete(id), 6000);
          void run(() => moveMapToken(id, sx, sy));
        }
      } else {
        setSel(d.id); // clique curto → seleciona
      }
    }
  }

  async function abrirFicha(characterId: string) {
    setFichaLoading(true);
    setFicha(null);
    try {
      const res = await fetch(`/api/ficha?id=${encodeURIComponent(characterId)}`, {
        cache: "no-store",
      });
      if (res.ok) setFicha((await res.json()) as FichaRapida);
      else setErro("Não foi possível abrir a ficha.");
    } catch {
      setErro("Falha ao abrir a ficha.");
    } finally {
      setFichaLoading(false);
    }
  }

  async function ajustar(dPv: number, dSan: number) {
    if (!ficha) return;
    const id = ficha.id;
    // Atualização otimista dos números no drawer.
    setFicha((f) =>
      f ? { ...f, pvAtual: f.pvAtual + dPv, sanAtual: f.sanAtual + dSan } : f,
    );
    await run(() => ajustarRecursos(id, dPv, dSan));
    void abrirFicha(id);
  }

  const jaTenhoToken = (charId: string) =>
    data.tokens.some((t) => t.characterId === charId);

  return (
    <div className="lg:flex lg:items-start lg:gap-4">
      {/* Painel de customização */}
      <aside className="mb-3 space-y-3 lg:mb-0 lg:max-h-[80vh] lg:w-80 lg:shrink-0 lg:overflow-y-auto">
        {chars.length > 0 && (
          <section className="paper paper-edge rounded-md p-3">
            <p className="label mb-2">
              {isMaster ? "Colocar personagem" : "Seus personagens"}
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {chars.map((c) => {
                const on = jaTenhoToken(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded border border-sepia/25 bg-black/[0.03] p-1.5"
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/15">
                      {c.portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.portraitUrl}
                          alt=""
                          className="h-full w-full object-cover grayscale"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-sepia/50">
                          ?
                        </span>
                      )}
                    </span>
                    <span className="typewriter min-w-0 flex-1 truncate text-sm text-sepia-ink">
                      {c.name}
                    </span>
                    <button
                      type="button"
                      className={`btn tap text-[0.7rem] ${on ? "btn-ghost" : "btn-primary"}`}
                      disabled={on}
                      onClick={() => run(() => addMyToken(c.id))}
                    >
                      {on ? "no mapa ✓" : "＋ puxar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isMaster && (
          <>
            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Campo (quadros)</p>
              <div className="flex items-end gap-2">
                <div className="w-16">
                  <label className="label">X (col)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    className="field mt-1 text-sm"
                    value={colsInput}
                    onChange={(e) => setColsInput(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="w-16">
                  <label className="label">Y (lin)</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    className="field mt-1 text-sm"
                    value={rowsInput}
                    onChange={(e) => setRowsInput(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="w-20">
                  <label className="label">Quadro px</label>
                  <input
                    type="number"
                    min={16}
                    max={240}
                    className="field mt-1 text-sm"
                    value={cellInput}
                    onChange={(e) => setCellInput(Number(e.target.value) || 64)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  onClick={() =>
                    run(() =>
                      updateMapSettings({
                        cols: colsInput,
                        rows: rowsInput,
                        cell: cellInput,
                      }),
                    )
                  }
                >
                  Gerar campo
                </button>
                <button
                  type="button"
                  className={`btn tap text-xs ${data.map.showGrid ? "btn-primary" : "btn-dark"}`}
                  onClick={() =>
                    run(() => updateMapSettings({ showGrid: !data.map.showGrid }))
                  }
                >
                  {data.map.showGrid ? "grade ✓" : "grade off"}
                </button>
              </div>
            </section>

            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Imagem de fundo</p>
              <input
                className="field text-sm"
                value={bgUrlInput}
                onChange={(e) => setBgUrlInput(e.target.value)}
                placeholder="https://… (vazio = sem imagem)"
              />
              <p className="typewriter text-[0.65rem] text-sepia-dark">
                A imagem se encaixa exatamente no campo {data.map.cols}×
                {data.map.rows}.
              </p>
              <button
                type="button"
                className="btn btn-dark tap text-xs"
                onClick={() =>
                  run(() => updateMapSettings({ backgroundUrl: bgUrlInput }))
                }
              >
                Definir fundo
              </button>
            </section>

            <section className="paper paper-edge space-y-2 rounded-md p-3">
              <p className="label">Token avulso (inimigo/PNJ)</p>
              <input
                className="field text-sm"
                value={tkNome}
                onChange={(e) => setTkNome(e.target.value)}
                placeholder="Nome"
              />
              <input
                className="field text-sm"
                value={tkImg}
                onChange={(e) => setTkImg(e.target.value)}
                placeholder="Imagem (URL, opcional)"
              />
              <div className="flex items-center gap-1">
                {LADOS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setTkLado(l.key)}
                    className={`typewriter rounded-full px-2 py-0.5 text-[0.65rem] ${tkLado === l.key ? "text-ink" : "text-sepia"}`}
                    style={{
                      background: tkLado === l.key ? l.cor : "transparent",
                      border: `1px solid ${l.cor}`,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  disabled={!tkNome.trim() && !tkImg.trim()}
                  onClick={() =>
                    run(async () => {
                      const r = await addMapTokenCustom(tkNome, tkImg, tkLado);
                      if (r.ok) {
                        setTkNome("");
                        setTkImg("");
                      }
                      return r;
                    })
                  }
                >
                  ＋ Token
                </button>
                <button
                  type="button"
                  className="btn btn-ghost tap text-xs"
                  onClick={() => {
                    if (confirm("Limpar TODOS os tokens do mapa?"))
                      run(limparTokens);
                  }}
                >
                  Limpar tokens
                </button>
              </div>
            </section>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {LADOS.map((l) => (
            <span
              key={l.key}
              className="typewriter inline-flex items-center gap-1 text-[0.65rem] text-paper/60"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: l.cor }}
              />
              {l.label}
            </span>
          ))}
        </div>
        <p className="typewriter text-[0.7rem] text-paper/45">
          Arraste seu token (encaixa na grade). Clique para selecionar: aperte{" "}
          <strong>Delete</strong> para remover ou use os pontos coloridos acima
          do token para mudar o lado. Duplo-clique abre a ficha rápida. A roda
          do mouse dá zoom só sobre o mapa.
        </p>
        {erro && <p className="typewriter text-xs text-stamp">{erro}</p>}
      </aside>

      {/* Mapa */}
      <div className="relative flex-1">
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoom(1 / 1.2)}
            className="btn btn-dark tap text-xs"
          >
            −
          </button>
          <span className="typewriter w-11 rounded bg-ink/70 text-center text-xs text-paper/80">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoom(1.2)}
            className="btn btn-dark tap text-xs"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setView({ scale: 1, tx: 24, ty: 24 })}
            className="btn btn-ghost tap text-xs"
          >
            Centralizar
          </button>
        </div>

        <div
          ref={wrapRef}
          onPointerDown={onDownBg}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="quadro relative h-[80vh] w-full touch-none overflow-hidden rounded-md"
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            }}
          >
            {/* Fundo (encaixado no campo) */}
            {data.map.backgroundUrl && (
              <div
                className="pointer-events-none absolute left-0 top-0 overflow-hidden"
                style={{ width: areaW, height: areaH }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.map.backgroundUrl}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-fill"
                />
              </div>
            )}

            {/* Grade */}
            {data.map.showGrid && (
              <div
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: areaW,
                  height: areaH,
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)",
                  backgroundSize: `${cell}px ${cell}px`,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
            )}

            {/* Tokens */}
            {data.tokens.map((t) => {
              const p = pos[t.id] ?? { x: t.x, y: t.y };
              const meu = isMaster || t.ownerId === data.viewerId;
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDownToken(e, t)}
                  onDoubleClick={() => {
                    if (t.characterId) void abrirFicha(t.characterId);
                  }}
                  title={t.characterId ? "Duplo-clique: ficha rápida" : undefined}
                  style={{ left: p.x, top: p.y, width: cell, height: cell }}
                  className={`absolute select-none ${meu ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                >
                  <div
                    className="token relative h-full w-full overflow-hidden rounded-full"
                    style={{
                      boxShadow:
                        sel === t.id
                          ? `0 0 0 3px ${ladoCor(t.lado)}, 0 0 0 6px rgba(231,220,196,0.9)`
                          : `0 0 0 3px ${ladoCor(t.lado)}`,
                    }}
                  >
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.imageUrl}
                        alt={t.nome}
                        draggable={false}
                        className="h-full w-full object-cover grayscale"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-sepia-ink text-paper-light">
                        {t.nome.slice(0, 2) || "?"}
                      </span>
                    )}
                  </div>
                  {sel === t.id && meu && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-ink/90 px-1.5 py-1 shadow"
                      style={{ top: -cell * 0.42 }}
                    >
                      {LADOS.map((l) => (
                        <button
                          key={l.key}
                          type="button"
                          onClick={() => run(() => setTokenLado(t.id, l.key))}
                          title={l.label}
                          className="h-3.5 w-3.5 rounded-full"
                          style={{
                            background: l.cor,
                            outline:
                              t.lado === l.key
                                ? "2px solid rgba(231,220,196,0.9)"
                                : "none",
                            outlineOffset: 1,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {t.nome && (
                    <div
                      className="typewriter mt-0.5 truncate text-center text-paper-light"
                      style={{ fontSize: Math.max(9, cell * 0.16) }}
                    >
                      {t.nome}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ficha rápida (duplo-clique no token) */}
      {(ficha || fichaLoading) && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-black/60"
          onClick={() => {
            setFicha(null);
            setFichaLoading(false);
          }}
        >
          <div
            className="h-full w-[min(92vw,24rem)] overflow-y-auto bg-ink/95 shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            {fichaLoading || !ficha ? (
              <p className="typewriter p-6 text-sm text-paper/60">
                Abrindo ficha…
              </p>
            ) : (
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="display text-xl text-paper-light">
                      {ficha.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className={`badge ${ficha.classe === "OCULTISTA" ? "badge-ocultista" : "badge-classe"}`}
                      >
                        {classLabel(ficha.classe)}
                      </span>
                      {ficha.subclasse && (
                        <span className="badge badge-classe">
                          {subclassLabel(ficha.subclasse)}
                        </span>
                      )}
                      <span className="badge badge-nivel">
                        {levelLabel(ficha.nivel)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFicha(null)}
                    className="rounded bg-black/40 px-2 text-paper/70"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>

                {ficha.condicoes.length > 0 && (
                  <ConditionBadges condicoes={ficha.condicoes} />
                )}

                <div className="grid grid-cols-4 gap-2">
                  {ATTRIBUTES.map((a) => {
                    const val = (ficha as unknown as Record<string, number>)[
                      a.key
                    ];
                    return (
                      <div key={a.key} className="text-center">
                        <div className="attr-stamp mx-auto flex h-12 w-12 items-center justify-center bg-paper-light">
                          <span className="typewriter text-lg">
                            {fmtSigned(val)}
                          </span>
                        </div>
                        <div className="typewriter mt-1 text-[0.6rem] text-paper/60">
                          {a.code}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 rounded-md bg-black/20 p-3">
                  <ResourceMeter
                    kind="pv"
                    current={ficha.pvAtual}
                    max={ficha.pvMax}
                  />
                  <ResourceMeter
                    kind="san"
                    current={ficha.sanAtual}
                    max={ficha.sanMax}
                  />
                  {(isMaster || ficha.ownerId === data.viewerId) && (
                    <div className="space-y-2 border-t border-sepia/25 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="label">Quantidade</span>
                        <input
                          type="number"
                          min={1}
                          className="field w-20 text-sm"
                          value={qtd}
                          onChange={(e) =>
                            setQtd(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-dark tap text-xs"
                          onClick={() => ajustar(-qtd, 0)}
                          title="Dano"
                        >
                          − PV
                        </button>
                        <button
                          type="button"
                          className="btn btn-dark tap text-xs"
                          onClick={() => ajustar(qtd, 0)}
                          title="Cura"
                        >
                          ＋ PV
                        </button>
                        <button
                          type="button"
                          className="btn btn-dark tap text-xs"
                          onClick={() => ajustar(0, -qtd)}
                          title="Perda de Sanidade"
                        >
                          − SAN
                        </button>
                        <button
                          type="button"
                          className="btn btn-dark tap text-xs"
                          onClick={() => ajustar(0, qtd)}
                          title="Recuperar Sanidade"
                        >
                          ＋ SAN
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="label mb-1">Itens</p>
                  {ficha.inventory.length === 0 ? (
                    <p className="typewriter text-xs text-paper/40">
                      Bolsos vazios.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {ficha.inventory.map((it, i) => (
                        <li
                          key={i}
                          className="typewriter border-b border-dashed border-sepia/25 py-1 text-sm text-paper"
                        >
                          — {it.nome}
                          {it.qtd > 1 ? (
                            <span className="text-paper/50"> ×{it.qtd}</span>
                          ) : null}
                          {it.dano ? (
                            <span className="ml-2 text-xs text-stamp-bright">
                              ({it.dano})
                            </span>
                          ) : null}
                          {(it.efeitoPv !== 0 || it.efeitoSan !== 0) && (
                            <span className="ml-2 text-[0.62rem] text-emerald-300">
                              {it.efeitoPv !== 0
                                ? `${it.efeitoPv > 0 ? "+" : ""}${it.efeitoPv} PV`
                                : ""}
                              {it.efeitoPv !== 0 && it.efeitoSan !== 0
                                ? " · "
                                : ""}
                              {it.efeitoSan !== 0
                                ? `${it.efeitoSan > 0 ? "+" : ""}${it.efeitoSan} SAN`
                                : ""}
                            </span>
                          )}
                          <span className="ml-2 text-[0.6rem] text-paper/40">
                            usos: {it.usos}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
