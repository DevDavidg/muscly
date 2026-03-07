"use client";

interface PlayerLoadingScreenProps {
  loadProgress: number;
  loadStatus?: string;
  loadElapsedMs?: number;
}

export default function PlayerLoadingScreen({
  loadProgress,
  loadStatus = "",
  loadElapsedMs = 0,
}: PlayerLoadingScreenProps) {
  const elapsedSec = Math.floor(loadElapsedMs / 1000);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
      <div className="flex flex-col items-center gap-6 w-full max-w-xs p-6">
        <h1 className="text-4xl font-black tracking-tighter">MUSCLY</h1>
        <div className="w-full space-y-2">
          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-neutral-500 text-xs text-center font-mono">
            {loadProgress}%
          </p>
        </div>
        <div className="w-full space-y-1 text-center font-mono text-[11px] text-neutral-500">
          {loadStatus && (
            <p className="truncate" title={loadStatus}>
              Cargando: {loadStatus}
            </p>
          )}
          {elapsedSec > 0 && (
            <p>
              Tiempo: {elapsedSec}s
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
