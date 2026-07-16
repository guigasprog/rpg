"use client";

import { useEffect, useRef } from "react";

export interface Luz {
  x: number; // centro (world px)
  y: number;
  r: number; // raio em px
}

// Névoa desenhada em canvas: escurece a área e "fura" buracos suaves (degradê)
// onde há luz (lanternas/lampiões) ou células reveladas pelo Mestre.
export function FogCanvas({
  areaW,
  areaH,
  cell,
  revelado,
  luzes,
  isMaster,
}: {
  areaW: number;
  areaH: number;
  cell: number;
  revelado: string[];
  luzes: Luz[];
  isMaster: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, areaW, areaH);
    // Base: escuridão (opaca p/ jogadores, esmaecida p/ o Mestre).
    ctx.fillStyle = isMaster ? "rgba(6,5,4,0.55)" : "rgba(4,4,4,0.98)";
    ctx.fillRect(0, 0, areaW, areaH);

    // "Fura" a névoa onde há luz — degradê do centro para a borda.
    ctx.globalCompositeOperation = "destination-out";
    for (const l of luzes) {
      if (l.r <= 0) continue;
      const g = ctx.createRadialGradient(l.x, l.y, l.r * 0.25, l.x, l.y, l.r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.7, "rgba(0,0,0,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Células exploradas (reveladas pelo Mestre) ficam limpas.
    for (const key of revelado) {
      const m = /^(\d+),(\d+)$/.exec(key);
      if (!m) continue;
      const c = Number(m[1]);
      const r = Number(m[2]);
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(c * cell, r * cell, cell + 1, cell + 1);
    }
    ctx.globalCompositeOperation = "source-over";
  }, [areaW, areaH, cell, revelado, luzes, isMaster]);

  return (
    <canvas
      ref={ref}
      width={areaW}
      height={areaH}
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: areaW, height: areaH }}
    />
  );
}
