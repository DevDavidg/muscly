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
import {
  createYoutubeIdleBassData,
  getNextSyntheticBassData,
} from "@/lib/youtube-synthetic-bass";

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
  const [trackLoading, setTrackLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState<string>("");
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [syntheticBassData, setSyntheticBassData] = useState(() =>
    createYoutubeIdleBassData()
  );

  const youtubePlayerRef = useRef<{
    play: () => void;
    pause: () => void;
    seekTo: (s: number) => void;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);
  const isSeekingRef = useRef(false);
  const autoPlayExecuted = useRef(false);
  const themeCandidateRef = useRef({ label: "Idle", count: 0 });
  const trackAnalysisRef = useRef<TrackAnalysisSnapshot | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syntheticFreqRef = useRef(new Uint8Array(1024));
  const youtubeIdleBassRef = useRef(createYoutubeIdleBassData());

  const { bassData, connect: connectBass, connectStream, disconnect: disconnectBass } = useBassDetector({
    enabled: true,
    threshold: 1.4,
  });

  const [tabCaptureActive, setTabCaptureActive] = useState(false);
  const capturedStreamRef = useRef<MediaStream | null>(null);

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
    } catch {
    }
  };

  const togglePlay = useCallback(() => {
    if (youtubePlayerRef.current && !currentTrack) {
      if (youtubePlaying) youtubePlayerRef.current.pause();
      else youtubePlayerRef.current.play();
      setYoutubePlaying(!youtubePlaying);
      return;
    }
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, youtubePlaying, currentTrack]);

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
      const needsLoad = !audio;
      if (!audio) {
        setTrackLoading(true);
        audio = new Audio(track.audioUrl);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audioCache.current.set(track.fileName, audio);
        audio.addEventListener("error", () => setTrackLoading(false));
      }
      const onReady = () => {
        setTrackLoading(false);
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onReady);
      };
      audio.addEventListener("canplaythrough", onReady);
      audio.addEventListener("error", onReady);
      audio.currentTime = 0;
      audioRef.current = audio;
      if (!needsLoad) setTrackLoading(false);
      audio.onloadedmetadata = () =>
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      connectBass(audio);
      audio.play().catch(() => setTrackLoading(false));
      setCurrentTrack(track);
      setCoverLoaded(false);
      setCoverSrc(track.coverUrl || null);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(
        track.duration > 0
          ? track.duration
          : Number.isFinite(audio.duration)
            ? audio.duration
            : 0
      );
      setStableThemeLabel("Idle");
      themeCandidateRef.current = { label: "Idle", count: 0 };
      trackAnalysisRef.current = createTrackAnalysisSnapshot(track);
      if (needsLoad) {
        const idx = initialTracks.findIndex((t) => t.fileName === track.fileName);
        const nextTrack = initialTracks[(idx + 1) % initialTracks.length];
        if (nextTrack && !audioCache.current.has(nextTrack.fileName)) {
          const nextAudio = new Audio(nextTrack.audioUrl);
          nextAudio.preload = "auto";
          nextAudio.crossOrigin = "anonymous";
          audioCache.current.set(nextTrack.fileName, nextAudio);
        }
      }
    },
    [currentTrack, initialTracks, togglePlay, connectBass]
  );

  const getYoutubeVideoId = useCallback((url: string) => {
    const m =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.exec(
        url
      );
    return m ? m[1] : null;
  }, []);

  useEffect(() => {
    if (!youtubeUrl) {
      setYoutubeVideoTitle("");
      return;
    }
    const id = getYoutubeVideoId(youtubeUrl);
    if (!id) {
      setYoutubeVideoTitle("");
      return;
    }
    let cancelled = false;
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${id}`
    )}&format=json`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { title?: string }) => {
        if (!cancelled && data?.title) setYoutubeVideoTitle(data.title);
      })
      .catch(() => {
        if (!cancelled) setYoutubeVideoTitle("");
      });
    return () => {
      cancelled = true;
    };
  }, [youtubeUrl, getYoutubeVideoId]);

  useEffect(() => {
    if (youtubeUrl && !currentTrack) setStableThemeLabel("Video");
  }, [youtubeUrl, currentTrack]);

  useEffect(() => {
    if (!youtubeUrl) {
      setYoutubeDuration(0);
      setYoutubeCurrentTime(0);
      setYoutubePlaying(false);
      youtubePlayerRef.current = null;
      disconnectBass();
      capturedStreamRef.current?.getTracks().forEach((t) => t.stop());
      capturedStreamRef.current = null;
      setTabCaptureActive(false);
    }
  }, [youtubeUrl, disconnectBass]);

  useEffect(() => {
    const id = getYoutubeVideoId(youtubeUrl);
    if (!id || currentTrack || tabCaptureActive) {
      setSyntheticBassData(youtubeIdleBassRef.current);
      return;
    }
    let rafId = 0;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      setSyntheticBassData(
        getNextSyntheticBassData(
          syntheticFreqRef.current,
          performance.now()
        )
      );
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [youtubeUrl, currentTrack, tabCaptureActive, getYoutubeVideoId]);

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
      playTrack(pendingAutoPlay);
      setPendingAutoPlay(null);
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
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = useCallback(
    (time: number) => {
      if (youtubePlayerRef.current && !currentTrack) {
        youtubePlayerRef.current.seekTo(time);
        setYoutubeCurrentTime(time);
        return;
      }
      setCurrentTime(time);
      if (audioRef.current) audioRef.current.currentTime = time;
    },
    [currentTrack]
  );

  const youtubeId = youtubeUrl ? getYoutubeVideoId(youtubeUrl) : null;
  const displayBassData = currentTrack
    ? bassData
    : youtubeId && tabCaptureActive
      ? bassData
      : youtubeId
        ? syntheticBassData
        : youtubeIdleBassRef.current;
  const displayStableThemeLabel = currentTrack
    ? stableThemeLabel
    : youtubeId && tabCaptureActive
      ? bassData.themeLabel
      : youtubeId
        ? syntheticBassData.themeLabel
        : "Video";

  const startTabCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      capturedStreamRef.current = stream;
      connectStream(stream);
      setTabCaptureActive(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        disconnectBass();
        capturedStreamRef.current = null;
        setTabCaptureActive(false);
      });
    } catch {
      setTabCaptureActive(false);
    }
  }, [connectStream, disconnectBass]);

  const stopTabCapture = useCallback(() => {
    disconnectBass();
    capturedStreamRef.current?.getTracks().forEach((t) => t.stop());
    capturedStreamRef.current = null;
    setTabCaptureActive(false);
  }, [disconnectBass]);

  return {
    isLoading,
    loadProgress,
    loadStatus,
    loadElapsedMs,
    trackLoading,
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
    volume,
    setVolume,
    bassData: displayBassData,
    stableThemeLabel: displayStableThemeLabel,
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
    youtubeUrl,
    setYoutubeUrl,
    youtubeVideoTitle,
    youtubeDuration,
    youtubeCurrentTime,
    youtubePlaying,
    setYoutubeDuration,
    setYoutubeCurrentTime,
    setYoutubePlaying,
    youtubePlayerRef,
    handleSeek,
    tabCaptureActive,
    startTabCapture,
    stopTabCapture,
  };
}
