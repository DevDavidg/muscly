"use client";

import { useEffect } from "react";
import { Track } from "@/lib/data";
import type { TrackAnalysisSnapshot } from "./music-player-types";
import { createTrackAnalysisSnapshot } from "./track-analysis-utils";

interface BassData {
  themeLabel: string;
  subPeak: boolean;
  intensity: number;
  warmth: number;
  brightness: number;
  motion: number;
  peak: boolean;
}

interface UseThemeAnalysisParams {
  bassData: BassData;
  currentTrack: Track | null;
  isPlaying: boolean;
  stableThemeLabel: string;
  themeCandidateRef: React.MutableRefObject<{ label: string; count: number }>;
  trackAnalysisRef: React.MutableRefObject<TrackAnalysisSnapshot | null>;
  getDisplayThemeLabel: (
    themeLabel: string,
    subPeak: boolean,
    intensity: number
  ) => string;
  setStableThemeLabel: (label: string) => void;
}

export function useThemeAnalysis({
  bassData,
  currentTrack,
  isPlaying,
  stableThemeLabel,
  themeCandidateRef,
  trackAnalysisRef,
  getDisplayThemeLabel,
  setStableThemeLabel,
}: UseThemeAnalysisParams) {

  useEffect(() => {
    const displayTheme = getDisplayThemeLabel(
      bassData.themeLabel,
      bassData.subPeak,
      bassData.intensity
    );
    const candidate = themeCandidateRef.current;
    if (displayTheme === stableThemeLabel) {
      candidate.label = displayTheme;
      candidate.count = 0;
      return;
    }
    if (candidate.label === displayTheme) {
      candidate.count += 1;
    } else {
      candidate.label = displayTheme;
      candidate.count = 1;
    }
    if (candidate.count >= 12) {
      setStableThemeLabel(displayTheme);
      candidate.count = 0;
    }
  }, [
    bassData.intensity,
    bassData.subPeak,
    bassData.themeLabel,
    getDisplayThemeLabel,
    stableThemeLabel,
  ]);

  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    const snapshot = trackAnalysisRef.current;
    if (!snapshot || snapshot.trackId !== currentTrack.id) {
      trackAnalysisRef.current = createTrackAnalysisSnapshot(currentTrack);
    }
    const activeSnapshot = trackAnalysisRef.current;
    if (!activeSnapshot) return;
    const displayTheme = getDisplayThemeLabel(
      bassData.themeLabel,
      bassData.subPeak,
      bassData.intensity
    );
    activeSnapshot.samples += 1;
    activeSnapshot.warmthSum += bassData.warmth;
    activeSnapshot.brightnessSum += bassData.brightness;
    activeSnapshot.motionSum += bassData.motion;
    activeSnapshot.intensitySum += bassData.intensity;
    activeSnapshot.themeCounts[displayTheme] =
      (activeSnapshot.themeCounts[displayTheme] ?? 0) + 1;
    if (bassData.peak) activeSnapshot.peakCount += 1;
    if (bassData.subPeak) activeSnapshot.subPeakCount += 1;
  }, [
    bassData.brightness,
    bassData.intensity,
    bassData.motion,
    bassData.peak,
    bassData.subPeak,
    bassData.themeLabel,
    bassData.warmth,
    currentTrack,
    getDisplayThemeLabel,
    isPlaying,
  ]);
}
