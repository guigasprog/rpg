"use client";

import { useEffect, useRef } from "react";

export interface Luz {
  x: number; // centro (world px)
  y: number;
  r: number; // raio/alcance em px
  cor: string; // cor do brilho (#rrggbb)
  cone: boolean; // true = lanterna (cone na direção dir)
  dir: number; // direção em graus (0 = para cima), usada só no cone
}

const CONE_ANG = 68; // abertura do cone (graus)

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [242, 215, 154];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Névoa em canvas: escurece a área e "fura" buracos suaves (degradê) onde há
// luz — radial (lampião/objeto) ou em cone (lanterna, na direção do token).
// Também tinge de leve a área iluminada com a cor do brilho.
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
    ctx.fillStyle = isMaster ? "rgba(6,5,4,0.55)" : "rgb(2,2,3)";
    ctx.fillRect(0, 0, areaW, areaH);

    function caminhoLuz(l: Luz) {
      ctx!.beginPath();
      if (l.cone) {
        const a = ((l.dir - 90) * Math.PI) / 180;
        const half = ((CONE_ANG / 2) * Math.PI) / 180;
        ctx!.moveTo(l.x, l.y);
        ctx!.arc(l.x, l.y, l.r, a - half, a + half);
        ctx!.closePath();
      } else {
        ctx!.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      }
    }

    // Revela (fura a névoa) com degradê.
    for (const l of luzes) {
      if (l.r <= 0) continue;
      ctx.save();
      caminhoLuz(l);
      ctx.clip();
      ctx.globalCompositeOperation = "destination-out";
      const g = ctx.createRadialGradient(l.x, l.y, l.r * 0.2, l.x, l.y, l.r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.7, "rgba(0,0,0,0.82)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      ctx.restore();
    }

    // Células exploradas (reveladas pelo Mestre) ficam limpas.
    ctx.globalCompositeOperation = "destination-out";
    for (const key of revelado) {
      const m = /^(\d+),(\d+)$/.exec(key);
      if (!m) continue;
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(Number(m[1]) * cell, Number(m[2]) * cell, cell + 1, cell + 1);
    }

    // Tinge de leve a área iluminada com a cor do brilho.
    ctx.globalCompositeOperation = "source-over";
    for (const l of luzes) {
      if (l.r <= 0) continue;
      const [r, gg, b] = hexRgb(l.cor);
      ctx.save();
      caminhoLuz(l);
      ctx.clip();
      const g = ctx.createRadialGradient(l.x, l.y, l.r * 0.15, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(${r},${gg},${b},0.28)`);
      g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      ctx.restore();
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
