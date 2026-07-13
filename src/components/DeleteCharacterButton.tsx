"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCharacter } from "@/lib/actions";

interface Props {
  characterId: string;
  nome: string;
}

export function DeleteCharacterButton({ characterId, nome }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apagar() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCharacter(characterId);
      if (!res.ok) {
        setError(res.error ?? "Falha ao excluir.");
        setConfirmando(false);
        return;
      }
      router.refresh();
    });
  }

  if (confirmando) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          className="btn btn-primary tap text-xs"
          onClick={apagar}
          disabled={pending}
          title={`Excluir permanentemente ${nome}`}
        >
          {pending ? "..." : "Confirmar exclusão"}
        </button>
        <button
          type="button"
          className="btn btn-dark tap text-xs"
          onClick={() => setConfirmando(false)}
          disabled={pending}
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span>
      <button
        type="button"
        className="btn btn-dark tap text-xs"
        onClick={() => setConfirmando(true)}
        title="Apagar o dossiê permanentemente"
      >
        🗑 Apagar
      </button>
      {error && <span className="typewriter ml-1 text-xs text-stamp">{error}</span>}
    </span>
  );
}
