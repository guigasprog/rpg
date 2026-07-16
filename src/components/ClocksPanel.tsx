"use client";

import { useEffect, useState } from "react";
import {
  avancarClock,
  createClock,
  deleteClock,
  setClockVisivel,
} from "@/lib/actions";

interface Clock {
  id: string;
  titulo: string;
  segmentos: number;
  preenchido: number;
  visivel: boolean;
}

const POLL_MS = 5000;

// Mostrador de relógio (rosca segmentada).
function ClockDial({ seg, fill, size = 46 }: { seg: number; fill: number; size?: number }) {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const raio = r - 3;
  const wedge = (i: number) => {
    const a0 = (i / seg) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / seg) * 2 * Math.PI - Math.PI / 2;
    const x0 = cx + raio * Math.cos(a0);
    const y0 = cy + raio * Math.sin(a0);
    const x1 = cx + raio * Math.cos(a1);
    const y1 = cy + raio * Math.sin(a1);
    return `M ${cx} ${cy} L ${x0} ${y0} A ${raio} ${raio} 0 0 1 ${x1} ${y1} Z`;
  };
  return (
    <svg width={size} height={size} className="shrink-0">
      {Array.from({ length: seg }, (_, i) => (
        <path
          key={i}
          d={wedge(i)}
          fill={i < fill ? "rgba(176,51,44,0.85)" : "rgba(217,203,172,0.10)"}
          stroke="rgba(217,203,172,0.5)"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}

export function ClocksPanel({ isMaster }: { isMaster: boolean }) {
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [aberto, setAberto] = useState(true);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoSeg, setNovoSeg] = useState(6);
  const [busy, setBusy] = useState(false);

  async function puxar() {
    try {
      const res = await fetch("/api/clocks", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as { clocks: Clock[] };
      setClocks(d.clocks ?? []);
    } catch {
      /* ignora */
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    puxar();
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, []);

  async function run(fn: () => Promise<{ ok: boolean }>) {
    setBusy(true);
    await fn();
    setBusy(false);
    puxar();
  }

  // Nada a mostrar para jogadores sem relógios revelados.
  if (!isMaster && clocks.length === 0) return null;

  return (
    <div className="fixed left-3 top-16 z-[60] w-[min(88vw,220px)]">
      <div className="overflow-hidden rounded-md border border-sepia/50 bg-ink/90 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex w-full items-center justify-between px-2 py-1.5"
        >
          <span className="display text-xs text-paper-light">🕛 Relógios</span>
          <span className="typewriter text-[0.6rem] text-paper/50">
            {aberto ? "▲" : "▼"}
          </span>
        </button>

        {aberto && (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto px-2 pb-2">
            {clocks.length === 0 && (
              <p className="typewriter text-[0.65rem] text-paper/40">
                Nenhum relógio.
              </p>
            )}
            {clocks.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 rounded border p-1.5 ${c.visivel ? "border-sepia/40" : "border-sepia/20 opacity-70"}`}
              >
                <ClockDial seg={c.segmentos} fill={c.preenchido} />
                <div className="min-w-0 flex-1">
                  <p className="typewriter truncate text-xs text-paper-light">
                    {c.titulo}
                  </p>
                  <p className="typewriter text-[0.6rem] text-paper/50">
                    {c.preenchido}/{c.segmentos}
                    {isMaster && !c.visivel ? " · oculto" : ""}
                  </p>
                  {isMaster && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-dark px-1.5 py-0 text-[0.65rem]"
                        disabled={busy}
                        onClick={() => run(() => avancarClock(c.id, -1))}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary px-1.5 py-0 text-[0.65rem]"
                        disabled={busy}
                        onClick={() => run(() => avancarClock(c.id, 1))}
                      >
                        ＋
                      </button>
                      <button
                        type="button"
                        className={`btn px-1.5 py-0 text-[0.65rem] ${c.visivel ? "btn-primary" : "btn-dark"}`}
                        disabled={busy}
                        onClick={() => run(() => setClockVisivel(c.id, !c.visivel))}
                        title={c.visivel ? "Ocultar da mesa" : "Revelar à mesa"}
                      >
                        {c.visivel ? "👁" : "🙈"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-1.5 py-0 text-[0.65rem]"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Apagar o relógio "${c.titulo}"?`))
                            run(() => deleteClock(c.id));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isMaster && (
              <div className="space-y-1 border-t border-sepia/30 pt-2">
                <input
                  className="field text-xs"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  placeholder="Novo relógio (ex.: O ritual)"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={2}
                    max={12}
                    className="field w-14 text-xs"
                    value={novoSeg}
                    onChange={(e) =>
                      setNovoSeg(Math.max(2, Math.min(12, Number(e.target.value) || 6)))
                    }
                    title="Segmentos"
                  />
                  <button
                    type="button"
                    className="btn btn-dark flex-1 text-[0.65rem]"
                    disabled={busy || !novoTitulo.trim()}
                    onClick={() =>
                      run(async () => {
                        const r = await createClock(novoTitulo, novoSeg);
                        if (r.ok) setNovoTitulo("");
                        return r;
                      })
                    }
                  >
                    ＋ Criar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
