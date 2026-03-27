import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src", "temas");
const dest = path.join(root, "public", "temas");
const META_NAME = "tracks-meta.json";

function readWavDurationSeconds(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const size = fs.statSync(filePath).size;
    if (size < 12) return 0;
    const hdr = Buffer.alloc(12);
    fs.readSync(fd, hdr, 0, 12, 0);
    if (hdr.toString("ascii", 0, 4) !== "RIFF" || hdr.toString("ascii", 8, 12) !== "WAVE")
      return 0;
    let pos = 12;
    let byteRate = 0;
    let dataSize = 0;
    let sampleRate = 0;
    let channels = 0;
    let bitsPerSample = 0;
    while (pos + 8 <= size) {
      const head = Buffer.alloc(8);
      fs.readSync(fd, head, 0, 8, pos);
      const chunkId = head.toString("ascii", 0, 4);
      const chunkSize = head.readUInt32LE(4);
      const dataStart = pos + 8;
      if (chunkId === "fmt ") {
        const n = Math.min(chunkSize, 40);
        const fmt = Buffer.alloc(n);
        fs.readSync(fd, fmt, 0, n, dataStart);
        if (n >= 16) {
          channels = fmt.readUInt16LE(2);
          sampleRate = fmt.readUInt32LE(4);
          byteRate = fmt.readUInt32LE(8);
          bitsPerSample = fmt.readUInt16LE(14);
        }
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }
      pos += 8 + chunkSize + (chunkSize % 2);
    }
    if (byteRate > 0 && dataSize > 0) return dataSize / byteRate;
    if (sampleRate > 0 && channels > 0 && bitsPerSample > 0 && dataSize > 0) {
      const bytesPerFrame = (channels * bitsPerSample) / 8;
      return dataSize / bytesPerFrame / sampleRate;
    }
    return 0;
  } finally {
    fs.closeSync(fd);
  }
}

if (!fs.existsSync(src)) {
  console.warn("copy-temas: src/temas not found, skipping");
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
for (const name of fs.readdirSync(src)) {
  const srcFile = path.join(src, name);
  const destFile = path.join(dest, name);
  if (fs.statSync(srcFile).isFile() && name !== META_NAME) {
    fs.copyFileSync(srcFile, destFile);
  }
}

const files = fs.readdirSync(dest);
const wavFiles = files.filter((f) => f.toLowerCase().endsWith(".wav"));
const coverName = files.find((f) => f.toLowerCase() === "portada.png") ?? null;
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const sorted = [...wavFiles].sort((a, b) =>
  collator.compare(a.replace(/\.wav$/i, ""), b.replace(/\.wav$/i, ""))
);
const tracks = sorted.map((fileName) => {
  const wavPath = path.join(dest, fileName);
  const duration =
    fs.existsSync(wavPath) && fs.statSync(wavPath).isFile()
      ? Math.round(readWavDurationSeconds(wavPath))
      : 0;
  return {
    fileName,
    title: fileName.replace(/\.wav$/i, ""),
    duration,
    notLicenced: fileName === "W∀X.wav",
  };
});
const meta = { coverName, tracks };
fs.writeFileSync(path.join(dest, META_NAME), JSON.stringify(meta), "utf8");
console.log("copy-temas: synced src/temas → public/temas, wrote tracks-meta.json");
