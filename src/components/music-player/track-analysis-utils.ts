import { Track } from "@/lib/data";
import type { TrackAnalysisSnapshot } from "./music-player-types";

export function createTrackAnalysisSnapshot(
  track: Track
): TrackAnalysisSnapshot {
  return {
    trackId: track.id,
    title: track.title,
    samples: 0,
    warmthSum: 0,
    brightnessSum: 0,
    motionSum: 0,
    intensitySum: 0,
    peakCount: 0,
    subPeakCount: 0,
    themeCounts: {},
  };
}

export function getDisplayThemeLabel(
  themeLabel: string,
  subPeak: boolean,
  intensity: number
): string {
  if (subPeak && intensity > 0.56) return "Driving 808";
  if (themeLabel === "Heavy 808") return "Driving 808";
  return themeLabel;
}
