import fs from "fs";
import path from "path";

export type Track = {
  id: string;
  title: string;
  fileName: string;
  coverName: string | null;
  duration: string | null;
};

const ASSETS_DIR = path.join(process.cwd(), "assets", "temas");

function getWavDuration(filePath: string): string | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(44); // Read header
    fs.readSync(fd, buffer, 0, 44, 0);
    fs.closeSync(fd);

    // Check if RIFF and WAVE
    if (buffer.toString("utf8", 0, 4) !== "RIFF" || buffer.toString("utf8", 8, 12) !== "WAVE") {
      return null;
    }

    // Read Byte Rate at offset 28 (Little Endian)
    const byteRate = buffer.readUInt32LE(28);
    
    if (byteRate === 0) return null;

    // Get file size
    const { size } = fs.statSync(filePath);
    const dataSize = size - 44; // Approximate data size (header is 44 usually)

    const seconds = dataSize / byteRate;
    
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    
    return `${min}:${sec.toString().padStart(2, "0")}`;
  } catch (e) {
    return null;
  }
}

export async function getTracks(): Promise<Track[]> {
  if (!fs.existsSync(ASSETS_DIR)) return [];

  const files = fs.readdirSync(ASSETS_DIR);
  const wavFiles = files.filter((f) => f.endsWith(".wav"));
  const imageFiles = files.filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

  return wavFiles.map((wav) => {
    const baseName = wav.replace(/\.wav$/i, "");
    let cover = imageFiles.find((img) => img.startsWith(baseName + "."));
    
    if (!cover && baseName === "∀yBrda") {
       cover = imageFiles.find(img => img.startsWith("AyBrda"));
    }

    const duration = getWavDuration(path.join(ASSETS_DIR, wav));

    return {
      id: baseName,
      title: baseName,
      fileName: wav,
      coverName: cover || null,
      duration
    };
  });
}
