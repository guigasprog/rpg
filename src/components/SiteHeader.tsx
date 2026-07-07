import Link from "next/link";
import { getViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { LogoutButton } from "@/components/LogoutButton";
import { FedoraIcon, MagnifierIcon } from "@/components/icons";

export async function SiteHeader() {
  const viewer = await getViewer();
  const isMaster = viewer?.role === ROLES.MASTER;

  return (
    <header className="border-b border-sepia/40 bg-ink/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/personagens" className="flex items-center gap-2">
          <FedoraIcon className="text-2xl text-stamp-bright" />
          <span className="display text-lg text-paper-light">
            Arquivo Sombrio
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/personagens" className="btn btn-ghost text-xs">
            <span className="inline-flex items-center gap-1">
              <MagnifierIcon /> Dossiês
            </span>
          </Link>
          <Link href="/manual" className="btn btn-ghost text-xs">
            Manual
          </Link>
          {isMaster && (
            <Link href="/mestre" className="btn btn-dark text-xs">
              Mesa do Mestre
            </Link>
          )}
          {viewer && <LogoutButton />}
        </nav>
      </div>
    </header>
  );
}
