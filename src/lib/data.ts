import path from "node:path";
import fs from "node:fs";
import { getGlobalScores } from "@/lib/votes";

export interface Track {
  id: string;
  title: string;
  fileName: string;
  subgenre: string | null;
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

const subgenreByTitle: Record<string, string> = {
  "W∀X": "Surf",
  "∀DO": "Slime Trap",
  "∀SSP": "Cloud Trap",
  "∀yBrda feat. (Gonza)": "Dark Trap",
  "2%": "Crank",
  "B∀K feat. (LEK)": "Boom Bap",
  "FRƎE": "Dark Trap",
  FTR3: "Melodic Trap",
  "HRꓷ": "Goofy Trap",
  "ICƎ": "Goofy Trap",
  "MOLꞀY prod. (Satur)": "Hard Trap",
  "MOVƎ": "Atlanta Trap",
  "OЯO": "Hard Trap",
  "VLЯ": "Emo Trap",
  "и1cio": "Dark Trap",
  "ꓷYƧ feat. (SXNTY)": "Surf Trap",
};

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
    subgenre: subgenreByTitle[t.title] ?? null,
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
