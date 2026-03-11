"use client";

import { useState, useEffect } from "react";
import type { MusicPlayerProps } from "./music-player-types";
import { useMusicPlayer } from "./use-music-player";
import PlayerLoadingScreen from "./PlayerLoadingScreen";
import PendingAutoPlayScreen from "./PendingAutoPlayScreen";
import TrackResultToast from "./TrackResultToast";
import PlayerLeftPanel from "./PlayerLeftPanel";
import TrackLibrary from "./TrackLibrary";

function LocalFallbackToast() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="absolute top-3 right-3 z-10 max-w-[280px] rounded-lg bg-neutral-800/95 px-3 py-2 text-[11px] text-neutral-400 shadow-lg backdrop-blur-sm transition-opacity duration-300"
      role="status"
    >
      Sin DATABASE_URL: usando temas locales. En Vercel: Project Settings → Environment Variables → añade DATABASE_URL con la connection string de Neon.
    </div>
  );
}

export default function MusicPlayer({
  initialTracks,
  localFallback = false,
}: MusicPlayerProps) {
  const player = useMusicPlayer(initialTracks);
  const audioRef = player.audioRef;

  const handleSeek = (time: number) => {
    player.setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleSeekStart = () => {
    player.isSeekingRef.current = true;
  };

  const handleSeekEnd = () => {
    player.isSeekingRef.current = false;
  };

  if (player.isLoading) {
    return (
      <PlayerLoadingScreen
        loadProgress={player.loadProgress}
        loadStatus={player.loadStatus}
        loadElapsedMs={player.loadElapsedMs}
      />
    );
  }

  if (player.pendingAutoPlay) {
    return (
      <PendingAutoPlayScreen
        track={player.pendingAutoPlay}
        pendingCoverError={player.pendingCoverError}
        onCoverError={() => player.setPendingCoverError(true)}
        onPlay={player.handlePendingAutoPlay}
      />
    );
  }

  const w = Number.isFinite(player.bassData.warmth) ? player.bassData.warmth : 0;
  const b = Number.isFinite(player.bassData.brightness)
    ? player.bassData.brightness
    : 0;
  const m = Number.isFinite(player.bassData.motion) ? player.bassData.motion : 0;
  const i = Number.isFinite(player.bassData.intensity)
    ? player.bassData.intensity
    : 0;

  const backdropStyle = {
    background: `
      radial-gradient(circle at 18% 22%, rgba(236,72,153,${0.05 + w * 0.18}) 0%, transparent 34%),
      radial-gradient(circle at 78% 18%, rgba(59,130,246,${0.05 + b * 0.2}) 0%, transparent 30%),
      radial-gradient(circle at 55% 80%, rgba(168,85,247,${0.08 + i * 0.24}) 0%, transparent 36%)
    `,
  };

  const coverAuraStyle = {
    background: `conic-gradient(from ${player.currentTime * 38}deg, rgba(244,114,182,${0.18 + w * 0.4}), rgba(168,85,247,${0.22 + i * 0.45}), rgba(34,211,238,${0.16 + b * 0.38}), rgba(244,114,182,${0.18 + w * 0.4}))`,
    opacity: 0.35 + i * 0.45,
    transform: `scale(${1 + m * 0.08})`,
  } satisfies React.CSSProperties;

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-50 md:flex-row">
      {localFallback && (
        <LocalFallbackToast />
      )}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-200"
        style={backdropStyle}
      />
      {player.trackResultToast && (
        <TrackResultToast result={player.trackResultToast} />
      )}
      <PlayerLeftPanel
        coverSrc={player.coverSrc}
        coverLoaded={player.coverLoaded}
        coverImgRef={player.coverImgRef}
        setCoverSrc={player.setCoverSrc}
        setCoverLoaded={player.setCoverLoaded}
        bassData={player.bassData}
        currentTime={player.currentTime}
        duration={player.duration}
        currentTrack={player.currentTrack}
        stableThemeLabel={player.stableThemeLabel}
        volume={player.volume}
        isPlaying={player.isPlaying}
        trackLoading={player.trackLoading}
        coverAuraStyle={coverAuraStyle}
        onSeek={handleSeek}
        onSeekStart={handleSeekStart}
        onSeekEnd={handleSeekEnd}
        onVolumeChange={player.setVolume}
        onTogglePlay={player.togglePlay}
        onPlayPrev={player.playPrev}
        onPlayNext={player.playNext}
        formatTime={player.formatTime}
      />
      <TrackLibrary
        tracks={player.initialTracks}
        currentTrack={player.currentTrack}
        isPlaying={player.isPlaying}
        copiedTrackId={player.copiedTrackId}
        formatTime={player.formatTime}
        onPlayTrack={player.playTrack}
        onCopyLink={player.copyTrackLink}
      />
    </main>
  );
}
