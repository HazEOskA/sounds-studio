import React, { useState, useRef, useEffect } from "react";
import {
  Music2,
  Play,
  Pause,
  Download,
  Sparkles,
  Sliders,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Wand2,
  Layers,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { MidiNote, ChordVariation } from "../types";
import { INITIAL_MIDI_NOTES, INITIAL_CHORD_VARIATIONS } from "../data/demoTracks";
import { exportMidiFile } from "../utils/midiExporter";
import { audioEngine } from "../utils/audioEngine";

interface MidiLabProps {
  bpm: number;
  detectedKey: string;
  trackTitle: string;
}

export const MidiLab: React.FC<MidiLabProps> = ({
  bpm: initialBpm,
  detectedKey,
  trackTitle,
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm || 138);
  const [notes, setNotes] = useState<MidiNote[]>(INITIAL_MIDI_NOTES);
  const [variations, setVariations] = useState<ChordVariation[]>(INITIAL_CHORD_VARIATIONS);
  const [selectedVariation, setSelectedVariation] = useState<ChordVariation>(INITIAL_CHORD_VARIATIONS[0]);
  const [transposeSemitones, setTransposeSemitones] = useState<number>(0);
  const [activeTabLayer, setActiveTabLayer] = useState<"chords" | "melody" | "bass" | "drums">("chords");
  const [isPlayingSynth, setIsPlayingSynth] = useState<boolean>(false);
  const [isGeneratingMidi, setIsGeneratingMidi] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const synthTimerRef = useRef<any>(null);

  // Draw Piano Roll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const minPitch = 36; // C2
    const maxPitch = 72; // C5
    const pitchRange = maxPitch - minPitch;
    const rowHeight = height / pitchRange;
    const totalBeats = 16; // 4 bars * 4 beats
    const beatWidth = width / totalBeats;

    // 1. Draw Grid Background & Black/White piano row lines
    for (let p = minPitch; p <= maxPitch; p++) {
      const pitchIdx = maxPitch - p;
      const y = pitchIdx * rowHeight;
      const isBlackKey = [1, 3, 6, 8, 10].includes(p % 12);

      ctx.fillStyle = isBlackKey ? "#11131a" : "#171924";
      ctx.fillRect(0, y, width, rowHeight);

      ctx.strokeStyle = "#202334";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Draw Vertical Beat & Bar Lines
    for (let b = 0; b <= totalBeats; b++) {
      const x = b * beatWidth;
      const isBarLine = b % 4 === 0;
      ctx.strokeStyle = isBarLine ? "#3e4460" : "#24283c";
      ctx.lineWidth = isBarLine ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 3. Draw MIDI Notes
    notes.forEach((note) => {
      const transposedPitch = note.pitch + transposeSemitones;
      if (transposedPitch < minPitch || transposedPitch > maxPitch) return;

      const pitchIdx = maxPitch - transposedPitch;
      const y = pitchIdx * rowHeight;
      const x = (note.startTime / 1) * (beatWidth / 1); // 1 unit = 1 beat
      const w = Math.max(4, note.duration * beatWidth - 2);
      const h = Math.max(3, rowHeight - 2);

      // Gradient Amber for chord notes
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, "#fbbf24");
      grad.addColorStop(1, "#f59e0b");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w, h, 2);
      ctx.fill();

      // Border highlight
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  }, [notes, transposeSemitones]);

  const handlePlaySynthProgression = () => {
    if (isPlayingSynth) {
      if (synthTimerRef.current) clearTimeout(synthTimerRef.current);
      setIsPlayingSynth(false);
      return;
    }

    setIsPlayingSynth(true);
    // Play 4 chords sequentially
    selectedVariation.midiNotes.forEach((chordNotes, idx) => {
      setTimeout(() => {
        audioEngine.playSynthesizerChord(chordNotes, 1.4, "warm");
      }, idx * 1000);
    });

    synthTimerRef.current = setTimeout(() => {
      setIsPlayingSynth(false);
    }, selectedVariation.midiNotes.length * 1000 + 400);
  };

  const handleDownloadMidi = () => {
    const blob = exportMidiFile(
      notes.map((n) => ({ ...n, pitch: n.pitch + transposeSemitones })),
      bpm,
      `${trackTitle || "OSA"}-${selectedVariation.name}`
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(trackTitle || "OSA_Soul").replace(/\s+/g, "_")}_Chords.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateVariations = async () => {
    setIsGeneratingMidi(true);
    try {
      const res = await fetch("/api/midi-progressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scale: detectedKey || "F-moll naturalny",
          mood: "Głęboka nocna melancholia z kinowym uniesieniem",
          baseChords: selectedVariation.chords.join(" - "),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.variations && data.variations.length > 0) {
          setVariations(data.variations);
          setSelectedVariation(data.variations[0]);
        }
      }
    } catch (e) {
      console.error("Błąd generowania wariacji MIDI", e);
    } finally {
      setIsGeneratingMidi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                MIDI Lab: Harmonia, Piano Roll & Eksport .MID
              </h2>
              <p className="text-xs text-zinc-400">
                Wizualizacja nutowa, transkrypcja akordów, syntezator odsłuchowy i generowanie plików MIDI dla Twojego DAW.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMidi}
            className="px-4 py-2 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Pobierz plik MIDI (.mid)</span>
          </button>
        </div>
      </div>

      {/* Main Piano Roll Visualizer */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          {/* Layer switcher */}
          <div className="flex items-center gap-1.5 bg-[#111114] border border-[#222226] p-1 rounded-lg">
            <button
              onClick={() => setActiveTabLayer("chords")}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition ${
                activeTabLayer === "chords"
                  ? "bg-[#FFB300] text-black shadow-[0_0_10px_rgba(255,179,0,0.3)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Akordy (Fm9 - Abmaj7)
            </button>
            <button
              onClick={() => setActiveTabLayer("bass")}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition ${
                activeTabLayer === "bass"
                  ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(107,70,193,0.4)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Linia Basu (808)
            </button>
            <button
              onClick={() => setActiveTabLayer("melody")}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition ${
                activeTabLayer === "melody"
                  ? "bg-cyan-600 text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Melodia Główna
            </button>
          </div>

          {/* Transpose & Tempo controls */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-[#111114] border border-[#222226] px-2.5 py-1 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#FFB300]" />
              <span className="text-zinc-400 font-mono">Transpozycja:</span>
              <button
                onClick={() => setTransposeSemitones((prev) => prev - 1)}
                className="px-1.5 text-zinc-300 hover:text-white font-bold"
              >
                -
              </button>
              <span className="font-mono text-[#FFB300] font-bold min-w-[20px] text-center">
                {transposeSemitones > 0 ? `+${transposeSemitones}` : transposeSemitones}
              </span>
              <button
                onClick={() => setTransposeSemitones((prev) => prev + 1)}
                className="px-1.5 text-zinc-300 hover:text-white font-bold"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-[#111114] border border-[#222226] px-2.5 py-1 rounded-lg">
              <span className="text-zinc-400 font-mono">BPM:</span>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                className="w-12 bg-transparent text-[#FFB300] font-mono font-bold focus:outline-none text-center"
              />
            </div>
          </div>
        </div>

        {/* Canvas Piano Roll */}
        <div className="relative bg-[#0A0A0C] border border-[#1A1A1E] rounded-lg overflow-hidden mb-4 p-1">
          <canvas
            ref={canvasRef}
            width={900}
            height={220}
            className="w-full h-48 sm:h-56 block rounded cursor-crosshair"
          />
        </div>

        {/* Audition controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlaySynthProgression}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2 shadow-[0_0_15px_rgba(255,179,0,0.3)] ${
                isPlayingSynth
                  ? "bg-[#ffbe1a] text-black"
                  : "bg-[#FFB300] hover:bg-[#ffbe1a] text-black"
              }`}
            >
              {isPlayingSynth ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlayingSynth ? "Zatrzymaj odsłuch" : "Odsłuchaj Akordy Syntezatorem"}</span>
            </button>
          </div>

          <div className="text-xs font-mono text-zinc-500">
            Zarejestrowano <strong className="text-zinc-200">{notes.length}</strong> nut MIDI w 4 taktach
          </div>
        </div>
      </div>

      {/* 4 Emotional Chord Variations */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFB300]" />
            Emocjonalne Wariacje Harmonii i Psychologia Akordów
          </h3>

          <button
            onClick={handleGenerateVariations}
            disabled={isGeneratingMidi}
            className="px-3 py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-300 border border-[#2A2A2E] rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isGeneratingMidi ? "animate-spin text-[#FFB300]" : ""}`} />
            <span>{isGeneratingMidi ? "Generowanie..." : "Generuj nowe wariacje"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variations.map((v, idx) => {
            const isSel = selectedVariation.name === v.name;
            return (
              <div
                key={idx}
                onClick={() => setSelectedVariation(v)}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  isSel
                    ? "bg-[#1A1A1E] border-[#FFB300]/60 shadow-lg"
                    : "bg-[#111114] border-[#222226] hover:bg-[#1A1A1E]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-zinc-100 uppercase">{v.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-900/50 text-purple-300 border border-purple-500/30 rounded">
                      {v.romanNumerals}
                    </span>
                  </div>

                  {/* Chord Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {v.chords.map((chord, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20 text-xs font-mono font-bold rounded"
                      >
                        {chord}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                    {v.emotionalReasoning}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#222226] flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-mono">Bas: {v.recommendedBassline}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVariation(v);
                      v.midiNotes.forEach((cn, i) => {
                        setTimeout(() => audioEngine.playSynthesizerChord(cn, 1.2, "warm"), i * 800);
                      });
                    }}
                    className="text-[#FFB300] hover:text-[#ffbe1a] font-bold uppercase flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Odsłuchaj</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
