"use client";

import { useEffect, useRef, useState } from "react";
import { enviarMensagem } from "@/lib/actions";

interface Msg {
  id: string;
  autorNome: string;
  autorRole: string;
  tipo: string;
  texto: string;
  createdAt: string;
}

const POLL_MS = 4000;

export function ChatPanel() {
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    puxar();
    const t = setInterval(puxar, POLL_MS);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (open) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

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
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-primary fixed bottom-4 right-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full p-0 text-xl leading-none shadow-lg"
        title="Chat & dados da mesa"
        aria-label="Abrir chat"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-[80] flex h-[70vh] max-h-[560px] w-[min(92vw,360px)] flex-col rounded-md border border-sepia/50 bg-ink/95 shadow-2xl backdrop-blur">
          <div className="border-b border-sepia/30 px-3 py-2">
            <p className="display text-sm text-paper-light">Mesa — chat & dados</p>
            <p className="typewriter text-[0.6rem] text-paper/50">
              Dados: !2d6+inv · !1d20 · oculto: !s2d6 · sussurro: @usuário ...
            </p>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
            {msgs.length === 0 && (
              <p className="typewriter text-xs text-paper/40">
                Silêncio na mesa…
              </p>
            )}
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`typewriter text-xs ${
                  m.texto.startsWith("🔒")
                    ? "text-amber-300"
                    : m.texto.startsWith("🤫")
                      ? "italic text-violet-300"
                      : m.tipo === "ROLL"
                        ? "text-emerald-300"
                        : "text-paper"
                }`}
              >
                <span
                  className={`font-bold ${m.autorRole === "MASTER" ? "text-stamp-bright" : "text-paper-light"}`}
                >
                  {m.autorNome}
                </span>
                <span className="text-paper/40">: </span>
                <span className="whitespace-pre-wrap break-words">{m.texto}</span>
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          <div className="border-t border-sepia/30 p-2">
            {erro && <p className="typewriter mb-1 text-[0.65rem] text-stamp">{erro}</p>}
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
      )}
    </>
  );
}
