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
    const stat = fs.statSync(filePath);
    const buf = Buffer.alloc(Math.min(512, stat.size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    if (buf.length < 44) return 0;
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE")
      return 0;
    let offset = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString("ascii", offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === "fmt ") {
        if (offset + 16 <= buf.length) byteRate = buf.readUInt32LE(offset + 16);
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
