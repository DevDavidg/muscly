"use client";

import { useState, useRef, useEffect } from "react";
import { Track } from "@/lib/data";
import { preloadAssets } from "./preload-assets";

export function useAudioPreload(initialTracks: Track[]) {
  const [isLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("");
  const [loadElapsedMs, setLoadElapsedMs] = useState(0);
  const loadStartedAt = useRef<number>(0);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (initialTracks.length === 0) return;
    setLoadElapsedMs(0);
    loadStartedAt.current = Date.now();
    const total = initialTracks.length + (initialTracks[0]?.coverUrl ? 1 : 0);
    preloadAssets(
      initialTracks,
      audioCache.current,
      (loaded, t, current) => {
        setLoadProgress(Math.round((loaded / (t || total)) * 100));
        setLoadStatus(current);
      }
    ).then(() => {});
  }, [initialTracks]);

  useEffect(() => {
    if (!isLoading) return;
    const t = setInterval(() => {
      setLoadElapsedMs(Date.now() - loadStartedAt.current);
    }, 500);
    return () => clearInterval(t);
  }, [isLoading]);

  return {
    isLoading,
    loadProgress,
    loadStatus,
    loadElapsedMs,
    audioCache,
  };
}
