"use client";

interface TrackThemeAnalyzerProps {
  themeLabel: string;
  warmth: number;
  brightness: number;
  motion: number;
  intensity: number;
  subPeak: boolean;
}

const metrics = [
  { key: "warmth", label: "Warmth" },
  { key: "brightness", label: "Brightness" },
  { key: "motion", label: "Motion" },
] as const;

export default function TrackThemeAnalyzer({
  themeLabel,
  warmth,
  brightness,
  motion,
  intensity,
  subPeak,
}: TrackThemeAnalyzerProps) {
  const values = {
    warmth,
    brightness,
    motion,
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-150"
            style={{
              background: subPeak ? "rgb(216 180 254)" : "rgb(82 82 91)",
              boxShadow: subPeak ? "0 0 8px rgba(216,180,254,0.6)" : "none",
            }}
          />
          <span className="text-xs font-medium text-white truncate">{themeLabel}</span>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Drive
          </span>
          <span className="text-sm font-semibold tabular-nums text-white">
            {Number.isFinite(intensity) ? Math.round(intensity * 100) : 0}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-hidden">
        {metrics.map(({ key, label }) => {
          const raw = values[key];
          const value = Number.isFinite(raw) ? raw : 0;
          const pct = Math.round(value * 100);
          return (
            <div key={key} className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] text-neutral-500 truncate">{label}</span>
                <span className="text-[10px] font-mono tabular-nums text-neutral-400 shrink-0">
                  {Number.isFinite(pct) ? pct : 0}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.max(4, Number.isFinite(value) ? value * 100 : 0)}%`,
                    background:
                      key === "warmth"
                        ? "linear-gradient(90deg, rgba(251,113,133,0.85), rgba(168,85,247,0.85))"
                        : key === "brightness"
                          ? "linear-gradient(90deg, rgba(96,165,250,0.85), rgba(34,211,238,0.85))"
                          : "linear-gradient(90deg, rgba(99,102,241,0.85), rgba(236,72,153,0.85))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
