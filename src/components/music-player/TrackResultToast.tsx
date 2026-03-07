"use client";

import type { TrackResultToast as TrackResultToastType } from "./music-player-types";

interface TrackResultToastProps {
  result: TrackResultToastType;
}

export default function TrackResultToast({ result }: TrackResultToastProps) {
  return (
    <div className="animate-toast-enter pointer-events-none fixed right-4 top-4 z-50 w-[min(92vw,22rem)] rounded-2xl border border-white/10 bg-neutral-950/88 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-neutral-500">
            Track Result
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold text-white">
            {result.title}
          </h3>
        </div>
        <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-purple-200">
          {result.theme}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-neutral-500">Drive</p>
          <p className="mt-1 font-semibold text-white">{result.drive}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-neutral-500">Warmth</p>
          <p className="mt-1 font-semibold text-white">{result.warmth}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-neutral-500">Brightness</p>
          <p className="mt-1 font-semibold text-white">{result.brightness}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] px-3 py-2">
          <p className="text-neutral-500">Motion</p>
          <p className="mt-1 font-semibold text-white">{result.motion}%</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-neutral-400">
        {result.subPeaks} golpes 808 detectados y {result.peaks} picos de bajo
        durante la reproduccion.
      </p>
    </div>
  );
}
