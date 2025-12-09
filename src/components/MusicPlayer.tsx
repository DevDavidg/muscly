"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  Music,
  SkipBack,
  SkipForward,
  Copy,
  Check,
} from "lucide-react";
import { Track } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useBassDetector } from "@/lib/use-bass-detector";
import SpectrumVisualizer from "./SpectrumVisualizer";

interface MusicPlayerProps {
  initialTracks: Track[];
}

export default function MusicPlayer({ initialTracks }: MusicPlayerProps) {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingAutoPlay, setPendingAutoPlay] = useState<Track | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const isSeekingRef = useRef(false);
  const autoPlayExecuted = useRef(false);

  const { bassData, connect: connectBass } = useBassDetector({
    enabled: true,
    threshold: 1.4,
  });

  useEffect(() => {
    const preloadAssets = async () => {
      const imagePromises: Promise<void>[] = [];
      const audioPromises: Promise<void>[] = [];
      const tracksWithCovers = initialTracks.filter((t) => t.coverName);
      const totalAssets = tracksWithCovers.length + initialTracks.length;
      let loaded = 0;

      const updateProgress = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / totalAssets) * 100));
      };

      // Precargar imágenes
      for (const track of tracksWithCovers) {
        imagePromises.push(
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => {
              updateProgress();
              resolve();
            };
            img.onerror = () => {
              updateProgress();
              resolve();
            };
            img.src = track.coverUrl || "";
          })
        );
      }

      // Precargar TODOS los audios de forma forzada
      for (const track of initialTracks) {
        audioPromises.push(
          new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.preload = "auto";
            audio.crossOrigin = "anonymous";

            // Forzar la carga completa del audio
            const handleCanPlayThrough = () => {
              audioCache.current.set(track.fileName, audio);
              updateProgress();
              audio.removeEventListener("canplaythrough", handleCanPlayThrough);
              audio.removeEventListener("error", handleError);
              audio.removeEventListener("loadeddata", handleLoadedData);
              resolve();
            };

            const handleLoadedData = () => {
              // Si ya se cargó suficiente, intentar reproducir y pausar para forzar carga completa
              if (audio.readyState >= 3) {
                audio
                  .play()
                  .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                  })
                  .catch(() => {
                    // Ignorar errores de reproducción
                  });
              }
            };

            const handleError = () => {
              // Aún así lo agregamos al cache aunque haya error
              audioCache.current.set(track.fileName, audio);
              updateProgress();
              audio.removeEventListener("canplaythrough", handleCanPlayThrough);
              audio.removeEventListener("error", handleError);
              audio.removeEventListener("loadeddata", handleLoadedData);
              resolve();
            };

            audio.addEventListener("canplaythrough", handleCanPlayThrough);
            audio.addEventListener("error", handleError);
            audio.addEventListener("loadeddata", handleLoadedData);

            // Establecer src y forzar la carga
            audio.src = track.audioUrl;
            audio.load();
          })
        );
      }

      // Esperar a que TODAS las imágenes y TODOS los audios estén cargados
      await Promise.all([...imagePromises, ...audioPromises]);
      setIsLoading(false);
    };

    preloadAssets();
  }, [initialTracks]);

  const copyTrackLink = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${globalThis.location.origin}?track=${encodeURIComponent(
      track.id
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTrackId(track.id);
      setTimeout(() => setCopiedTrackId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const playTrack = useCallback(
    (track: Track) => {
      if (currentTrack?.fileName === track.fileName) {
        togglePlay();
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
      }

      let audio = audioCache.current.get(track.fileName);
      if (!audio) {
        audio = new Audio(track.audioUrl);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audioCache.current.set(track.fileName, audio);
      }

      audio.currentTime = 0;
      audioRef.current = audio;
      audio.onloadedmetadata = () => setDuration(audio.duration);

      connectBass(audio);
      audio.play().catch((err) => {
        console.error("Play failed:", err);
      });

      setCurrentTrack(track);
      setCoverLoaded(false);
      setCoverSrc(track.coverUrl || null);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(audio.duration || 0);
    },
    [currentTrack, togglePlay, connectBass]
  );

  useEffect(() => {
    if (!isLoading && initialTracks.length > 0) {
      const trackId = searchParams.get("track");
      if (trackId) {
        const decodedTrackId = decodeURIComponent(trackId);
        const track = initialTracks.find((t) => t.id === decodedTrackId);
        if (
          track &&
          currentTrack?.id !== track.id &&
          !autoPlayExecuted.current
        ) {
          autoPlayExecuted.current = true;
          setPendingAutoPlay(track);
        }
      } else {
        autoPlayExecuted.current = false;
        setPendingAutoPlay(null);
      }
    }
  }, [isLoading, searchParams, initialTracks, currentTrack]);

  const handlePendingAutoPlay = useCallback(() => {
    if (pendingAutoPlay) {
      const playWhenReady = () => {
        const audio = audioCache.current.get(pendingAutoPlay.fileName);
        if (audio && audio.readyState >= 2) {
          playTrack(pendingAutoPlay);
          setPendingAutoPlay(null);
        } else {
          setTimeout(playWhenReady, 100);
        }
      };
      playWhenReady();
    }
  }, [pendingAutoPlay, playTrack]);

  const playNext = () => {
    if (!currentTrack || initialTracks.length === 0) return;
    const currentIndex = initialTracks.findIndex(
      (t) => t.fileName === currentTrack.fileName
    );
    const nextIndex = (currentIndex + 1) % initialTracks.length;
    playTrack(initialTracks[nextIndex]);
  };

  const playPrev = () => {
    if (!currentTrack || initialTracks.length === 0) return;
    const currentIndex = initialTracks.findIndex(
      (t) => t.fileName === currentTrack.fileName
    );
    const prevIndex =
      currentIndex <= 0 ? initialTracks.length - 1 : currentIndex - 1;
    playTrack(initialTracks[prevIndex]);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      const currentIndex = initialTracks.findIndex(
        (t) => t.fileName === currentTrack?.fileName
      );
      const nextIndex = (currentIndex + 1) % initialTracks.length;
      playTrack(initialTracks[nextIndex]);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
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
        </div>
      </div>
    );
  }

  if (pendingAutoPlay) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50 p-4">
        <div className="flex flex-col items-center gap-8 w-full max-w-md text-center">
          <div className="flex items-center gap-3 mb-4">
            <img src="/favicon.svg" alt="Muscly" className="w-6 h-6" />
            <h1 className="text-2xl font-black tracking-tighter">MUSCLY</h1>
          </div>

          <div className="relative w-full max-w-sm">
            <div className="absolute -inset-8 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-transparent rounded-3xl blur-3xl opacity-50" />
            <div className="relative aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 group cursor-pointer" onClick={handlePendingAutoPlay}>
              {pendingAutoPlay.coverUrl ? (
                <img
                  src={pendingAutoPlay.coverUrl}
                  alt={pendingAutoPlay.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                  <Music size={80} />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <button
                  onClick={handlePendingAutoPlay}
                  className="h-20 w-20 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  <Play size={32} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 w-full">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {pendingAutoPlay.title}
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                {pendingAutoPlay.released ? (
                  <span className="text-green-500 font-medium">Released</span>
                ) : (
                  <span>Unreleased</span>
                )}
                {pendingAutoPlay.notLicenced && (
                  <>
                    <span>•</span>
                    <span className="text-orange-500 font-medium">
                      not licenced
                    </span>
                  </>
                )}
                <span>•</span>
                <span>WAV</span>
              </div>
            </div>

            <p className="text-neutral-500 text-xs font-medium uppercase tracking-wider">
              Click to start playback
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-neutral-950 text-neutral-50">
      {/* Left: Player */}
      <div className="w-full md:w-1/2 lg:w-2/5 p-4 md:p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-neutral-800 min-h-[50vh] md:h-screen md:max-h-screen md:overflow-y-auto relative">
        <div className="absolute top-4 md:top-6 left-4 md:left-6 flex items-center gap-2">
          <img
            src="/favicon.svg"
            alt="Muscly"
            className="w-5 h-5 md:w-6 md:h-6"
          />
          <h1 className="text-lg md:text-xl font-bold tracking-tighter">
            MUSCLY
          </h1>
        </div>

        <div className="w-full max-w-sm space-y-4 md:space-y-8 mt-10 md:mt-0 py-4 md:py-0">
          <div className="relative reduce-cover mx-auto">
            <div
              className="absolute -inset-4 reduce-blur rounded-3xl opacity-60 blur-2xl transition-all duration-75"
              style={{
                background: bassData.subPeak
                  ? `radial-gradient(circle, rgba(168,85,247,${Math.min(
                      0.8,
                      bassData.subNormalized
                    )}) 0%, rgba(139,92,246,${Math.min(
                      0.4,
                      bassData.subNormalized * 0.5
                    )}) 50%, transparent 70%)`
                  : "transparent",
                transform: `scale(${
                  1 + (bassData.subPeak ? bassData.subNormalized * 0.15 : 0)
                })`,
                transition: "all 0.1s ease-out",
              }}
            />
            <div
              className="aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative group transition-transform duration-75"
              style={{
                transform: bassData.subPeak ? "scale(1.02)" : "scale(1)",
                borderColor: bassData.subPeak
                  ? "rgba(168,85,247,0.5)"
                  : undefined,
              }}
            >
              {coverSrc ? (
                <>
                  {!coverLoaded && (
                    <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
                  )}
                  <img
                    src={coverSrc}
                    alt="Cover"
                    className={cn(
                      "w-full h-full object-cover",
                      !coverLoaded && "opacity-0"
                    )}
                    onLoad={() => setCoverLoaded(true)}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                  <Music size={80} />
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-center gap-2 reduce-808 transition-opacity duration-200",
              bassData.peak ? "opacity-100" : "opacity-30 blur-[1px]"
            )}
          >
            <div className="flex items-end gap-[3px] h-4">
              {[0.3, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3].map((mult, i) => (
                <div
                  key={i}
                  className="w-1 bg-purple-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, bassData.normalized * 16 * mult)}px`,
                    opacity: bassData.peak ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-purple-400/70 uppercase tracking-wider">
              808
            </span>
          </div>

          <div className="w-full">
            <SpectrumVisualizer
              data={bassData.frequencyData}
              width={300}
              height={50}
            />
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl md:text-2xl font-bold truncate">
                {currentTrack?.title || "Select a track"}
              </h2>
              <p className="text-neutral-500 text-xs md:text-sm font-medium">
                {currentTrack ? "Playing Now" : "Ready to play"}
              </p>
            </div>

            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  setCurrentTime(time);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                  }
                }}
                onPointerDown={() => {
                  isSeekingRef.current = true;
                }}
                onPointerUp={() => {
                  isSeekingRef.current = false;
                }}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
              <div className="flex justify-between text-xs text-neutral-500 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 md:gap-8">
              <button
                onClick={playPrev}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipBack size={20} className="md:w-6 md:h-6" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="h-14 w-14 md:h-16 md:w-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isPlaying ? (
                  <Pause
                    size={24}
                    className="md:w-7 md:h-7"
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={24}
                    className="md:w-7 md:h-7 ml-0.5 md:ml-1"
                    fill="currentColor"
                  />
                )}
              </button>
              <button
                onClick={playNext}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipForward size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Track List */}
      <div className="w-full md:w-1/2 lg:w-3/5 bg-neutral-950 md:h-screen md:max-h-screen overflow-y-auto p-4 md:p-8 lg:p-12">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
              Library
            </h2>
            <p className="text-neutral-500 text-xs md:text-sm">Local tracks</p>
          </div>

          <div className="grid gap-1.5 md:gap-2">
            {initialTracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={cn(
                  "group flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-lg md:rounded-xl cursor-pointer transition-all border border-transparent",
                  currentTrack?.fileName === track.fileName
                    ? "bg-neutral-900 border-neutral-800"
                    : "hover:bg-neutral-900/50 hover:border-neutral-800/50"
                )}
              >
                <span className="text-neutral-600 font-mono text-xs md:text-sm w-4 md:w-5 text-right">
                  {index + 1}
                </span>
                <div className="relative h-10 w-10 md:h-12 md:w-12 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-600">
                      <Music size={18} className="md:w-5 md:h-5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity",
                      currentTrack?.fileName === track.fileName
                        ? "opacity-100"
                        : "group-hover:opacity-100"
                    )}
                  >
                    {currentTrack?.fileName === track.fileName && isPlaying ? (
                      <div className="music-bar-animation gap-[2px] flex items-end h-2.5 md:h-3">
                        <span className="w-[2px] bg-white h-full animate-pulse"></span>
                        <span className="w-[2px] bg-white h-2/3 animate-pulse delay-75"></span>
                        <span className="w-[2px] bg-white h-1/2 animate-pulse delay-150"></span>
                      </div>
                    ) : (
                      <Play size={14} className="md:w-4 md:h-4" fill="white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "font-medium truncate text-sm md:text-base",
                      currentTrack?.fileName === track.fileName
                        ? "text-white"
                        : "text-neutral-300"
                    )}
                  >
                    {track.title}
                  </h3>
                  <p className="text-[10px] md:text-xs text-neutral-500 truncate flex items-center gap-1">
                    {track.released ? (
                      <a
                        href={track.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-500 hover:text-green-400 font-medium"
                      >
                        Released
                      </a>
                    ) : (
                      <span className="text-neutral-500 font-medium">
                        Unreleased
                      </span>
                    )}
                    {track.notLicenced && (
                      <>
                        <span>•</span>
                        <span className="text-orange-500 font-medium">
                          not licenced
                        </span>
                      </>
                    )}
                    <span>•</span> WAV
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[10px] md:text-xs text-neutral-600 font-mono">
                    {track.duration}
                  </div>
                  <button
                    onClick={(e) => copyTrackLink(track, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-neutral-800 rounded"
                    title="Copy track link"
                  >
                    {copiedTrackId === track.id ? (
                      <Check
                        size={14}
                        className="md:w-4 md:h-4 text-green-500"
                      />
                    ) : (
                      <Copy
                        size={14}
                        className="md:w-4 md:h-4 text-neutral-400 hover:text-white"
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
