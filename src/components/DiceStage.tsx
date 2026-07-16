"use client";

import { useEffect, useState } from "react";

export interface StageData {
  dados: number[];
  total: number;
  label: string;
  resultado: string;
  tom: "ok" | "parcial" | "ruim" | "crit" | "critfail";
}

const TOM_COR: Record<StageData["tom"], string> = {
  ok: "text-emerald-300",
  parcial: "text-amber-300",
  ruim: "text-stamp-bright",
  crit: "text-emerald-300",
  critfail: "text-stamp-bright",
};

// Overlay central: gira os dados e revela o resultado. Auto-dispensa.
export function DiceStage({
  data,
  onClose,
}: {
  data: StageData | null;
  onClose: () => void;
}) {
  const [girando, setGirando] = useState(true);

  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGirando(true);
    const t1 = setTimeout(() => setGirando(false), 850);
    const t2 = setTimeout(onClose, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data, onClose]);

  if (!data) return null;
  const critico = data.tom === "crit" || data.tom === "critfail";

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-3">
          {data.dados.map((d, i) => (
            <div
              key={i}
              className={`dado-stage flex h-20 w-20 items-center justify-center rounded-2xl bg-paper-light text-4xl text-ink ${girando ? "dado-girando" : "ink-reveal"} ${!girando && critico ? "dado-crit" : ""}`}
            >
              {girando ? "?" : d}
            </div>
          ))}
        </div>
        {!girando && (
          <div className="ink-reveal text-center">
            <div className="display text-5xl leading-none text-paper-light">
              {data.total}
            </div>
            <div className={`display mt-1 text-xl ${TOM_COR[data.tom]}`}>
              {critico && "✦ "}
              {data.resultado}
            </div>
            <div className="typewriter mt-1 text-xs text-paper/60">
              {data.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
