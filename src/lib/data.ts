import path from "node:path";
import fs from "node:fs";
import { getGlobalScores } from "@/lib/votes";

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

interface TracksMeta {
  coverName: string | null;
  tracks: Array<{
    fileName: string;
    title: string;
    duration: number;
    notLicenced: boolean;
  }>;
}

export async function getTracks(): Promise<Track[]> {
  const metaPath = path.join(process.cwd(), "public", "temas", "tracks-meta.json");
  if (!fs.existsSync(metaPath)) return [];
  let meta: TracksMeta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as TracksMeta;
  } catch {
    return [];
  }
  const hasCover = meta.coverName !== null && meta.coverName !== undefined;
  const tracks = meta.tracks.map((t) => ({
    id: t.fileName,
    title: t.title,
    fileName: t.fileName,
    coverName: meta.coverName,
    audioUrl: `/temas/${encodeURIComponent(t.fileName)}`,
    coverUrl: hasCover ? "/temas/portada.png" : null,
    duration: t.duration,
    released: true,
    notLicenced: t.notLicenced,
  }));
  const scores = await getGlobalScores(tracks.map((track) => track.id));
  return tracks.sort((a, b) => {
    const scoreA = scores.get(a.id) ?? 0;
    const scoreB = scores.get(b.id) ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.title.localeCompare(b.title);
  });
}
