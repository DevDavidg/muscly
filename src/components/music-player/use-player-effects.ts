"use client";

import { useEffect, useRef } from "react";
import { Track } from "@/lib/data";

interface UsePlayerEffectsParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isSeekingRef: React.MutableRefObject<boolean>;
  currentTrack: Track | null;
  volume: number;
  initialTracks: Track[];
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  setVolume: (v: number | ((prev: number) => number)) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  playTrack: (track: Track) => void;
  finalizeTrackAnalysis: () => void;
}

export function usePlayerEffects({
  audioRef,
  isSeekingRef,
  currentTrack,
  volume,
  initialTracks,
  setCurrentTime,
  setDuration,
  setIsPlaying,
  setVolume,
  togglePlay,
  playNext,
  playPrev,
  playTrack,
  finalizeTrackAnalysis,
}: UsePlayerEffectsParams) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
        setDuration(
          Number.isFinite(audio.duration) ? audio.duration : 0
        );
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      finalizeTrackAnalysis();
      const currentIndex = initialTracks.findIndex(
        (t) => t.fileName === currentTrack?.fileName
      );
      const nextIndex = (currentIndex + 1) % initialTracks.length;
      playTrack(initialTracks[nextIndex]);
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, currentTrack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement &&
        (e.target as HTMLInputElement).type !== "range"
      )
        return;
      if (e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          playNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playPrev();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, +(v + 0.05).toFixed(2)));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, +(v - 0.05).toFixed(2)));
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, playNext, playPrev]);
}
