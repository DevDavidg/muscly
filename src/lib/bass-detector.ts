type BassCallback = (data: BassData) => void;

export interface BassData {
  energy: number;
  peak: boolean;
  normalized: number;
  frequencyData: Uint8Array;
  subPeak: boolean;
  subNormalized: number;
}

interface AudioNodeCache {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
}

const audioNodeCache = new WeakMap<HTMLAudioElement, AudioNodeCache>();

export class BassDetector {
  private currentCache: AudioNodeCache | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private callback: BassCallback | null = null;
  private connectedElement: HTMLAudioElement | null = null;
  private energyHistory: number[] = [];
  private readonly historySize = 10;
  private readonly subBassEnd = 1;
  private readonly bassEnd = 4;
  private threshold = 1.05;
  private lastPeakTime = 0;
  private readonly peakCooldown = 20;
  private frameCount = 0;
  private readonly warmupFrames = 8;

  connect(audioElement: HTMLAudioElement, callback: BassCallback): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.callback = callback;
    this.connectedElement = audioElement;
    this.energyHistory = [];
    this.frameCount = 0;

    let cache = audioNodeCache.get(audioElement);

    if (!cache) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audioElement);
      const analyser = context.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;

      source.connect(analyser);
      analyser.connect(context.destination);

      cache = { context, source, analyser };
      audioNodeCache.set(audioElement, cache);
    }

    this.currentCache = cache;
    this.dataArray = new Uint8Array(cache.analyser.frequencyBinCount);

    if (cache.context.state === "suspended") {
      cache.context.resume();
    }

    console.log("[808] Bass detector connected");
    this.startAnalysis();
  }

  private calculateBandEnergy(startBin: number, endBin: number): number {
    if (!this.dataArray) return 0;
    
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += this.dataArray[i];
    }
    return sum / (endBin - startBin + 1);
  }

  private calculateSubBassEnergy(): number {
    if (!this.dataArray) return 0;
    const weights = [0.25, 0.22, 0.18, 0.15, 0.12, 0.08];
    let weighted = 0;
    for (let i = 0; i <= 5; i++) {
      weighted += this.dataArray[i] * weights[i];
    }
    return weighted;
  }

  private isTransient(currentEnergy: number, prevEnergy: number, threshold: number = 2): boolean {
    return (currentEnergy - prevEnergy) > threshold;
  }

  private isSustain(currentEnergy: number, prevEnergy: number, minEnergy: number = 25, decayRate: number = 0.8): boolean {
    return currentEnergy > minEnergy && currentEnergy > prevEnergy * decayRate;
  }

  private checkSubDominance(subEnergy: number, restEnergy: number, ratio: number = 0.5): boolean {
    return subEnergy > (restEnergy + 1) * ratio;
  }

  private startAnalysis(): void {
    const analyze = () => {
      if (!this.currentCache || !this.dataArray || !this.callback) return;

      this.currentCache.analyser.getByteFrequencyData(this.dataArray);
      this.frameCount++;

      const subBassEnergy = this.calculateBandEnergy(0, 5);
      const pureSubEnergy = this.calculateSubBassEnergy();
      const restEnergy = this.calculateBandEnergy(10, 50);

      this.energyHistory.push(subBassEnergy);
      if (this.energyHistory.length > this.historySize) {
        this.energyHistory.shift();
      }

      let isPeak = false;
      let isSubPeak = false;

      if (this.frameCount > this.warmupFrames) {
        const prevEnergy = this.energyHistory[this.energyHistory.length - 2] || 0;
        
        const now = performance.now();
        const canPeak = now - this.lastPeakTime > this.peakCooldown;

        const isSubDominant = this.checkSubDominance(subBassEnergy, restEnergy, 0.5);
        const isHit = this.isTransient(subBassEnergy, prevEnergy, 2);
        const isSustained = this.isSustain(subBassEnergy, prevEnergy, 25, 0.8);
        
        isPeak = (isHit || isSustained) && canPeak && isSubDominant;

        const pureSubThreshold = 20;
        const subRatio = pureSubEnergy / (restEnergy + 1);
        isSubPeak = pureSubEnergy > pureSubThreshold && subRatio > 0.4 && canPeak;

        if (isPeak) {
          this.lastPeakTime = now;
        }
      }

      this.callback({
        energy: subBassEnergy,
        peak: isPeak,
        normalized: Math.min(subBassEnergy / 255, 1),
        frequencyData: new Uint8Array(this.dataArray),
        subPeak: isSubPeak,
        subNormalized: Math.min(pureSubEnergy / 100, 1),
      });

      this.animationId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  setThreshold(value: number): void {
    this.threshold = Math.max(1, Math.min(3, value));
  }

  disconnect(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.callback = null;
    this.dataArray = null;
    this.energyHistory = [];
    this.connectedElement = null;
    this.currentCache = null;
  }

  resume(): void {
    if (this.currentCache?.context.state === "suspended") {
      this.currentCache.context.resume();
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
