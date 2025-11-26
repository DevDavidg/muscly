import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime"; // You might not have this, better use simple mapping

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return new NextResponse("File not found", { status: 404 });
  }

  // Security: prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "assets", "temas", safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  let contentType = "application/octet-stream";
  if (safeFilename.endsWith(".wav")) contentType = "audio/wav";
  else if (safeFilename.endsWith(".png")) contentType = "image/png";
  else if (safeFilename.endsWith(".jpg") || safeFilename.endsWith(".jpeg")) contentType = "image/jpeg";

  // @ts-ignore: ReadableStream type mismatch with node stream, but Next.js handles it
  return new NextResponse(fileStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": stat.size.toString(),
    },
  });
}

