import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export interface Track {
  id: string;
  title: string;
  fileName: string;
  coverName: string | null;
  duration: number;
  released: boolean;
  youtubeUrl?: string;
}

const ASSETS_DIR = path.join(process.cwd(), "assets", "temas");

function getWavDuration(filePath: string): number {
  try {
    const buffer = fsSync.readFileSync(filePath);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const riffBytes = Array.from(new Uint8Array(buffer.buffer, buffer.byteOffset, 4));
    const riff = String.fromCodePoint(...riffBytes);
    if (riff !== "RIFF") return 0;

    const waveBytes = Array.from(new Uint8Array(buffer.buffer, buffer.byteOffset + 8, 4));
    const wave = String.fromCodePoint(...waveBytes);
    if (wave !== "WAVE") return 0;

    let offset = 12;
    let byteRate = 176400;
    let dataSize = 0;

    while (offset < buffer.length - 8) {
      const chunkIdBytes = Array.from(new Uint8Array(buffer.buffer, buffer.byteOffset + offset, 4));
      const chunkId = String.fromCodePoint(...chunkIdBytes);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        byteRate = view.getUint32(offset + 16, true);
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
    }

    if (dataSize === 0) return 0;
    const duration = dataSize / byteRate;
    return Math.round(duration);
  } catch {
    return 0;
  }
}

const TRACK_ORDER: Record<string, number> = {
  FRƎE: 1,
  "∀DO": 2,
  и1cio: 3,
  "W∀X": 4,
  "∀yBrda feat. (Gonza)": 5,
  "∀SSP": 6,
  "HRꓷ": 7,
  "ꓷYƧ feat. (SXNTY)": 8,
};

export async function getTracks(): Promise<Track[]> {
  const files = await fs.readdir(ASSETS_DIR);

  const wavFiles = files.filter((f) => f.toLowerCase().endsWith(".wav"));
  const imageFiles = files.filter((f) =>
    [".png", ".jpg", ".jpeg"].some((ext) => f.toLowerCase().endsWith(ext))
  );

  const tracks = wavFiles.map((wav) => {
    const baseName = wav.replace(/\.wav$/i, "");
    const cover = imageFiles.find((img) => img.startsWith(baseName + "."));

    const duration = getWavDuration(path.join(ASSETS_DIR, wav));

    const isReleased = baseName === "и1cio";

    return {
      id: baseName,
      title: baseName,
      fileName: wav,
      coverName: cover || null,
      duration,
      released: isReleased,
      youtubeUrl: isReleased
        ? "https://www.youtube.com/watch?v=Jwwubg3sFeY"
        : undefined,
    };
  });

  return tracks.sort((a, b) => {
    const orderA = TRACK_ORDER[a.id] ?? 999;
    const orderB = TRACK_ORDER[b.id] ?? 999;
    return orderA - orderB;
  });
}
