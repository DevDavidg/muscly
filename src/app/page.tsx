import { Suspense } from "react";
import { getTracks } from "@/lib/data";
import MusicPlayer from "@/components/MusicPlayer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { tracks, localFallback } = await getTracks();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
          Loading...
        </div>
      }
    >
      <MusicPlayer initialTracks={tracks} localFallback={localFallback} />
    </Suspense>
  );
}
