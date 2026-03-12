import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src", "temas");
const dest = path.join(root, "public", "temas");

if (!fs.existsSync(src)) {
  console.warn("copy-temas: src/temas not found, skipping");
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
for (const name of fs.readdirSync(src)) {
  const srcFile = path.join(src, name);
  const destFile = path.join(dest, name);
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
  }
}
console.log("copy-temas: synced src/temas → public/temas");
