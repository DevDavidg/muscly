import { Pool, neonConfig } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "dotenv";
import ws from "ws";

config({ path: ".env.local" });
config();

neonConfig.webSocketConstructor = ws;

const TRACKS_DIR = join(process.cwd(), "src", "temas");

const MIME: Record<string, string> = {
  ".wav": "audio/wav",
  ".png": "image/png",
};

const RELEASES: Record<string, { youtube: string; spotify: string }> = {
  "и1cio": {
    youtube: "https://www.youtube.com/watch?v=Jwwubg3sFeY",
    spotify:
      "https://open.spotify.com/intl-es/track/5FVbw85IR7yOIc1DWueQjC?si=6656ced9c0ba4c54",
  },
  "∀DO": {
    youtube: "https://www.youtube.com/watch?v=vZTBZ2Wher4",
    spotify:
      "https://open.spotify.com/intl-es/track/4VFONIImDcVipzPS21afUL?si=604be836429e4b70",
  },
  "∀yBrda feat. (Gonza)": {
    youtube: "https://www.youtube.com/watch?v=_7BAgF6zW0I",
    spotify:
      "https://open.spotify.com/intl-es/track/3Ruz3uGk9knLeulQjh5ALO?si=d1affbc0711f4e24",
  },
};

export async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });

  try {
    const files = await readdir(TRACKS_DIR);
    const wavFiles = files.filter((f) => f.toLowerCase().endsWith(".wav"));
    const coverFile = files.find((f) => f.toLowerCase() === "portada.png") ?? null;

    await pool.query("DELETE FROM tracks");
    await pool.query("DELETE FROM bucket");

    let coverBucketId: string | null = null;
    if (coverFile) {
      const coverPath = join(TRACKS_DIR, coverFile);
      const data = await readFile(coverPath);
      const ext = coverFile.toLowerCase().slice(coverFile.lastIndexOf("."));
      const mime = MIME[ext] ?? "application/octet-stream";
      const r = await pool.query(
        "INSERT INTO bucket (file_name, mime_type, data) VALUES ($1, $2, $3) RETURNING id",
        [coverFile, mime, data]
      );
      coverBucketId = r.rows[0].id;
    }

    const collator = new Intl.Collator(undefined, {
      sensitivity: "base",
      numeric: true,
    });
    const sorted = [...wavFiles].sort((a, b) =>
      collator.compare(a.replace(/\.wav$/i, ""), b.replace(/\.wav$/i, ""))
    );

    for (const fileName of sorted) {
      const baseName = fileName.replace(/\.wav$/i, "");
      const filePath = join(TRACKS_DIR, fileName);
      const data = await readFile(filePath);
      const mime = MIME[".wav"];
      const ir = await pool.query(
        "INSERT INTO bucket (file_name, mime_type, data) VALUES ($1, $2, $3) RETURNING id",
        [fileName, mime, data]
      );
      const audioBucketId = ir.rows[0].id;
      const release = RELEASES[baseName];
      const notLicenced = baseName === "W∀X";
      await pool.query(
        `INSERT INTO tracks (id, title, file_name, cover_name, audio_bucket_id, cover_bucket_id, duration, released, not_licenced, youtube_url, spotify_url)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)`,
        [
          baseName,
          baseName,
          fileName,
          coverFile,
          audioBucketId,
          coverBucketId,
          !!release,
          notLicenced,
          release?.youtube ?? null,
          release?.spotify ?? null,
        ]
      );
      console.log(`Synced ${fileName}`);
    }

    console.log(`Done. ${sorted.length} tracks in Neon bucket.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
