import React, { useState, useEffect } from "react";
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Download,
  Scissors,
  Layers,
  Zap,
  Grid,
} from "lucide-react";
import { audioEngine, encodeAudioBufferToWav } from "../utils/audioEngine";

interface LoopLabProps {
  bpm: number;
  trackTitle: string;
}

interface MPCpad {
  id: string;
  name: string;
  keyTrigger: string;
  color: string;
  soundType: "kick" | "snare" | "hihat" | "bass808" | "chord" | "vocal";
  pitchSemitones: number;
}

export const LoopLab: React.FC<LoopLabProps> = ({ bpm, trackTitle }) => {
  const [activePad, setActivePad] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [gridSteps, setGridSteps] = useState<boolean[][]>([
    // Kick (16 steps)
    [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    // Snare
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    // Hi-hat
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, true],
    // 808 Sub
    [true, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
  ]);

  const pads: MPCpad[] = [
    { id: "pad-1", name: "Hard Kick 808", keyTrigger: "1", color: "from-amber-500 to-amber-700", soundType: "kick", pitchSemitones: 0 },
    { id: "pad-2", name: "Punchy Snare", keyTrigger: "2", color: "from-violet-500 to-violet-700", soundType: "snare", pitchSemitones: 0 },
    { id: "pad-3", name: "Trap Hi-Hat", keyTrigger: "3", color: "from-yellow-500 to-amber-600", soundType: "hihat", pitchSemitones: 0 },
    { id: "pad-4", name: "Deep Sub 808", keyTrigger: "4", color: "from-red-600 to-red-900", soundType: "bass808", pitchSemitones: 0 },
    { id: "pad-5", name: "Rhodes Chop 1", keyTrigger: "Q", color: "from-cyan-500 to-blue-700", soundType: "chord", pitchSemitones: 0 },
    { id: "pad-6", name: "Rhodes Chop 2", keyTrigger: "W", color: "from-blue-500 to-indigo-700", soundType: "chord", pitchSemitones: 3 },
    { id: "pad-7", name: "Vocal Ambience", keyTrigger: "E", color: "from-purple-500 to-fuchsia-700", soundType: "vocal", pitchSemitones: 0 },
    { id: "pad-8", name: "Sub Drop FX", keyTrigger: "R", color: "from-emerald-500 to-teal-700", soundType: "bass808", pitchSemitones: -5 },
  ];

  const triggerPad = (pad: MPCpad) => {
    setActivePad(pad.id);
    setTimeout(() => setActivePad(null), 150);

    if (pad.soundType === "kick") audioEngine.playDrumSound("kick");
    else if (pad.soundType === "snare") audioEngine.playDrumSound("snare");
    else if (pad.soundType === "hihat") audioEngine.playDrumSound("hihat");
    else if (pad.soundType === "bass808") audioEngine.playDrumSound("bass808");
    else if (pad.soundType === "chord") {
      audioEngine.playSynthesizerChord(["F3", "Ab3", "C4", "Eb4"], 1.2, "warm");
    } else if (pad.soundType === "vocal") {
      audioEngine.playSynthesizerChord(["C4", "Eb4", "G4", "Bb4"], 1.5, "pluck");
    }
  };

  // Keyboard triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const key = e.key.toUpperCase();
      const matched = pads.find((p) => p.keyTrigger.toUpperCase() === key);
      if (matched) {
        triggerPad(matched);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Step Sequencer Timer
  useEffect(() => {
    if (!isLooping) return;
    const stepDurationMs = (60 / bpm / 4) * 1000;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % 16;
        // Trigger sounds at step
        if (gridSteps[0][next]) audioEngine.playDrumSound("kick");
        if (gridSteps[1][next]) audioEngine.playDrumSound("snare");
        if (gridSteps[2][next]) audioEngine.playDrumSound("hihat");
        if (gridSteps[3][next]) audioEngine.playDrumSound("bass808");
        return next;
      });
    }, stepDurationMs);

    return () => clearInterval(interval);
  }, [isLooping, bpm, gridSteps]);

  const toggleGridStep = (rowIdx: number, stepIdx: number) => {
    setGridSteps((prev) => {
      const next = prev.map((r) => [...r]);
      next[rowIdx][stepIdx] = !next[rowIdx][stepIdx];
      return next;
    });
  };

  const handleDownloadBeatWav = () => {
    const buffer = audioEngine.getCurrentBuffer();
    if (!buffer) {
      alert("Brak aktywnego bufora audio.");
      return;
    }
    const blob = encodeAudioBufferToWav(buffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trackTitle || "OSA"}_Beat_Loop.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowLabels = ["Kick Drum", "Snare / Clap", "Hi-Hat", "808 Sub"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                Loop Lab: Sampler MPC & 16-Krokowy Sekwencer
              </h2>
              <p className="text-xs text-zinc-400">
                Graj na padach studyjnych (klawisze 1-4, Q-R), programuj bębny w siatce rytmicznej i eksportuj pętle.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 shadow-md ${
              isLooping
                ? "bg-[#FFB300] text-black shadow-[0_0_15px_rgba(255,179,0,0.3)]"
                : "bg-[#FFB300] hover:bg-[#ffbe1a] text-black shadow-[0_0_15px_rgba(255,179,0,0.2)]"
            }`}
          >
            {isLooping ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isLooping ? "Zatrzymaj Pętlę" : "Uruchom Pętlę (16 Steps)"}</span>
          </button>

          <button
            onClick={handleDownloadBeatWav}
            className="px-3 py-2 bg-[#111114] hover:bg-[#1A1A1E] text-zinc-300 border border-[#222226] rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz Pętlę WAV</span>
          </button>
        </div>
      </div>

      {/* MPC 8-Pad Hardware Interface */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFB300]" />
            Pady Perkusyjne & Chopy Sampli (MPC Studio)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">Użyj myszy lub klawiatury fizycznej</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {pads.map((pad) => {
            const isActive = activePad === pad.id;
            return (
              <button
                key={pad.id}
                onClick={() => triggerPad(pad)}
                className={`h-24 sm:h-28 rounded-xl p-3 border transition-all transform flex flex-col justify-between text-left relative overflow-hidden group ${
                  isActive
                    ? "scale-95 border-[#FFB300] shadow-xl shadow-[#FFB300]/30"
                    : "border-[#222226] hover:border-zinc-500 hover:scale-[1.02]"
                } bg-gradient-to-br ${pad.color}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-6 h-6 rounded-md bg-black/60 text-white font-mono text-xs font-black flex items-center justify-center border border-white/20">
                    {pad.keyTrigger}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider font-mono">
                    {pad.soundType}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-black text-white block leading-tight drop-shadow-sm uppercase">
                    {pad.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 16-Step Drum Grid Sequencer */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Grid className="w-4 h-4 text-purple-400" />
            16-Krokowy Sekwencer Rytmiczny ({bpm} BPM)
          </h3>
          <span className="text-xs font-mono text-[#FFB300] font-bold">
            Krok: {currentStep + 1}/16
          </span>
        </div>

        <div className="space-y-3">
          {gridSteps.map((row, rIdx) => (
            <div key={rIdx} className="flex items-center gap-2">
              <span className="w-28 text-xs font-bold text-zinc-300 truncate font-mono uppercase text-[11px]">
                {rowLabels[rIdx]}
              </span>

              <div className="flex-1 grid grid-cols-16 gap-1">
                {row.map((on, sIdx) => {
                  const isCurrent = currentStep === sIdx && isLooping;
                  const isBeatQuarter = sIdx % 4 === 0;
                  return (
                    <button
                      key={sIdx}
                      onClick={() => toggleGridStep(rIdx, sIdx)}
                      className={`h-8 sm:h-9 rounded-md transition border ${
                        on
                          ? "bg-[#FFB300] border-[#ffc533] shadow-[0_0_8px_rgba(255,179,0,0.4)]"
                          : isBeatQuarter
                          ? "bg-[#1A1A1E] border-[#2A2A2E] hover:bg-[#222226]"
                          : "bg-[#111114] border-[#1E1E22] hover:bg-[#16161A]"
                      } ${isCurrent ? "ring-2 ring-purple-400 scale-105" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
