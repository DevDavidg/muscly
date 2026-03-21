import path from "node:path";
import fs from "node:fs";
import { readdir } from "node:fs/promises";

export interface Track {
  id: string;
  title: string;
  fileName: string;
  coverName: string | null;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
  released: boolean;
  notLicenced: boolean;
  youtubeUrl?: string;
  spotifyUrl?: string;
}

function readWavDurationSeconds(filePath: string): number {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(Math.min(512, fs.statSync(filePath).size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    if (buf.length < 44) return 0;
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return 0;
    let offset = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString("ascii", offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === "fmt ") {
        if (offset + 16 <= buf.length) {
          byteRate = buf.readUInt32LE(offset + 16);
        }
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }
    if (byteRate > 0 && dataSize > 0) return dataSize / byteRate;
    return 0;
  } finally {
    fs.closeSync(fd);
  }
}

export async function getTracks(): Promise<Track[]> {
  const base = path.join(process.cwd(), "public", "temas");
  let files: string[] = [];
  try {
    files = await readdir(base);
  } catch {
    return [];
  }
  const wavFiles = files.filter((f) => f.toLowerCase().endsWith(".wav"));
  const coverName =
    files.find((f) => f.toLowerCase() === "portada.png") ?? null;
  const hasCover = coverName !== null;
  const collator = new Intl.Collator(undefined, {
    sensitivity: "base",
    numeric: true,
  });
  const sorted = [...wavFiles].sort((a, b) =>
    collator.compare(a.replace(/\.wav$/i, ""), b.replace(/\.wav$/i, ""))
  );
  return sorted.map((fileName) => {
    const title = fileName.replace(/\.wav$/i, "");
    const wavPath = path.join(base, fileName);
    const duration =
      fs.existsSync(wavPath) && fs.statSync(wavPath).isFile()
        ? readWavDurationSeconds(wavPath)
        : 0;
    const audioUrl = `/temas/${encodeURIComponent(fileName)}`;
    return {
      id: fileName,
      title,
      fileName,
      coverName,
      audioUrl,
      coverUrl: hasCover ? "/temas/portada.png" : null,
      duration: Math.round(duration),
      released: true,
      notLicenced: fileName === "W∀X.wav",
    };
  });
}
