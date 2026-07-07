import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function Pentagram(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 3 L17.3 19.3 L3.4 9.2 L20.6 9.2 L6.7 19.3 Z" />
    </svg>
  );
}

export function TripleMoon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M7 6 A6 6 0 1 0 7 18 A4.4 6 0 1 1 7 6 Z" />
      <path d="M17 6 A6 6 0 1 1 17 18 A4.4 6 0 1 0 17 6 Z" />
    </svg>
  );
}

export function OccultEye(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      <path d="M12 4 V1.5 M12 20 V22.5 M4 6 L2.5 4.5 M20 6 L21.5 4.5" />
    </svg>
  );
}

export function Sigil(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 2.5 V21.5 M4.2 8 L19.8 16 M19.8 8 L4.2 16" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

export function OccultCross(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M12 2 V22 M6 8 H18" />
      <circle cx="12" cy="18.5" r="2.6" />
    </svg>
  );
}

// Rascunho eldritch — placeholder de "rabisco" quando não há imagem.
export function EldritchSketch(props: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 40c-4-2-8-6-8-13 0-9 8-16 20-16s20 7 20 16c0 7-4 11-8 13" />
      <path d="M20 40c0 6 5 12 12 12s12-6 12-12" opacity="0.8" />
      <circle cx="32" cy="26" r="6" />
      <circle cx="32" cy="26" r="1.4" fill="currentColor" />
      <path d="M18 44c-2 4-6 6-10 6M46 44c2 4 6 6 10 6M26 50c-1 5-3 8-6 10M38 50c1 5 3 8 6 10M32 52v10" opacity="0.75" />
      <path d="M14 20c-3-2-6-2-9-1M50 20c3-2 6-2 9-1" opacity="0.6" />
    </svg>
  );
}

// Fileira decorativa de sigilos (separador de seções ocultas).
export function SigilRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 text-stamp ${className}`}
      aria-hidden
    >
      <span className="h-px flex-1 bg-stamp/30" />
      <TripleMoon className="text-lg opacity-80" />
      <Sigil className="text-xl" />
      <Pentagram className="text-2xl" />
      <Sigil className="text-xl" />
      <OccultCross className="text-lg opacity-80" />
      <span className="h-px flex-1 bg-stamp/30" />
    </div>
  );
}
