import { del, list, put } from "@vercel/blob";
import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

config({ path: ".env.local" });
config();

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set");

const temasDir = join(process.cwd(), "src", "temas");

async function deleteAllBlobs(): Promise<number> {
  const { blobs } = await list({ token });
  const urls = blobs.map((b) => b.url);
  const batchSize = 200;
  for (let i = 0; i < urls.length; i += batchSize) {
    await del(urls.slice(i, i + batchSize), { token });
  }
  return urls.length;
}

async function upload(fileName: string): Promise<void> {
  const buffer = await readFile(join(temasDir, fileName));
  await put(fileName, buffer, {
    token,
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function main(): Promise<void> {
  const entries = await readdir(temasDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);

  const cover = files.find((f) => f.toLowerCase() === "portada.png");
  if (!cover) throw new Error(`portada.png not found in ${temasDir}`);

  const wavs = files.filter((f) => f.toLowerCase().endsWith(".wav"));
  if (wavs.length === 0) throw new Error(`No .wav files found in ${temasDir}`);

  const deleted = await deleteAllBlobs();

  await upload(cover);
  for (const wav of wavs) await upload(wav);

  console.log(
    JSON.stringify(
      { deleted, uploadedCover: cover, uploadedWavs: wavs.length },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
