"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FedoraIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (res?.error) {
      setLoading(false);
      setError("Usuário ou senha incorretos.");
      return;
    }
    // Login OK: "carimba" o dossiê como confidencial antes de entrar.
    setSuccess(true);
    setTimeout(() => {
      router.push("/personagens");
      router.refresh();
    }, 850);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <FedoraIcon className="mx-auto text-5xl text-stamp-bright" />
          <h1 className="display mt-2 text-3xl text-paper-light">
            Arquivo Sombrio
          </h1>
          <p className="typewriter mt-1 text-sm text-paper/70">
            Divisão de Casos Não-Arquiváveis
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="paper paper-edge folder-open relative rounded-md p-6"
        >
          {success && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="stamp stamp-slam text-2xl">Confidencial</span>
            </div>
          )}

          <h2 className="display mb-4 text-lg text-sepia-ink">
            Identifique-se
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="username">
                Usuário
              </label>
              <input
                id="username"
                className="field mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <p className="typewriter mt-4 text-sm text-stamp">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-6 w-full"
            disabled={loading}
          >
            {loading ? "Verificando..." : "Entrar no arquivo"}
          </button>

          <p className="typewriter mt-4 text-center text-xs text-sepia">
            Sem credenciais? Procure o Mestre da mesa.
          </p>
        </form>
      </div>
    </main>
  );
}
