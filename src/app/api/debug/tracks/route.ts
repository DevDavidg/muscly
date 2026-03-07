import { readdir } from "node:fs/promises";
import { resolve, normalize } from "node:path";
import { NextResponse } from "next/server";

const TEMAS_DIR = normalize(resolve(process.cwd(), "src", "temas"));

function toCodePoints(s: string): string {
  return [...s].map((c) => `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(" ");
}

export async function GET() {
  let files: string[] = [];
  let error: string | null = null;
  try {
    files = await readdir(TEMAS_DIR);
  } catch (e) {
    error = String(e);
  }
  const wavFiles = files.filter((f) => f.toLowerCase().endsWith(".wav"));
  const debug = {
    dir: TEMAS_DIR,
    error,
    totalFiles: files.length,
    files,
    wavFiles,
    wavDetail: wavFiles.map((f) => ({
      name: f,
      codePoints: toCodePoints(f),
      nfc: f.normalize("NFC"),
      nfd: f.normalize("NFD"),
      encodedUrl: `/api/tracks/${encodeURIComponent(f)}`,
    })),
  };
  return NextResponse.json(debug, { status: 200 });
}
