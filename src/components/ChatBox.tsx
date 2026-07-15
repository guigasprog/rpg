"use client";

import { useEffect, useRef, useState } from "react";
import { enviarMensagem } from "@/lib/actions";

interface Msg {
  id: string;
  autorNome: string;
  autorRole: string;
  tipo: string;
  texto: string;
  personagem?: string | null;
  createdAt: string;
}

const POLL_MS = 4000;

function grupoKey(m: Msg): string {
  return m.tipo === "ROLL" ? m.personagem || m.autorNome : m.autorNome;
}

export function ChatBox({ onClose }: { onClose?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  async function puxar() {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Msg[] };
      setMsgs(data.messages ?? []);
    } catch {
      /* ignora */
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    puxar();
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    const res = await enviarMensagem(t);
    setEnviando(false);
    if (!res.ok) {
      setErro(res.error ?? "Falha.");
      return;
    }
    setTexto("");
    puxar();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-sepia/30 px-3 py-2">
        <div>
          <p className="display text-sm text-paper-light">Mesa — chat & dados</p>
          <p className="typewriter text-[0.6rem] text-paper/50">
            Dados: !2d6+inv · !1d20 · oculto: !s2d6 · sussurro: @usuário …
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-black/40 px-2 text-paper/70 hover:text-paper-light"
            aria-label="Fechar chat"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {msgs.length === 0 && (
          <p className="typewriter text-sm text-paper/40">Silêncio na mesa…</p>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const mesmoGrupo =
            !!prev && prev.tipo === m.tipo && grupoKey(prev) === grupoKey(m);
          const isRoll = m.tipo === "ROLL";
          const isSussurro = m.texto.startsWith("🤫");
          const isOculto = m.texto.startsWith("🔒");
          const corTexto = isOculto
            ? "text-amber-300"
            : isSussurro
              ? "italic text-violet-300"
              : isRoll
                ? "text-emerald-300"
                : "text-paper";
          return (
            <div key={m.id} className={mesmoGrupo ? "" : "pt-2.5"}>
              {!mesmoGrupo && (
                <div className="mb-0.5 flex items-baseline gap-1.5">
                  <span
                    className={`typewriter text-xs font-bold ${
                      isRoll
                        ? "text-emerald-200"
                        : m.autorRole === "MASTER"
                          ? "text-stamp-bright"
                          : "text-paper-light"
                    }`}
                  >
                    {isRoll ? `🎲 ${grupoKey(m)}` : m.autorNome}
                  </span>
                  {isRoll && m.personagem && (
                    <span className="typewriter text-[0.6rem] text-paper/40">
                      · {m.autorNome}
                    </span>
                  )}
                </div>
              )}
              <p
                className={`typewriter whitespace-pre-wrap break-words pl-0.5 text-sm leading-relaxed ${corTexto}`}
              >
                {m.texto}
              </p>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      <div className="border-t border-sepia/30 p-2">
        {erro && (
          <p className="typewriter mb-1 text-[0.65rem] text-stamp">{erro}</p>
        )}
        <div className="flex gap-1">
          <input
            className="field text-sm"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="mensagem ou !2d6+inv"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enviar();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary text-xs"
            onClick={enviar}
            disabled={enviando}
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
