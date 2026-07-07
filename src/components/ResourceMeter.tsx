import { HeartIcon, EyeIcon } from "@/components/icons";

interface Props {
  kind: "pv" | "san";
  current: number;
  max: number;
  compact?: boolean;
  breakdown?: string; // ex.: "10 base + 2 COM + 3 nível"
}

export function ResourceMeter({ kind, current, max, compact, breakdown }: Props) {
  const isPv = kind === "pv";
  const label = isPv ? "Pontos de Vida" : "Sanidade";
  const Icon = isPv ? HeartIcon : EyeIcon;

  const safeMax = Math.max(1, max);
  const pct = Math.max(0, Math.min(100, (current / safeMax) * 100));

  const isNegative = current < 0;
  const over = current > max ? current - max : 0; // sobrevida
  // Sanidade baixa "rasga".
  const sanTorn = !isPv && pct < 40 && !isNegative;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label inline-flex items-center gap-1">
          <Icon className="text-sm" />
          {compact ? (isPv ? "PV" : "SAN") : label}
        </span>
        <span className="typewriter flex items-center gap-1.5 text-xs">
          <span className={isNegative ? "resource-negative" : "text-sepia-dark"}>
            {current}
          </span>
          <span className="text-sepia-dark">/ {max}</span>
          {over > 0 && (
            <span className="badge-over text-[0.62rem]">+{over}</span>
          )}
        </span>
      </div>
      <div
        className={`meter ${compact ? "h-3" : "h-5"}`}
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={`h-full ${
            over > 0 ? "meter-fill-over" : isPv ? "meter-fill-pv" : "meter-fill-san"
          }`}
          style={{
            width: `${over > 0 ? 100 : pct}%`,
            opacity: sanTorn ? 0.7 : 1,
            clipPath: sanTorn
              ? "polygon(0 0, 100% 0, 96% 45%, 100% 60%, 94% 100%, 0 100%)"
              : undefined,
          }}
        />
      </div>
      {breakdown && (
        <p className="typewriter mt-1 text-[0.65rem] text-sepia">{breakdown}</p>
      )}
      {isNegative && (
        <p className="typewriter mt-1 text-[0.65rem] text-stamp">
          {isPv ? "À beira da morte." : "Mente em colapso."}
        </p>
      )}
    </div>
  );
}
