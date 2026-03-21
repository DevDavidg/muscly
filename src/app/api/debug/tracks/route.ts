import path from "node:path";
import fs from "node:fs";
import { NextResponse } from "next/server";

const META = path.join(process.cwd(), "public", "temas", "tracks-meta.json");

function toCodePoints(s: string): string {
  return [...s]
    .map(
      (c) =>
        `${c}(U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`
    )
    .join(" ");
}

export async function GET() {
  let error: string | null = null;
  let meta: unknown = null;
  try {
    if (fs.existsSync(META)) {
      meta = JSON.parse(fs.readFileSync(META, "utf8"));
    }
  } catch (e) {
    error = String(e);
  }
  const wavFiles =
    meta &&
    typeof meta === "object" &&
    meta !== null &&
    "tracks" in meta &&
    Array.isArray((meta as { tracks: { fileName: string }[] }).tracks)
      ? (meta as { tracks: { fileName: string }[] }).tracks.map((t) => t.fileName)
      : [];
  const debug = {
    metaPath: META,
    error,
    meta,
    wavFiles,
    wavDetail: wavFiles.map((f) => ({
      name: f,
      codePoints: toCodePoints(f),
      nfc: f.normalize("NFC"),
      nfd: f.normalize("NFD"),
      encodedUrl: `/temas/${encodeURIComponent(f)}`,
    })),
  };
  return NextResponse.json(debug, { status: 200 });
}
