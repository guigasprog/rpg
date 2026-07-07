"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOccultismUnlocked } from "@/lib/actions";
import { LockIcon } from "@/components/icons";

interface Props {
  characterId: string;
  unlocked: boolean;
  compact?: boolean;
}

export function OccultismToggle({ characterId, unlocked, compact }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setOccultismUnlocked(characterId, !unlocked);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={compact ? "" : "space-y-1"}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`btn text-xs ${unlocked ? "btn-primary" : "btn-dark"}`}
        title={unlocked ? "Revogar acesso ao Ocultismo" : "Liberar Ocultismo"}
      >
        <span className="inline-flex items-center gap-1">
          <LockIcon />
          {pending
            ? "..."
            : unlocked
              ? "Ocultismo liberado"
              : "Liberar Ocultismo"}
        </span>
      </button>
      {error && <p className="typewriter text-xs text-stamp">{error}</p>}
    </div>
  );
}
