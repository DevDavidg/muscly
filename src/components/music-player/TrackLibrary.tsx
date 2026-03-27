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
import { ALBUM_TITLE, LIBRARY_LABEL } from "@/lib/album-meta";
import type { Track } from "@/lib/data";
import { cn } from "@/lib/utils";

type VoteValue = 1 | -1 | 0;

interface TrackVoteSummary {
  likes: number;
  dislikes: number;
  score: number;
  userVote: VoteValue;
}

const subgenreToneByName: Record<string, string> = {
  Surf: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
  "Slime Trap": "border-lime-500/40 bg-lime-500/15 text-lime-300",
  "Cloud Trap": "border-sky-500/40 bg-sky-500/15 text-sky-300",
  "Dark Trap": "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Crank: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  "Boom Bap": "border-orange-500/40 bg-orange-500/15 text-orange-300",
  "Melodic Trap": "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
  "Goofy Trap": "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  "Hard Trap": "border-red-500/40 bg-red-500/15 text-red-300",
  "Atlanta Trap": "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
  "Emo Trap": "border-pink-500/40 bg-pink-500/15 text-pink-300",
  "Surf Trap": "border-teal-500/40 bg-teal-500/15 text-teal-300",
};

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
  const topThreeTracks = rankedTracks.slice(0, 3);
  const otherTracks = rankedTracks.slice(3);

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
    if (previous.userVote === 0) {
      if (vote === 1) {
        next.likes += 1;
        next.score += 1;
      } else {
        next.dislikes += 1;
        next.score -= 1;
      }
      next.userVote = vote;
    } else {
      next.userVote = 0;
    }
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
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-neutral-950 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:h-screen md:w-1/2 md:max-h-screen md:flex-none md:overflow-y-auto md:p-8 lg:w-3/5 lg:p-12">
      <div className="mx-auto w-full max-w-2xl space-y-3 max-md:max-w-none md:space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-neutral-500 text-[11px] font-semibold uppercase tracking-wider md:text-xs">
              {LIBRARY_LABEL}
            </p>
            <h2 className="text-xl md:text-2xl font-bold mb-0.5 tracking-tight">
              {ALBUM_TITLE}
            </h2>
            <p className="text-neutral-500 text-xs md:text-sm">
              {tracks.length} tracks · {totalMinutes} min
            </p>
          </div>
        </div>

        <div className="grid gap-1.5 md:gap-2">
          {topThreeTracks.length > 0 && (
            <div
              style={{
                borderWidth: "1.5px",
                borderStyle: "solid",
                borderImage:
                  "linear-gradient(135deg, #f59e0b, #ec4899, #22d3ee, #a78bfa, #34d399) 1",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.03), 0 10px 30px rgba(244,114,182,0.16)",
              }}
              className="rounded-xl p-1 md:p-1.5"
            >
              <div className="grid gap-1.5 md:gap-2">
                {topThreeTracks.map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack(track)}
                    className={cn(
                      "group flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:gap-3 md:gap-4 md:p-3 rounded-lg md:rounded-xl cursor-pointer transition-all border border-transparent",
                      currentTrack?.fileName === track.fileName
                        ? "bg-neutral-900 border-neutral-800"
                        : "bg-neutral-950/70 hover:bg-neutral-900/50 hover:border-neutral-800/50"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4">
                    <span className="text-neutral-600 font-mono text-xs md:text-sm w-4 md:w-5 shrink-0 text-right">
                      {index + 1}
                    </span>
                    <div className="relative h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-md overflow-hidden bg-neutral-800">
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
                      {track.subgenre && (
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium md:text-xs",
                            subgenreToneByName[track.subgenre] ??
                              "border-neutral-700 bg-neutral-800/70 text-neutral-300"
                          )}
                        >
                          {track.subgenre}
                        </span>
                      )}
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
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
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
                        className="rounded p-1.5 text-neutral-400 transition-opacity hover:bg-neutral-800 hover:text-white md:opacity-0 md:group-hover:opacity-100"
                        title="Descargar WAV"
                      >
                        <Download size={14} className="md:w-4 md:h-4" />
                      </a>
                      <button
                        onClick={(e) => onCopyLink(track, e)}
                        className="rounded p-1.5 transition-opacity hover:bg-neutral-800 md:opacity-0 md:group-hover:opacity-100"
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
          )}
          {otherTracks.map((track, index) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className={cn(
                "group flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:gap-3 md:gap-4 md:p-3 rounded-lg md:rounded-xl cursor-pointer transition-all border border-transparent",
                currentTrack?.fileName === track.fileName
                  ? "bg-neutral-900 border-neutral-800"
                  : "hover:bg-neutral-900/50 hover:border-neutral-800/50"
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4">
              <span className="text-neutral-600 font-mono text-xs md:text-sm w-4 md:w-5 shrink-0 text-right">
                {index + 4}
              </span>
              <div className="relative h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-md overflow-hidden bg-neutral-800">
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
                {track.subgenre && (
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium md:text-xs",
                      subgenreToneByName[track.subgenre] ??
                        "border-neutral-700 bg-neutral-800/70 text-neutral-300"
                    )}
                  >
                    {track.subgenre}
                  </span>
                )}
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
              </div>

              <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
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
                  className="rounded p-1.5 text-neutral-400 transition-opacity hover:bg-neutral-800 hover:text-white md:opacity-0 md:group-hover:opacity-100"
                  title="Descargar WAV"
                >
                  <Download size={14} className="md:w-4 md:h-4" />
                </a>
                <button
                  onClick={(e) => onCopyLink(track, e)}
                  className="rounded p-1.5 transition-opacity hover:bg-neutral-800 md:opacity-0 md:group-hover:opacity-100"
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
