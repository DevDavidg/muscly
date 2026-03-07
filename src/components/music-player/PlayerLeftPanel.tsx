"use client";

import {
  Play,
  Pause,
  Music,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SpectrumVisualizer from "../SpectrumVisualizer";
import TrackThemeAnalyzer from "../TrackThemeAnalyzer";

interface PlayerLeftPanelProps {
  coverSrc: string | null;
  coverLoaded: boolean;
  coverImgRef: React.RefObject<HTMLImageElement | null>;
  setCoverSrc: (src: string | null) => void;
  setCoverLoaded: (loaded: boolean) => void;
  bassData: {
    frequencyData: Uint8Array;
    warmth: number;
    brightness: number;
    motion: number;
    intensity: number;
    subPeak: boolean;
    peak: boolean;
    normalized: number;
    subNormalized: number;
  };
  currentTime: number;
  duration: number;
  currentTrack: { title: string } | null;
  stableThemeLabel: string;
  volume: number;
  isPlaying: boolean;
  coverAuraStyle: React.CSSProperties;
  onSeek: (time: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  onVolumeChange: (v: number) => void;
  onTogglePlay: () => void;
  onPlayPrev: () => void;
  onPlayNext: () => void;
  formatTime: (time: number) => string;
}

export default function PlayerLeftPanel({
  coverSrc,
  coverLoaded,
  coverImgRef,
  setCoverSrc,
  setCoverLoaded,
  bassData,
  currentTime,
  duration,
  currentTrack,
  stableThemeLabel,
  volume,
  isPlaying,
  coverAuraStyle,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onVolumeChange,
  onTogglePlay,
  onPlayPrev,
  onPlayNext,
  formatTime,
}: PlayerLeftPanelProps) {
  const w = Number.isFinite(bassData.warmth) ? bassData.warmth : 0;
  const b = Number.isFinite(bassData.brightness) ? bassData.brightness : 0;
  const m = Number.isFinite(bassData.motion) ? bassData.motion : 0;
  const i = Number.isFinite(bassData.intensity) ? bassData.intensity : 0;
  const sn = Number.isFinite(bassData.subNormalized) ? bassData.subNormalized : 0;

  return (
    <div className="relative flex w-full min-h-[50vh] flex-col border-b border-neutral-800 p-4 md:h-screen md:max-h-screen md:w-1/2 md:flex-shrink-0 md:border-b-0 md:border-r md:p-6 lg:w-2/5">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2">
        <img src="/favicon.svg" alt="Muscly" className="w-5 h-5 md:w-6 md:h-6" />
        <h1 className="text-lg font-bold tracking-tighter md:text-xl">MUSCLY</h1>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col pt-11 md:pt-12">
        <div className="mx-auto w-full max-w-xs flex-shrink-0 px-1 pt-4 pb-2 sm:max-w-sm md:pb-3">
          <div className="relative reduce-cover mx-auto w-full overflow-visible">
            <div
              className="absolute -inset-7 rounded-[2rem] blur-3xl transition-all duration-150"
              style={coverAuraStyle}
            />
            <div
              className="absolute -inset-4 reduce-blur rounded-3xl opacity-60 blur-2xl transition-all duration-200"
              style={{
                background: bassData.subPeak
                  ? `radial-gradient(circle, rgba(168,85,247,${Math.min(0.8, sn)}) 0%, rgba(139,92,246,${Math.min(0.4, sn * 0.5)}) 50%, transparent 70%)`
                  : "transparent",
                transform: `scale(${1 + (bassData.subPeak ? sn * 0.05 : 0)})`,
                transition: "transform 0.2s ease-out",
              }}
            />
            <div
              className="aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative group transition-transform duration-200"
              style={{
                transform: `scale(${1 + i * 0.003 + (bassData.subPeak ? 0.006 : 0)})`,
                borderColor: bassData.subPeak ? "rgba(168,85,247,0.5)" : undefined,
                boxShadow: `0 30px 70px rgba(0,0,0,0.45), 0 0 45px rgba(168,85,247,${0.08 + i * 0.28})`,
              }}
            >
              {coverSrc ? (
                <img
                  ref={coverImgRef}
                  src={coverSrc}
                  alt="Cover"
                  className="w-full h-full object-cover"
                  onLoad={() => setCoverLoaded(true)}
                  onError={() => {
                    setCoverSrc(null);
                    setCoverLoaded(true);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                  <Music size={80} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto flex w-full max-w-xs flex-col items-stretch gap-4 px-1 py-2 sm:max-w-sm md:gap-5 md:py-4">
          <div
            className={cn(
              "flex items-center justify-center gap-2 reduce-808 transition-opacity duration-200",
              bassData.peak ? "opacity-100" : "opacity-30 blur-[1px]"
            )}
          >
            <div className="flex items-end gap-[2px] h-3">
              {[0.3, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3].map((mult, idx) => (
                <div
                  key={idx}
                  className="w-0.5 bg-purple-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(3, (Number.isFinite(bassData.normalized) ? bassData.normalized : 0) * 12 * mult)}px`,
                    opacity: bassData.peak ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-purple-400/70 uppercase tracking-wider">
              808
            </span>
          </div>

          <SpectrumVisualizer
            data={bassData.frequencyData}
            warmth={bassData.warmth}
            brightness={bassData.brightness}
            motion={bassData.motion}
            intensity={bassData.intensity}
          />

          <TrackThemeAnalyzer
            themeLabel={stableThemeLabel}
            warmth={bassData.warmth}
            brightness={bassData.brightness}
            motion={bassData.motion}
            intensity={bassData.intensity}
            subPeak={bassData.subPeak}
          />

          <div className="space-y-3 pt-1 md:space-y-4">
            <div className="space-y-1 text-center">
              <h2 className="text-xl md:text-2xl font-bold truncate">
                {currentTrack?.title || "Select a track"}
              </h2>
              <p className="text-neutral-500 text-xs md:text-sm font-medium">
                {currentTrack
                  ? `Playing Now • ${stableThemeLabel}`
                  : "Ready to play"}
              </p>
            </div>

            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.01}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                onPointerDown={onSeekStart}
                onPointerUp={onSeekEnd}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.85) ${duration ? (currentTime / duration) * 100 : 0}%, rgb(38,38,38) ${duration ? (currentTime / duration) * 100 : 0}%)`,
                  borderRadius: "9999px",
                }}
              />
              <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 md:gap-8">
              <button
                onClick={onPlayPrev}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipBack size={20} className="md:w-6 md:h-6" />
              </button>
              <button
                onClick={onTogglePlay}
                disabled={!currentTrack}
                className="h-14 w-14 md:h-16 md:w-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {isPlaying ? (
                  <Pause size={24} className="md:w-7 md:h-7" fill="currentColor" />
                ) : (
                  <Play size={24} className="md:w-7 md:h-7 ml-0.5 md:ml-1" fill="currentColor" />
                )}
              </button>
              <button
                onClick={onPlayNext}
                disabled={!currentTrack}
                className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <SkipForward size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.5) ${volume * 100}%, rgb(38,38,38) ${volume * 100}%)`,
                  borderRadius: "9999px",
                }}
              />
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
