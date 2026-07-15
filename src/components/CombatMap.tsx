"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMapTokenCustom,
  addMyToken,
  limparTokens,
  moveMapToken,
  removeMapToken,
  updateMapBackground,
  updateMapSettings,
} from "@/lib/actions";

interface MapCfg {
  id: string;
  backgroundUrl: string | null;
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
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
  const [bg, setBg] = useState({
    x: initial.map.bgX,
    y: initial.map.bgY,
    w: initial.map.bgW,
    h: initial.map.bgH,
  });
  const [view, setView] = useState({ scale: 1, tx: 20, ty: 20 });
  const [bgEdit, setBgEdit] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Controles do Mestre
  const [bgUrlInput, setBgUrlInput] = useState(initial.map.backgroundUrl ?? "");
  const [cellInput, setCellInput] = useState(initial.map.cell);
  const [tkNome, setTkNome] = useState("");
  const [tkImg, setTkImg] = useState("");
  const [selChar, setSelChar] = useState(chars[0]?.id ?? "");

  const isMaster = data.isMaster;
  const cell = data.map.cell;

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "pan" | "token" | "bgmove" | "bgresize";
    id?: string;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
    ow?: number;
    oh?: number;
  } | null>(null);
  const pinnedRef = useRef<Set<string>>(new Set());
  const bgPinRef = useRef(false);

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
      if (!bgPinRef.current && dragRef.current?.kind !== "bgmove" && dragRef.current?.kind !== "bgresize") {
        setBg({ x: d.map.bgX, y: d.map.bgY, w: d.map.bgW, h: d.map.bgH });
      }
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, [puxar]);

  function worldDelta(dx: number, dy: number) {
    return { dx: dx / view.scale, dy: dy / view.scale };
  }

  function onDownToken(e: React.PointerEvent, t: Token) {
    if (!(isMaster || t.ownerId === data.viewerId)) return; // só arrasta o seu
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[t.id] ?? { x: t.x, y: t.y };
    dragRef.current = {
      kind: "token",
      id: t.id,
      startX: e.clientX,
      startY: e.clientY,
      ox: p.x,
      oy: p.y,
    };
  }

  function onDownBg(e: React.PointerEvent) {
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      ox: view.tx,
      oy: view.ty,
    };
  }

  function onDownBgMove(e: React.PointerEvent) {
    if (!bgEdit) return;
    e.stopPropagation();
    bgPinRef.current = true;
    dragRef.current = {
      kind: "bgmove",
      startX: e.clientX,
      startY: e.clientY,
      ox: bg.x,
      oy: bg.y,
    };
  }

  function onDownBgResize(e: React.PointerEvent) {
    e.stopPropagation();
    bgPinRef.current = true;
    dragRef.current = {
      kind: "bgresize",
      startX: e.clientX,
      startY: e.clientY,
      ox: bg.x,
      oy: bg.y,
      ow: bg.w,
      oh: bg.h,
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
    } else if (d.kind === "token" && d.id) {
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      const id = d.id;
      setPos((m) => ({ ...m, [id]: { x: d.ox + dx, y: d.oy + dy } }));
    } else if (d.kind === "bgmove") {
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      setBg((b) => ({ ...b, x: d.ox + dx, y: d.oy + dy }));
    } else if (d.kind === "bgresize") {
      const { dx, dy } = worldDelta(e.clientX - d.startX, e.clientY - d.startY);
      setBg((b) => ({
        ...b,
        w: Math.max(40, (d.ow ?? b.w) + dx),
        h: Math.max(40, (d.oh ?? b.h) + dy),
      }));
    }
  }

  function onUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "token" && d.id) {
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
    } else if (d?.kind === "bgmove" || d?.kind === "bgresize") {
      const rect = { ...bg };
      void run(() =>
        updateMapBackground(
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.w),
          Math.round(rect.h),
        ),
      );
      setTimeout(() => (bgPinRef.current = false), 3000);
    }
  }

  function zoom(f: number, cx?: number, cy?: number) {
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.25, v.scale * f));
      const rect = wrapRef.current?.getBoundingClientRect();
      const px = cx ?? (rect ? rect.width / 2 : 0);
      const py = cy ?? (rect ? rect.height / 2 : 0);
      const wx = (px - v.tx) / v.scale;
      const wy = (py - v.ty) / v.scale;
      return { scale, tx: px - wx * scale, ty: py - wy * scale };
    });
  }

  function onWheel(e: React.WheelEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    zoom(
      e.deltaY < 0 ? 1.12 : 1 / 1.12,
      rect ? e.clientX - rect.left : undefined,
      rect ? e.clientY - rect.top : undefined,
    );
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErro(null);
    const r = await fn();
    if (!r.ok) setErro(r.error ?? "Falha.");
    puxar();
  }

  const jaTenhoToken = (charId: string) =>
    data.tokens.some((t) => t.characterId === charId);

  return (
    <div className="space-y-3">
      {/* Barra de ferramentas */}
      <div className="paper paper-edge space-y-2 rounded-md p-3">
        <div className="flex flex-wrap items-center gap-2">
          {chars.length > 0 && (
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
                {jaTenhoToken(selChar) ? "token no mapa ✓" : "＋ Colocar token"}
              </button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoom(1 / 1.2)}
              className="btn btn-dark tap text-xs"
            >
              −
            </button>
            <span className="typewriter w-12 text-center text-xs text-sepia-dark">
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
              onClick={() => setView({ scale: 1, tx: 20, ty: 20 })}
              className="btn btn-ghost tap text-xs"
            >
              Centralizar
            </button>
          </div>
        </div>

        {isMaster && (
          <div className="flex flex-wrap items-end gap-2 border-t border-sepia/25 pt-2">
            <div className="min-w-[10rem] flex-1">
              <label className="label">Imagem de fundo (URL)</label>
              <input
                className="field mt-1 text-sm"
                value={bgUrlInput}
                onChange={(e) => setBgUrlInput(e.target.value)}
                placeholder="https://… (deixe vazio p/ sem imagem)"
              />
            </div>
            <button
              type="button"
              className="btn btn-dark tap text-xs"
              onClick={() =>
                run(() => updateMapSettings({ backgroundUrl: bgUrlInput }))
              }
            >
              Definir fundo
            </button>
            <div className="w-24">
              <label className="label">Célula (px)</label>
              <input
                type="number"
                min={16}
                max={240}
                className="field mt-1 text-sm"
                value={cellInput}
                onChange={(e) => setCellInput(Number(e.target.value) || 64)}
              />
            </div>
            <button
              type="button"
              className="btn btn-dark tap text-xs"
              onClick={() => run(() => updateMapSettings({ cell: cellInput }))}
            >
              Aplicar
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
            <button
              type="button"
              className={`btn tap text-xs ${bgEdit ? "btn-primary" : "btn-dark"}`}
              onClick={() => setBgEdit((v) => !v)}
              title="Mover/esticar a imagem de fundo"
            >
              {bgEdit ? "✓ editando fundo" : "✥ Mover/esticar fundo"}
            </button>
          </div>
        )}

        {isMaster && (
          <div className="flex flex-wrap items-end gap-2 border-t border-sepia/25 pt-2">
            <div className="w-32">
              <label className="label">Token avulso</label>
              <input
                className="field mt-1 text-sm"
                value={tkNome}
                onChange={(e) => setTkNome(e.target.value)}
                placeholder="Nome"
              />
            </div>
            <div className="min-w-[8rem] flex-1">
              <label className="label">Imagem (URL, opcional)</label>
              <input
                className="field mt-1 text-sm"
                value={tkImg}
                onChange={(e) => setTkImg(e.target.value)}
                placeholder="https://…"
              />
            </div>
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
        )}
      </div>
      {erro && <p className="typewriter text-xs text-stamp">{erro}</p>}

      {/* Mapa */}
      <div
        ref={wrapRef}
        onPointerDown={onDownBg}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onWheel={onWheel}
        className="quadro relative h-[74vh] w-full touch-none overflow-hidden rounded-md"
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          }}
        >
          {/* Fundo */}
          {data.map.backgroundUrl && (
            <div
              onPointerDown={onDownBgMove}
              className={`absolute overflow-hidden ${bgEdit ? "cursor-move ring-2 ring-stamp" : "pointer-events-none"}`}
              style={{ left: bg.x, top: bg.y, width: bg.w, height: bg.h }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.map.backgroundUrl}
                alt=""
                draggable={false}
                className="h-full w-full object-fill"
              />
              {bgEdit && (
                <span
                  onPointerDown={onDownBgResize}
                  className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize bg-stamp"
                  title="Esticar"
                />
              )}
            </div>
          )}

          {/* Grade */}
          {data.map.showGrid && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: bg.x,
                top: bg.y,
                width: bg.w,
                height: bg.h,
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)",
                backgroundSize: `${cell}px ${cell}px`,
                border: "1px solid rgba(255,255,255,0.18)",
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
                className={`absolute select-none ${meu ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                <div className="token relative h-full w-full overflow-hidden rounded-full">
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
                  {meu && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => run(() => removeMapToken(t.id))}
                      className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-stamp text-[0.55rem] leading-none text-paper-light"
                      aria-label={`Remover ${t.nome}`}
                    >
                      ✕
                    </button>
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
      <p className="typewriter text-[0.7rem] text-paper/40">
        Arraste seu token (encaixa na grade); arraste o fundo para andar; scroll
        ou +/− para o zoom.{" "}
        {isMaster
          ? "Use “Mover/esticar fundo” para posicionar a imagem do mapa."
          : ""}
      </p>
    </div>
  );
}
