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
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-4">Error loading tracks</h1>
          <p className="text-neutral-500 mb-4">{message}</p>
          {message.includes("DATABASE_URL") && (
            <p className="text-sm text-neutral-600">
              En Vercel: Project Settings → Environment Variables → añade DATABASE_URL con la connection string de Neon.
            </p>
          )}
        </div>
      </div>
    );
  }
}
