"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCharacterArchived } from "@/lib/actions";

interface Props {
  characterId: string;
  arquivado: boolean;
}

export function ArchiveToggle({ characterId, arquivado }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setCharacterArchived(characterId, !arquivado);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`btn text-xs ${arquivado ? "btn-primary" : "btn-dark"}`}
        title={
          arquivado
            ? "Reativar o dossiê para o jogador"
            : "Arquivar (fica inativo/invisível para o jogador)"
        }
      >
        {pending ? "..." : arquivado ? "📂 Reativar" : "📦 Arquivar"}
      </button>
      {error && <p className="typewriter text-xs text-stamp">{error}</p>}
    </div>
  );
}
