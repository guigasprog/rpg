"use client";

import { useEffect, useState } from "react";
import {
  addIniciativa,
  avancarTurno,
  limparIniciativa,
  removerIniciativa,
} from "@/lib/actions";

interface Entry {
  id: string;
  nome: string;
  valor: number;
  atual: boolean;
}

const POLL_MS = 4000;

export function InitiativePanel({ isMaster }: { isMaster: boolean }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [busy, setBusy] = useState(false);

  async function puxar() {
    try {
      const res = await fetch("/api/initiative", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { entries: Entry[] };
      setEntries(data.entries ?? []);
    } catch {
      /* ignora */
    }
  }

  // Poll sempre (leve): abre com badge se houver combate ativo.
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

  const temCombate = entries.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`btn fixed bottom-4 left-4 z-[80] h-12 w-12 rounded-full p-0 text-xl shadow-lg ${temCombate ? "btn-primary" : "btn-dark"}`}
        title="Ordem de combate"
        aria-label="Ordem de combate"
      >
        {open ? "✕" : "⚔️"}
      </button>

      {open && (
        <div className="fixed bottom-20 left-4 z-[80] flex max-h-[70vh] w-[min(92vw,300px)] flex-col overflow-hidden rounded-md border border-sepia/50 bg-ink/95 shadow-2xl backdrop-blur">
          <div className="border-b border-sepia/30 px-3 py-2">
            <p className="display text-sm text-paper-light">Ordem de Combate</p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {entries.length === 0 ? (
              <p className="typewriter text-xs text-paper/40">
                Sem combate no momento.
              </p>
            ) : (
              <ol className="space-y-1">
                {entries.map((e, i) => (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                      e.atual
                        ? "bg-stamp/25 ring-1 ring-stamp"
                        : "bg-black/20"
                    }`}
                  >
                    <span className="typewriter text-xs text-paper">
                      <span className="text-paper/50">{i + 1}.</span> {e.nome}
                      {e.atual && (
                        <span className="ml-1 text-stamp-bright">◀ turno</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="typewriter text-xs text-paper-light">
                        {e.valor}
                      </span>
                      {isMaster && (
                        <button
                          type="button"
                          className="text-stamp"
                          onClick={() => run(() => removerIniciativa(e.id))}
                          disabled={busy}
                          aria-label={`Remover ${e.nome}`}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {isMaster && (
            <div className="space-y-2 border-t border-sepia/30 p-2">
              <div className="flex gap-1">
                <input
                  className="field text-sm"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                />
                <input
                  type="number"
                  className="field w-16 text-sm"
                  value={valor}
                  onChange={(e) => setValor(Math.trunc(Number(e.target.value) || 0))}
                  title="Iniciativa"
                />
                <button
                  type="button"
                  className="btn btn-dark text-xs"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await addIniciativa(nome, valor);
                      if (r.ok) {
                        setNome("");
                        setValor(0);
                      }
                      return r;
                    })
                  }
                >
                  +
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-primary flex-1 text-xs"
                  disabled={busy || !temCombate}
                  onClick={() => run(avancarTurno)}
                >
                  ▶ Próximo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={busy || !temCombate}
                  onClick={() => run(limparIniciativa)}
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
