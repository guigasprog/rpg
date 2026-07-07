import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

// Corvo (gravura de jornal).
export function Raven(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M8 30c2-10 10-16 18-16 3 0 5 1 6 3l6-3-3 5 5 1-5 3c1 6-3 12-10 14l2 5h-5l-1-4c-6 0-11-4-13-9l-6 2z" />
      <circle cx="30" cy="19" r="1" fill="#d8c9a3" />
    </svg>
  );
}

// Vela acesa.
export function Candle(props: IconProps) {
  return (
    <svg {...line} width="1em" height="1em" {...props}>
      <path d="M12 3c1.5 1.6 2.5 3 2.5 4.3A2.5 2.5 0 0 1 12 10a2.5 2.5 0 0 1-2.5-2.7C9.5 6 10.5 4.6 12 3Z" fill="currentColor" stroke="none" />
      <path d="M12 10v3" />
      <rect x="8.5" y="13" width="7" height="8" rx="1" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

// Caveira pequena.
export function Skull(props: IconProps) {
  return (
    <svg {...line} width="1em" height="1em" {...props}>
      <path d="M6 11a6 6 0 0 1 12 0c0 2-1 3.5-2 4.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C7 14.5 6 13 6 11Z" />
      <circle cx="9.5" cy="11" r="1.4" fill="currentColor" />
      <circle cx="14.5" cy="11" r="1.4" fill="currentColor" />
      <path d="M11 15h2M10 19v2M14 19v2M12 19v2" />
    </svg>
  );
}

// Mão apontadora (manícula clássica de jornal ☞).
export function Manicule(props: IconProps) {
  return (
    <svg {...line} width="1em" height="1em" {...props}>
      <path d="M3 12h9" />
      <path d="M12 8.5c1.5 0 6-1 8-1s1.5 1.5 0 1.7c-1.5.2-3 .3-3 .3s3 0 4 .2 1 1.6-.3 1.7c-1 .1-3.7.1-3.7.1s2.8.1 3.5.4.6 1.5-.4 1.6c-1 .1-3.1.1-3.1.1s2 .2 2.5.5.3 1.3-.6 1.4c-2 .2-5.4.2-7.4-.8S8 13 8 12s2.5-3.5 4-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Fleurão / ornamento de separação.
export function Fleuron(props: IconProps) {
  return (
    <svg {...line} width="1em" height="1em" {...props}>
      <path d="M12 6c-3 0-5 2-5 5 0 2 1.5 4 4 4-1.5-1-2-2-2-3 0-2 1.5-3 3-3s3 1 3 3c0 1-.5 2-2 3 2.5 0 4-2 4-4 0-3-2-5-5-5Z" />
      <path d="M12 15v3M9 20h6" />
    </svg>
  );
}
