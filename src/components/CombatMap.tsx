"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMapTokenCustom,
  addMyToken,
  limparTokens,
  moveMapToken,
  removeMapToken,
  updateMapSettings,
} from "@/lib/actions";

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
  x: number;
  y: number;
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

  const [bgUrlInput, setBgUrlInput] = useState(initial.map.backgroundUrl ?? "");
  const [cellInput, setCellInput] = useState(initial.map.cell);
  const [colsInput, setColsInput] = useState(initial.map.cols);
  const [rowsInput, setRowsInput] = useState(initial.map.rows);
  const [tkNome, setTkNome] = useState("");
  const [tkImg, setTkImg] = useState("");
  const [selChar, setSelChar] = useState(chars[0]?.id ?? "");

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

  const jaTenhoToken = (charId: string) =>
    data.tokens.some((t) => t.characterId === charId);

  return (
    <div className="lg:flex lg:items-start lg:gap-4">
      {/* Painel de customização */}
      <aside className="mb-3 space-y-3 lg:mb-0 lg:max-h-[80vh] lg:w-80 lg:shrink-0 lg:overflow-y-auto">
        {chars.length > 0 && (
          <section className="paper paper-edge rounded-md p-3">
            <p className="label mb-1">Seu token</p>
            <div className="flex items-center gap-1">
              {chars.length > 1 && (
                <select
                  className="field text-sm"
                  value={selChar}
                  onChange={(e) => setSelChar(e.target.value)}
                >
                  {chars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="btn btn-primary tap text-xs"
                disabled={!selChar || jaTenhoToken(selChar)}
                onClick={() => run(() => addMyToken(selChar))}
              >
                {jaTenhoToken(selChar) ? "no mapa ✓" : "＋ Colocar"}
              </button>
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark tap text-xs"
                  disabled={!tkNome.trim() && !tkImg.trim()}
                  onClick={() =>
                    run(async () => {
                      const r = await addMapTokenCustom(tkNome, tkImg);
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

        <p className="typewriter text-[0.7rem] text-paper/45">
          Arraste seu token (encaixa na grade). Clique num token e aperte{" "}
          <strong>Delete</strong> para removê-lo. Arraste o fundo para andar; a
          roda do mouse dá zoom só sobre o mapa.
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
                  style={{ left: p.x, top: p.y, width: cell, height: cell }}
                  className={`absolute select-none ${meu ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                >
                  <div
                    className={`token relative h-full w-full overflow-hidden rounded-full ${sel === t.id ? "ring-2 ring-stamp-bright" : ""}`}
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
    </div>
  );
}
