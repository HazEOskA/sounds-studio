import React, { useState, useEffect, useRef } from "react";
import {
  Sliders,
  Sparkles,
  Zap,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Layers,
  Wand2,
  Loader2,
  BarChart2,
  Radio,
  RadioTower,
  Play,
  Pause,
} from "lucide-react";
import { MixSettings, MixRecommendation } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface MixMasteringProps {
  trackTitle: string;
  bpm: number;
  detectedKey: string;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export const MixMastering: React.FC<MixMasteringProps> = ({
  trackTitle,
  bpm,
  detectedKey,
  isPlaying,
  onPlayPause,
}) => {
  const [eq, setEq] = useState({
    low: 1.5,
    lowMid: -2.0,
    mid: 0.0,
    highMid: 2.0,
    high: 3.5,
  });

  const [dynamics, setDynamics] = useState({
    compressorThreshold: -16,
    compressorRatio: 3.5,
    saturationDrive: 25,
    stereoWidth: 115,
  });

  const [selectedGoal, setSelectedGoal] = useState<string>("Popraw czytelność wokalu i dodaj przestrzeni");
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const [isRecommending, setIsRecommending] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<MixRecommendation | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync EQ with audioEngine
  useEffect(() => {
    if (isBypassed) {
      audioEngine.setEqGain("low", 0);
      audioEngine.setEqGain("lowMid", 0);
      audioEngine.setEqGain("mid", 0);
      audioEngine.setEqGain("highMid", 0);
      audioEngine.setEqGain("high", 0);
    } else {
      audioEngine.setEqGain("low", eq.low);
      audioEngine.setEqGain("lowMid", eq.lowMid);
      audioEngine.setEqGain("mid", eq.mid);
      audioEngine.setEqGain("highMid", eq.highMid);
      audioEngine.setEqGain("high", eq.high);
    }
  }, [eq, isBypassed]);

  // Draw EQ Curve on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;

    // Grid lines (0 dB, +6 dB, -6 dB, +12 dB, -12 dB)
    ctx.strokeStyle = "#1A1A1E";
    ctx.lineWidth = 1;
    [-12, -6, 0, 6, 12].forEach((db) => {
      const y = centerY - (db / 18) * (height / 2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = "#71717A";
      ctx.font = "9px monospace";
      ctx.fillText(`${db > 0 ? "+" : ""}${db}dB`, 6, y - 3);
    });

    // Freq markers (100Hz, 1kHz, 10kHz)
    [
      { label: "100Hz", x: 0.18 * width },
      { label: "500Hz", x: 0.38 * width },
      { label: "1kHz", x: 0.52 * width },
      { label: "5kHz", x: 0.74 * width },
      { label: "10kHz", x: 0.88 * width },
    ].forEach((m) => {
      ctx.strokeStyle = "#16161A";
      ctx.beginPath();
      ctx.moveTo(m.x, 0);
      ctx.lineTo(m.x, height);
      ctx.stroke();

      ctx.fillStyle = "#71717A";
      ctx.fillText(m.label, m.x + 3, height - 6);
    });

    // Draw Smooth EQ Spline Curve
    const bandPoints = [
      { x: 0, db: isBypassed ? 0 : eq.low * 0.9 },
      { x: 0.18 * width, db: isBypassed ? 0 : eq.low },
      { x: 0.35 * width, db: isBypassed ? 0 : eq.lowMid },
      { x: 0.52 * width, db: isBypassed ? 0 : eq.mid },
      { x: 0.74 * width, db: isBypassed ? 0 : eq.highMid },
      { x: 0.88 * width, db: isBypassed ? 0 : eq.high },
      { x: width, db: isBypassed ? 0 : eq.high * 0.95 },
    ];

    ctx.beginPath();
    bandPoints.forEach((pt, i) => {
      const y = centerY - (pt.db / 18) * (height / 2);
      if (i === 0) ctx.moveTo(pt.x, y);
      else {
        const prev = bandPoints[i - 1];
        const prevY = centerY - (prev.db / 18) * (height / 2);
        const cpx = (prev.x + pt.x) / 2;
        ctx.bezierCurveTo(cpx, prevY, cpx, y, pt.x, y);
      }
    });

    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
    fillGrad.addColorStop(0, isBypassed ? "rgba(71, 85, 105, 0.15)" : "rgba(255, 179, 0, 0.25)");
    fillGrad.addColorStop(1, "rgba(255, 179, 0, 0.0)");
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke curve line
    ctx.strokeStyle = isBypassed ? "#71717A" : "#FFB300";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw control nodes
    bandPoints.slice(1, 6).forEach((pt) => {
      const y = centerY - (pt.db / 18) * (height / 2);
      ctx.beginPath();
      ctx.arc(pt.x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = isBypassed ? "#71717A" : "#FFB300";
      ctx.fill();
      ctx.strokeStyle = "#0A0A0C";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [eq, isBypassed]);

  const handleRecommendMix = async () => {
    setIsRecommending(true);
    try {
      const res = await fetch("/api/recommend-mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: selectedGoal,
          currentSettings: { eq, ...dynamics },
          genre: "Dark Trap / Emotional Soul",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecommendation(data);
        if (data.recommendedEq) {
          setEq(data.recommendedEq);
        }
      }
    } catch (e) {
      console.error("Błąd rekomendacji miksu:", e);
    } finally {
      setIsRecommending(false);
    }
  };

  const goals = [
    "Popraw czytelność wokalu i dodaj przestrzeni",
    "Zrób mocniejszy, głęboki dół (Stopa i Bas 808)",
    "Usuń dudnienie w średnich tonach i dodaj powietrza",
    "Zachowaj surowy, brudny i analogowy charakter lo-fi",
    "Przygotuj mastering pod serwisy streamingowe (-14 LUFS)",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-100 tracking-tight uppercase">
                Mix & Mastering: Korektor Parametryczny & Dynamika
              </h2>
              <p className="text-xs text-zinc-400">
                Prawdziwe filtry Web Audio w czasie rzeczywistym, nasycenie analogowe i rekomendacje inżyniera dźwięku.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBypassed(!isBypassed)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition border ${
              isBypassed
                ? "bg-[#111114] text-zinc-400 border-[#222226]"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {isBypassed ? "EQ: WYŁĄCZONE (BYPASS)" : "EQ: AKTYWNE"}
          </button>

          <button
            onClick={onPlayPause}
            className="px-3.5 py-1.5 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,179,0,0.3)]"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? "Zatrzymaj" : "Odsłuchaj Tor"}</span>
          </button>
        </div>
      </div>

      {/* 5-Band Parametric EQ Visualizer & Sliders */}
      <div className="bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#FFB300]" />
            Krzywa Częstotliwościowa (5-Band EQ)
          </h3>
          <span className="text-xs text-zinc-400 font-mono">20 Hz — 20 000 Hz</span>
        </div>

        {/* Canvas Display */}
        <div className="relative bg-[#0A0A0C] border border-[#222226] rounded-lg overflow-hidden p-2">
          <canvas
            ref={canvasRef}
            width={900}
            height={180}
            className="w-full h-36 sm:h-44 block rounded-lg"
          />
        </div>

        {/* 5 Fader Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="bg-[#111114] border border-[#222226] p-3 rounded-lg space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Low Sub (80Hz)</span>
            <p className="text-xs font-mono font-bold text-[#FFB300]">
              {eq.low > 0 ? `+${eq.low.toFixed(1)}` : eq.low.toFixed(1)} dB
            </p>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eq.low}
              onChange={(e) => setEq({ ...eq, low: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
            />
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3 rounded-lg space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Low Mid (250Hz)</span>
            <p className="text-xs font-mono font-bold text-[#FFB300]">
              {eq.lowMid > 0 ? `+${eq.lowMid.toFixed(1)}` : eq.lowMid.toFixed(1)} dB
            </p>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eq.lowMid}
              onChange={(e) => setEq({ ...eq, lowMid: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
            />
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3 rounded-lg space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Mid Body (1kHz)</span>
            <p className="text-xs font-mono font-bold text-[#FFB300]">
              {eq.mid > 0 ? `+${eq.mid.toFixed(1)}` : eq.mid.toFixed(1)} dB
            </p>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eq.mid}
              onChange={(e) => setEq({ ...eq, mid: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
            />
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3 rounded-lg space-y-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">High Mid (4.5kHz)</span>
            <p className="text-xs font-mono font-bold text-[#FFB300]">
              {eq.highMid > 0 ? `+${eq.highMid.toFixed(1)}` : eq.highMid.toFixed(1)} dB
            </p>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eq.highMid}
              onChange={(e) => setEq({ ...eq, highMid: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
            />
          </div>

          <div className="bg-[#111114] border border-[#222226] p-3 rounded-lg space-y-1 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Air Shelf (12kHz)</span>
            <p className="text-xs font-mono font-bold text-[#FFB300]">
              {eq.high > 0 ? `+${eq.high.toFixed(1)}` : eq.high.toFixed(1)} dB
            </p>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eq.high}
              onChange={(e) => setEq({ ...eq, high: parseFloat(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
            />
          </div>
        </div>
      </div>

      {/* Dynamics & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamics Faders (5 cols) */}
        <div className="lg:col-span-5 bg-[#16161A] border border-[#222226] rounded-xl p-5 shadow-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Dynamika & Charakter Analogowy
          </h3>

          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Próg Kompresora (Threshold)</span>
                <span className="font-mono text-[#FFB300] font-bold">{dynamics.compressorThreshold} dB</span>
              </div>
              <input
                type="range"
                min="-40"
                max="0"
                value={dynamics.compressorThreshold}
                onChange={(e) => setDynamics({ ...dynamics, compressorThreshold: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FFB300]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Stopień Kompresji (Ratio)</span>
                <span className="font-mono text-[#FFB300] font-bold">{dynamics.compressorRatio}:1</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={dynamics.compressorRatio}
                onChange={(e) => setDynamics({ ...dynamics, compressorRatio: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Nasycenie Lampowe (Saturation Drive)</span>
                <span className="font-mono text-[#FFB300] font-bold">{dynamics.saturationDrive}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={dynamics.saturationDrive}
                onChange={(e) => setDynamics({ ...dynamics, saturationDrive: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">Szerokość Bazy Stereo</span>
                <span className="font-mono text-cyan-300 font-bold">{dynamics.stereoWidth}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={dynamics.stereoWidth}
                onChange={(e) => setDynamics({ ...dynamics, stereoWidth: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* AI Mix Recommendation Engine (7 cols) */}
        <div className="lg:col-span-7 bg-[#16161A] border border-[#222226] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFB300]" />
              Inteligentny Doradca Miksu & Maskowania
            </h3>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-mono">Wybierz cel brzmieniowy:</label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full bg-[#111114] border border-[#222226] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#FFB300]"
            >
              {goals.map((g, idx) => (
                <option key={idx} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRecommendMix}
            disabled={isRecommending}
            className="w-full py-2.5 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg shadow-[0_0_15px_rgba(255,179,0,0.3)] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRecommending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analiza szyny miksu przez AI...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Wygeneruj Rekomendacje dla Tego Celu</span>
              </>
            )}
          </button>

          {recommendation && (
            <div className="p-4 bg-[#111114] border border-[#FFB300]/30 rounded-xl space-y-3 animate-in fade-in">
              <div>
                <span className="text-[11px] font-bold uppercase text-[#FFB300] block mb-1 font-mono">
                  Werdykt Inżynierski:
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {recommendation.explanation}
                </p>
              </div>

              {recommendation.keyFixes && (
                <div>
                  <span className="text-[11px] font-bold uppercase text-purple-400 block mb-1 font-mono">
                    Kluczowe Kroki Naprawcze:
                  </span>
                  <ul className="space-y-1">
                    {recommendation.keyFixes.map((fix, fIdx) => (
                      <li key={fIdx} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
