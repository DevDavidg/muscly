"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getBassDetector, BassData } from "./bass-detector";

interface UseBassDetectorOptions {
  enabled?: boolean;
  threshold?: number;
}

interface UseBassDetectorReturn {
  bassData: BassData;
  connect: (audioElement: HTMLAudioElement) => void;
  disconnect: () => void;
  setThreshold: (value: number) => void;
}

export function useBassDetector(
  options: UseBassDetectorOptions = {}
): UseBassDetectorReturn {
  const { enabled = true, threshold = 1.3 } = options;
  const detectorRef = useRef(getBassDetector());

  const [bassData, setBassData] = useState<BassData>({
    energy: 0,
    peak: false,
    normalized: 0,
    frequencyData: new Uint8Array(),
    subPeak: false,
    subNormalized: 0,
  });

  useEffect(() => {
    if (threshold) {
      detectorRef.current.setThreshold(threshold);
    }
  }, [threshold]);

  const connect = useCallback(
    (audioElement: HTMLAudioElement) => {
      if (!enabled) return;
      detectorRef.current.connect(audioElement, setBassData);
    },
    [enabled]
  );

  const disconnect = useCallback(() => {
    detectorRef.current.disconnect();
    setBassData({
      energy: 0,
      peak: false,
      normalized: 0,
      frequencyData: new Uint8Array(),
      subPeak: false,
      subNormalized: 0,
    });
  }, []);

  const setThreshold = useCallback((value: number) => {
    detectorRef.current.setThreshold(value);
  }, []);

  useEffect(() => {
    const detector = detectorRef.current;
    return () => {
      detector.disconnect();
    };
  }, []);

  return {
    bassData,
    connect,
    disconnect,
    setThreshold,
  };
}
