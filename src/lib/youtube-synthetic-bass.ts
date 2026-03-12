import type { BassData } from "./bass-detector";

const FREQ_BINS = 1024;

function resolveThemeLabel(
  warmth: number,
  brightness: number,
  motion: number,
  intensity: number,
  subPeak: boolean
): string {
  if (subPeak && intensity > 0.6) return "Heavy 808";
  if (warmth > 0.72 && brightness < 0.35) return "Deep";
  if (brightness > 0.7 && motion > 0.55) return "Bright";
  if (motion > 0.68 && intensity > 0.42) return "Driving";
  if (intensity < 0.22) return "Smooth";
  if (warmth > 0.58 && brightness > 0.5) return "Wide";
  return "Balanced";
}

export function createYoutubeIdleBassData(): BassData {
  return {
    energy: 0,
    peak: false,
    normalized: 0,
    frequencyData: new Uint8Array(FREQ_BINS),
    subPeak: false,
    subNormalized: 0,
    rms: 0,
    warmth: 0,
    brightness: 0,
    motion: 0,
    intensity: 0,
    themeLabel: "Video",
  };
}

export function getNextSyntheticBassData(
  freqData: Uint8Array,
  t: number
): BassData {
  const t0 = t * 0.001;
  const t1 = t0 * 1.7;
  const t2 = t0 * 2.3;
  const sub = Math.max(0, 0.4 + 0.35 * Math.sin(t0) + 0.15 * Math.sin(t1 * 2));
  const mid = Math.max(0, 0.25 + 0.2 * Math.sin(t0 * 1.2 + 1) + 0.1 * Math.sin(t2));
  const high = Math.max(0, 0.2 + 0.15 * Math.sin(t0 * 0.9 + 2));
  for (let i = 0; i < FREQ_BINS; i++) {
    const f = i / FREQ_BINS;
    let v = 0;
    if (f < 0.1) v = sub * (1 + 0.5 * Math.sin(t0 + i * 0.2)) * (1 - f * 5);
    else if (f < 0.35) v = sub * 0.6 * Math.sin(t1 + i * 0.05);
    else if (f < 0.65) v = mid * (0.7 + 0.3 * Math.sin(t2 + i * 0.03));
    else v = high * (0.5 + 0.5 * Math.sin(t0 * 1.1 + i * 0.02));
    freqData[i] = Math.min(255, Math.round(128 + 120 * v));
  }
  const warmth = 0.35 + 0.4 * Math.sin(t0 * 0.8) + 0.1 * Math.sin(t1);
  const brightness = 0.3 + 0.35 * Math.sin(t0 * 0.9 + 0.5) + 0.1 * Math.sin(t2);
  const motion = 0.4 + 0.35 * Math.sin(t0 * 1.1 + 1) + 0.1 * Math.sin(t1 * 1.5);
  const intensity = 0.35 + 0.4 * Math.sin(t0 * 0.85 + 2) + 0.15 * Math.sin(t2 * 0.8);
  const normalized = 0.3 + 0.5 * Math.max(0, Math.sin(t0 * 1.2));
  const subNormalized = 0.25 + 0.55 * Math.max(0, Math.sin(t0 * 1.4 + 0.7));
  const peak = Math.sin(t0 * 3) > 0.92;
  const subPeak = Math.sin(t0 * 2.5 + 1) > 0.9;
  const rms = 0.2 + 0.25 * Math.sin(t0);
  const energy = 15 + 25 * Math.sin(t0 * 0.7);
  const themeLabel = resolveThemeLabel(
    Math.min(1, Math.max(0, warmth)),
    Math.min(1, Math.max(0, brightness)),
    Math.min(1, Math.max(0, motion)),
    Math.min(1, Math.max(0, intensity)),
    subPeak
  );
  return {
    energy,
    peak,
    normalized: Math.min(1, Math.max(0, normalized)),
    frequencyData: new Uint8Array(freqData),
    subPeak,
    subNormalized: Math.min(1, Math.max(0, subNormalized)),
    rms: Math.min(1, Math.max(0, rms)),
    warmth: Math.min(1, Math.max(0, warmth)),
    brightness: Math.min(1, Math.max(0, brightness)),
    motion: Math.min(1, Math.max(0, motion)),
    intensity: Math.min(1, Math.max(0, intensity)),
    themeLabel,
  };
}
