"use client";

import { useEffect, useRef, useState } from "react";

interface SpectrumVisualizerProps {
  data: Uint8Array;
  warmth?: number;
  brightness?: number;
  motion?: number;
  intensity?: number;
}

export default function SpectrumVisualizer({
  data,
  warmth = 0,
  brightness = 0,
  motion = 0,
  intensity = 0,
}: SpectrumVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);
  const canvasHeight = Math.max(36, Math.round(canvasWidth * 0.155));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setCanvasWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvasWidth;
    const height = canvasHeight;

    ctx.clearRect(0, 0, width, height);
    if (!data || data.length === 0) return;

    const wVal = Number.isFinite(warmth) ? warmth : 0;
    const bVal = Number.isFinite(brightness) ? brightness : 0;
    const mVal = Number.isFinite(motion) ? motion : 0;
    const iVal = Number.isFinite(intensity) ? intensity : 0;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `rgba(244,114,182,${0.28 + wVal * 0.4})`);
    gradient.addColorStop(0.45, `rgba(168,85,247,${0.35 + iVal * 0.45})`);
    gradient.addColorStop(1, `rgba(34,211,238,${0.22 + bVal * 0.45})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const visibleBars = Math.min(64, data.length);
    const sliceSize = Math.max(1, Math.floor(data.length / visibleBars));
    const barWidth = width / visibleBars;
    const baseLine = height * 0.9;
    const peakLineY = height * (0.18 + (1 - iVal) * 0.1);

    ctx.shadowBlur = 14 + iVal * 20;

    for (let i = 0; i < visibleBars; i++) {
      let sum = 0;
      const start = i * sliceSize;
      const end = Math.min(start + sliceSize, data.length);
      for (let j = start; j < end; j++) sum += data[j];

      const value = sum / Math.max(1, end - start);
      const normalized = value / 255;
      const barHeight = normalized * height * (0.88 + mVal * 0.2);
      const x = i * barWidth;
      const hue = 316 - i * 2.1 - bVal * 56 + wVal * 18;
      const alpha = 0.38 + normalized * 0.55;

      ctx.fillStyle = `hsla(${hue},92%,${58 + normalized * 18}%,${alpha})`;
      ctx.shadowColor =
        i < 10
          ? `rgba(244,114,182,${0.35 + normalized * 0.45})`
          : `rgba(96,165,250,${0.2 + normalized * 0.35})`;
      ctx.beginPath();
      ctx.roundRect(
        x + 1,
        baseLine - barHeight,
        Math.max(barWidth - 2, 2),
        barHeight,
        999,
      );
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + iVal * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, peakLineY);
    ctx.lineTo(width, peakLineY);
    ctx.moveTo(0, height * 0.55);
    ctx.lineTo(width, height * 0.55);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,255,255,${0.2 + mVal * 0.25})`;

    for (let i = 0; i < visibleBars; i++) {
      let sum = 0;
      const start = i * sliceSize;
      const end = Math.min(start + sliceSize, data.length);
      for (let j = start; j < end; j++) sum += data[j];

      const value = sum / Math.max(1, end - start);
      const normalized = value / 255;
      const x = i * barWidth + barWidth / 2;
      const y = height - normalized * height * 0.72;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }, [brightness, canvasHeight, canvasWidth, data, intensity, motion, warmth]);

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full rounded-xl border border-white/10 bg-neutral-950/70"
        style={{ height: canvasHeight }}
      />
      <div className="flex w-full justify-between px-1 font-mono text-[10px] text-neutral-500">
        <span>SUB</span>
        <span>BASS</span>
        <span>MIDS</span>
        <span>HIGHS</span>
      </div>
    </div>
  );
}
