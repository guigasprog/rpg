"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addIniciativa,
  addMapTokenCustom,
  addMapTokenFromLore,
  addMyToken,
  ajustarRecursos,
  limparTokens,
  moveMapToken,
  removeMapToken,
  resizeMapToken,
  setTokenLado,
  setTokenStatus,
  updateMapSettings,
  usarItemRapido,
} from "@/lib/actions";
import {
  ATTRIBUTES,
  classLabel,
  levelLabel,
  subclassLabel,
} from "@/lib/game";
import { ResourceMeter } from "@/components/ResourceMeter";
import { ConditionBadges } from "@/components/Conditions";
import { DiceRoller } from "@/components/DiceRoller";
import { WeaponRoller } from "@/components/WeaponRoller";

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
  especialistaFocos: string[];
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
  status: string;
  size: number;
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

const STATUS = [
  { key: "", label: "Nenhum", icone: "" },
  { key: "MORTO", label: "Morto", icone: "💀" },
  { key: "INCONSCIENTE", label: "Inconsciente", icone: "😵" },
  { key: "FERIDO", label: "Ferido", icone: "🩸" },
  { key: "ENVENENADO", label: "Envenenado", icone: "🤢" },
  { key: "ATORDOADO", label: "Atordoado", icone: "💫" },
  { key: "FUGINDO", label: "Fugindo", icone: "🏃" },
  { key: "ALVO", label: "Alvo", icone: "🎯" },
];

function statusIcone(key: string): string {
  return STATUS.find((s) => s.key === key)?.icone ?? "";
}
interface CharLite {
  id: string;
  name: string;
  portraitUrl: string | null;
}
interface LoreLite {
  id: string;
  titulo: string;
  imagemUrl: string | null;
  categoria: string;
}
interface PlaceItem {
  kind: "char" | "lore";
  id: string;
  name: string;
  portraitUrl: string | null;
}
interface MapData {
  map: MapCfg;
  tokens: Token[];
  turno: string | null;
  viewerId: string | null;
  isMaster: boolean;
}

const POLL_MS = 4000;

export function CombatMap({
  initial,
  chars,
  lore = [],
}: {
  initial: MapData;
  chars: CharLite[];
  lore?: LoreLite[];
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
  const [placing, setPlacing] = useState<PlaceItem | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    initial.tokens.forEach((t) => (m[t.id] = t.size > 0 ? t.size : initial.map.cell));
    return m;
  });
  const [clip, setClip] = useState<{
    nome: string;
    imageUrl: string | null;
    lado: string;
    status: string;
    size: number;
    x: number;
    y: number;
  } | null>(null);

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
  const podeEditar =
    !!ficha && (isMaster || ficha.ownerId === data.viewerId);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "pan" | "token" | "resize";
    id?: string;
    canMove?: boolean;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    osize?: number;
    moved?: boolean;
  } | null>(null);
  const pinnedRef = useRef<Set<string>>(new Set());
  const lastTurnoRef = useRef<string | null>(null);

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
      setSizes((prev) => {
        const m: Record<string, number> = {};
        d.tokens.forEach((t) => {
          const base = t.size > 0 ? t.size : d.map.cell;
          m[t.id] =
            pinnedRef.current.has(t.id) || dragRef.current?.id === t.id
              ? (prev[t.id] ?? base)
              : base;
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

  // Foca (centraliza) o token de quem está no turno quando o turno muda.
  useEffect(() => {
    const turno = data.turno;
    if (!turno || turno === lastTurnoRef.current) return;
    lastTurnoRef.current = turno;
    const alvo = turno.trim().toLowerCase();
    const t = data.tokens.find(
      (x) => x.nome.trim() !== "" && x.nome.trim().toLowerCase() === alvo,
    );
    const el = wrapRef.current;
    if (!t || !el) return;
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    const size = t.size > 0 ? t.size : cell;
    const cx = p.x + size / 2;
    const cy = p.y + size / 2;
    const rect = el.getBoundingClientRect();
    setView((v) => ({
      ...v,
      tx: rect.width / 2 - cx * v.scale,
      ty: rect.height / 2 - cy * v.scale,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.turno, data.tokens, cell]);

  // Trava a rolagem da página enquanto a ficha rápida está aberta (o conteúdo
  // do próprio painel continua rolando).
  useEffect(() => {
    if (!ficha && !fichaLoading) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [ficha, fichaLoading]);

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

  // Ctrl+C / Ctrl+V: copiar e colar token (Mestre).
  useEffect(() => {
    if (!isMaster) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "c" && sel) {
        const t = data.tokens.find((x) => x.id === sel);
        if (!t) return;
        const p = pos[t.id] ?? { x: t.x, y: t.y };
        setClip({
          nome: t.nome,
          imageUrl: t.imageUrl,
          lado: t.lado,
          status: t.status,
          size: sizes[t.id] ?? t.size,
          x: p.x,
          y: p.y,
        });
        e.preventDefault();
      } else if (k === "v" && clip) {
        e.preventDefault();
        const nx = clip.x + cell;
        const ny = clip.y + cell;
        setClip({ ...clip, x: nx, y: ny });
        void run(() =>
          addMapTokenCustom(
            clip.nome,
            clip.imageUrl ?? "",
            clip.lado,
            nx,
            ny,
          ),
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMaster, sel, data, pos, sizes, clip, cell, run]);

  // Arrastar um card (personagem/monstro) e soltar no mapa — pointer capture
  // no próprio card garante que o "puxar" funcione até soltar.
  function iniciarPuxar(item: PlaceItem, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setPlacing(item);
    setGhost({ x: e.clientX, y: e.clientY });
  }
  function moverPuxar(e: React.PointerEvent) {
    if (placing) setGhost({ x: e.clientX, y: e.clientY });
  }
  function soltarPuxar(e: React.PointerEvent) {
    if (!placing) return;
    const item = placing;
    setPlacing(null);
    setGhost(null);
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return; // soltou fora do mapa → cancela
    const wx = (e.clientX - rect.left - view.tx) / view.scale - cell / 2;
    const wy = (e.clientY - rect.top - view.ty) / view.scale - cell / 2;
    const sx = Math.round(wx / cell) * cell;
    const sy = Math.round(wy / cell) * cell;
    void run(() =>
      item.kind === "lore"
        ? addMapTokenFromLore(item.id, sx, sy)
        : addMyToken(item.id, sx, sy),
    );
  }

  function worldDelta(dx: number, dy: number) {
    return { dx: dx / view.scale, dy: dy / view.scale };
  }

  function onDownToken(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    // Ctrl+Shift+clique: põe o token na ordem de combate (Mestre).
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (isMaster && t.nome.trim()) void run(() => addIniciativa(t.nome, 0));
      return;
    }
    // Ctrl+clique: amplia a imagem do token.
    if (e.ctrlKey || e.metaKey) {
      if (t.imageUrl) setZoomUrl(t.imageUrl);
      return;
    }
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

  function onDownResize(e: React.PointerEvent, t: Token) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      kind: "resize",
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: 0,
      oy: 0,
      osize: sizes[t.id] ?? (t.size > 0 ? t.size : cell),
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
    } else if (d.kind === "resize" && d.id) {
      const delta =
        Math.max(e.clientX - d.startX, e.clientY - d.startY) / view.scale;
      let ns = (d.osize ?? cell) + delta;
      // Sem Shift: encaixa em múltiplos do quadro. Com Shift: livre.
      ns = e.shiftKey
        ? Math.max(16, ns)
        : Math.max(cell, Math.round(ns / cell) * cell);
      const id = d.id;
      setSizes((m) => ({ ...m, [id]: ns }));
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
    } else if (d?.kind === "resize" && d.id) {
      const id = d.id;
      const s = sizes[id];
      pinnedRef.current.add(id);
      setTimeout(() => pinnedRef.current.delete(id), 6000);
      if (typeof s === "number") void run(() => resizeMapToken(id, Math.round(s)));
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
            <p className="typewriter mb-1 text-[0.65rem] text-sepia-dark">
              Arraste o card para o mapa, no lugar onde o token deve ficar.
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {chars.map((c) => {
                const on = jaTenhoToken(c.id);
                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) =>
                      iniciarPuxar(
                        {
                          kind: "char",
                          id: c.id,
                          name: c.name,
                          portraitUrl: c.portraitUrl,
                        },
                        e,
                      )
                    }
                    onPointerMove={moverPuxar}
                    onPointerUp={soltarPuxar}
                    className={`flex touch-none cursor-grab select-none items-center gap-2 rounded border border-sepia/25 bg-black/[0.03] p-1.5 active:cursor-grabbing ${placing?.kind === "char" && placing.id === c.id ? "opacity-40" : ""}`}
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/15">
                      {c.portraitUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.portraitUrl}
                          alt=""
                          draggable={false}
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
                    <span className="typewriter shrink-0 text-[0.65rem] text-sepia">
                      {on ? "no mapa ✓ ↦" : "↦ arraste"}
                    </span>
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

            {lore.length > 0 && (
              <section className="paper paper-edge rounded-md p-3">
                <p className="label mb-1">Do Livro (monstros/PNJs)</p>
                <p className="typewriter mb-1 text-[0.65rem] text-sepia-dark">
                  Arraste para o mapa.
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {lore.map((l) => (
                    <div
                      key={l.id}
                      onPointerDown={(e) =>
                        iniciarPuxar(
                          {
                            kind: "lore",
                            id: l.id,
                            name: l.titulo,
                            portraitUrl: l.imagemUrl,
                          },
                          e,
                        )
                      }
                      onPointerMove={moverPuxar}
                      onPointerUp={soltarPuxar}
                      className={`flex touch-none cursor-grab select-none items-center gap-2 rounded border border-sepia/25 bg-black/[0.03] p-1.5 active:cursor-grabbing ${placing?.kind === "lore" && placing.id === l.id ? "opacity-40" : ""}`}
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/15">
                        {l.imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.imagemUrl}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-cover grayscale"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-sepia/50">
                            ?
                          </span>
                        )}
                      </span>
                      <span className="typewriter min-w-0 flex-1 truncate text-sm text-sepia-ink">
                        {l.titulo}
                      </span>
                      <span className="typewriter shrink-0 text-[0.65rem] text-sepia">
                        ↦
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
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
          Arraste para o mapa. Clique para selecionar: <strong>Delete</strong>{" "}
          remove; a alça ◢ redimensiona (segure <strong>Shift</strong> para
          tamanho livre); os pontos e ícones acima do token mudam lado e status.
          Duplo-clique abre a ficha rápida; Ctrl+clique amplia a imagem.{" "}
          {isMaster
            ? "Ctrl+Shift+clique põe na iniciativa; Ctrl+C / Ctrl+V copia e cola. "
            : ""}
          A câmera foca quem está no turno. A roda do mouse dá zoom só sobre o
          mapa.
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
          onDoubleClick={(e) => e.preventDefault()}
          className={`quadro relative h-[80vh] w-full touch-none select-none overflow-hidden rounded-md ${placing ? "ring-2 ring-stamp-bright" : ""}`}
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
              const ehTurno =
                !!data.turno &&
                t.nome.trim() !== "" &&
                t.nome.trim().toLowerCase() === data.turno.trim().toLowerCase();
              const tsize = sizes[t.id] ?? (t.size > 0 ? t.size : cell);
              const ringos = [`0 0 0 3px ${ladoCor(t.lado)}`];
              if (sel === t.id) ringos.push("0 0 0 6px rgba(231,220,196,0.9)");
              if (ehTurno) ringos.push("0 0 18px 5px rgba(224,192,96,0.9)");
              const icone = statusIcone(t.status);
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => onDownToken(e, t)}
                  onDoubleClick={() => {
                    if (t.characterId) void abrirFicha(t.characterId);
                  }}
                  title={t.characterId ? "Duplo-clique: ficha rápida" : undefined}
                  style={{ left: p.x, top: p.y, width: tsize, height: tsize }}
                  className={`absolute select-none ${meu ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                >
                  <div
                    className={`token relative h-full w-full overflow-hidden rounded-full ${ehTurno ? "turno-pulse" : ""}`}
                    style={{ boxShadow: ringos.join(", ") }}
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
                    {t.status === "MORTO" && (
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 50% 45%, rgba(176,51,44,0.35), rgba(90,10,10,0.72))",
                          mixBlendMode: "multiply",
                        }}
                      />
                    )}
                  </div>

                  {/* Ícone de status no canto direito */}
                  {icone && (
                    <span
                      className="pointer-events-none absolute -right-1 -top-1 z-10 flex items-center justify-center rounded-full bg-ink leading-none ring-1 ring-paper-light/40"
                      style={{
                        width: Math.max(16, tsize * 0.34),
                        height: Math.max(16, tsize * 0.34),
                        fontSize: Math.max(11, tsize * 0.22),
                      }}
                    >
                      {icone}
                    </span>
                  )}

                  {/* Alça de redimensionar */}
                  {sel === t.id && meu && (
                    <span
                      onPointerDown={(e) => onDownResize(e, t)}
                      className="absolute -bottom-1 -right-1 h-4 w-4 cursor-nwse-resize rounded-sm bg-paper-light text-center text-[0.6rem] leading-4 text-ink"
                      title="Arraste para redimensionar (Shift = livre)"
                    >
                      ◢
                    </span>
                  )}

                  {/* Picker de lado + status (token selecionado) */}
                  {sel === t.id && meu && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
                      style={{ top: -tsize * 0.5 - 22 }}
                    >
                      <div className="flex gap-1 rounded-full bg-ink/90 px-1.5 py-1 shadow">
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
                      <div className="flex max-w-[168px] flex-wrap justify-center gap-0.5 rounded bg-ink/90 px-1 py-0.5 shadow">
                        {STATUS.map((s) => (
                          <button
                            key={s.key || "none"}
                            type="button"
                            onClick={() => run(() => setTokenStatus(t.id, s.key))}
                            title={s.label}
                            className={`h-5 w-5 rounded text-xs leading-5 ${t.status === s.key ? "bg-stamp/40" : ""}`}
                          >
                            {s.icone || "∅"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ehTurno && sel !== t.id && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 font-bold text-ink"
                      style={{
                        top: -tsize * 0.36,
                        background: "#e0c060",
                        fontSize: Math.max(8, cell * 0.14),
                      }}
                    >
                      ▶ turno
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

      {/* Fantasma do card sendo arrastado */}
      {placing && ghost && (
        <div
          className="pointer-events-none fixed z-[95]"
          style={{ left: ghost.x - 24, top: ghost.y - 24, width: 48, height: 48 }}
        >
          <div className="token h-full w-full overflow-hidden rounded-full opacity-85">
            {placing.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={placing.portraitUrl}
                alt=""
                className="h-full w-full object-cover grayscale"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-sepia-ink text-xs text-paper-light">
                {placing.name.slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ctrl+clique: imagem do token em tela cheia */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full object-contain grayscale"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded bg-ink/80 px-3 py-1 text-paper-light"
            onClick={() => setZoomUrl(null)}
          >
            ✕
          </button>
        </div>
      )}

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
                  {podeEditar && (
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

                {/* Rolagens e itens — painel claro (componentes de papel) */}
                <div className="paper paper-edge space-y-4 rounded-md p-3">
                  <DiceRoller
                    attrs={{
                      attrInvestigar: ficha.attrInvestigar,
                      attrCombate: ficha.attrCombate,
                      attrLabia: ficha.attrLabia,
                      attrMente: ficha.attrMente,
                    }}
                    focos={
                      ficha.classe === "ESPECIALISTA"
                        ? ficha.especialistaFocos
                        : []
                    }
                  />

                  <div>
                    <p className="label mb-1">Itens</p>
                    {ficha.inventory.length === 0 ? (
                      <p className="typewriter text-sm text-sepia-dark">
                        Bolsos vazios.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {ficha.inventory.map((it, i) => {
                          const temEfeito =
                            it.efeitoPv !== 0 || it.efeitoSan !== 0;
                          return (
                            <li
                              key={i}
                              className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-sepia/30 py-2"
                            >
                              <span className="typewriter text-sm text-sepia-ink">
                                — {it.nome}
                                {it.qtd > 1 ? (
                                  <span className="text-sepia"> ×{it.qtd}</span>
                                ) : null}
                                {temEfeito && (
                                  <span className="ml-2 text-[0.65rem] text-emerald-800">
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
                                <span className="ml-2 text-[0.6rem] text-sepia-dark">
                                  usos: {it.usos}
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                {podeEditar && it.usos > 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-primary tap px-2 py-1 text-xs"
                                    onClick={() =>
                                      run(async () => {
                                        const r = await usarItemRapido(
                                          ficha.id,
                                          i,
                                        );
                                        void abrirFicha(ficha.id);
                                        return r;
                                      })
                                    }
                                    title={
                                      temEfeito
                                        ? "Usar: aplica efeito e gasta 1 uso"
                                        : "Usar (−1 uso)"
                                    }
                                  >
                                    Usar
                                  </button>
                                )}
                                {it.dano ? (
                                  <WeaponRoller
                                    dieCode={it.dano}
                                    combate={ficha.attrCombate}
                                    advantage={ficha.classe === "COMBATENTE"}
                                    nome={it.nome}
                                  />
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
