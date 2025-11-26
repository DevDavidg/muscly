import { getTracks } from "@/lib/data";
import MusicPlayer from "@/components/MusicPlayer";

export default async function Home() {
  const tracks = await getTracks();

  return <MusicPlayer initialTracks={tracks} />;
}
