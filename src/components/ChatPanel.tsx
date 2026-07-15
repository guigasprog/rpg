"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChatBox } from "@/components/ChatBox";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // No mapa o chat fica ancorado na tela; não mostra o botão flutuante.
  if (pathname === "/mapa") return null;

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
          <ChatBox onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
