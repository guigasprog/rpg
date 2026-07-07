"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCharacterOnStage } from "@/lib/actions";

interface Props {
  characterId: string;
  mostrarNaMesa: boolean;
}

export function OnStageToggle({ characterId, mostrarNaMesa }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setCharacterOnStage(characterId, !mostrarNaMesa);
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
        className={`btn text-xs ${mostrarNaMesa ? "btn-primary" : "btn-dark"}`}
        title={
          mostrarNaMesa
            ? "Parar de mostrar o retrato na tela de todos"
            : "Mostrar o retrato deste personagem na tela de todos (só a imagem)"
        }
      >
        {pending ? "..." : mostrarNaMesa ? "Na mesa ✓" : "🖼️ Mostrar p/ mesa"}
      </button>
      {error && <p className="typewriter text-xs text-stamp">{error}</p>}
    </div>
  );
}
