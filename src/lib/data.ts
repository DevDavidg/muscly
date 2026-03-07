import { getSql } from "@/lib/db";

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

export async function getTracks(): Promise<Track[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, title, file_name, cover_name, audio_bucket_id, cover_bucket_id, duration, released, not_licenced, youtube_url, spotify_url
    FROM tracks
    ORDER BY title
  `;
  return rows.map((r) => ({
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
}
