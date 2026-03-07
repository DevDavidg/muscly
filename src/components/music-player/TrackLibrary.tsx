"use client";

import { Music, Copy, Check, Play } from "lucide-react";
import { Track } from "@/lib/data";
import { cn } from "@/lib/utils";

interface TrackLibraryProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  copiedTrackId: string | null;
  formatTime: (time: number) => string;
  onPlayTrack: (track: Track) => void;
  onCopyLink: (track: Track, e: React.MouseEvent) => void;
}

export default function TrackLibrary({
  tracks,
  currentTrack,
  isPlaying,
  copiedTrackId,
  formatTime,
  onPlayTrack,
  onCopyLink,
}: TrackLibraryProps) {
  const totalMinutes = Math.round(
    tracks.reduce((s, t) => s + t.duration, 0) / 60
  );

  return (
    <div className="w-full md:w-1/2 lg:w-3/5 bg-neutral-950 md:h-screen md:max-h-screen overflow-y-auto p-4 md:p-8 lg:p-12">
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-0.5">Library</h2>
            <p className="text-neutral-500 text-xs md:text-sm">
              {tracks.length} tracks · {totalMinutes} min
            </p>
          </div>
        </div>

        <div className="grid gap-1.5 md:gap-2">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
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
                <p className="text-[10px] md:text-xs text-neutral-500 truncate flex items-center gap-1 flex-wrap">
                  {track.released ? (
                    <>
                      {track.spotifyUrl && (
                        <a
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-500 hover:text-green-400 font-medium"
                        >
                          Spotify
                        </a>
                      )}
                      {track.spotifyUrl && track.youtubeUrl && (
                        <span className="text-neutral-600">•</span>
                      )}
                      {track.youtubeUrl && (
                        <a
                          href={track.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-500 hover:text-green-400 font-medium"
                        >
                          YouTube
                        </a>
                      )}
                    </>
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

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[10px] md:text-xs text-neutral-600 font-mono tabular-nums">
                  {formatTime(track.duration)}
                </div>
                <button
                  onClick={(e) => onCopyLink(track, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-neutral-800 rounded"
                  title="Copy track link"
                >
                  {copiedTrackId === track.id ? (
                    <Check size={14} className="md:w-4 md:h-4 text-green-500" />
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
  );
}
