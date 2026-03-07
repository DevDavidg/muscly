import { Track } from "@/lib/data";

const AUDIO_PRELOAD_TIMEOUT_MS = 12000;
const GLOBAL_LOAD_TIMEOUT_MS = 8000;

function preloadAudio(
  track: Track,
  audioCache: Map<string, HTMLAudioElement>,
  updateProgress: () => void
): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      audioCache.set(track.fileName, audio);
      updateProgress();
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      audio.removeEventListener("loadeddata", onLoadedData);
      audio.removeEventListener("error", onError);
      clearTimeout(timeoutId);
      resolve();
    };

    const onCanPlayThrough = () => finish();
    const onLoadedData = () => {
      if (audio.readyState >= 2) finish();
    };
    const onError = () => finish();

    const timeoutId = setTimeout(finish, AUDIO_PRELOAD_TIMEOUT_MS);

    audio.addEventListener("canplaythrough", onCanPlayThrough);
    audio.addEventListener("loadeddata", onLoadedData);
    audio.addEventListener("error", onError);
    audio.src = track.audioUrl;
    audio.load();
  });
}

export type LoadStatus = { loaded: number; total: number; current: string };

export async function preloadAssets(
  tracks: Track[],
  audioCache: Map<string, HTMLAudioElement>,
  onProgress: (loaded: number, total: number, current: string) => void
): Promise<void> {
  const coverUrl =
    tracks.length > 0 && tracks[0].coverUrl ? tracks[0].coverUrl : null;
  const totalAssets = (coverUrl ? 1 : 0) + tracks.length;
  let loaded = 0;
  const pending = new Set<string>(
    [
      ...(coverUrl ? ["portada.png"] : []),
      ...tracks.map((t) => t.fileName),
    ]
  );

  const updateProgress = (doneLabel: string) => {
    pending.delete(doneLabel);
    loaded++;
    const next = pending.values().next().value ?? "";
    onProgress(loaded, totalAssets, next);
  };

  const firstCurrent = coverUrl ? "portada.png" : (tracks[0]?.fileName ?? "");
  onProgress(0, totalAssets, firstCurrent);

  const imagePromise = coverUrl
    ? new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          updateProgress("portada.png");
          resolve();
        };
        img.onerror = () => {
          updateProgress("portada.png");
          resolve();
        };
        img.src = coverUrl;
      })
    : Promise.resolve();

  const audioPromises = tracks.map((track) =>
    preloadAudio(track, audioCache, () => updateProgress(track.fileName))
  );

  const allDone = Promise.all([imagePromise, ...audioPromises]);
  const maxWait = new Promise<void>((resolve) =>
    setTimeout(resolve, GLOBAL_LOAD_TIMEOUT_MS)
  );

  await Promise.race([allDone, maxWait]);
}
