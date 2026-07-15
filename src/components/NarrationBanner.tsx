"use client";

import { useEffect, useState } from "react";

interface Narracao {
  id: string;
  texto: string;
}

const POLL_MS = 5000;

export function NarrationBanner() {
  const [narracao, setNarracao] = useState<Narracao | null>(null);
  const [dispensadoId, setDispensadoId] = useState<string | null>(null);

  async function puxar() {
    try {
      const res = await fetch("/api/narration", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { narracao: Narracao | null };
      setNarracao(data.narracao ?? null);
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

  if (!narracao || narracao.id === dispensadoId) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-[70] flex justify-center px-3">
      <div className="narracao ink-reveal relative w-full max-w-2xl rounded-md p-4 shadow-2xl sm:p-5">
        <span className="stamp absolute -top-2 left-4 text-[0.55rem]">
          Narração
        </span>
        <p className="hand-title whitespace-pre-wrap text-center text-lg leading-snug text-paper-light sm:text-xl">
          {narracao.texto}
        </p>
        <button
          type="button"
          onClick={() => setDispensadoId(narracao.id)}
          className="absolute right-2 top-2 rounded bg-black/40 px-2 text-sm text-paper/70 hover:text-paper-light"
          aria-label="Dispensar narração"
          title="Dispensar (some só para você)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
