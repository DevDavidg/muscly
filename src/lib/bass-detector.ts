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
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private callback: BassCallback | null = null;
  private connectedElement: HTMLAudioElement | null = null;
  private energyHistory: number[] = [];
  private sub808History: number[] = []; // Historial específico para 808
  private readonly historySize = 10;
  private readonly sub808HistorySize = 5; // Historial más corto para 808 (más reactivo)
  private readonly subBassEnd = 1;
  private readonly bassEnd = 4;
  private threshold = 1.05;
  private lastPeakTime = 0;
  private last808PeakTime = 0; // Cooldown separado para 808
  private readonly peakCooldown = 20;
  private readonly sub808Cooldown = 15; // Cooldown más corto para 808
  private frameCount = 0;
  private readonly warmupFrames = 8;
  private isMobile: boolean = false;

  connect(audioElement: HTMLAudioElement, callback: BassCallback): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.callback = callback;
    this.connectedElement = audioElement;
    this.energyHistory = [];
    this.sub808History = [];
    this.frameCount = 0;

    // Detectar si es mobile para ajustar sensibilidad
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;

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
    this.dataArray = new Uint8Array(
      cache.analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;

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

  /**
   * Calcula la energía del 808 usando los ÚLTIMOS 3 bins del sub-bass (bins 3, 4, 5)
   * Estas frecuencias (~40-80 Hz) son donde el 808 tiene más presencia
   * Ajustado para desktop y mobile
   */
  private calculate808Energy(): number {
    if (!this.dataArray) return 0;

    // Últimos 3 bins del sub-bass: bins 3, 4, 5 (~40-80 Hz para 808)
    // Pesos mayores en bin 3 y 4 donde el 808 tiene más punch
    const bin3 = this.dataArray[3]; // ~40-50 Hz - fundamental del 808
    const bin4 = this.dataArray[4]; // ~50-65 Hz - armónico principal
    const bin5 = this.dataArray[5]; // ~65-80 Hz - cuerpo del 808

    // Pesos optimizados para el 808: más peso en bins 3 y 4
    const weights = this.isMobile
      ? { w3: 0.45, w4: 0.35, w5: 0.2 } // Mobile: más sensible al fundamental
      : { w3: 0.4, w4: 0.38, w5: 0.22 }; // Desktop: balance más equilibrado

    const weighted = bin3 * weights.w3 + bin4 * weights.w4 + bin5 * weights.w5;

    // Boost adicional si hay pico claro en el 808 (bins 3-4 dominan sobre bin 5)
    const hasSharpAttack = bin3 + bin4 > bin5 * 2;
    const attackBoost = hasSharpAttack ? 1.15 : 1.0;

    return weighted * attackBoost;
  }

  /**
   * Calcula el ratio de dominancia del 808 vs el resto del espectro
   */
  private calculate808Dominance(): number {
    if (!this.dataArray) return 0;

    const sub808Energy = this.calculate808Energy();
    const midEnergy = this.calculateBandEnergy(6, 20); // Mids
    const highEnergy = this.calculateBandEnergy(21, 50); // Highs

    const totalOther = midEnergy + highEnergy + 1;
    return sub808Energy / totalOther;
  }

  private isTransient(
    currentEnergy: number,
    prevEnergy: number,
    threshold: number = 2
  ): boolean {
    return currentEnergy - prevEnergy > threshold;
  }

  private isSustain(
    currentEnergy: number,
    prevEnergy: number,
    minEnergy: number = 25,
    decayRate: number = 0.8
  ): boolean {
    return currentEnergy > minEnergy && currentEnergy > prevEnergy * decayRate;
  }

  private checkSubDominance(
    subEnergy: number,
    restEnergy: number,
    ratio: number = 0.5
  ): boolean {
    return subEnergy > (restEnergy + 1) * ratio;
  }

  private startAnalysis(): void {
    const analyze = () => {
      if (!this.currentCache || !this.dataArray || !this.callback) return;

      this.currentCache.analyser.getByteFrequencyData(this.dataArray);
      this.frameCount++;

      const subBassEnergy = this.calculateBandEnergy(0, 5);
      const sub808Energy = this.calculate808Energy(); // Nuevo: energía específica del 808
      const restEnergy = this.calculateBandEnergy(10, 50);

      // Historial general
      this.energyHistory.push(subBassEnergy);
      if (this.energyHistory.length > this.historySize) {
        this.energyHistory.shift();
      }

      // Historial específico del 808 (últimos 3 del sub)
      this.sub808History.push(sub808Energy);
      if (this.sub808History.length > this.sub808HistorySize) {
        this.sub808History.shift();
      }

      let isPeak = false;
      let isSubPeak = false;

      if (this.frameCount > this.warmupFrames) {
        const prevEnergy =
          this.energyHistory[this.energyHistory.length - 2] || 0;
        const prev808Energy =
          this.sub808History[this.sub808History.length - 2] || 0;

        const now = performance.now();
        const canPeak = now - this.lastPeakTime > this.peakCooldown;
        const can808Peak = now - this.last808PeakTime > this.sub808Cooldown;

        const isSubDominant = this.checkSubDominance(
          subBassEnergy,
          restEnergy,
          0.5
        );
        const isHit = this.isTransient(subBassEnergy, prevEnergy, 2);
        const isSustained = this.isSustain(subBassEnergy, prevEnergy, 25, 0.8);

        isPeak = (isHit || isSustained) && canPeak && isSubDominant;

        // === DETECCIÓN MEJORADA DEL 808 ===
        // Umbrales ajustados para desktop y mobile
        const sub808Threshold = this.isMobile ? 15 : 18;
        const sub808RatioThreshold = this.isMobile ? 0.35 : 0.38;

        // Calcular dominancia del 808
        const sub808Dominance = this.calculate808Dominance();

        // Detectar transiente del 808 (golpe inicial)
        const is808Transient =
          sub808Energy - prev808Energy > (this.isMobile ? 1.5 : 2);

        // Detectar sustain del 808 (cola larga característica)
        const is808Sustain =
          sub808Energy > (this.isMobile ? 20 : 25) &&
          sub808Energy > prev808Energy * 0.85;

        // El 808 tiene que ser dominante y tener transiente o sustain
        isSubPeak =
          sub808Energy > sub808Threshold &&
          sub808Dominance > sub808RatioThreshold &&
          (is808Transient || is808Sustain) &&
          can808Peak;

        if (isPeak) {
          this.lastPeakTime = now;
        }

        if (isSubPeak) {
          this.last808PeakTime = now;
        }
      }

      this.callback({
        energy: subBassEnergy,
        peak: isPeak,
        normalized: Math.min(subBassEnergy / 255, 1),
        frequencyData: new Uint8Array(this.dataArray),
        subPeak: isSubPeak,
        subNormalized: Math.min(sub808Energy / 80, 1), // Normalizado con el 808
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
    this.sub808History = [];
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
