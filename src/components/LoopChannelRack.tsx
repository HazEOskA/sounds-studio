import React, { useMemo } from "react";
import { CircleDot, Grid } from "lucide-react";
import { DawProject } from "../daw/types";
import { toggleDawStep, updateDawChannel } from "../daw/store";

interface LoopChannelRackProps {
  project: DawProject;
  currentStep: number;
  isLooping: boolean;
}

export const LoopChannelRack: React.FC<LoopChannelRackProps> = ({
  project,
  currentStep,
  isLooping,
}) => {
  const hasSolo = useMemo(
    () => project.channels.some((channel) => channel.solo),
    [project.channels]
  );

  return (
    <section className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Grid className="w-4 h-4 text-purple-400" /> Channel Rack 4 × 16 ({project.bpm} BPM)
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">Zmiany tutaj są natychmiast widoczne w DAW DEV i odwrotnie.</p>
        </div>
        <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-3">
          <span className="flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-emerald-400" />{hasSolo ? "SOLO ACTIVE" : "ALL CHANNELS"}</span>
          <span className="text-[#FFB300] font-bold">{currentStep >= 0 ? `STEP ${currentStep + 1}/16` : "STOP"}</span>
        </div>
      </div>

      <div className="space-y-3">
        {project.channels.map((channel) => {
          const audible = !channel.mute && (!hasSolo || channel.solo);
          return (
            <div key={channel.id} className="bg-[#101013] border border-[#242429] rounded-xl p-3">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="xl:w-52 flex items-center gap-2 shrink-0">
                  <span className="w-2 h-8 rounded-full" style={{ backgroundColor: channel.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black uppercase text-zinc-200 truncate">{channel.name}</div>
                    <div className={`text-[9px] font-mono ${audible ? "text-emerald-400" : "text-zinc-600"}`}>{audible ? "ON" : "OFF"}</div>
                  </div>
                  <button
                    onClick={() => updateDawChannel(channel.id, (current) => ({ ...current, mute: !current.mute }))}
                    className={`w-8 h-8 rounded-md text-[10px] font-black border transition ${channel.mute ? "bg-red-500 text-white border-red-400" : "bg-[#1B1B20] text-zinc-400 border-[#303038]"}`}
                  >M</button>
                  <button
                    onClick={() => updateDawChannel(channel.id, (current) => ({ ...current, solo: !current.solo }))}
                    className={`w-8 h-8 rounded-md text-[10px] font-black border transition ${channel.solo ? "bg-[#FFB300] text-black border-[#ffc533]" : "bg-[#1B1B20] text-zinc-400 border-[#303038]"}`}
                  >S</button>
                </div>

                <div className="xl:w-60 grid grid-cols-2 gap-3 shrink-0">
                  <label className="text-[9px] text-zinc-500 font-mono">
                    <div className="flex justify-between mb-1"><span>VOL</span><span className="text-zinc-300">{Math.round(channel.volume * 100)}%</span></div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={channel.volume}
                      onChange={(event) => updateDawChannel(channel.id, (current) => ({ ...current, volume: Number(event.target.value) }))}
                      className="w-full accent-[#FFB300]"
                    />
                  </label>
                  <label className="text-[9px] text-zinc-500 font-mono">
                    <div className="flex justify-between mb-1"><span>PAN</span><span className="text-zinc-300">{channel.pan === 0 ? "C" : channel.pan < 0 ? `${Math.round(Math.abs(channel.pan) * 100)}L` : `${Math.round(channel.pan * 100)}R`}</span></div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.05}
                      value={channel.pan}
                      onChange={(event) => updateDawChannel(channel.id, (current) => ({ ...current, pan: Number(event.target.value) }))}
                      className="w-full accent-purple-400"
                    />
                  </label>
                </div>

                <div className="flex-1 overflow-x-auto pb-1">
                  <div className="grid grid-cols-16 gap-1 min-w-[640px]">
                    {channel.steps.map((active, stepIndex) => {
                      const isCurrent = currentStep === stepIndex && isLooping;
                      const isQuarter = stepIndex % 4 === 0;
                      return (
                        <button
                          key={stepIndex}
                          onClick={() => toggleDawStep(channel.id, stepIndex)}
                          title={`${channel.name} • krok ${stepIndex + 1}`}
                          className={`h-9 rounded-md transition border ${
                            active
                              ? "bg-[#FFB300] border-[#ffc533] shadow-[0_0_8px_rgba(255,179,0,0.35)]"
                              : isQuarter
                              ? "bg-[#1A1A1E] border-[#2A2A2E] hover:bg-[#222226]"
                              : "bg-[#111114] border-[#1E1E22] hover:bg-[#16161A]"
                          } ${isCurrent ? "ring-2 ring-purple-400 scale-105" : ""}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
