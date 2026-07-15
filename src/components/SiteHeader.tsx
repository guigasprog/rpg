import Link from "next/link";
import { getViewer } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { LogoutButton } from "@/components/LogoutButton";
import { FedoraIcon, MagnifierIcon } from "@/components/icons";

export async function SiteHeader() {
  const viewer = await getViewer();
  const isMaster = viewer?.role === ROLES.MASTER;

  return (
    <header className="sticky top-0 z-40 border-b border-sepia/40 bg-ink/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/personagens" className="flex shrink-0 items-center gap-2">
          <FedoraIcon className="text-2xl text-stamp-bright" />
          <span className="display text-base text-paper-light sm:text-lg">
            Arquivo Sombrio
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Link href="/personagens" className="btn btn-ghost tap text-xs">
            <span className="inline-flex items-center gap-1">
              <MagnifierIcon /> Dossiês
            </span>
          </Link>
          <Link href="/provas" className="btn btn-ghost tap text-xs">
            Provas
          </Link>
          <Link href="/manual" className="btn btn-ghost tap text-xs">
            Manual
          </Link>
          {isMaster && (
            <Link href="/mestre" className="btn btn-dark tap text-xs">
              Mesa do Mestre
            </Link>
          )}
          {viewer && <LogoutButton />}
        </nav>
      </div>
    </header>
  );
}
