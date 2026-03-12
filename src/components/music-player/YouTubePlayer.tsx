"use client";

import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          events?: { onReady?: (ev: { target: YTPlayer }) => void };
        }
      ) => YTPlayer;
      PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number };
    };
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  playerRef: React.MutableRefObject<{
    play: () => void;
    pause: () => void;
    seekTo: (s: number) => void;
  } | null>;
  onDuration: (d: number) => void;
  onTimeUpdate: (t: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

const SCRIPT_URL = "https://www.youtube.com/iframe_api";
const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;

export default function YouTubePlayer({
  videoId,
  playerRef,
  onDuration,
  onTimeUpdate,
  onPlayingChange,
}: YouTubePlayerProps) {
  const containerId = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!videoId) return;

    let lastDuration = 0;
    const startPolling = (player: YTPlayer) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        const t = player.getCurrentTime();
        const state = player.getPlayerState();
        const d = player.getDuration();
        if (Number.isFinite(d) && d > 0 && d !== lastDuration) {
          lastDuration = d;
          onDuration(d);
        }
        onTimeUpdate(t);
        onPlayingChange(state === PLAYING);
        if (state === ENDED) onPlayingChange(false);
      }, 250);
    };

    const initPlayer = () => {
      const win = globalThis as Window;
      if (!win.YT) return;
      const yt = win.YT;
      const ytPlayer = new yt.Player(containerId, {
        videoId,
        playerVars: {
          origin: win.location?.origin ?? "",
        },
        events: {
          onReady(ev: { target: YTPlayer }) {
            const p = ev.target;
            playerInstanceRef.current = p;
            const d = p.getDuration();
            if (Number.isFinite(d) && d > 0) onDuration(d);
            playerRef.current = {
              play: () => p.playVideo(),
              pause: () => p.pauseVideo(),
              seekTo: (s: number) => p.seekTo(s),
            };
            startPolling(p);
          },
        },
      });
    };

    if ((globalThis as Window).YT) {
      initPlayer();
      return () => {
        playerRef.current = null;
        playerInstanceRef.current = null;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }

    const win = globalThis as Window;
    const prev = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      prev?.();
      initPlayer();
    };

    const tag = document.createElement("script");
    tag.src = SCRIPT_URL;
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(tag, first);

    return () => {
      win.onYouTubeIframeAPIReady = prev;
      playerRef.current = null;
      playerInstanceRef.current = null;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    videoId,
    containerId,
    playerRef,
    onDuration,
    onTimeUpdate,
    onPlayingChange,
  ]);

  return (
    <div
      id={containerId}
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ aspectRatio: "1" }}
    />
  );
}
