"use client";

import { useState } from "react";
import { EldritchSketch, Pentagram, SigilRow } from "@/components/OccultSigils";

export interface EncounterItem {
  id: string;
  titulo: string;
  imagemUrl: string | null;
}

// Dialog dramático sobre a página: só imagem + nome. Avisa que "algo vai rolar"
// (monstro/NPC), sem revelar ficha. Controlado pelo Mestre (disparo).
export function EncounterBanner({ items }: { items: EncounterItem[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visiveis = items.filter((i) => !dismissed.includes(i.id));

  if (visiveis.length === 0) return null;

  function fechar() {
    setDismissed(items.map((i) => i.id));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aparição"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Fundo escurecido */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={fechar}
      />

      {/* Caixa de diálogo */}
      <div className="irreal folder-open relative z-[101] w-full max-w-md rounded-md border border-stamp/60 bg-noir-black/95 p-6 shadow-2xl">
        <div className="ink-reveal">
          <div className="mb-3 flex items-center justify-center gap-3 text-stamp">
            <Pentagram className="text-xl" />
            <span className="glitch display text-sm tracking-widest text-stamp-bright">
              Algo se manifesta
            </span>
            <Pentagram className="text-xl" />
          </div>

          <div className="flex flex-col items-center gap-4">
            {visiveis.map((it) => (
              <div key={it.id} className="flex flex-col items-center gap-2">
                <div className="rabisco flex h-40 w-32 items-center justify-center overflow-hidden rounded">
                  {it.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imagemUrl} alt={it.titulo} />
                  ) : (
                    <EldritchSketch className="text-6xl text-stamp/60" />
                  )}
                </div>
                <span className="glitch display text-center text-2xl text-paper-light">
                  {it.titulo}
                </span>
              </div>
            ))}
          </div>

          <SigilRow className="my-4 text-sm" />

          <button
            type="button"
            onClick={fechar}
            className="btn btn-ghost mx-auto block text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
