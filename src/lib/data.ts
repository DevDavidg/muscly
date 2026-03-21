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
  return meta.tracks.map((t) => ({
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
}
