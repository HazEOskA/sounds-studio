import React, { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  BookOpen,
  Headphones,
  CheckCircle2,
  Play,
  Volume2,
  X,
  Layers,
  Wand2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SchoolLesson, AudioAnalysis } from "../types";
import { STATIC_SCHOOL_LESSONS } from "../data/demoTracks";
import { audioEngine } from "../utils/audioEngine";

interface MusicSchoolBarProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnalysis: AudioAnalysis | null;
  trackTitle: string;
}

export const MusicSchoolBar: React.FC<MusicSchoolBarProps> = ({
  isOpen,
  onClose,
  currentAnalysis,
  trackTitle,
}) => {
  const [lessons, setLessons] = useState<SchoolLesson[]>(STATIC_SCHOOL_LESSONS);
  const [selectedLesson, setSelectedLesson] = useState<SchoolLesson>(STATIC_SCHOOL_LESSONS[0]);
  const [activeLevel, setActiveLevel] = useState<string>("Wszystkie");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>("");
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const levels = ["Wszystkie", "Początkujący", "Producent", "Inżynier", "Eksperymentator"];

  const filteredLessons =
    activeLevel === "Wszystkie"
      ? lessons
      : lessons.filter((l) => l.level === activeLevel);

  const toggleStep = (stepKey: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  const playAudioExample = (type: string) => {
    if (type === "sub_808") {
      audioEngine.playDrumSound("bass808");
      setTimeout(() => audioEngine.playDrumSound("kick"), 150);
    } else if (type === "rhodes_chords") {
      audioEngine.playSynthesizerChord(["F2", "Ab3", "C4", "Eb4", "G4"], 1.5, "warm");
    } else if (type === "vocal_plate") {
      audioEngine.playSynthesizerChord(["C4", "Eb4", "G4", "Bb4"], 2.0, "pluck");
    } else {
      audioEngine.playDrumSound("kick");
      setTimeout(() => audioEngine.playDrumSound("snare"), 300);
      setTimeout(() => audioEngine.playDrumSound("hihat"), 450);
    }
  };

  const handleGenerateCustomLesson = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: customTopic || `Aranżacja i sound design dla utworu: ${trackTitle}`,
          level: activeLevel === "Wszystkie" ? "Producent" : activeLevel,
          projectContext: {
            title: trackTitle,
            analysis: currentAnalysis,
          },
        }),
      });

      if (res.ok) {
        const newLesson = await res.json();
        const fullLesson: SchoolLesson = {
          id: `custom-${Date.now()}`,
          level: (activeLevel === "Wszystkie" ? "Producent" : activeLevel) as any,
          ...newLesson,
        };
        setLessons([fullLesson, ...lessons]);
        setSelectedLesson(fullLesson);
        setCustomTopic("");
      }
    } catch (e) {
      console.error("Błąd generowania lekcji", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Top Banner (Always Visible on Studio Workspace - Immersive UI Theme) */}
      <div className="h-12 bg-gradient-to-r from-[#FFB300] to-[#E67E22] flex items-center justify-between px-3 sm:px-6 shadow-lg relative z-30">
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-black font-black tracking-tighter text-xs sm:text-sm uppercase">
              Szkoła Muzyczna OSA
            </span>
            <div className="hidden sm:block h-1 w-20 sm:w-24 bg-black/25 rounded-full overflow-hidden">
              <div className="h-full bg-black w-2/3"></div>
            </div>
          </div>
          <span className="text-black font-semibold text-[11px] sm:text-xs truncate max-w-[220px] sm:max-w-md">
            Lekcja: {selectedLesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (lessons.length > 0) {
                const nextIdx = (lessons.findIndex((l) => l.id === selectedLesson.id) + 1) % lessons.length;
                setSelectedLesson(lessons[nextIdx]);
              }
            }}
            className="hidden md:inline-flex bg-black/15 text-black hover:bg-black/25 text-[10px] px-2.5 py-1 rounded font-bold uppercase transition"
          >
            Zmień temat
          </button>
          <button
            onClick={() => {
              // open modal
              const event = new CustomEvent("open-school-modal");
              window.dispatchEvent(event);
            }}
            className="bg-black text-[#FFB300] text-[10px] px-3 py-1 rounded font-bold uppercase hover:bg-zinc-900 shadow-sm transition"
          >
            Przejdź do lekcji
          </button>
        </div>
      </div>

      {/* Expandable Masterclass Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-[#111114] border border-[#222226] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#222226] flex items-center justify-between bg-[#16161A]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFB300]/15 border border-[#FFB300]/40 flex items-center justify-center text-[#FFB300]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-100 flex items-center gap-2">
                    Szkoła Muzyczna & Warsztat Realizacji Dźwięku
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Lekcje dopasowane bezpośrednio do harmonicznych i brzmieniowych cech Twojego projektu.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#1A1A1E] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Left sidebar (lessons list) & Right view (lesson content) */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              {/* Sidebar */}
              <div className="md:col-span-4 border-r border-[#222226] bg-[#0E0E10] p-3 sm:p-4 overflow-y-auto flex flex-col gap-3">
                {/* Level filters */}
                <div className="flex flex-wrap gap-1">
                  {levels.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setActiveLevel(lvl)}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                        activeLevel === lvl
                          ? "bg-[#FFB300] text-black font-bold"
                          : "bg-[#16161A] text-zinc-400 hover:text-zinc-200 border border-[#222226]"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Lesson Cards */}
                <div className="flex flex-col gap-2">
                  {filteredLessons.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLesson(l)}
                      className={`p-3 rounded-xl cursor-pointer border transition text-left ${
                        selectedLesson.id === l.id
                          ? "bg-[#1A1A1E] border-[#FFB300]/60 shadow-lg"
                          : "bg-[#16161A] border-[#222226] hover:bg-[#1A1A1E]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20">
                          {l.level}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-100 line-clamp-2">{l.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{l.summary}</p>
                    </div>
                  ))}
                </div>

                {/* Custom AI Lesson Prompt Generator */}
                <div className="mt-auto pt-3 border-t border-[#222226]">
                  <span className="text-[11px] font-semibold text-[#FFB300] flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Wygeneruj lekcję pod to, co tworzysz
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="np. Jak zrobić przejście perkusyjne przed dropem?"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="flex-1 bg-[#16161A] border border-[#2A2A2E] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#FFB300]"
                    />
                    <button
                      onClick={handleGenerateCustomLesson}
                      disabled={isGenerating}
                      className="px-3 py-1.5 bg-[#FFB300] text-black font-bold rounded-lg text-xs hover:bg-[#ffbe1a] transition flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="md:col-span-8 p-4 sm:p-6 overflow-y-auto bg-[#111114]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/30 rounded-md">
                    {selectedLesson.level}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Dotyczy projektu: <strong className="text-zinc-200">{trackTitle}</strong>
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-zinc-100 tracking-tight mb-2">
                  {selectedLesson.title}
                </h3>

                <p className="text-sm text-amber-200/90 bg-[#16161A] border border-[#FFB300]/20 p-3.5 rounded-xl mb-5">
                  {selectedLesson.summary}
                </p>

                {/* Core Theory */}
                <div className="mb-6 bg-[#16161A] border border-[#222226] p-4 rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-[#FFB300]" />
                    Zrozumienie Emocjonalne & Fizyka Dźwięku
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">{selectedLesson.coreTheory}</p>
                </div>

                {/* Practical Steps in DAW */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Kroki Realizacyjne w Twoim DAW (FL Studio / Ableton / Logic)
                  </h4>
                  <div className="space-y-3">
                    {selectedLesson.practicalSteps.map((step, idx) => {
                      const stepKey = `${selectedLesson.id}-${idx}`;
                      const isDone = completedSteps[stepKey];
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition ${
                            isDone
                              ? "bg-emerald-950/20 border-emerald-500/30"
                              : "bg-[#16161A] border-[#222226]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/40 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {step.stepNumber}
                              </span>
                              <div>
                                <h5 className="text-sm font-semibold text-zinc-100">{step.title}</h5>
                                <p className="text-xs text-zinc-300 mt-1">{step.instruction}</p>

                                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
                                  <span className="px-2 py-0.5 bg-[#1A1A1E] text-purple-300 border border-purple-800/40 rounded font-mono">
                                    🎛️ {step.technicalSetting}
                                  </span>
                                  <span className="px-2 py-0.5 bg-[#FFB300]/10 text-amber-300 border border-[#FFB300]/20 rounded">
                                    💡 Tip: {step.proTip}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleStep(stepKey)}
                              className={`p-1 rounded-lg transition ${
                                isDone ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                              }`}
                              title={isDone ? "Oznacz jako niewykonane" : "Oznacz jako wykonane"}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Listening Exercise & Sound Demo */}
                <div className="bg-gradient-to-r from-[#1A1A1E] to-[#16161A] border border-purple-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2 mb-1">
                      <Headphones className="w-4 h-4 text-purple-400" />
                      Zadanie Odsłuchowe
                    </h4>
                    <p className="text-xs text-zinc-300">{selectedLesson.listeningExercise}</p>
                  </div>
                  <button
                    onClick={() => playAudioExample(selectedLesson.audioExampleType)}
                    className="px-3.5 py-2 bg-[#6B46C1] hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 transition flex items-center gap-1.5 shrink-0 uppercase"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Odsłuchaj Dźwięk</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
