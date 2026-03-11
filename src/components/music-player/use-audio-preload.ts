"use client";

import { useRef } from "react";
import { Track } from "@/lib/data";

export function useAudioPreload(_initialTracks: Track[]) {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
  return {
    isLoading: false,
    loadProgress: 100,
    loadStatus: "",
    loadElapsedMs: 0,
    audioCache,
  };
}
