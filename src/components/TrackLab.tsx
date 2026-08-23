import React, { useRef, useEffect, useState } from "react";
import {
  Activity,
  Sparkles,
  Zap,
  Tag,
  Clock,
  Music,
  Maximize2,
  RefreshCw,
  MessageSquare,
  Play,
  Pause,
  Sliders,
  Layers,
  HelpCircle,
} from "lucide-react";
import { AudioAnalysis, DspMetrics, SongSection } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface TrackLabProps {
  waveformPoints: number[];
  analysis: AudioAnalysis | null;
  dspMetrics: DspMetrics | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onAskAboutTimestamp: (time: number, sectionName?: string) => void;
  onReAnalyze: () => void;
  isAnalyzing: boolean;
  trackTitle: string;
}

export const TrackLab: React.FC<TrackLabProps> = ({
  waveformPoints,
  analysis,
  dspMetrics,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  onAskAboutTimestamp,
  onReAnalyze,
  isAnalyzing,
  trackTitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<SongSection | null>(null);

  // Draw interactive Waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const points = waveformPoints.length > 0 ? waveformPoints : new Array(300).fill(0.2);
    const numBars = points.length;
    const barWidth = width / numBars;
    const currentProgress = duration > 0 ? currentTime / duration : 0;
    const currentBarIdx = Math.floor(currentProgress * numBars);

    // 1. Draw Section Background Highlights
    if (analysis?.sections && duration > 0) {
      analysis.sections.forEach((sec, idx) => {
        const startX = (sec.startSeconds / duration) * width;
        const endX = (sec.endSeconds / duration) * width;
        const w = Math.max(2, endX - startX);

        // alternating subtle background tint
        const alpha = selectedSection?.name === sec.name ? 0.18 : 0.05 + (idx % 2) * 0.03;
        ctx.fillStyle = idx % 2 === 0 ? `rgba(245, 158, 11, ${alpha})` : `rgba(139, 92, 246, ${alpha})`;
        ctx.fillRect(startX, 0, w, height);

        // Section divider line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.stroke();
      });
    }

    // 2. Draw Waveform Bars
    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const point = points[i];
      const barHeight = Math.max(4, point * (height * 0.85));
      const y = (height - barHeight) / 2;

      // Color based on playback progress
      if (i <= currentBarIdx) {
        // Gradient for played portion (Glowing Amber to Yellow)
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, "#fbbf24");
        grad.addColorStop(1, "#d97706");
        ctx.fillStyle = grad;
      } else {
        // Unplayed portion (Graphite/Slate)
        ctx.fillStyle = "#2a2e42";
      }

      // Rounded bar top and bottom
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, Math.max(1.5, barWidth - 1), barHeight, 2);
      ctx.fill();
    }

    // 3. Draw Active Playhead Line
    const playheadX = currentProgress * width;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 4. Draw Hover Time Cursor if active
    if (hoverTime !== null && duration > 0) {
      const hoverX = (hoverTime / duration) * width;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]); // reset
    }
  }, [waveformPoints, currentTime, duration, analysis, selectedSection, hoverTime]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * duration;
    onSeek(targetTime);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, mouseX / rect.width));
    setHoverTime(percent * duration);
  };

  const formatSec = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Interactive Player & Waveform Box */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Header with Title & Quick DSP Specs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFB300] shadow-[0_0_8px_rgba(255,179,0,0.8)] animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                {trackTitle || "Projekt Studyjny"}
              </h2>
              <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-mono uppercase">
                {analysis?.detectedGenre || "Gatunek"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Stanowisko Odsłuchowe i Emocjonalna Spektrografia Ścieżki
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReAnalyze}
              disabled={isAnalyzing}
              className="px-3 py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-300 border border-[#2A2A2E] rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-[#FFB300]" : ""}`} />
              <span>{isAnalyzing ? "Analiza AI..." : "Odśwież analizę"}</span>
            </button>
          </div>
        </div>

        {/* Real DSP Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5 font-mono text-[11px]">
          <div className="bg-[#111114] border border-[#222226] p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tempo</span>
            <p className="text-base font-extrabold text-[#FFB300] font-mono">
              {dspMetrics?.bpm || analysis?.estimatedBpm || 120} <span className="text-xs text-zinc-600 font-normal">BPM</span>
            </p>
          </div>
          <div className="bg-[#111114] border border-[#222226] p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tonacja</span>
            <p className="text-base font-extrabold text-purple-300">
              {dspMetrics?.detectedKey || analysis?.estimatedKey || "C-moll"}
            </p>
          </div>
          <div className="bg-[#111114] border border-[#222226] p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Poziom RMS</span>
            <p className="text-base font-extrabold text-zinc-200 font-mono">
              {dspMetrics?.rmsLevel ? `${dspMetrics.rmsLevel} dB` : "-14.2 dB"}
            </p>
          </div>
          <div className="bg-[#111114] border border-[#222226] p-2.5 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">True Peak</span>
            <p className="text-base font-extrabold text-emerald-400 font-mono">
              {dspMetrics?.peakDb ? `${dspMetrics.peakDb} dBFS` : "-0.8 dBFS"}
            </p>
          </div>
          <div className="bg-[#111114] border border-[#222226] p-2.5 rounded-lg text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Dynamika</span>
            <p className="text-base font-extrabold text-cyan-300 font-mono">
              {dspMetrics?.dynamicRangeDb ? `${dspMetrics.dynamicRangeDb} dB` : "13.4 dB"}
            </p>
          </div>
        </div>

        {/* Waveform Canvas */}
        <div className="relative bg-[#0A0A0C] border border-[#1A1A1E] rounded-lg p-2.5 mb-3">
          <canvas
            ref={canvasRef}
            width={900}
            height={140}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            className="w-full h-28 sm:h-36 block cursor-pointer rounded"
          />

          {/* Hover timestamp tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute top-2 pointer-events-none px-2 py-0.5 bg-black/90 text-[#FFB300] text-[10px] font-mono rounded border border-[#FFB300]/40 shadow-md"
              style={{
                left: `${(hoverTime / (duration || 1)) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              {formatSec(hoverTime)}
            </div>
          )}
        </div>

        {/* Song Structure Timeline Bar */}
        {analysis?.sections && analysis.sections.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono">
              <span>Struktura Utworu i Rozkład Energii</span>
              <span>{analysis.sections.length} Sekcji</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {analysis.sections.map((sec, idx) => {
                const isCurrent = currentTime >= sec.startSeconds && currentTime <= sec.endSeconds;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedSection(sec);
                      onSeek(sec.startSeconds);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition text-left ${
                      isCurrent
                        ? "bg-[#FFB300]/15 border-[#FFB300]/60 shadow-lg"
                        : "bg-[#111114] border-[#222226] hover:bg-[#1A1A1E]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-zinc-200 line-clamp-1">{sec.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FFB300]/10 text-[#FFB300] rounded font-bold">
                        {sec.energy}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{formatSec(sec.startSeconds)} - {formatSec(sec.endSeconds)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskAboutTimestamp(sec.startSeconds, sec.name);
                        }}
                        className="text-[#FFB300] hover:text-[#ffbe1a] font-medium flex items-center gap-0.5"
                        title="Zapytaj producenta AI o tę sekcję"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transport Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1A1A1E]">
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayPause}
              className="px-4 py-2 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? "Pauza" : "Odtwórz odznaczone"}</span>
            </button>

            <button
              onClick={() => onAskAboutTimestamp(currentTime, selectedSection?.name)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase text-xs rounded-lg shadow-md shadow-purple-900/30 transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Zapytaj AI ({formatSec(currentTime)})</span>
            </button>
          </div>

          <div className="text-right text-xs font-mono text-zinc-500">
            Pozycja: <strong className="text-zinc-200">{formatSec(currentTime)}</strong> / {formatSec(duration)}
          </div>
        </div>
      </div>

      {/* 2. Emotional Narrative & Producer Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Emotional Interpretation (Left 7 cols) */}
        <div className="lg:col-span-7 bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFB300]" />
              Emocjonalna Dusza Utworu
            </h3>
            <span className="text-[10px] uppercase font-bold text-[#FFB300] px-2 py-0.5 bg-[#FFB300]/10 rounded border border-[#FFB300]/20 font-mono">
              Analiza Psychologiczna
            </span>
          </div>

          <div className="bg-[#111114] border border-[#222226] p-4 rounded-xl">
            <p className="text-sm sm:text-base text-zinc-200 leading-relaxed italic font-serif">
              "{analysis?.emotionalNarrative || "Analizowanie emocjonalnego klimatu i ładunku utworu..."}"
            </p>
          </div>

          {/* Tags */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2 font-mono">
              Klimat & Wrażliwość Brzmienia:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis?.moodKeywords?.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-[#1A1A1E] text-amber-300 border border-[#FFB300]/30 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-[#FFB300]" />
                  {kw}
                </span>
              )) || (
                <span className="text-xs text-zinc-600 font-mono">Wczytywanie nastrojów...</span>
              )}
            </div>
          </div>

          {/* Energy Contour */}
          <div className="bg-[#111114] border border-[#222226] p-3.5 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#FFB300]" />
              Dynamika Napięcia w Czasie
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {analysis?.energyContour || "Opis narastania i uwalniania energii w utworze."}
            </p>
          </div>
        </div>

        {/* Producer Verdict & Recommendations (Right 5 cols) */}
        <div className="lg:col-span-5 bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FFB300]" />
                Werdykt Realizatora Dźwięku
              </h3>
            </div>

            <div className="bg-[#111114] border border-[#FFB300]/20 p-4 rounded-xl mb-4">
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {analysis?.producerVerdict || "Wczytywanie uwag realizatorskich..."}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1A1A1E] flex flex-col gap-2">
            <span className="text-[11px] text-zinc-500">
              Chcesz rozwinąć konkretny element w miksie?
            </span>
            <button
              onClick={() => onAskAboutTimestamp(currentTime, "Werdykt Ogólny")}
              className="w-full py-2 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Porozmawiaj o tym z Producentem AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sound Design Breakdown (How it was built) */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-cyan-400" />
          Anatomia Brzmienia: Jak zbudowano poszczególne warstwy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-[#111114] border border-[#222226] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#FFB300] tracking-wider block mb-1 font-mono">
              🎸 Linia Basu & Sub
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {analysis?.soundDesignBreakdown?.bass || "Charakterystyka basu."}
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-[#FFB300] tracking-wider block mb-1 font-mono">
              🥁 Perkusja & Transjenty
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {analysis?.soundDesignBreakdown?.drums || "Charakterystyka perkusji."}
            </p>
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider block mb-1 font-mono">
              🎤 Wokal & Efekty Przestrzenne
            </span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {analysis?.soundDesignBreakdown?.vocals || "Przestrzeń i nasycenie głosu."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
