import React, { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { MusicSchoolBar } from "./components/MusicSchoolBar";
import { ProjectInitializer } from "./components/ProjectInitializer";
import { TrackLab } from "./components/TrackLab";
import { StemSplitter } from "./components/StemSplitter";
import { MidiLab } from "./components/MidiLab";
import { MusicGenerator } from "./components/MusicGenerator";
import { MixMastering } from "./components/MixMastering";
import { LoopLab } from "./components/LoopLab";
import { AiProducerChat } from "./components/AiProducerChat";
import { DawDev } from "./components/DawDev";

import { AudioAnalysis, DspMetrics, StemTrack } from "./types";
import {
  DEFAULT_ANALYSIS,
  DEFAULT_DSP_METRICS,
  DEFAULT_STEMS,
  generateSyntheticTrackAudio,
} from "./data/demoTracks";
import { audioEngine } from "./utils/audioEngine";
import { extractWaveformPeaks, analyzeAudioBufferDsp } from "./utils/audioDsp";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("lab");
  const [trackTitle, setTrackTitle] = useState<string>("OSA - Nocny Rejs (Dark Trap 808)");
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(DEFAULT_ANALYSIS);
  const [dspMetrics, setDspMetrics] = useState<DspMetrics | null>(DEFAULT_DSP_METRICS);
  const [stems, setStems] = useState<StemTrack[]>(DEFAULT_STEMS);
  const [waveformPoints, setWaveformPoints] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);

  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isSchoolOpen, setIsSchoolOpen] = useState<boolean>(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>("");

  useEffect(() => {
    try {
      const demoBuffer = generateSyntheticTrackAudio("trap");
      audioEngine.loadAudioBuffer(demoBuffer);
      setDuration(demoBuffer.duration);
      const peaks = extractWaveformPeaks(demoBuffer, 250);
      setWaveformPoints(peaks);
    } catch (e) {
      console.warn("Auto audio init deferred until user gesture", e);
    }

    return audioEngine.onPlaybackProgress((time, dur) => {
      setCurrentTime(time);
      setDuration(dur);
      setIsPlaying(audioEngine.getIsPlaying());
    });
  }, []);

  const handlePlayPause = async () => {
    await audioEngine.init();
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleLoadAudioFile = async (file: File) => {
    setIsProcessingFile(true);
    setTrackTitle(file.name.replace(/\.[^/.]+$/, ""));
    try {
      await audioEngine.init();
      const arrayBuffer = await file.arrayBuffer();
      const ctx = audioEngine.getAudioContext();
      if (!ctx) throw new Error("Brak AudioContext");

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioEngine.loadAudioBuffer(audioBuffer);
      setDuration(audioBuffer.duration);

      const peaks = extractWaveformPeaks(audioBuffer, 250);
      setWaveformPoints(peaks);

      const dsp = analyzeAudioBufferDsp(audioBuffer);
      setDspMetrics(dsp);

      setIsAnalyzing(true);
      const res = await fetch("/api/analyze-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name, dspMetrics: dsp }),
      });

      if (res.ok) {
        const aiAnalysis: AudioAnalysis = await res.json();
        setAnalysis(aiAnalysis);
      }
    } catch (err) {
      console.error("Błąd ładowania pliku audio:", err);
      alert("Nie udało się zdekodować pliku audio. Upewnij się, że to poprawny plik dźwiękowy (MP3, WAV, FLAC, OGG).");
    } finally {
      setIsProcessingFile(false);
      setIsAnalyzing(false);
    }
  };

  const handleSelectPreset = (style: "trap" | "neosoul" | "cyberpunk") => {
    const titles = {
      trap: "OSA - Nocny Rejs (Dark Trap 808)",
      neosoul: "OSA - Ciepły Deszcz (Neo-Soul Lo-Fi)",
      cyberpunk: "OSA - Neonowa Otchłań (Cyberpunk Ambient)",
    };
    setTrackTitle(titles[style]);
    const buffer = generateSyntheticTrackAudio(style);
    audioEngine.loadAudioBuffer(buffer);
    setDuration(buffer.duration);
    setWaveformPoints(extractWaveformPeaks(buffer, 250));
    setDspMetrics(analyzeAudioBufferDsp(buffer));
  };

  const handleAskAboutTimestamp = (time: number, sectionName?: string) => {
    const minute = Math.floor(time / 60);
    const second = Math.floor(time % 60).toString().padStart(2, "0");
    const query = sectionName
      ? `Zwróć uwagę na sekcję '${sectionName}' w minucie ${minute}:${second}. Jakie elementy miksu lub harmonii warto tu poprawić?`
      : `Sprawdź moment ${minute}:${second}. Co sądzisz o dynamice i przestrzeni w tej sekundzie utworu?`;
    setChatInitialQuery(query);
    setIsChatOpen(true);
  };

  const handleReAnalyze = async () => {
    if (!dspMetrics) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trackTitle, dspMetrics }),
      });
      if (res.ok) {
        const aiAnalysis: AudioAnalysis = await res.json();
        setAnalysis(aiAnalysis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        trackTitle={trackTitle}
        bpm={dspMetrics?.bpm || analysis?.estimatedBpm || 138}
        detectedKey={dspMetrics?.detectedKey || analysis?.estimatedKey || "F-moll"}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isSchoolOpen={isSchoolOpen}
        setIsSchoolOpen={setIsSchoolOpen}
      />

      <MusicSchoolBar
        isOpen={isSchoolOpen}
        onClose={() => setIsSchoolOpen(false)}
        currentAnalysis={analysis}
        trackTitle={trackTitle}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 space-y-6">
        {activeTab === "lab" && (
          <ProjectInitializer
            onLoadAudioFile={handleLoadAudioFile}
            onSelectPreset={handleSelectPreset}
            onOpenGenerator={() => setActiveTab("generator")}
            isProcessing={isProcessingFile}
          />
        )}

        {activeTab === "lab" && (
          <TrackLab
            waveformPoints={waveformPoints}
            analysis={analysis}
            dspMetrics={dspMetrics}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onAskAboutTimestamp={handleAskAboutTimestamp}
            onReAnalyze={handleReAnalyze}
            isAnalyzing={isAnalyzing}
            trackTitle={trackTitle}
          />
        )}

        {activeTab === "stems" && (
          <StemSplitter
            stems={stems}
            setStems={setStems}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            trackTitle={trackTitle}
          />
        )}

        {activeTab === "midi" && (
          <MidiLab
            bpm={dspMetrics?.bpm || analysis?.estimatedBpm || 138}
            detectedKey={dspMetrics?.detectedKey || analysis?.estimatedKey || "F-moll"}
            trackTitle={trackTitle}
          />
        )}

        {activeTab === "generator" && <MusicGenerator />}

        {activeTab === "mix" && (
          <MixMastering
            trackTitle={trackTitle}
            bpm={dspMetrics?.bpm || analysis?.estimatedBpm || 138}
            detectedKey={dspMetrics?.detectedKey || analysis?.estimatedKey || "F-moll"}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
          />
        )}

        {activeTab === "loop" && (
          <LoopLab
            bpm={dspMetrics?.bpm || analysis?.estimatedBpm || 138}
            trackTitle={trackTitle}
          />
        )}

        {activeTab === "daw" && <DawDev />}
      </main>

      <AiProducerChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentAnalysis={analysis}
        trackTitle={trackTitle}
        currentTime={currentTime}
        initialQuery={chatInitialQuery}
        onClearInitialQuery={() => setChatInitialQuery("")}
      />
    </div>
  );
}
