import React, { useEffect, useState } from "react";
import {
  Download,
  FolderOpen,
  Pause,
  Play,
  Radio,
  Save,
  Sparkles,
} from "lucide-react";
import { dawAudioEngine } from "../daw/DawAudioEngine";
import { renderDawProjectToWav } from "../daw/renderer";
import {
  loadSharedDawProject,
  saveSharedDawProject,
  setDawBpm,
  useDawProject,
} from "../daw/store";
import { LoopChannelRack } from "./LoopChannelRack";
import { LoopPads } from "./LoopPads";

interface LoopLabProps {
  bpm: number;
  trackTitle: string;
}

export const LoopLab: React.FC<LoopLabProps> = ({ bpm: detectedBpm, trackTitle }) => {
  const project = useDawProject();
  const [isLooping, setIsLooping] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [status, setStatus] = useState("Wspólny projekt DAW aktywny");
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    dawAudioEngine.updateProject(project);
  }, [project]);

  useEffect(() => {
    return () => dawAudioEngine.stop();
  }, []);

  const toggleLoopPlayback = async () => {
    if (isLooping || dawAudioEngine.isPlaying()) {
      dawAudioEngine.stop();
      setIsLooping(false);
      setCurrentStep(-1);
      return;
    }

    await dawAudioEngine.play(project, (step) => setCurrentStep(step));
    setIsLooping(true);
  };

  const handleSave = () => {
    const saved = saveSharedDawProject();
    setStatus(`Projekt zapisany • ${new Date(saved.updatedAt).toLocaleTimeString("pl-PL")}`);
  };

  const handleLoad = () => {
    dawAudioEngine.stop();
    setIsLooping(false);
    setCurrentStep(-1);
    const loaded = loadSharedDawProject();
    setStatus(loaded ? "Wczytano zapisany projekt DAW" : "Brak zapisanego projektu DAW");
  };

  const handleDownloadBeatWav = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setStatus("Renderuję aktualny pattern do WAV…");

    try {
      const blob = await renderDawProjectToWav(project);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${trackTitle || "OSA"}_Beat_Loop_${project.bpm}BPM.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`WAV gotowy • ${project.bpm} BPM • 16 kroków`);
    } catch (error) {
      console.error("Błąd renderu DAW WAV", error);
      setStatus("Błąd renderu WAV — sprawdź konsolę przeglądarki");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">Loop Lab: Shared DAW Channel Rack</h2>
                <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">FUNCTIONAL CLOSURE 1</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Ten sam project state, pattern, BPM i mixer state co DAW DEV. Audio jest planowane przez wspólny scheduler AudioContext.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleLoopPlayback}
              className={`h-10 px-4 rounded-lg text-xs font-black uppercase transition flex items-center gap-2 ${isLooping ? "bg-red-500 text-white hover:bg-red-400" : "bg-[#FFB300] hover:bg-[#ffbe1a] text-black"}`}
            >
              {isLooping ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isLooping ? "Stop" : "Play Pattern"}
            </button>

            <label className="h-10 px-3 rounded-lg bg-[#111114] border border-[#2A2A2E] flex items-center gap-2 text-xs font-mono">
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

            <button
              onClick={() => setDawBpm(detectedBpm)}
              className="h-10 px-3 rounded-lg bg-[#111114] border border-[#2A2A2E] text-[10px] font-bold text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40 transition"
              title={`Ustaw BPM projektu na wykryte ${detectedBpm}`}
            >SYNC {detectedBpm}</button>

            <button onClick={handleSave} className="h-10 px-3 rounded-lg bg-[#111114] text-zinc-300 border border-[#222226] text-xs font-bold uppercase flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-[#FFB300]" /> Zapisz
            </button>

            <button onClick={handleLoad} className="h-10 px-3 rounded-lg bg-[#111114] text-zinc-300 border border-[#222226] text-xs font-bold uppercase flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-purple-400" /> Wczytaj
            </button>

            <button
              onClick={handleDownloadBeatWav}
              disabled={isRendering}
              className="h-10 px-3 bg-[#111114] disabled:opacity-50 text-zinc-300 border border-[#222226] rounded-lg text-xs font-bold uppercase flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> {isRendering ? "Render…" : "WAV"}
            </button>
          </div>
        </div>

        <div className="bg-[#101013] border border-[#222226] rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
          <span>{status}</span>
          <span>Krok: <strong className="text-[#FFB300]">{currentStep >= 0 ? `${currentStep + 1}/16` : "—"}</strong></span>
        </div>
      </section>

      <LoopPads project={project} />
      <LoopChannelRack project={project} currentStep={currentStep} isLooping={isLooping} />

      <section className="bg-[#111114] border border-[#222226] rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5" />
        <p className="text-xs text-zinc-400">Export WAV renderuje aktualny 16-krokowy pattern wraz z mute/solo/volume/pan. Nie eksportuje już bufora utworu z Laboratorium.</p>
      </section>
    </div>
  );
};
