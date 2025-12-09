import { list } from "@vercel/blob";

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
}

const TRACK_ORDER: Record<string, number> = {
  FRƎE: 1,
  "∀DO": 2,
  и1cio: 3,
  "W∀X": 4,
  "∀yBrda feat. (Gonza)": 5,
  "∀SSP": 6,
  HRꓷ: 7,
  "ꓷYƧ feat. (SXNTY)": 8,
};

const TRACK_DURATIONS: Record<string, number> = {
  FRƎE: 0,
  "∀DO": 0,
  и1cio: 0,
  "W∀X": 0,
  "∀yBrda feat. (Gonza)": 0,
  "∀SSP": 0,
  HRꓷ: 0,
  "ꓷYƧ feat. (SXNTY)": 0,
};

async function getWavDuration(url: string): Promise<number> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-1024" } });
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);

    const riffBytes = Array.from(new Uint8Array(buffer, 0, 4));
    const riff = String.fromCodePoint(...riffBytes);
    if (riff !== "RIFF") return 0;

    const waveBytes = Array.from(new Uint8Array(buffer, 8, 4));
    const wave = String.fromCodePoint(...waveBytes);
    if (wave !== "WAVE") return 0;

    let offset = 12;
    let byteRate = 176400;
    let dataSize = 0;

    while (offset < buffer.byteLength - 8) {
      const chunkIdBytes = Array.from(new Uint8Array(buffer, offset, 4));
      const chunkId = String.fromCodePoint(...chunkIdBytes);
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === "fmt ") {
        byteRate = view.getUint32(offset + 16, true);
      } else if (chunkId === "data") {
        dataSize = chunkSize;
        break;
      }

      offset += 8 + chunkSize;
    }

    if (dataSize === 0) return 0;
    const duration = dataSize / byteRate;
    return Math.round(duration);
  } catch {
    return 0;
  }
}

export async function getTracks(): Promise<Track[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const { blobs } = await list({
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const wavBlobs = blobs.filter((b) =>
    b.pathname.toLowerCase().endsWith(".wav")
  );
  const imageBlobs = blobs.filter((b) =>
    [".png", ".jpg", ".jpeg"].some((ext) =>
      b.pathname.toLowerCase().endsWith(ext)
    )
  );

  const tracks = await Promise.all(
    wavBlobs.map(async (wavBlob) => {
      const baseName = wavBlob.pathname.replace(/\.wav$/i, "");
      const coverBlob = imageBlobs.find((img) =>
        img.pathname.startsWith(baseName + ".")
      );

      const duration =
        TRACK_DURATIONS[baseName] || (await getWavDuration(wavBlob.url)) || 0;

      const isReleased = baseName === "и1cio";
      const notLicenced = baseName === "W∀X";

      return {
        id: baseName,
        title: baseName,
        fileName: wavBlob.pathname,
        coverName: coverBlob?.pathname || null,
        audioUrl: wavBlob.url,
        coverUrl: coverBlob?.url || null,
        duration,
        released: isReleased,
        notLicenced,
        youtubeUrl: isReleased
          ? "https://www.youtube.com/watch?v=Jwwubg3sFeY"
          : undefined,
      };
    })
  );

  const filteredTracks = tracks.filter((track) => {
    if (track.id === "∀yBrda") {
      const hasFeatVersion = tracks.some(
        (t) => t.id === "∀yBrda feat. (Gonza)"
      );
      return !hasFeatVersion;
    }
    return true;
  });

  return filteredTracks.sort((a, b) => {
    const orderA = TRACK_ORDER[a.id] ?? 999;
    const orderB = TRACK_ORDER[b.id] ?? 999;
    return orderA - orderB;
  });
}
