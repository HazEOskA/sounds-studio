import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { audioEngine } from "../utils/audioEngine";
import { dawAudioEngine } from "../daw/DawAudioEngine";
import { DawProject } from "../daw/types";

interface MPCpad {
  id: string;
  name: string;
  keyTrigger: string;
  color: string;
  soundType: "kick" | "snare" | "hihat" | "bass808" | "chord" | "vocal";
}

const PADS: MPCpad[] = [
  { id: "pad-1", name: "Hard Kick 808", keyTrigger: "1", color: "from-amber-500 to-amber-700", soundType: "kick" },
  { id: "pad-2", name: "Punchy Snare", keyTrigger: "2", color: "from-violet-500 to-violet-700", soundType: "snare" },
  { id: "pad-3", name: "Trap Hi-Hat", keyTrigger: "3", color: "from-yellow-500 to-amber-600", soundType: "hihat" },
  { id: "pad-4", name: "Deep Sub 808", keyTrigger: "4", color: "from-red-600 to-red-900", soundType: "bass808" },
  { id: "pad-5", name: "Rhodes Chop 1", keyTrigger: "Q", color: "from-cyan-500 to-blue-700", soundType: "chord" },
  { id: "pad-6", name: "Rhodes Chop 2", keyTrigger: "W", color: "from-blue-500 to-indigo-700", soundType: "chord" },
  { id: "pad-7", name: "Vocal Ambience", keyTrigger: "E", color: "from-purple-500 to-fuchsia-700", soundType: "vocal" },
  { id: "pad-8", name: "Sub Drop FX", keyTrigger: "R", color: "from-emerald-500 to-teal-700", soundType: "bass808" },
];

interface LoopPadsProps {
  project: DawProject;
}

export const LoopPads: React.FC<LoopPadsProps> = ({ project }) => {
  const [activePad, setActivePad] = useState<string | null>(null);

  const triggerPad = (pad: MPCpad) => {
    setActivePad(pad.id);
    window.setTimeout(() => setActivePad(null), 150);

    if (["kick", "snare", "hihat", "bass808"].includes(pad.soundType)) {
      const channel = project.channels.find((item) => item.soundType === pad.soundType);
      if (channel) void dawAudioEngine.triggerChannel(channel.id, project);
      return;
    }

    if (pad.soundType === "chord") {
      audioEngine.playSynthesizerChord(["F3", "Ab3", "C4", "Eb4"], 1.2, "warm");
    } else if (pad.soundType === "vocal") {
      audioEngine.playSynthesizerChord(["C4", "Eb4", "G4", "Bb4"], 1.5, "pluck");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const key = event.key.toUpperCase();
      const matched = PADS.find((pad) => pad.keyTrigger.toUpperCase() === key);
      if (matched) triggerPad(matched);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project]);

  return (
    <section className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#FFB300]" /> Pady Perkusyjne & Chopy Sampli
        </h3>
        <span className="text-xs text-zinc-400 font-mono">1–4 używają silnika DAW</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {PADS.map((pad) => {
          const active = activePad === pad.id;
          return (
            <button
              key={pad.id}
              onClick={() => triggerPad(pad)}
              className={`h-24 sm:h-28 rounded-xl p-3 border transition-all transform flex flex-col justify-between text-left ${
                active ? "scale-95 border-[#FFB300] shadow-xl shadow-[#FFB300]/30" : "border-[#222226] hover:border-zinc-500 hover:scale-[1.02]"
              } bg-gradient-to-br ${pad.color}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="w-6 h-6 rounded-md bg-black/60 text-white font-mono text-xs font-black flex items-center justify-center border border-white/20">{pad.keyTrigger}</span>
                <span className="text-[10px] uppercase font-bold text-white/80 tracking-wider font-mono">{pad.soundType}</span>
              </div>
              <span className="text-xs font-black text-white uppercase">{pad.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
