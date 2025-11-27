"use client";

import { useEffect, useRef } from "react";

interface SpectrumVisualizerProps {
  data: Uint8Array;
  width?: number;
  height?: number;
}

export default function SpectrumVisualizer({
  data,
  width = 300,
  height = 100,
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    const bufferLength = data.length;
    const barWidth = (width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (data[i] / 255) * height;

      // Colorear diferente los bajos
      // Bins 0-5: SUB-BASS (808) - Estos disparan el detector
      // Bins 6-20: Bass/Kick normal
      if (i < 6) {
        ctx.fillStyle = `rgb(168, 85, 247)`; // Purple (808)
      } else if (i < 20) {
        ctx.fillStyle = `rgb(59, 130, 246)`; // Blue (Kick/Bass)
      } else {
        ctx.fillStyle = `rgb(156, 163, 175)`; // Gray (Mids/Highs)
      }

      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    // Dibujar líneas de referencia
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.25);
    ctx.lineTo(width, height * 0.25); // 75%
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5); // 50%
    ctx.stroke();
  }, [data, width, height]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-neutral-900/50 rounded-lg border border-neutral-800"
      />
      <div className="flex justify-between w-full text-[10px] text-neutral-500 font-mono px-1">
        <span>SUB</span>
        <span>BASS</span>
        <span>MIDS</span>
        <span>HIGHS</span>
      </div>
    </div>
  );
}

