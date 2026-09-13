import React, { useEffect, useMemo, useState } from "react";
import {
  CircleDot,
  FolderOpen,
  Play,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Square,
  Volume2,
} from "lucide-react";
import { dawAudioEngine } from "../daw/DawAudioEngine";
import {
  loadSharedDawProject,
  resetSharedDawProject,
  saveSharedDawProject,
  setDawBpm,
  toggleDawStep,
  updateDawChannel,
  useDawProject,
} from "../daw/store";

export const DawDev: React.FC = () => {
  const project = useDawProject();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [status, setStatus] = useState("Shared DAW Project aktywny");

  const hasSolo = useMemo(
    () => project.channels.some((channel) => channel.solo),
    [project.channels]
  );

  useEffect(() => {
    dawAudioEngine.updateProject(project);
  }, [project]);

  useEffect(() => {
    return () => dawAudioEngine.stop();
  }, []);

  const togglePlayback = async () => {
    if (isPlaying || dawAudioEngine.isPlaying()) {
      dawAudioEngine.stop();
      setIsPlaying(false);
      setCurrentStep(-1);
      return;
    }

    await dawAudioEngine.play(project, (step) => setCurrentStep(step));
    setIsPlaying(true);
  };

  const handleSave = () => {
    const saved = saveSharedDawProject();
    setStatus(`Zapisano lokalnie • ${new Date(saved.updatedAt).toLocaleTimeString("pl-PL")}`);
  };

  const handleLoad = () => {
    dawAudioEngine.stop();
    setIsPlaying(false);
    setCurrentStep(-1);
    const loaded = loadSharedDawProject();
    setStatus(loaded ? "Wczytano zapisany projekt" : "Brak zapisanego projektu DAW");
  };

  const handleReset = () => {
    dawAudioEngine.stop();
    setIsPlaying(false);
    setCurrentStep(-1);
    resetSharedDawProject();
    setStatus("Przywrócono projekt startowy");
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#151519] border border-[#2A2A2F] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#25252B] bg-gradient-to-r from-[#18181D] to-[#111114] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 flex items-center justify-center text-[#FFB300]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-100">OSA SOUL DAW DEV</h2>
                <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black font-mono">SHARED CORE</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">DAW DEV i Loop Lab pracują teraz na dokładnie tym samym DawProject.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={togglePlayback}
              className={`h-10 px-4 rounded-lg font-black text-xs uppercase flex items-center gap-2 transition ${isPlaying ? "bg-red-500 text-white hover:bg-red-400" : "bg-[#FFB300] text-black hover:bg-[#ffc02a]"}`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? "Stop" : "Play"}
            </button>

            <label className="h-10 px-3 rounded-lg bg-[#0F0F12] border border-[#2B2B31] flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">BPM</span>
              <input
                type="number"
                min={40}
                max={240}
                value={project.bpm}
                onChange={(event) => setDawBpm(Number(event.target.value))}
                className="w-14 bg-transparent text-[#FFB300] font-black outline-none text-center"
              />
            </label>

            <button onClick={handleSave} className="h-10 px-3 rounded-lg bg-[#1B1B20] border border-[#303038] text-zinc-200 text-xs font-bold flex items-center gap-2">
              <Save className="w-4 h-4 text-[#FFB300]" /> Zapisz
            </button>
            <button onClick={handleLoad} className="h-10 px-3 rounded-lg bg-[#1B1B20] border border-[#303038] text-zinc-200 text-xs font-bold flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" /> Wczytaj
            </button>
            <button onClick={handleReset} className="h-10 px-3 rounded-lg bg-[#1B1B20] border border-[#303038] text-zinc-400 text-xs font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 bg-[#101013] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
          <span className="text-zinc-500">{status}</span>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>Tempo: <strong className="text-zinc-200">{project.bpm} BPM</strong></span>
            <span>Krok: <strong className="text-[#FFB300]">{currentStep >= 0 ? `${currentStep + 1}/16` : "—"}</strong></span>
            <span>Clock: <strong className="text-emerald-400">AudioContext</strong></span>
          </div>
        </div>
      </section>

      <section className="bg-[#151519] border border-[#25252B] rounded-xl shadow-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-100">Channel Rack</h3>
            <p className="text-xs text-zinc-500 mt-1">Edytujesz ten sam pattern, który widzi Loop Lab.</p>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
            <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
            {hasSolo ? "Tryb SOLO aktywny" : "Wszystkie kanały aktywne"}
          </div>
        </div>

        <div className="space-y-3">
          {project.channels.map((channel) => {
            const audible = !channel.mute && (!hasSolo || channel.solo);
            return (
              <div key={channel.id} className="bg-[#101013] border border-[#25252B] rounded-xl p-3">
                <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                  <div className="xl:w-64 flex items-center gap-3 shrink-0">
                    <span className="w-3 h-8 rounded-full" style={{ backgroundColor: channel.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-zinc-100 truncate">{channel.name}</span>
                        <span className={`text-[9px] font-mono ${audible ? "text-emerald-400" : "text-zinc-600"}`}>{audible ? "ON" : "OFF"}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">{channel.soundType}</span>
                    </div>
                    <button onClick={() => updateDawChannel(channel.id, (current) => ({ ...current, mute: !current.mute }))} className={`w-8 h-8 rounded-md text-[10px] font-black border ${channel.mute ? "bg-red-500 text-white border-red-400" : "bg-[#1B1B20] text-zinc-400 border-[#303038]"}`}>M</button>
                    <button onClick={() => updateDawChannel(channel.id, (current) => ({ ...current, solo: !current.solo }))} className={`w-8 h-8 rounded-md text-[10px] font-black border ${channel.solo ? "bg-[#FFB300] text-black border-[#ffc533]" : "bg-[#1B1B20] text-zinc-400 border-[#303038]"}`}>S</button>
                  </div>

                  <div className="xl:w-72 grid grid-cols-2 gap-3 shrink-0">
                    <label className="text-[10px] text-zinc-500 font-mono">
                      <div className="flex justify-between mb-1"><span>VOL</span><span className="text-zinc-300">{Math.round(channel.volume * 100)}%</span></div>
                      <input type="range" min={0} max={1.5} step={0.01} value={channel.volume} onChange={(event) => updateDawChannel(channel.id, (current) => ({ ...current, volume: Number(event.target.value) }))} className="w-full accent-[#FFB300]" />
                    </label>
                    <label className="text-[10px] text-zinc-500 font-mono">
                      <div className="flex justify-between mb-1"><span>PAN</span><span className="text-zinc-300">{channel.pan === 0 ? "C" : channel.pan < 0 ? `${Math.round(Math.abs(channel.pan) * 100)}L` : `${Math.round(channel.pan * 100)}R`}</span></div>
                      <input type="range" min={-1} max={1} step={0.05} value={channel.pan} onChange={(event) => updateDawChannel(channel.id, (current) => ({ ...current, pan: Number(event.target.value) }))} className="w-full accent-purple-400" />
                    </label>
                  </div>

                  <div className="flex-1 overflow-x-auto pb-1">
                    <div className="grid grid-cols-16 gap-1 min-w-[640px]">
                      {channel.steps.map((active, stepIndex) => {
                        const isCurrent = currentStep === stepIndex && isPlaying;
                        const isQuarter = stepIndex % 4 === 0;
                        return (
                          <button
                            key={stepIndex}
                            onClick={() => toggleDawStep(channel.id, stepIndex)}
                            title={`Krok ${stepIndex + 1}`}
                            className={`h-10 rounded-md border transition-all ${active ? "bg-[#FFB300] border-[#ffc533]" : isQuarter ? "bg-[#202025] border-[#34343B]" : "bg-[#17171B] border-[#26262C]"} ${isCurrent ? "ring-2 ring-purple-400 scale-105" : ""}`}
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

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#151519] border border-[#25252B] rounded-xl p-4"><span className="text-[10px] font-black uppercase tracking-wider text-[#FFB300]">Shared Project</span><p className="text-xs text-zinc-400 mt-2">Loop Lab i DAW DEV korzystają z jednego serializowalnego stanu.</p></div>
        <div className="bg-[#151519] border border-[#25252B] rounded-xl p-4"><span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Transport</span><p className="text-xs text-zinc-400 mt-2">Audio jest schedulowane z wyprzedzeniem względem zegara AudioContext.</p></div>
        <div className="bg-[#151519] border border-[#25252B] rounded-xl p-4"><span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Mixer Graph</span><p className="text-xs text-zinc-400 mt-2 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Gain + StereoPanner per kanał → master bus.</p></div>
      </section>
    </div>
  );
};
