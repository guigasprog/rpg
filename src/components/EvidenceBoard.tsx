"use client";

import { useState } from "react";

interface Item {
  id: string;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
}

export function EvidenceBoard({ items }: { items: Item[] }) {
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="typewriter text-sm text-paper/60">
        Nada no mural ainda. As pistas aparecem aqui quando o Mestre as revela.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <article key={e.id} className="paper paper-edge rounded-md p-4">
            {e.imagemUrl && (
              <button
                type="button"
                onClick={() => setZoomUrl(e.imagemUrl)}
                className="paper-edge mb-2 block aspect-[4/3] w-full overflow-hidden rounded bg-black/10"
                title="Ampliar"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.imagemUrl}
                  alt=""
                  className="h-full w-full object-cover grayscale"
                />
              </button>
            )}
            <h3 className="display text-base leading-tight text-sepia-ink">
              {e.titulo}
            </h3>
            {e.descricao && (
              <p className="typewriter mt-1 whitespace-pre-wrap text-xs leading-snug text-sepia">
                {e.descricao}
              </p>
            )}
          </article>
        ))}
      </div>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomUrl}
            alt=""
            className="max-h-full max-w-full object-contain grayscale"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded bg-ink/80 px-3 py-1 text-paper-light"
            onClick={() => setZoomUrl(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
