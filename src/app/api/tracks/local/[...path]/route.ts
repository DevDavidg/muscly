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
  const exists = fs.existsSync(resolved);
  const isFile = exists && fs.statSync(resolved).isFile();
  if (!exists || !isFile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = fs.readFileSync(resolved);
  const ext = path.extname(fileName).toLowerCase();
  let mime = "application/octet-stream";
  if (ext === ".wav") mime = "audio/wav";
  else if (ext === ".png") mime = "image/png";
  const disposition =
    ext === ".wav" || ext === ".png"
      ? `attachment; filename="${path.basename(fileName).replace(/"/g, "%22")}"`
      : "attachment";
  const CHUNK = 64 * 1024;
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < buf.length; i += CHUNK) {
        const slice = buf.subarray(i, Math.min(i + CHUNK, buf.length));
        controller.enqueue(new Uint8Array(slice));
      }
      controller.close();
    },
  });
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.length),
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
