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
  spotifyUrl?: string;
}

const RELEASES: Record<
  string,
  { youtube: string; spotify: string }
> = {
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

async function getWavDuration(url: string): Promise<number> {
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-65535" } });
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
    b.pathname.toLowerCase().endsWith(".wav"),
  );
  const imageBlobs = blobs.filter((b) =>
    [".png", ".jpg", ".jpeg"].some((ext) =>
      b.pathname.toLowerCase().endsWith(ext),
    ),
  );

  const defaultCoverBlob =
    imageBlobs.find((b) =>
      /portada\.png$/i.test(b.pathname.replace(/^\/+/, "")),
    ) || null;

  const tracks = await Promise.all(
    wavBlobs.map(async (wavBlob) => {
      const baseName = wavBlob.pathname.replace(/\.wav$/i, "");
      const duration = (await getWavDuration(wavBlob.url)) || 0;

      const release = RELEASES[baseName];
      const notLicenced = baseName === "W∀X";

      return {
        id: baseName,
        title: baseName,
        fileName: wavBlob.pathname,
        coverName: defaultCoverBlob?.pathname || null,
        audioUrl: wavBlob.url,
        coverUrl: defaultCoverBlob?.url || null,
        duration,
        released: !!release,
        notLicenced,
        youtubeUrl: release?.youtube,
        spotifyUrl: release?.spotify,
      };
    }),
  );

  const collator = new Intl.Collator(undefined, {
    sensitivity: "base",
    numeric: true,
  });

  return tracks.sort((a, b) => collator.compare(a.title, b.title));
}
