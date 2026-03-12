import { getSql } from "@/lib/db";
import path from "node:path";
import fs from "node:fs";

export interface Track {
  id: string;
  title: string;
  fileName: string;
  coverName: string | null;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
  released: boolean;
  notLicenced: boolean;
  youtubeUrl?: string;
  spotifyUrl?: string;
}

const LOCAL_TEMA_FILES = [
  "B∀K feat. (LEK).wav",
  "FRƎE.wav",
  "HRꓷ.wav",
  "ICƎ.wav",
  "MOLꞀY prod. (Satur).wav",
  "VLЯ.wav",
  "W∀X.wav",
  "∀DO.wav",
  "∀SSP.wav",
  "∀yBrda feat. (Gonza).wav",
  "и1cio.wav",
  "ꓷYƧ feat. (SXNTY).wav",
];

function readWavDurationSeconds(filePath: string): number {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(Math.min(512, fs.statSync(filePath).size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    if (buf.length < 44) return 0;
    if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return 0;
    let offset = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.toString("ascii", offset, offset + 4);
      const chunkSize = buf.readUInt32LE(offset + 4);
      if (chunkId === "fmt ") {
        if (offset + 16 <= buf.length) {
          byteRate = buf.readUInt32LE(offset + 16);
        }
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

function getLocalTracks(): Track[] {
  const base = path.join(process.cwd(), "src", "temas");
  const coverPath = path.join(base, "portada.png");
  const hasCover = fs.existsSync(coverPath);
  return LOCAL_TEMA_FILES.map((fileName, i) => {
    const title = fileName.replace(/\.wav$/i, "");
    const wavPath = path.join(base, fileName);
    const duration =
      fs.existsSync(wavPath) && fs.statSync(wavPath).isFile()
        ? readWavDurationSeconds(wavPath)
        : 0;
    const audioUrl = `/temas/${encodeURIComponent(fileName)}`;
    return {
      id: `local-${i}-${title}`,
      title,
      fileName,
      coverName: hasCover ? "portada.png" : null,
      audioUrl,
      coverUrl: hasCover ? "/temas/portada.png" : null,
      duration: Math.round(duration),
      released: true,
      notLicenced: false,
    };
  });
}

export type GetTracksResult = { tracks: Track[]; localFallback: boolean };

export async function getTracks(): Promise<GetTracksResult> {
  if (!process.env.DATABASE_URL) {
    return { tracks: getLocalTracks(), localFallback: true };
  }
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, title, file_name, cover_name, audio_bucket_id, cover_bucket_id, duration, released, not_licenced, youtube_url, spotify_url
      FROM tracks
      ORDER BY title
    `;
    const tracks = rows.map((r) => ({
      id: r.id,
      title: r.title,
      fileName: r.file_name,
      coverName: r.cover_name,
      audioUrl: `/api/tracks/file/${r.audio_bucket_id}`,
      coverUrl: r.cover_bucket_id ? `/api/tracks/file/${r.cover_bucket_id}` : null,
      duration: r.duration ?? 0,
      released: r.released ?? false,
      notLicenced: r.not_licenced ?? false,
      youtubeUrl: r.youtube_url ?? undefined,
      spotifyUrl: r.spotify_url ?? undefined,
    }));
    return { tracks, localFallback: false };
  } catch {
    return { tracks: getLocalTracks(), localFallback: true };
  }
}
