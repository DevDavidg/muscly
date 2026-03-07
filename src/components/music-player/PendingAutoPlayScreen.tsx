"use client";

import { Play, Music } from "lucide-react";
import { Track } from "@/lib/data";

interface PendingAutoPlayScreenProps {
  track: Track;
  pendingCoverError: boolean;
  onCoverError: () => void;
  onPlay: () => void;
}

export default function PendingAutoPlayScreen({
  track,
  pendingCoverError,
  onCoverError,
  onPlay,
}: PendingAutoPlayScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50 p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-md text-center">
        <div className="flex items-center gap-3 mb-4">
          <img src="/favicon.svg" alt="Muscly" className="w-6 h-6" />
          <h1 className="text-2xl font-black tracking-tighter">MUSCLY</h1>
        </div>

        <div className="relative w-full max-w-sm">
          <div className="absolute -inset-8 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-transparent rounded-3xl blur-3xl opacity-50" />
          <div
            className="relative aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 group cursor-pointer"
            onClick={onPlay}
          >
            {track.coverUrl && !pendingCoverError ? (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={onCoverError}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                <Music size={80} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <button
                onClick={onPlay}
                className="h-20 w-20 flex items-center justify-center bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                <Play size={32} fill="currentColor" className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 w-full">
          <div>
            <h2 className="text-3xl font-bold mb-2">{track.title}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 flex-wrap">
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
                  {track.spotifyUrl && track.youtubeUrl && <span>•</span>}
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
                <span>Unreleased</span>
              )}
              {track.notLicenced && (
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
