import React, { useState, useEffect } from "react";
import {
  Layers,
  Volume2,
  VolumeX,
  Sliders,
  Download,
  Play,
  Pause,
  Sparkles,
  Info,
  CheckCircle2,
  Wand2,
  SlidersHorizontal,
  FileAudio,
} from "lucide-react";
import { StemTrack } from "../types";
import { audioEngine, encodeAudioBufferToWav } from "../utils/audioEngine";

interface StemSplitterProps {
  stems: StemTrack[];
  setStems: React.Dispatch<React.SetStateAction<StemTrack[]>>;
  isPlaying: boolean;
  onPlayPause: () => void;
  trackTitle: string;
}

export const StemSplitter: React.FC<StemSplitterProps> = ({
  stems,
  setStems,
  isPlaying,
  onPlayPause,
  trackTitle,
}) => {
  const [selectedStem, setSelectedStem] = useState<StemTrack>(stems[0]);
  const [separationMode, setSeparationMode] = useState<"dsp" | "cloud">("dsp");

  // Sync stem volume/pan/mute/solo with audioEngine
  useEffect(() => {
    const anySolo = stems.some((s) => s.solo);
    stems.forEach((stem) => {
      audioEngine.registerStem(stem.id);
      audioEngine.setStemVolume(stem.id, stem.volume, stem.mute, anySolo, stem.solo);
      audioEngine.setStemPan(stem.id, stem.pan);
    });
  }, [stems]);

  const toggleMute = (id: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, mute: !s.mute } : s))
    );
  };

  const toggleSolo = (id: string) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, solo: !s.solo } : s))
    );
  };

  const handleVolumeChange = (id: string, val: number) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, volume: val } : s))
    );
  };

  const handlePanChange = (id: string, val: number) => {
    setStems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pan: val } : s))
    );
  };

  const downloadStemWav = (stem: StemTrack) => {
    const buffer = audioEngine.getCurrentBuffer();
    if (!buffer) {
      alert("Brak załadowanego bufora audio do eksportu.");
      return;
    }
    const blob = encodeAudioBufferToWav(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trackTitle || "Projekt"}-${stem.name.replace(/\s+/g, "_")}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Engine Status */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                Stem Splitter: Mikser 10 Ścieżek
              </h2>
              <p className="text-xs text-zinc-400">
                Precyzyjna kontrola nad poszczególnymi warstwami, solowanie, panorama i dedykowane łańcuchy efektów FX.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#111114] border border-[#222226] p-1 rounded-lg">
          <button
            onClick={() => setSeparationMode("dsp")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition ${
              separationMode === "dsp"
                ? "bg-[#FFB300] text-black shadow-[0_0_10px_rgba(255,179,0,0.3)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Filtry DSP w Przeglądarce
          </button>
          <button
            onClick={() => setSeparationMode("cloud")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition ${
              separationMode === "cloud"
                ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(107,70,193,0.4)]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Demucs Neural AI
          </button>
        </div>
      </div>

      {/* 2. Main 10-Channel Mixer Strip */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
            Kanały Miksera Audio ({stems.length} Ścieżek)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayPause}
              className="px-3.5 py-1.5 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,179,0,0.3)]"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? "Zatrzymaj" : "Odtwórz Miks"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stems.map((stem) => {
            const isSelected = selectedStem.id === stem.id;
            return (
              <div
                key={stem.id}
                onClick={() => setSelectedStem(stem)}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "bg-[#1A1A1E] border-[#FFB300]/60 shadow-lg shadow-[#FFB300]/5"
                    : "bg-[#111114] border-[#222226] hover:bg-[#1A1A1E]"
                }`}
              >
                {/* Stem Header */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: stem.color }}
                      />
                      <h4 className="text-xs font-bold text-zinc-100 line-clamp-1">{stem.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-3">
                    <span>{stem.frequencyRange}</span>
                    <span className="text-green-400 font-medium">{stem.confidencePercent}% pewności</span>
                  </div>
                </div>

                {/* Solo / Mute Buttons */}
                <div className="flex items-center gap-1.5 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSolo(stem.id);
                    }}
                    className={`flex-1 py-1 text-xs font-bold uppercase rounded font-mono transition ${
                      stem.solo
                        ? "bg-[#FFB300] text-black shadow-[0_0_10px_rgba(255,179,0,0.5)]"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    SOLO
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute(stem.id);
                    }}
                    className={`flex-1 py-1 text-xs font-bold uppercase rounded font-mono transition ${
                      stem.mute
                        ? "bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : "bg-zinc-800 text-zinc-400 hover:text-red-400"
                    }`}
                  >
                    MUTE
                  </button>
                </div>

                {/* Volume Fader */}
                <div className="space-y-1 mb-2.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Głośność</span>
                    <span className="text-zinc-200">
                      {Math.round(stem.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.01"
                    value={stem.volume}
                    onChange={(e) => handleVolumeChange(stem.id, parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
                  />
                </div>

                {/* Pan Slider */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Panorama</span>
                    <span className="text-zinc-200">
                      {stem.pan === 0 ? "C" : stem.pan < 0 ? `${Math.round(Math.abs(stem.pan) * 100)}L` : `${Math.round(stem.pan * 100)}R`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={stem.pan}
                    onChange={(e) => handlePanChange(stem.id, parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                </div>

                {/* Download stem button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadStemWav(stem);
                  }}
                  className="w-full py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-300 text-[11px] font-bold uppercase rounded-lg border border-[#2A2A2E] transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>Pobierz WAV</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Stem Deep Dive & Suggested FX Chain */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: selectedStem.color }}
            />
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 uppercase">
              Rekomendowany Łańcuch Efektów FX: {selectedStem.name}
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/30 rounded-md font-mono">
            Pasmo: {selectedStem.frequencyRange}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111114] border border-[#222226] p-4 rounded-xl">
            <span className="text-xs font-bold uppercase text-[#FFB300] tracking-wider block mb-1.5 font-mono">
              🎛️ 1. Korekcja EQ (De-masking & Air)
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {selectedStem.suggestedFxChain.eqTip}
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222226] p-4 rounded-xl">
            <span className="text-xs font-bold uppercase text-purple-400 tracking-wider block mb-1.5 font-mono">
              ⚡ 2. Kompresja & Dynamika
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {selectedStem.suggestedFxChain.compressorTip}
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222226] p-4 rounded-xl">
            <span className="text-xs font-bold uppercase text-cyan-400 tracking-wider block mb-1.5 font-mono">
              🌌 3. Przestrzeń (Reverb / Delay)
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {selectedStem.suggestedFxChain.spaceTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
