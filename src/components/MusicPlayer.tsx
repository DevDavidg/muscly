"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Music, Image as ImageIcon, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Track } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  initialTracks: Track[];
}

export default function MusicPlayer({ initialTracks }: MusicPlayerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1234") {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setAudioSrc(`/api/media?file=${encodeURIComponent(track.fileName)}`);
    setCoverSrc(track.coverName ? `/api/media?file=${encodeURIComponent(track.coverName)}` : null);
    setIsPlaying(true);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "audio/wav") {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setCurrentTrack({
        id: "local",
        title: file.name.replace(".wav", ""),
        fileName: file.name,
        coverName: null
      });
      setIsPlaying(false); // Let user press play
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setCoverSrc(url);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current && isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [audioSrc]);

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-50">
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-xs p-6">
          <h1 className="text-4xl font-black text-center tracking-tighter mb-4">MUSCLY</h1>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-center text-lg placeholder:text-neutral-600"
            />
            {error && <p className="text-red-500 text-sm text-center font-medium">Access Denied</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors"
          >
            ENTER
          </button>
        </form>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-neutral-950 text-neutral-50">
      {/* Left: Player */}
      <div className="w-full md:w-1/2 lg:w-2/5 p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-neutral-800 min-h-[50vh] md:h-screen relative">
         <div className="absolute top-6 left-6">
            <h1 className="text-xl font-bold tracking-tighter">MUSCLY</h1>
         </div>
         <button 
            onClick={() => setIsAuthenticated(false)}
            className="absolute top-6 right-6 text-xs text-neutral-500 hover:text-neutral-300"
         >
            Logout
         </button>

        <div className="w-full max-w-sm space-y-8">
            <div className="aspect-square w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 relative group">
                {coverSrc ? (
                <img src={coverSrc} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-800">
                    <Music size={80} />
                </div>
                )}
                
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 text-white font-medium">
                        <ImageIcon size={32} />
                        <span className="text-sm">Upload Cover</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
            </div>

            <div className="space-y-6">
                <div className="space-y-1 text-center">
                    <h2 className="text-2xl font-bold truncate">{currentTrack?.title || "Select a track"}</h2>
                    <p className="text-neutral-500 text-sm font-medium">{currentTrack ? "Playing Now" : "Ready to play"}</p>
                </div>

                <div className="space-y-2">
                    <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                        <div 
                            className="bg-white h-full" 
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-8">
                    <button className="text-neutral-400 hover:text-white transition-colors"><SkipBack size={24} /></button>
                    <button 
                        onClick={togglePlay}
                        disabled={!audioSrc}
                        className="h-16 w-16 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="text-neutral-400 hover:text-white transition-colors"><SkipForward size={24} /></button>
                </div>
            </div>
            
            <div className="pt-4 flex justify-center">
                 <label className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full text-xs font-medium text-neutral-400 cursor-pointer transition-colors border border-neutral-800">
                    <Upload size={14} />
                    <span>Import Local WAV</span>
                    <input type="file" accept=".wav" onChange={handleAudioUpload} className="hidden" />
                </label>
            </div>
        </div>
      </div>

      {/* Right: Track List */}
      <div className="w-full md:w-1/2 lg:w-3/5 bg-neutral-950 md:h-screen overflow-y-auto p-6 md:p-12">
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2">Library</h2>
                <p className="text-neutral-500 text-sm">Local tracks from assets/temas</p>
            </div>

            <div className="grid gap-2">
                {initialTracks.map((track) => (
                    <div 
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className={cn(
                            "group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                            currentTrack?.fileName === track.fileName 
                                ? "bg-neutral-900 border-neutral-800" 
                                : "hover:bg-neutral-900/50 hover:border-neutral-800/50"
                        )}
                    >
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                            {track.coverName ? (
                                <img src={`/api/media?file=${encodeURIComponent(track.coverName)}`} alt={track.title} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-600"><Music size={20} /></div>
                            )}
                             <div className={cn(
                                 "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 transition-opacity",
                                 currentTrack?.fileName === track.fileName ? "opacity-100" : "group-hover:opacity-100"
                             )}>
                                 {currentTrack?.fileName === track.fileName && isPlaying ? <div className="music-bar-animation gap-[2px] flex items-end h-3"><span className="w-[2px] bg-white h-full animate-pulse"></span><span className="w-[2px] bg-white h-2/3 animate-pulse delay-75"></span><span className="w-[2px] bg-white h-1/2 animate-pulse delay-150"></span></div> : <Play size={16} fill="white" className="text-white" />}
                             </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className={cn("font-medium truncate", currentTrack?.fileName === track.fileName ? "text-white" : "text-neutral-300")}>{track.title}</h3>
                            <p className="text-xs text-neutral-500 truncate">WAV • Local Asset</p>
                        </div>

                        <div className="text-xs text-neutral-600 font-mono">
                            {track.duration}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={onTimeUpdate}
      />
    </main>
  );
}

