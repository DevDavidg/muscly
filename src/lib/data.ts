import fs from "fs";
import path from "path";

export type Track = {
  id: string;
  title: string;
  fileName: string;
  coverName: string | null;
  duration: string | null;
  released: boolean;
  youtubeUrl?: string;
};

const ASSETS_DIR = path.join(process.cwd(), "assets", "temas");

function getWavDuration(filePath: string): string | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const headerBuffer = Buffer.alloc(12);
    fs.readSync(fd, headerBuffer, 0, 12, 0);

    if (
      headerBuffer.toString("utf8", 0, 4) !== "RIFF" ||
      headerBuffer.toString("utf8", 8, 12) !== "WAVE"
    ) {
      fs.closeSync(fd);
      return null;
    }

    let offset = 12;
    let sampleRate = 0;
    let bitsPerSample = 0;
    let numChannels = 0;
    let dataSize = 0;
    const chunkBuffer = Buffer.alloc(8);
    const fmtBuffer = Buffer.alloc(16);
    const { size: fileSize } = fs.statSync(filePath);

    while (offset < fileSize - 8) {
      fs.readSync(fd, chunkBuffer, 0, 8, offset);
      const chunkId = chunkBuffer.toString("utf8", 0, 4);
      const chunkSize = chunkBuffer.readUInt32LE(4);

      if (chunkId === "fmt ") {
        fs.readSync(fd, fmtBuffer, 0, 16, offset + 8);
        numChannels = fmtBuffer.readUInt16LE(2);
        sampleRate = fmtBuffer.readUInt32LE(4);
        bitsPerSample = fmtBuffer.readUInt16LE(14);
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
      if (chunkSize % 2 !== 0) offset++;
    }

    fs.closeSync(fd);

    if (!sampleRate || !bitsPerSample || !numChannels || !dataSize) return null;

    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = dataSize / (bytesPerSample * numChannels);
    const seconds = totalSamples / sampleRate;

    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);

    return `${min}:${sec.toString().padStart(2, "0")}`;
  } catch {
    return null;
  }
}

const TRACK_ORDER: Record<string, number> = {
  и1cio: 1,
  FRƎE: 2,
  "∀DO": 3,
  "W∀X": 4,
  "∀yBrda feat.(Gonza)": 5,
  "∀SSP": 6,
};

export async function getTracks(): Promise<Track[]> {
  if (!fs.existsSync(ASSETS_DIR)) return [];

  const files = fs.readdirSync(ASSETS_DIR);
  const wavFiles = files.filter((f) => f.endsWith(".wav"));
  const imageFiles = files.filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  const tracks = wavFiles.map((wav) => {
    const baseName = wav.replace(/\.wav$/i, "");
    let cover = imageFiles.find((img) => img.startsWith(baseName + "."));

    // Specific manual fixes based on provided file list
    if (!cover) {
      if (baseName === "∀yBrda")
        cover = imageFiles.find((img) => img.startsWith("AyBrda"));
      // Handle "∀yBrda feat.(Gonza)" -> might look for "∀yBrda feat.(Gonza).png" which exists
    }

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
