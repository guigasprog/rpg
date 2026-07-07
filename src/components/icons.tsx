import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function MagnifierIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </svg>
  );
}

export function FedoraIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M6 13c0-4 1-7 3-7s2 2 3 2 1-2 3-2 3 3 3 7" />
      <path d="M2.5 13.5c0 1.5 4 2.5 9.5 2.5s9.5-1 9.5-2.5c0-1-1.5-1.6-3.5-2" />
      <path d="M6 13c-1.5.3-2.5.8-2.5 1.3" />
    </svg>
  );
}

export function FingerprintIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M12 4a8 8 0 0 0-8 8v3" />
      <path d="M20 15v-3a8 8 0 0 0-4-6.9" />
      <path d="M8 20v-8a4 4 0 0 1 8 0v4" />
      <path d="M12 12v6" />
      <path d="M16 18a12 12 0 0 0 0-2" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M12 20s-7-4.5-7-10a3.7 3.7 0 0 1 7-1.6A3.7 3.7 0 0 1 19 10c0 5.5-7 10-7 10Z" />
    </svg>
  );
}

export function DiceIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...base} width="1em" height="1em" {...props}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}
