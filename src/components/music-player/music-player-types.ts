import { Track } from "@/lib/data";

export interface MusicPlayerProps {
  initialTracks: Track[];
  localFallback?: boolean;
}

export interface TrackAnalysisSnapshot {
  trackId: string;
  title: string;
  samples: number;
  warmthSum: number;
  brightnessSum: number;
  motionSum: number;
  intensitySum: number;
  peakCount: number;
  subPeakCount: number;
  themeCounts: Record<string, number>;
}

export interface TrackResultToast {
  title: string;
  theme: string;
  drive: number;
  warmth: number;
  brightness: number;
  motion: number;
  peaks: number;
  subPeaks: number;
}
