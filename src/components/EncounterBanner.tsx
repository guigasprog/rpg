"use client";

import { useEffect, useState } from "react";
import { EldritchSketch, Pentagram, SigilRow } from "@/components/OccultSigils";

export interface EncounterItem {
  id: string;
  titulo: string;
  imagemUrl: string | null;
  soImagem?: boolean; // personagem mostrado à mesa: exibe só a imagem
}

const POLL_MS = 5000;

// Dialog dramático sobre a página: monstros/NPCs (imagem+nome) e personagens
// mostrados à mesa (só imagem). Controlado pelo Mestre. Atualiza "ao vivo" via
// polling — aparece/some para todos os conectados sem precisar recarregar.
export function EncounterBanner({ items: initial }: { items: EncounterItem[] }) {
  const [items, setItems] = useState<EncounterItem[]>(initial);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [zoom, setZoom] = useState<string | null>(null); // imagem ampliada

  useEffect(() => {
    let ativo = true;

    async function puxar() {
      try {
        const res = await fetch("/api/encounters", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: EncounterItem[] };
        if (!ativo) return;
        const novos = data.items ?? [];
        setItems(novos);
        // Limpa da lista de "fechados" o que não está mais ativo — assim, se o
        // Mestre reexibir depois, o dialog volta a aparecer.
        const ativosIds = new Set(novos.map((i) => i.id));
        setDismissed((prev) => prev.filter((id) => ativosIds.has(id)));
      } catch {
        // ignora erros de rede transitórios
      }
    }

    const t = setInterval(puxar, POLL_MS);
    puxar();
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  const visiveis = items.filter((i) => !dismissed.includes(i.id));
  if (visiveis.length === 0) return null;

  function fechar() {
    setDismissed(items.map((i) => i.id));
  }

  return (
    <>
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aparição"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={fechar}
      />

      <div className="irreal folder-open relative z-[101] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-md border border-stamp/60 bg-noir-black/95 p-6 shadow-2xl">
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
                {it.imagemUrl ? (
                  <button
                    type="button"
                    onClick={() => setZoom(it.imagemUrl)}
                    title="Ampliar"
                    className={`rabisco block cursor-zoom-in overflow-hidden rounded ${
                      it.soImagem
                        ? "h-80 w-64 sm:h-96 sm:w-72"
                        : "h-64 w-48 sm:h-72 sm:w-56"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imagemUrl} alt={it.titulo || "aparição"} />
                  </button>
                ) : (
                  <div
                    className={`rabisco flex items-center justify-center overflow-hidden rounded ${
                      it.soImagem
                        ? "h-80 w-64 sm:h-96 sm:w-72"
                        : "h-64 w-48 sm:h-72 sm:w-56"
                    }`}
                  >
                    <EldritchSketch className="text-7xl text-stamp/60" />
                  </div>
                )}
                {!it.soImagem && it.titulo && (
                  <span className="glitch display text-center text-2xl text-paper-light">
                    {it.titulo}
                  </span>
                )}
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

    {zoom && (
      <div
        role="dialog"
        aria-label="Imagem ampliada"
        onClick={() => setZoom(null)}
        className="fixed inset-0 z-[110] flex cursor-zoom-out items-center justify-center bg-black p-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={zoom}
          alt="ampliada"
          className="max-h-[96vh] max-w-[96vw] object-contain grayscale"
        />
      </div>
    )}
    </>
  );
}
