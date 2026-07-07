"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlayerAccount, resetPlayerPassword } from "@/lib/actions";

interface Props {
  userId: string;
  username: string;
  isSelf: boolean;
}

export function AccountActions({ userId, username, isSelf }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await resetPlayerPassword(userId, novaSenha);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      setMsg(`Senha de "${username}" definida como: ${novaSenha}`);
      setNovaSenha("");
      setOpen(false);
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        `Apagar a conta "${username}"? Os personagens dela NÃO serão apagados — ficarão desvinculados (só o Mestre os verá).`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deletePlayerAccount(userId);
      if (!res.ok) {
        setError(res.error ?? "Falha.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="btn btn-ghost px-2 py-1 text-[0.65rem]"
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
        >
          <span className='text-sepia-ink'>Redefinir senha</span>
        </button>
        {!isSelf && (
          <button
            type="button"
            className="btn btn-ghost px-2 py-1 text-[0.65rem] text-sepia-ink"
            onClick={remove}
            disabled={pending}
          >
            <span className='text-sepia-ink'>Apagar</span>
          </button>
        )}
      </div>
      {open && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            className="field px-2 py-1 text-xs"
            placeholder="nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary px-2 py-1 text-[0.65rem] text-sepia-ink"
            onClick={reset}
            disabled={pending}
          >
            OK
          </button>
        </div>
      )}
      {msg && <span className="typewriter text-[0.65rem] text-sepia">{msg}</span>}
      {error && <span className="typewriter text-[0.65rem] text-stamp">{error}</span>}
    </div>
  );
}
