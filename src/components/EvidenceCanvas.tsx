"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEvidenceNote,
  deleteEvidenceLink,
  deleteEvidenceNote,
  linkEvidence,
  moveEvidence,
  updateEvidenceLink,
} from "@/lib/actions";

interface Ev {
  id: string;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  x: number;
  y: number;
}
interface Note {
  id: string;
  evidenceId: string;
  autorId: string | null;
  autorNome: string;
  texto: string;
  contra: boolean;
  createdAt: string;
}
interface Link {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  autorId: string | null;
}
interface Board {
  evidences: Ev[];
  notes: Note[];
  links: Link[];
  viewerId: string | null;
  isMaster: boolean;
}

const CARD_W = 190;
const ANCHOR_X = CARD_W / 2;
const ANCHOR_Y = 46; // ponto de ancoragem do barbante no cartão
const POLL_MS = 4000;

// Posição padrão em grade para provas ainda sem coordenada (x=y=0).
function seedPos(ev: Ev, i: number) {
  if (ev.x !== 0 || ev.y !== 0) return { x: ev.x, y: ev.y };
  const col = i % 4;
  const row = Math.floor(i / 4);
  return { x: 40 + col * 220, y: 40 + row * 210 };
}

export function EvidenceCanvas({ initial }: { initial: Board }) {
  const [board, setBoard] = useState<Board>(initial);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(
    () => {
      const m: Record<string, { x: number; y: number }> = {};
      initial.evidences.forEach((e, i) => (m[e.id] = seedPos(e, i)));
      return m;
    },
  );
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [mode, setMode] = useState<"mover" | "ligar">("mover");
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null); // painel de anotações
  const [erro, setErro] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "card" | "pan";
    id?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const pinnedRef = useRef<Set<string>>(new Set());

  const puxar = useCallback(async () => {
    try {
      const res = await fetch("/api/provas", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Board;
      setBoard(data);
      setPos((prev) => {
        const m: Record<string, { x: number; y: number }> = {};
        data.evidences.forEach((e, i) => {
          if (pinnedRef.current.has(e.id) || dragRef.current?.id === e.id) {
            m[e.id] = prev[e.id] ?? seedPos(e, i);
          } else {
            m[e.id] = seedPos(e, i);
          }
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

  function screenToWorldDelta(dxScreen: number, dyScreen: number) {
    return { dx: dxScreen / view.scale, dy: dyScreen / view.scale };
  }

  function onPointerDownCard(e: React.PointerEvent, id: string) {
    if (mode === "ligar") {
      e.stopPropagation();
      if (!linkFrom) {
        setLinkFrom(id);
      } else if (linkFrom !== id) {
        const label = window.prompt(
          "Que fato esta ligação prova? (opcional)",
          "",
        );
        const from = linkFrom;
        setLinkFrom(null);
        void run(() => linkEvidence(from, id, label ?? ""));
      } else {
        setLinkFrom(null);
      }
      return;
    }
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pos[id] ?? { x: 0, y: 0 };
    dragRef.current = {
      kind: "card",
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: p.x,
      origY: p.y,
    };
  }

  function onPointerDownBg(e: React.PointerEvent) {
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      origX: view.tx,
      origY: view.ty,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "pan") {
      setView((v) => ({
        ...v,
        tx: d.origX + (e.clientX - d.startX),
        ty: d.origY + (e.clientY - d.startY),
      }));
    } else if (d.kind === "card" && d.id) {
      const { dx, dy } = screenToWorldDelta(
        e.clientX - d.startX,
        e.clientY - d.startY,
      );
      const id = d.id;
      setPos((m) => ({ ...m, [id]: { x: d.origX + dx, y: d.origY + dy } }));
    }
  }

  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "card" && d.id) {
      const p = pos[d.id];
      if (p && (Math.abs(p.x - d.origX) > 2 || Math.abs(p.y - d.origY) > 2)) {
        const id = d.id;
        pinnedRef.current.add(id);
        setTimeout(() => pinnedRef.current.delete(id), 6000);
        void run(() => moveEvidence(id, Math.round(p.x), Math.round(p.y)));
      } else if (d.id && mode === "mover") {
        // clique curto sem arrastar → abre anotações
        setAberto(d.id);
      }
    }
  }

  function zoom(fator: number, cx?: number, cy?: number) {
    setView((v) => {
      const scale = Math.min(2.2, Math.max(0.35, v.scale * fator));
      const rect = wrapRef.current?.getBoundingClientRect();
      const px = cx ?? (rect ? rect.width / 2 : 0);
      const py = cy ?? (rect ? rect.height / 2 : 0);
      // mantém o ponto sob o cursor fixo ao dar zoom
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

  const evAberta = board.evidences.find((e) => e.id === aberto) ?? null;
  const notasAbertas = board.notes.filter((n) => n.evidenceId === aberto);

  function anchor(id: string, i: number) {
    const p = pos[id] ?? seedPos(board.evidences[i], i);
    return { x: p.x + ANCHOR_X, y: p.y + ANCHOR_Y };
  }

  return (
    <div className="space-y-3">
      {/* Barra */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("mover");
              setLinkFrom(null);
            }}
            className={`btn tap text-xs ${mode === "mover" ? "btn-primary" : "btn-dark"}`}
          >
            ✋ Mover
          </button>
          <button
            type="button"
            onClick={() => setMode("ligar")}
            className={`btn tap text-xs ${mode === "ligar" ? "btn-primary" : "btn-dark"}`}
            title="Ligue duas provas com barbante para amarrar um fato"
          >
            🧵 Ligar
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoom(1 / 1.2)}
            className="btn btn-dark tap text-xs"
            aria-label="Afastar"
          >
            −
          </button>
          <span className="typewriter w-12 text-center text-xs text-paper/60">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoom(1.2)}
            className="btn btn-dark tap text-xs"
            aria-label="Aproximar"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
            className="btn btn-ghost tap text-xs"
          >
            Centralizar
          </button>
        </div>
      </div>
      {mode === "ligar" && (
        <p className="typewriter text-xs text-stamp">
          {linkFrom
            ? "Agora clique na segunda prova para amarrar o fato."
            : "Clique na primeira prova a ligar."}
        </p>
      )}
      {erro && <p className="typewriter text-xs text-stamp">{erro}</p>}

      {/* Canvas */}
      <div
        ref={wrapRef}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        className="quadro relative h-[70vh] w-full touch-none overflow-hidden rounded-md"
      >
        {board.evidences.length === 0 && (
          <p className="typewriter absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-paper/50">
            Nada no quadro ainda. O Mestre revela as provas.
          </p>
        )}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          }}
        >
          {/* Barbante (ligações) */}
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={1}
            height={1}
          >
            {board.links.map((l) => {
              const iFrom = board.evidences.findIndex((e) => e.id === l.fromId);
              const iTo = board.evidences.findIndex((e) => e.id === l.toId);
              if (iFrom < 0 || iTo < 0) return null;
              const a = anchor(l.fromId, iFrom);
              const b = anchor(l.toId, iTo);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={l.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(176,51,44,0.85)"
                    strokeWidth={2}
                  />
                  {l.label && (
                    <text
                      x={mx}
                      y={my - 4}
                      textAnchor="middle"
                      className="fill-paper-light"
                      style={{ fontSize: 12, paintOrder: "stroke" }}
                      stroke="rgba(10,9,8,0.9)"
                      strokeWidth={4}
                    >
                      {l.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Botões das ligações (editar/remover) no ponto médio */}
          {board.links.map((l) => {
            const iFrom = board.evidences.findIndex((e) => e.id === l.fromId);
            const iTo = board.evidences.findIndex((e) => e.id === l.toId);
            if (iFrom < 0 || iTo < 0) return null;
            const a = anchor(l.fromId, iFrom);
            const b = anchor(l.toId, iTo);
            return (
              <button
                key={`btn-${l.id}`}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  const novo = window.prompt(
                    "Fato desta ligação (vazio p/ manter). Digite APAGAR para remover.",
                    l.label,
                  );
                  if (novo === null) return;
                  if (novo.trim().toUpperCase() === "APAGAR")
                    void run(() => deleteEvidenceLink(l.id));
                  else void run(() => updateEvidenceLink(l.id, novo));
                }}
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stamp text-[0.55rem] leading-none text-paper-light"
                style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 + 6 }}
                title="Editar/remover ligação"
              >
                ✎
              </button>
            );
          })}

          {/* Cartões de prova */}
          {board.evidences.map((e, i) => {
            const p = pos[e.id] ?? seedPos(e, i);
            const nNotas = board.notes.filter(
              (n) => n.evidenceId === e.id,
            ).length;
            const selecionada = linkFrom === e.id;
            return (
              <div
                key={e.id}
                onPointerDown={(ev) => onPointerDownCard(ev, e.id)}
                style={{ left: p.x, top: p.y, width: CARD_W }}
                className={`prova-card absolute select-none rounded-md p-2 ${
                  mode === "mover" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                } ${selecionada ? "ring-2 ring-stamp" : ""}`}
              >
                <div className="pin" />
                {e.imagemUrl && (
                  <div className="mb-1 aspect-[4/3] w-full overflow-hidden rounded bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imagemUrl}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover grayscale"
                    />
                  </div>
                )}
                <p className="display text-sm leading-tight text-sepia-ink">
                  {e.titulo}
                </p>
                {e.descricao && (
                  <p className="typewriter mt-0.5 line-clamp-3 text-[0.68rem] leading-snug text-sepia">
                    {e.descricao}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between">
                  <span className="typewriter text-[0.6rem] text-sepia-dark">
                    {nNotas > 0 ? `📝 ${nNotas}` : ""}
                  </span>
                  {mode === "mover" && (
                    <button
                      type="button"
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onClick={() => setAberto(e.id)}
                      className="typewriter text-[0.6rem] text-stamp underline"
                    >
                      anotações
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="typewriter text-[0.7rem] text-paper/40">
        Arraste os cartões para organizar; arraste o fundo para andar pelo
        quadro; scroll ou +/− para o zoom. Ligações e anotações são
        compartilhadas com a mesa.
      </p>

      {/* Painel de anotações */}
      {evAberta && (
        <NotasDrawer
          ev={evAberta}
          notas={notasAbertas}
          viewerId={board.viewerId}
          isMaster={board.isMaster}
          onClose={() => setAberto(null)}
          onChange={puxar}
          onErro={setErro}
        />
      )}
    </div>
  );
}

function NotasDrawer({
  ev,
  notas,
  viewerId,
  isMaster,
  onClose,
  onChange,
  onErro,
}: {
  ev: Ev;
  notas: Note[];
  viewerId: string | null;
  isMaster: boolean;
  onClose: () => void;
  onChange: () => void;
  onErro: (s: string | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [contra, setContra] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add() {
    const t = texto.trim();
    if (!t || busy) return;
    setBusy(true);
    onErro(null);
    const r = await addEvidenceNote(ev.id, t, contra);
    setBusy(false);
    if (!r.ok) {
      onErro(r.error ?? "Falha.");
      return;
    }
    setTexto("");
    setContra(false);
    onChange();
  }

  async function del(id: string) {
    setBusy(true);
    const r = await deleteEvidenceNote(id);
    setBusy(false);
    if (!r.ok) onErro(r.error ?? "Falha.");
    else onChange();
  }

  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="flex h-full w-[min(92vw,26rem)] flex-col bg-ink/95 shadow-2xl backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-sepia/30 p-4">
          <div className="min-w-0">
            <h3 className="display text-lg text-paper-light">{ev.titulo}</h3>
            {ev.descricao && (
              <p className="typewriter mt-1 whitespace-pre-wrap text-xs text-paper/70">
                {ev.descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-black/40 px-2 text-paper/70"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {ev.imagemUrl && (
          <div className="border-b border-sepia/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ev.imagemUrl}
              alt=""
              className="max-h-40 w-full rounded object-contain grayscale"
            />
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          <p className="label">Anotações da mesa</p>
          {notas.length === 0 && (
            <p className="typewriter text-xs text-paper/40">
              Ninguém anotou nada aqui ainda.
            </p>
          )}
          {notas.map((n) => (
            <div
              key={n.id}
              className={`rounded border p-2 ${
                n.contra
                  ? "border-stamp/60 bg-stamp/10"
                  : "border-sepia/30 bg-black/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="typewriter text-[0.62rem] text-paper/50">
                  {n.contra ? "✖ desmente · " : "＋ acrescenta · "}
                  {n.autorNome}
                </span>
                {(isMaster || n.autorId === viewerId) && (
                  <button
                    type="button"
                    onClick={() => del(n.id)}
                    disabled={busy}
                    className="text-stamp"
                    aria-label="Apagar anotação"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="typewriter mt-0.5 whitespace-pre-wrap text-sm text-paper">
                {n.texto}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-sepia/30 p-3">
          <textarea
            className="field text-sm"
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Acrescente uma informação ou desminta esta prova…"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="typewriter flex items-center gap-1 text-xs text-paper/70">
              <input
                type="checkbox"
                checked={contra}
                onChange={(e) => setContra(e.target.checked)}
              />
              desmentir / contradizer
            </label>
            <button
              type="button"
              className="btn btn-primary tap text-xs"
              onClick={add}
              disabled={busy || !texto.trim()}
            >
              Anotar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
