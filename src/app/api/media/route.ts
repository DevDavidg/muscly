import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return new NextResponse("File not found", { status: 404 });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "assets", "temas", safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  let contentType = "application/octet-stream";
  if (safeFilename.endsWith(".wav")) contentType = "audio/wav";
  else if (safeFilename.endsWith(".png")) contentType = "image/png";
  else if (safeFilename.endsWith(".jpg") || safeFilename.endsWith(".jpeg")) contentType = "image/jpeg";

  const range = req.headers.get("range");

  if (range && safeFilename.endsWith(".wav")) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileBuffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, fileBuffer, 0, chunkSize, start);
    fs.closeSync(fd);

    return new NextResponse(fileBuffer, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": chunkSize.toString(),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileSize.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

