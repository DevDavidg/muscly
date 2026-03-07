import { Suspense } from "react";
import { getTracks } from "@/lib/data";
import MusicPlayer from "@/components/MusicPlayer";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const tracks = await getTracks();
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
            Loading...
          </div>
        }
      >
        <MusicPlayer initialTracks={tracks} />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading tracks:", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading tracks</h1>
          <p className="text-neutral-500">{String(error)}</p>
        </div>
      </div>
    );
  }
}
