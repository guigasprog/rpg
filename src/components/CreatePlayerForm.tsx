"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayerAccount } from "@/lib/actions";

export function CreatePlayerForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PLAYER" | "MASTER">("PLAYER");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    setSaving(true);
    const res = await createPlayerAccount({ username, password, role });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Falha ao criar conta.");
      return;
    }
    setMsg(`Conta "${username}" criada.`);
    setUsername("");
    setPassword("");
    setRole("PLAYER");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="paper paper-edge rounded-md p-4">
      <h2 className="display mb-3 text-lg text-sepia-ink">
        Emitir credenciais
      </h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="label">Usuário</label>
          <input
            className="field mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Senha</label>
          <input
            type="text"
            className="field mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="label">Papel</label>
          <select
            className="field mt-1"
            value={role}
            onChange={(e) => setRole(e.target.value as "PLAYER" | "MASTER")}
          >
            <option value="PLAYER">Jogador</option>
            <option value="MASTER">Mestre</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={saving}
          >
            {saving ? "..." : "Criar"}
          </button>
        </div>
      </div>
      {msg && <p className="typewriter mt-2 text-sm text-sepia">{msg}</p>}
      {error && <p className="typewriter mt-2 text-sm text-stamp">{error}</p>}
    </form>
  );
}
