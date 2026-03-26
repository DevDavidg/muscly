"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Music,
  Copy,
  Check,
  Play,
  Download,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Track } from "@/lib/data";
import { cn } from "@/lib/utils";

type VoteValue = 1 | -1 | 0;

interface TrackVoteSummary {
  likes: number;
  dislikes: number;
  score: number;
  userVote: VoteValue;
}

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
  const [votesByTrack, setVotesByTrack] = useState<Record<string, TrackVoteSummary>>(
    {}
  );
  const [savingVoteId, setSavingVoteId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const params = new URLSearchParams();
      for (const track of tracks) params.append("trackId", track.id);
      const response = await fetch(`/api/votes?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as Record<string, TrackVoteSummary>;
      setVotesByTrack(data);
    };
    load().catch(() => {});
    return () => controller.abort();
  }, [tracks]);

  const rankedTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        const scoreA = votesByTrack[a.id]?.score ?? 0;
        const scoreB = votesByTrack[b.id]?.score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.title.localeCompare(b.title);
      }),
    [tracks, votesByTrack]
  );

  const totalMinutes = Math.round(
    rankedTracks.reduce((s, t) => s + t.duration, 0) / 60
  );

  const voteTrack = async (track: Track, vote: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savingVoteId) return;
    setSavingVoteId(track.id);
    const previous = votesByTrack[track.id] ?? {
      likes: 0,
      dislikes: 0,
      score: 0,
      userVote: 0,
    };
    const next = { ...previous };
    if (previous.userVote === 1) {
      next.likes = Math.max(0, next.likes - 1);
      next.score -= 1;
    }
    if (previous.userVote === -1) {
      next.dislikes = Math.max(0, next.dislikes - 1);
      next.score += 1;
    }
    if (vote === 1) {
      next.likes += 1;
      next.score += 1;
    } else {
      next.dislikes += 1;
      next.score -= 1;
    }
    next.userVote = vote;
    setVotesByTrack((current) => ({ ...current, [track.id]: next }));

    const response = await fetch("/api/votes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trackId: track.id, vote }),
    });
    if (!response.ok) {
      setVotesByTrack((current) => ({ ...current, [track.id]: previous }));
    }
    setSavingVoteId(null);
  };

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
              {rankedTracks.map((track, index) => (
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
                <div className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-1.5 py-1">
                  <button
                    onClick={(e) => voteTrack(track, 1, e)}
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] md:text-xs transition-colors",
                      votesByTrack[track.id]?.userVote === 1
                        ? "bg-emerald-500/30 text-emerald-300"
                        : "text-neutral-400 hover:text-emerald-300"
                    )}
                    disabled={savingVoteId === track.id}
                  >
                    <ThumbsUp size={12} className="md:h-3.5 md:w-3.5" />
                    <span className="font-mono tabular-nums">
                      {votesByTrack[track.id]?.likes ?? 0}
                    </span>
                  </button>
                  <button
                    onClick={(e) => voteTrack(track, -1, e)}
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] md:text-xs transition-colors",
                      votesByTrack[track.id]?.userVote === -1
                        ? "bg-rose-500/30 text-rose-300"
                        : "text-neutral-400 hover:text-rose-300"
                    )}
                    disabled={savingVoteId === track.id}
                  >
                    <ThumbsDown size={12} className="md:h-3.5 md:w-3.5" />
                    <span className="font-mono tabular-nums">
                      {votesByTrack[track.id]?.dislikes ?? 0}
                    </span>
                  </button>
                </div>
                <div className="text-[10px] md:text-xs text-neutral-600 font-mono tabular-nums">
                  {formatTime(track.duration)}
                </div>
                <a
                  href={track.audioUrl}
                  download={track.fileName}
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white"
                  title="Descargar WAV"
                >
                  <Download size={14} className="md:w-4 md:h-4" />
                </a>
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
