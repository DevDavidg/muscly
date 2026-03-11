import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

const TEMAS_DIR = path.join(process.cwd(), "src", "temas");

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  if (!pathSegments?.length) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const fileName = pathSegments.map((p) => decodeURIComponent(p)).join(path.sep);
  const resolved = path.resolve(TEMAS_DIR, fileName);
  if (!resolved.startsWith(TEMAS_DIR)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = fs.readFileSync(resolved);
  const ext = path.extname(fileName).toLowerCase();
  let mime = "application/octet-stream";
  if (ext === ".wav") mime = "audio/wav";
  else if (ext === ".png") mime = "image/png";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
