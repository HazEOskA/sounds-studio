import React, { useState } from "react";
import {
  Sparkles,
  Sliders,
  Play,
  Pause,
  Copy,
  Check,
  Music,
  Layers,
  Wand2,
  FileText,
  AlertCircle,
  HelpCircle,
  Volume2,
  Loader2,
  Info,
} from "lucide-react";
import { EmotionSliders, GeneratedBrief } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface MusicGeneratorProps {
  onLoadGeneratedTrack?: (brief: GeneratedBrief) => void;
}

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ onLoadGeneratedTrack }) => {
  const [description, setDescription] = useState<string>(
    "Samotna jazda przez puste, mokre od deszczu miasto o 4 rano. Ciężki, niski bas który wibruje w klatce piersiowej, ale wokal ma dużo intymnej przestrzeni i lekkiego echa. Zmęczenie połączone z niepokojem i cichą nadzieją."
  );
  const [genre, setGenre] = useState<string>("Dark Trap / Neo-Soul");
  const [structure, setStructure] = useState<string>("Pełny utwór (Intro - Zwrotka - Refren - Zwrotka 2 - Refren - Outro)");
  const [bpm, setBpm] = useState<number>(134);
  const [key, setKey] = useState<string>("F-moll");
  const [instrumentation, setInstrumentation] = useState<string>(
    "Ciężki 808 sub bass, przesterowany rimshot, rozmyty Rhodes, analogowy syntezator pad, zniekształcony wokalny chop"
  );

  const [emotionSliders, setEmotionSliders] = useState<EmotionSliders>({
    energy: 55,
    darkness: 85,
    melancholy: 90,
    hope: 40,
    aggression: 25,
    space: 85,
    rawness: 70,
    experimentation: 65,
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedBrief, setGeneratedBrief] = useState<GeneratedBrief | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isPlayingBriefAudio, setIsPlayingBriefAudio] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sliderConfigs: { key: keyof EmotionSliders; label: string; color: string; desc: string }[] = [
    { key: "darkness", label: "Mrok", color: "accent-amber-500", desc: "Ciężar harmoniczny, gęste basy, cienie" },
    { key: "melancholy", label: "Melancholia", color: "accent-violet-400", desc: "Tęsknota, intymność, deszczowe akordy" },
    { key: "energy", label: "Energia", color: "accent-orange-400", desc: "Tempo, dynamika uderzeń perkusji" },
    { key: "space", label: "Przestrzeń", color: "accent-cyan-400", desc: "Pogłosy, rozmyte tła, głębia stereo" },
    { key: "rawness", label: "Surowość", color: "accent-yellow-400", desc: "Brak polerowania, analogowy brud, lo-fi" },
    { key: "hope", label: "Nadzieja", color: "accent-emerald-400", desc: "Światło w harmonii, podnoszące tony" },
    { key: "aggression", label: "Agresja", color: "accent-red-500", desc: "Atak transjentów, przesterowanie, distortion" },
    { key: "experimentation", label: "Eksperyment", color: "accent-purple-400", desc: "Niestandardowe rytmy, modulacje microtonalne" },
  ];

  const handleSliderChange = (k: keyof EmotionSliders, val: number) => {
    setEmotionSliders((prev) => ({ ...prev, [k]: val }));
  };

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          genre,
          structure,
          bpm,
          key,
          instrumentation,
          emotions: emotionSliders,
        }),
      });

      if (!res.ok) {
        throw new Error(`Błąd serwera: ${res.status}`);
      }

      const data: GeneratedBrief = await res.json();
      setGeneratedBrief(data);
    } catch (err: any) {
      console.error("Błąd generowania briefu:", err);
      setErrorMsg("Wystąpił problem podczas generowania briefu. Sprawdź połączenie z serwerem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!generatedBrief) return;
    navigator.clipboard.writeText(generatedBrief.aiMusicPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const playBriefMoodAudio = () => {
    if (isPlayingBriefAudio) {
      setIsPlayingBriefAudio(false);
      return;
    }
    setIsPlayingBriefAudio(true);
    // Play emotional Rhodes chords + 808
    audioEngine.playSynthesizerChord(["F2", "Ab3", "C4", "Eb4"], 2.0, "warm");
    audioEngine.playDrumSound("bass808");
    setTimeout(() => {
      audioEngine.playDrumSound("kick");
      audioEngine.playSynthesizerChord(["Db2", "F3", "Ab3", "C4"], 2.0, "warm");
    }, 1200);
    setTimeout(() => {
      audioEngine.playDrumSound("snare");
      audioEngine.playDrumSound("hihat");
      audioEngine.playSynthesizerChord(["Eb2", "G3", "Bb3", "D4"], 2.0, "warm");
    }, 2400);
    setTimeout(() => {
      setIsPlayingBriefAudio(false);
    }, 3800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                Generator Muzyki AI & Studio Emocjonalne
              </h2>
              <p className="text-xs text-zinc-400">
                Stwórz pełny plan produkcyjny, prompt dla modeli AI (Suno / Lyria), harmonię, tekst i wskazówki wykonawcze.
              </p>
            </div>
          </div>
        </div>

        {/* Engine Status Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#111114] border border-[#222226] rounded-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#FFB300] animate-pulse" />
          <span className="text-zinc-400">Silnik: <strong className="text-purple-300">Gemini 2.5 Flash + DSP Harmonics</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Emotional Input & 8 Sliders (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FFB300]" />
              1. Co czujesz? (Opis i intencja)
            </h3>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Opisz sytuację, emocje, temperaturę, barwę lub wspomnienie..."
                className="w-full bg-[#111114] border border-[#222226] rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#FFB300] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1 font-mono">Gatunek & Styl</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#111114] border border-[#222226] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#FFB300]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1 font-mono">Tonacja</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-[#111114] border border-[#222226] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#FFB300]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1 font-mono">Docelowe BPM</label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                  className="w-full bg-[#111114] border border-[#222226] rounded-lg px-2.5 py-1.5 text-xs text-[#FFB300] font-mono font-bold focus:outline-none focus:border-[#FFB300]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1 font-mono">Struktura</label>
                <select
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  className="w-full bg-[#111114] border border-[#222226] rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#FFB300]"
                >
                  <option>Pełny utwór (Intro-Zwrotka-Refren-Outro)</option>
                  <option>Krótki beat (16 taktów)</option>
                  <option>Surowy szkic wokalny</option>
                  <option>Ambientowa pętla medytacyjna</option>
                  <option>Drop klubowy / Phonk</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1 font-mono">Kluczowe Instrumentarium</label>
              <input
                type="text"
                value={instrumentation}
                onChange={(e) => setInstrumentation(e.target.value)}
                className="w-full bg-[#111114] border border-[#222226] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#FFB300]"
              />
            </div>
          </div>

          {/* 8 Emotional Vector Sliders */}
          <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                2. Wektory Emocjonalne (0 - 100)
              </h3>
            </div>

            <div className="space-y-3">
              {sliderConfigs.map((cfg) => {
                const val = emotionSliders[cfg.key];
                return (
                  <div key={cfg.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-300 uppercase tracking-wide text-[11px]">{cfg.label}</span>
                      <span className="font-mono text-[#FFB300] font-bold">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={val}
                      onChange={(e) => handleSliderChange(cfg.key, parseInt(e.target.value))}
                      className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]`}
                    />
                    <p className="text-[10px] text-zinc-500">{cfg.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#222226]">
              <button
                id="generate-brief-btn"
                onClick={handleGenerateBrief}
                disabled={isGenerating}
                className="w-full py-3 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Przetwarzanie emocji i generowanie briefu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Wygeneruj Pakiet Produkcyjny & Prompt AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Output: Generated Package (7 cols) */}
        <div className="lg:col-span-7">
          {errorMsg && (
            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {generatedBrief ? (
            <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in">
              {/* Title & Tagline */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#222226] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#FFB300] tracking-wider font-mono">
                    Projekt AI Brief
                  </span>
                  <h3 className="text-xl font-black text-gray-100 uppercase">{generatedBrief.suggestedTitle}</h3>
                  <p className="text-xs text-zinc-400 font-serif italic mt-0.5">
                    "{generatedBrief.tagline}"
                  </p>
                </div>

                <button
                  onClick={playBriefMoodAudio}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 shadow-md ${
                    isPlayingBriefAudio
                      ? "bg-[#FFB300] text-black"
                      : "bg-[#111114] text-[#FFB300] hover:bg-[#1A1A1E] border border-[#FFB300]/30"
                  }`}
                >
                  {isPlayingBriefAudio ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlayingBriefAudio ? "Pauza" : "Odsłuchaj Klimat"}</span>
                </button>
              </div>

              {/* AI Prompt Box (Suno / Lyria ready) */}
              <div className="bg-[#111114] border border-purple-500/30 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Prompt Audio dla Modeli AI (Suno / Lyria / AudioCraft)
                  </span>

                  <button
                    onClick={handleCopyPrompt}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold uppercase transition flex items-center gap-1"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? "Skopiowano!" : "Kopiuj Prompt"}</span>
                  </button>
                </div>

                <p className="text-xs font-mono text-zinc-200 bg-[#0A0A0C] p-3 rounded-lg border border-[#222226] leading-relaxed">
                  {generatedBrief.aiMusicPrompt}
                </p>
              </div>

              {/* Arrangement & Chord Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#FFB300]" />
                  Struktura Utworu i Progresje Akordów
                </h4>
                <div className="space-y-2">
                  {generatedBrief.structurePlan?.map((sec, idx) => (
                    <div key={idx} className="p-2.5 bg-[#111114] border border-[#222226] rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{sec.section}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FFB300]/10 text-[#FFB300] rounded font-bold">
                            {sec.bars} taktów
                          </span>
                        </div>
                        <p className="text-zinc-400 text-[11px] mt-0.5">{sec.description}</p>
                      </div>
                      <span className="font-mono text-[#FFB300] font-bold text-[11px] shrink-0">
                        {sec.chords}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lyrics & Vocal Performance Cues */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Tekst & Wskazówki Wokalne
                </h4>
                <div className="p-3.5 bg-[#111114] border border-[#222226] rounded-xl text-xs space-y-3">
                  <p className="text-purple-300 font-semibold text-[11px]">
                    🎤 Sposób wykonania: {generatedBrief.vocalCues}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-zinc-200 leading-relaxed text-xs">
                    {generatedBrief.lyrics}
                  </pre>
                </div>
              </div>

              {/* Mix Vibe Guidance */}
              <div className="bg-[#111114] border border-[#FFB300]/20 p-3.5 rounded-xl">
                <span className="text-xs font-bold uppercase text-[#FFB300] block mb-1 font-mono">
                  🎛️ Klimat Miksu & Przestrzeń
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {generatedBrief.mixVibe}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#16161A] border border-[#222226] rounded-xl p-8 shadow-2xl text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-200 uppercase">Gotowy na zamianę emocji w dźwięk?</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
                Ustaw suwaki emocji po lewej stronie, wpisz co czujesz lub wybierz wstępny styl, a następnie kliknij przycisk generowania.
              </p>
              <button
                onClick={handleGenerateBrief}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                <span>Wygeneruj przykładowy brief</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
