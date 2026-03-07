"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Track } from "@/lib/data";
import { useBassDetector } from "@/lib/use-bass-detector";
import type { TrackAnalysisSnapshot, TrackResultToast } from "./music-player-types";
import { useAudioPreload } from "./use-audio-preload";
import { usePlayerEffects } from "./use-player-effects";
import { useThemeAnalysis } from "./use-theme-analysis";
import {
  createTrackAnalysisSnapshot,
  getDisplayThemeLabel as getThemeLabel,
} from "./track-analysis-utils";

export function useMusicPlayer(initialTracks: Track[]) {
  const searchParams = useSearchParams();
  const { isLoading, loadProgress, loadStatus, loadElapsedMs, audioCache } =
    useAudioPreload(initialTracks);

  const [copiedTrackId, setCopiedTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingAutoPlay, setPendingAutoPlay] = useState<Track | null>(null);
  const [pendingCoverError, setPendingCoverError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [stableThemeLabel, setStableThemeLabel] = useState("Idle");
  const [trackResultToast, setTrackResultToast] =
    useState<TrackResultToast | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);
  const isSeekingRef = useRef(false);
  const autoPlayExecuted = useRef(false);
  const themeCandidateRef = useRef({ label: "Idle", count: 0 });
  const trackAnalysisRef = useRef<TrackAnalysisSnapshot | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { bassData, connect: connectBass } = useBassDetector({
    enabled: true,
    threshold: 1.4,
  });

  const getDisplayThemeLabel = useCallback(
    (themeLabel: string, subPeak: boolean, intensity: number) =>
      getThemeLabel(themeLabel, subPeak, intensity),
    []
  );

  const showTrackResultToast = useCallback((result: TrackResultToast) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setTrackResultToast(result);
    toastTimeoutRef.current = setTimeout(() => {
      setTrackResultToast(null);
      toastTimeoutRef.current = null;
    }, 5200);
  }, []);

  const finalizeTrackAnalysis = useCallback(() => {
    const snapshot = trackAnalysisRef.current;
    if (!snapshot || snapshot.samples < 20) return;
    const theme =
      Object.entries(snapshot.themeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "Balanced";
    showTrackResultToast({
      title: snapshot.title,
      theme,
      drive: Math.round((snapshot.intensitySum / snapshot.samples) * 100),
      warmth: Math.round((snapshot.warmthSum / snapshot.samples) * 100),
      brightness: Math.round((snapshot.brightnessSum / snapshot.samples) * 100),
      motion: Math.round((snapshot.motionSum / snapshot.samples) * 100),
      peaks: snapshot.peakCount,
      subPeaks: snapshot.subPeakCount,
    });
  }, [showTrackResultToast]);

  const copyTrackLink = async (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${globalThis.location.origin}?track=${encodeURIComponent(track.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedTrackId(track.id);
      setTimeout(() => setCopiedTrackId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const playTrack = useCallback(
    (track: Track) => {
      if (currentTrack?.fileName === track.fileName) {
        togglePlay();
        return;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.ontimeupdate = null;
        audioRef.current.onended = null;
      }
      let audio = audioCache.current.get(track.fileName);
      if (!audio) {
        audio = new Audio(track.audioUrl);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audioCache.current.set(track.fileName, audio);
      }
      audio.currentTime = 0;
      audioRef.current = audio;
      audio.onloadedmetadata = () => setDuration(audio.duration);
      connectBass(audio);
      audio.play().catch((err) => {
        if (err?.name !== "AbortError") console.error("Play failed:", err);
      });
      setCurrentTrack(track);
      setCoverLoaded(false);
      setCoverSrc(track.coverUrl || null);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(audio.duration || 0);
      setStableThemeLabel("Idle");
      themeCandidateRef.current = { label: "Idle", count: 0 };
      trackAnalysisRef.current = createTrackAnalysisSnapshot(track);
    },
    [currentTrack, togglePlay, connectBass]
  );

  useEffect(() => {
    if (!isLoading && initialTracks.length > 0) {
      const trackId = searchParams.get("track");
      if (trackId) {
        const decodedTrackId = decodeURIComponent(trackId);
        const track = initialTracks.find((t) => t.id === decodedTrackId);
        if (
          track &&
          currentTrack?.id !== track.id &&
          !autoPlayExecuted.current
        ) {
          autoPlayExecuted.current = true;
          setPendingCoverError(false);
          setPendingAutoPlay(track);
        }
      } else {
        autoPlayExecuted.current = false;
        setPendingAutoPlay(null);
      }
    }
  }, [isLoading, searchParams, initialTracks, currentTrack]);

  const handlePendingAutoPlay = useCallback(() => {
    if (pendingAutoPlay) {
      const playWhenReady = () => {
        const audio = audioCache.current.get(pendingAutoPlay.fileName);
        if (audio && audio.readyState >= 2) {
          playTrack(pendingAutoPlay);
          setPendingAutoPlay(null);
        } else {
          setTimeout(playWhenReady, 100);
        }
      };
      playWhenReady();
    }
  }, [pendingAutoPlay, playTrack]);

  const playNext = useCallback(() => {
    if (!currentTrack || initialTracks.length === 0) return;
    const currentIndex = initialTracks.findIndex(
      (t) => t.fileName === currentTrack.fileName
    );
    const nextIndex = (currentIndex + 1) % initialTracks.length;
    playTrack(initialTracks[nextIndex]);
  }, [currentTrack, initialTracks, playTrack]);

  const playPrev = useCallback(() => {
    if (!currentTrack || initialTracks.length === 0) return;
    const currentIndex = initialTracks.findIndex(
      (t) => t.fileName === currentTrack.fileName
    );
    const prevIndex =
      currentIndex <= 0 ? initialTracks.length - 1 : currentIndex - 1;
    playTrack(initialTracks[prevIndex]);
  }, [currentTrack, initialTracks, playTrack]);

  useEffect(() => {
    if (!coverSrc || coverLoaded) return;
    const hideSkeleton = () => setCoverLoaded(true);
    const t1 = requestAnimationFrame(() => {
      if (coverImgRef.current?.complete && coverImgRef.current.naturalWidth > 0) {
        hideSkeleton();
      }
    });
    const t2 = setTimeout(hideSkeleton, 600);
    const t3 = setTimeout(hideSkeleton, 3000);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [coverSrc, coverLoaded]);

  useThemeAnalysis({
    bassData,
    currentTrack,
    isPlaying,
    stableThemeLabel,
    themeCandidateRef,
    trackAnalysisRef,
    getDisplayThemeLabel,
    setStableThemeLabel,
  });

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  usePlayerEffects({
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
  });

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    isLoading,
    loadProgress,
    loadStatus,
    loadElapsedMs,
    copiedTrackId,
    pendingAutoPlay,
    pendingCoverError,
    setPendingCoverError,
    handlePendingAutoPlay,
    trackResultToast,
    currentTrack,
    coverSrc,
    coverLoaded,
    setCoverSrc,
    setCoverLoaded,
    isPlaying,
    duration,
    currentTime,
    setCurrentTime,
    stableThemeLabel,
    volume,
    setVolume,
    bassData,
    audioRef,
    coverImgRef,
    isSeekingRef,
    initialTracks,
    copyTrackLink,
    togglePlay,
    playTrack,
    playNext,
    playPrev,
    formatTime,
  };
}
