"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Music, SkipBack, SkipForward } from "lucide-react";
import { Track } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  initialTracks: Track[];
}

export default function MusicPlayer({ initialTracks }: MusicPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    const preloadAssets = async () => {
      const imagePromises: Promise<void>[] = [];
      const tracksWithCovers = initialTracks.filter((t) => t.coverName);
      const totalImages = tracksWithCovers.length;
      let loaded = 0;

      const updateProgress = () => {
        loaded++;
        setLoadProgress(Math.round((loaded / totalImages) * 100));
      };

      for (const track of tracksWithCovers) {
        imagePromises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              updateProgress();
              resolve();
            };
            img.onerror = () => {
              updateProgress();
              resolve();
            };
            img.src = `/api/media?file=${encodeURIComponent(track.coverName!)}`;
          })
        );
      }

      await Promise.all(imagePromises);
      setIsLoading(false);

      for (const track of initialTracks) {
        const audio = new Audio();
        audio.preload = "auto";
        audio.oncanplaythrough = () => {
          audioCache.current.set(track.fileName, audio);
        };
        audio.src = `/api/media?file=${encodeURIComponent(track.fileName)}`;
      }
    };

    preloadAssets();
  }, [initialTracks]);

  const playTrack = (track: Track) => {
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
      audio = new Audio(
        `/api/media?file=${encodeURIComponent(track.fileName)}`
      );
      audio.preload = "auto";
      audioCache.current.set(track.fileName, audio);
    }

    audio.currentTime = 0;
    audioRef.current = audio;
    audio.ontimeupdate = onTimeUpdate;
    audio.onended = () => setIsPlaying(false);
    audio.onloadedmetadata = () => setDuration(audio!.duration);
    audio.play();

    setCurrentTrack(track);
    setCoverLoaded(false);
    setCoverSrc(
      track.coverName
        ? `/api/media?file=${encodeURIComponent(track.coverName)}`
        : null
    );
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(audio.duration || 0);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

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

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current && !isSeekingRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

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

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-neutral-950 text-neutral-50">
      {/* Left: Player */}
      <div className="w-full md:w-1/2 lg:w-2/5 p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-neutral-800 min-h-[50vh] md:h-screen relative">
        <div className="absolute top-6 left-6">
          <h1 className="text-xl font-bold tracking-tighter">MUSCLY</h1>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative group">
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

          <div className="space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-bold truncate">
                {currentTrack?.title || "Select a track"}
              </h2>
              <p className="text-neutral-500 text-sm font-medium">
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

            <div className="flex items-center justify-center gap-8">
              <button
                onClick={playPrev}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={togglePlay}
                disabled={!currentTrack}
                className="h-16 w-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </button>
              <button
                onClick={playNext}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipForward size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Track List */}
      <div className="w-full md:w-1/2 lg:w-3/5 bg-neutral-950 md:h-screen overflow-y-auto p-6 md:p-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Library</h2>
            <p className="text-neutral-500 text-sm">Local tracks</p>
          </div>

          <div className="grid gap-2">
            {initialTracks.map((track, index) => (
              <div
                key={track.id}
                onClick={() => playTrack(track)}
                className={cn(
                  "group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                  currentTrack?.fileName === track.fileName
                    ? "bg-neutral-900 border-neutral-800"
                    : "hover:bg-neutral-900/50 hover:border-neutral-800/50"
                )}
              >
                <span className="text-neutral-600 font-mono text-sm w-5 text-right">
                  {index + 1}
                </span>
                <div className="relative h-12 w-12 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                  {track.coverName ? (
                    <img
                      src={`/api/media?file=${encodeURIComponent(
                        track.coverName
                      )}`}
                      alt={track.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-neutral-600">
                      <Music size={20} />
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
                      <div className="music-bar-animation gap-[2px] flex items-end h-3">
                        <span className="w-[2px] bg-white h-full animate-pulse"></span>
                        <span className="w-[2px] bg-white h-2/3 animate-pulse delay-75"></span>
                        <span className="w-[2px] bg-white h-1/2 animate-pulse delay-150"></span>
                      </div>
                    ) : (
                      <Play size={16} fill="white" className="text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "font-medium truncate",
                      currentTrack?.fileName === track.fileName
                        ? "text-white"
                        : "text-neutral-300"
                    )}
                  >
                    {track.title}
                  </h3>
                  <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
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
                    <span>•</span> WAV
                  </p>
                </div>

                <div className="text-xs text-neutral-600 font-mono">
                  {track.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
