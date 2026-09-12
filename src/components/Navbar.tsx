import React, { useState } from "react";
import {
  Activity,
  Sliders,
  Sparkles,
  Layers,
  Music2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Zap,
  GraduationCap,
  Radio,
} from "lucide-react";
import { audioEngine } from "../utils/audioEngine";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  trackTitle: string;
  bpm: number;
  detectedKey: string;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isSchoolOpen: boolean;
  setIsSchoolOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  bpm,
  detectedKey,
  isChatOpen,
  setIsChatOpen,
  isSchoolOpen,
  setIsSchoolOpen,
}) => {
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (isMuted && val > 0) setIsMuted(false);
    audioEngine.setMasterVolume(val);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioEngine.setMasterVolume(volume);
      setIsMuted(false);
    } else {
      audioEngine.setMasterVolume(0);
      setIsMuted(true);
    }
  };

  const navItems = [
    { id: "lab", label: "Laboratorium", icon: Activity, badge: "LIVE" },
    { id: "stems", label: "Stem Splitter", icon: Layers, badge: "OK" },
    { id: "midi", label: "MIDI Lab", icon: Music2 },
    { id: "generator", label: "Generator Emocji", icon: Sparkles },
    { id: "mix", label: "Mix & Master", icon: Sliders },
    { id: "loop", label: "Loop Lab", icon: Radio },
    { id: "daw", label: "DAW DEV", icon: Zap, badge: "DEV" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#111114] border-b border-[#222226] text-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => setActiveTab("lab")}
          >
            <div className="w-8 h-8 bg-[#FFB300] flex items-center justify-center rounded-sm shadow-[0_0_10px_rgba(255,179,0,0.4)] group-hover:scale-105 transition">
              <div className="w-4 h-4 bg-black rotate-45"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-widest text-[#FFB300] uppercase font-sans">
                OSA SOUL
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider hidden sm:block">
                STUDIO PRODUCTION AI
              </span>
            </div>
          </div>
        </div>

        {activeTab !== "daw" && (
          <div className="hidden lg:flex items-center gap-3 bg-[#16161A] border border-[#222226] px-4 py-1.5 rounded-full shadow-inner">
            <button
              id="global-play-pause-btn"
              onClick={onPlayPause}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                isPlaying
                  ? "bg-[#FFB300] text-black shadow-[0_0_10px_rgba(255,179,0,0.5)]"
                  : "bg-zinc-800 text-[#FFB300] hover:bg-zinc-700"
              }`}
              title={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => onSeek(0)}
              className="p-1 text-zinc-400 hover:text-[#FFB300] transition"
              title="Od początku"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 min-w-[75px]">
              <span className="text-[#FFB300] font-bold">{formatTime(currentTime)}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            <div className="flex items-center gap-2 text-[11px] font-mono opacity-80">
              <span className="text-zinc-400">
                BPM: <strong className="text-zinc-200">{bpm}</strong>
              </span>
              <span className="text-zinc-400">
                KEY: <strong className="text-[#FFB300]">{detectedKey}</strong>
              </span>
              <span className="text-zinc-400 hidden xl:inline">
                LUFS: <strong className="text-green-400">-14.2</strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {activeTab !== "daw" && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#16161A] border border-[#222226] px-2.5 py-1.5 rounded-lg">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-[#FFB300] transition">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
              />
            </div>
          )}

          <button
            id="toggle-school-btn"
            onClick={() => setIsSchoolOpen(!isSchoolOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border uppercase ${
              isSchoolOpen
                ? "bg-[#FFB300] text-black border-[#FFB300] shadow-[0_0_10px_rgba(255,179,0,0.3)]"
                : "bg-[#16161A] text-[#FFB300] border-[#222226] hover:bg-[#1A1A1E]"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Szkoła</span>
          </button>

          <button
            id="toggle-producer-chat-btn"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border uppercase ${
              isChatOpen
                ? "bg-purple-600 text-white border-purple-500 shadow-[0_0_10px_rgba(107,70,193,0.4)]"
                : "bg-purple-900/30 text-purple-300 border-purple-500/30 hover:bg-purple-900/50"
            }`}
          >
            <div className="w-2 h-2 bg-[#FFB300] rounded-full animate-pulse"></div>
            <span>Producent AI</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center overflow-x-auto scrollbar-none border-t border-[#1A1A1E] py-1 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-btn-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                isActive
                  ? "bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#16161A]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FFB300]" : "text-zinc-500"}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                    item.badge === "LIVE"
                      ? "bg-[#FFB300] text-black font-bold"
                      : item.badge === "DEV"
                      ? "border border-purple-500 text-purple-300"
                      : "border border-green-500 text-green-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
