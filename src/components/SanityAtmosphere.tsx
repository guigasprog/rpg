"use client";

import { useEffect, useState } from "react";

const POLL_MS = 6000;

// Overlay que reage à Sanidade baixa do jogador: escurece as bordas e, no
// fundo do poço, pulsa/treme de leve. Não intercepta cliques.
export function SanityAtmosphere() {
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    let vivo = true;
    async function puxar() {
      try {
        const res = await fetch("/api/sanity", { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as { ratio: number };
        if (vivo) setRatio(typeof d.ratio === "number" ? d.ratio : 1);
      } catch {
        /* ignora */
      }
    }
    puxar();
    const t = setInterval(puxar, POLL_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  // Começa a pesar abaixo de 50% e satura perto de 0 (ou negativo).
  const intensidade = ratio >= 0.5 ? 0 : Math.min(1, (0.5 - ratio) / 0.5);
  if (intensidade <= 0.01) return null;
  const critico = intensidade > 0.75;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[45] ${critico ? "sanidade-critica" : ""}`}
      style={{
        opacity: 0.35 + intensidade * 0.5,
        background: `radial-gradient(circle at 50% 45%, transparent ${58 - intensidade * 30}%, rgba(6,5,4,${0.55 + intensidade * 0.4}) 100%)`,
      }}
    />
  );
}
