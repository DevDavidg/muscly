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

  const fileBuffer = fs.readFileSync(filePath);

  let contentType = "application/octet-stream";
  if (safeFilename.endsWith(".wav")) contentType = "audio/wav";
  else if (safeFilename.endsWith(".png")) contentType = "image/png";
  else if (safeFilename.endsWith(".jpg") || safeFilename.endsWith(".jpeg")) contentType = "image/jpeg";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

