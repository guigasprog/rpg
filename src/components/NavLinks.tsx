"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MagnifierIcon } from "@/components/icons";

interface Item {
  href: string;
  label: React.ReactNode;
  master?: boolean;
  dark?: boolean;
}

const ITENS: Item[] = [
  {
    href: "/personagens",
    label: (
      <span className="inline-flex items-center gap-1">
        <MagnifierIcon /> Dossiês
      </span>
    ),
  },
  { href: "/provas", label: "Provas" },
  { href: "/mapa", label: "Mapa" },
  { href: "/manual", label: "Manual" },
  { href: "/mestre", label: "Mesa do Mestre", master: true, dark: true },
];

export function NavLinks({ isMaster }: { isMaster: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {ITENS.filter((i) => !i.master || isMaster).map((i) => {
        const ativo =
          pathname === i.href || pathname.startsWith(i.href + "/");
        const base = i.dark ? "btn-dark" : "btn-ghost";
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo ? "page" : undefined}
            className={`btn tap text-xs ${
              ativo ? "btn-primary" : base
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </>
  );
}
