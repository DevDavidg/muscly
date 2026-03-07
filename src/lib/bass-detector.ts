import Meyda, { MeydaFeaturesObject } from "meyda";

type BassCallback = (data: BassData) => void;

export interface BassData {
  energy: number;
  peak: boolean;
  normalized: number;
  frequencyData: Uint8Array;
  subPeak: boolean;
  subNormalized: number;
  rms: number;
  warmth: number;
  brightness: number;
  motion: number;
  intensity: number;
  themeLabel: string;
}

export const emptyBassData: BassData = {
  energy: 0,
  peak: false,
  normalized: 0,
  frequencyData: new Uint8Array(),
  subPeak: false,
  subNormalized: 0,
  rms: 0,
  warmth: 0,
  brightness: 0,
  motion: 0,
  intensity: 0,
  themeLabel: "Idle",
};

interface AudioNodeCache {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
}

const audioNodeCache = new WeakMap<HTMLAudioElement, AudioNodeCache>();

const meydaFeatureExtractors = [
  "rms",
  "energy",
  "spectralCentroid",
  "spectralRolloff",
  "spectralFlatness",
  "zcr",
] as const;

export class BassDetector {
  private currentCache: AudioNodeCache | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private callback: BassCallback | null = null;
  private connectedElement: HTMLAudioElement | null = null;
  private energyHistory: number[] = [];
  private sub808History: number[] = [];
  private meydaAnalyzer: ReturnType<typeof Meyda.createMeydaAnalyzer> | null =
    null;
  private meydaFeatures: Partial<MeydaFeaturesObject> = {};
  private readonly historySize = 14;
  private readonly sub808HistorySize = 8;
  private threshold = 1.4;
  private lastPeakTime = 0;
  private last808PeakTime = 0;
  private readonly peakCooldown = 65;
  private readonly sub808Cooldown = 45;
  private frameCount = 0;
  private readonly warmupFrames = 10;
  private isMobile = false;

  connect(audioElement: HTMLAudioElement, callback: BassCallback): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.stopMeyda();
    this.callback = callback;
    this.connectedElement = audioElement;
    this.energyHistory = [];
    this.sub808History = [];
    this.frameCount = 0;
    this.meydaFeatures = {};
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;

    let cache = audioNodeCache.get(audioElement);

    if (!cache) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audioElement);
      const analyser = context.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.78;

      source.connect(analyser);
      analyser.connect(context.destination);

      cache = { context, source, analyser };
      audioNodeCache.set(audioElement, cache);
    }

    this.currentCache = cache;
    this.dataArray = new Uint8Array(cache.analyser.frequencyBinCount);

    if (cache.context.state === "suspended") {
      void cache.context.resume();
    }

    this.startMeyda(cache);
    this.startAnalysis();
  }

  private startMeyda(cache: AudioNodeCache): void {
    this.stopMeyda();
    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: cache.context,
      source: cache.source,
      bufferSize: 2048,
      featureExtractors: [...meydaFeatureExtractors],
      callback: (features: Partial<MeydaFeaturesObject>) => {
        this.meydaFeatures = features;
      },
    });
    this.meydaAnalyzer.start();
  }

  private stopMeyda(): void {
    if (this.meydaAnalyzer) {
      this.meydaAnalyzer.stop();
      this.meydaAnalyzer = null;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private normalize(value: number, min: number, max: number): number {
    if (max <= min) return 0;
    return this.clamp((value - min) / (max - min), 0, 1);
  }

  private getBinWidth(): number {
    if (!this.currentCache) return 0;
    return this.currentCache.context.sampleRate / this.currentCache.analyser.fftSize;
  }

  private getBinRange(minFreq: number, maxFreq: number): [number, number] {
    if (!this.currentCache || !this.dataArray) return [0, 0];
    const binWidth = this.getBinWidth();
    const maxBin = this.currentCache.analyser.frequencyBinCount - 1;
    const start = this.clamp(Math.floor(minFreq / binWidth), 0, maxBin);
    const end = this.clamp(Math.ceil(maxFreq / binWidth), start, maxBin);
    return [start, end];
  }

  private getBandEnergy(
    minFreq: number,
    maxFreq: number,
    weight?: (freq: number) => number
  ): number {
    if (!this.dataArray || !this.currentCache) return 0;
    const [startBin, endBin] = this.getBinRange(minFreq, maxFreq);
    const binWidth = this.getBinWidth();
    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = startBin; i <= endBin; i++) {
      const freq = i * binWidth;
      const currentWeight = weight ? weight(freq) : 1;
      totalWeight += currentWeight;
      weightedSum += this.dataArray[i] * currentWeight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private createBellWeight(center: number, width: number) {
    return (freq: number) => {
      const distance = Math.abs(freq - center) / width;
      return Math.max(0.15, 1.15 - distance);
    };
  }

  private calculate808Energy(): number {
    const fundamental = this.getBandEnergy(28, 68, this.createBellWeight(48, 22));
    const body = this.getBandEnergy(68, 110, this.createBellWeight(82, 20));
    const mud = this.getBandEnergy(110, 180);
    return Math.max(0, fundamental * 0.72 + body * 0.34 - mud * 0.1);
  }

  private calculate808Dominance(): number {
    const sub808Energy = this.calculate808Energy();
    const lowMidEnergy = this.getBandEnergy(110, 260);
    const midEnergy = this.getBandEnergy(260, 2200);
    const highEnergy = this.getBandEnergy(2200, 8000);
    return sub808Energy / (lowMidEnergy * 0.8 + midEnergy * 0.4 + highEnergy * 0.25 + 1);
  }

  private isTransient(currentEnergy: number, prevEnergy: number, delta: number): boolean {
    return currentEnergy - prevEnergy > delta;
  }

  private isSustain(
    currentEnergy: number,
    prevEnergy: number,
    minEnergy: number,
    decayRate: number
  ): boolean {
    return currentEnergy > minEnergy && currentEnergy >= prevEnergy * decayRate;
  }

  private resolveThemeLabel(
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

  private startAnalysis(): void {
    const analyze = () => {
      if (!this.currentCache || !this.dataArray || !this.callback) return;

      this.currentCache.analyser.getByteFrequencyData(
        this.dataArray as Uint8Array<ArrayBuffer>
      );
      this.frameCount++;

      const subBassEnergy = this.getBandEnergy(24, 95);
      const sub808Energy = this.calculate808Energy();
      const kickEnergy = this.getBandEnergy(95, 170);
      const midEnergy = this.getBandEnergy(170, 1800);
      const highEnergy = this.getBandEnergy(1800, 8000);
      const restEnergy = kickEnergy + midEnergy + highEnergy * 0.7;

      this.energyHistory.push(subBassEnergy);
      if (this.energyHistory.length > this.historySize) {
        this.energyHistory.shift();
      }

      this.sub808History.push(sub808Energy);
      if (this.sub808History.length > this.sub808HistorySize) {
        this.sub808History.shift();
      }

      let isPeak = false;
      let isSubPeak = false;

      if (this.frameCount > this.warmupFrames) {
        const prevEnergy = this.energyHistory[this.energyHistory.length - 2] ?? 0;
        const prev808Energy =
          this.sub808History[this.sub808History.length - 2] ?? 0;
        const now = performance.now();
        const canPeak = now - this.lastPeakTime > this.peakCooldown;
        const can808Peak = now - this.last808PeakTime > this.sub808Cooldown;
        const thresholdScale = this.threshold / 1.4;
        const subDominanceRatio = this.isMobile ? 0.48 : 0.55;
        const isSubDominant = subBassEnergy > (restEnergy + 1) * subDominanceRatio;
        const isHit = this.isTransient(
          subBassEnergy,
          prevEnergy,
          (this.isMobile ? 1.8 : 2.6) * thresholdScale
        );
        const isSustained = this.isSustain(
          subBassEnergy,
          prevEnergy,
          (this.isMobile ? 16 : 20) * thresholdScale,
          0.9
        );

        isPeak = (isHit || isSustained) && canPeak && isSubDominant;

        const sub808Dominance = this.calculate808Dominance();
        const is808Transient = this.isTransient(
          sub808Energy,
          prev808Energy,
          (this.isMobile ? 1.5 : 2.2) * thresholdScale
        );
        const is808Sustain = this.isSustain(
          sub808Energy,
          prev808Energy,
          (this.isMobile ? 18 : 24) * thresholdScale,
          0.92
        );

        isSubPeak =
          sub808Energy > (this.isMobile ? 18 : 24) * thresholdScale &&
          sub808Dominance > (this.isMobile ? 0.55 : 0.6) &&
          (is808Transient || is808Sustain) &&
          can808Peak;

        if (isPeak) {
          this.lastPeakTime = now;
        }

        if (isSubPeak) {
          this.last808PeakTime = now;
        }
      }

      const rms = this.normalize(this.meydaFeatures.rms ?? 0, 0.02, 0.18);
      const centroid = this.normalize(
        this.meydaFeatures.spectralCentroid ?? 0,
        350,
        5000
      );
      const rolloff = this.normalize(
        this.meydaFeatures.spectralRolloff ?? 0,
        1200,
        11000
      );
      const flatness = this.clamp(this.meydaFeatures.spectralFlatness ?? 0, 0, 1);
      const zcr = this.normalize(this.meydaFeatures.zcr ?? 0, 0.01, 0.18);
      const normalized = this.normalize(subBassEnergy, 12, 120);
      const subNormalized = this.normalize(sub808Energy, 10, 90);
      const warmth = this.clamp(subNormalized * 0.62 + normalized * 0.28 + (1 - centroid) * 0.1, 0, 1);
      const brightness = this.clamp(centroid * 0.5 + rolloff * 0.35 + flatness * 0.15, 0, 1);
      const motion = this.clamp(zcr * 0.4 + brightness * 0.25 + this.normalize(highEnergy, 10, 85) * 0.35, 0, 1);
      const intensity = this.clamp(rms * 0.45 + normalized * 0.2 + subNormalized * 0.35, 0, 1);
      const themeLabel = this.resolveThemeLabel(
        warmth,
        brightness,
        motion,
        intensity,
        isSubPeak
      );

      this.callback({
        energy: subBassEnergy,
        peak: isPeak,
        normalized,
        frequencyData: new Uint8Array(this.dataArray),
        subPeak: isSubPeak,
        subNormalized,
        rms,
        warmth,
        brightness,
        motion,
        intensity,
        themeLabel,
      });

      this.animationId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  setThreshold(value: number): void {
    this.threshold = this.clamp(value, 1, 3);
  }

  disconnect(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.stopMeyda();
    this.callback = null;
    this.dataArray = null;
    this.energyHistory = [];
    this.sub808History = [];
    this.connectedElement = null;
    this.currentCache = null;
    this.meydaFeatures = {};
  }

  resume(): void {
    if (this.currentCache?.context.state === "suspended") {
      void this.currentCache.context.resume();
    }
  }
}

let instance: BassDetector | null = null;

export function getBassDetector(): BassDetector {
  if (!instance) {
    instance = new BassDetector();
  }
  return instance;
}
