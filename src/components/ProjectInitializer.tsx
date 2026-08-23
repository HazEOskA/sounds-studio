import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Mic,
  Sparkles,
  PlayCircle,
  PlusCircle,
  FileAudio,
  Radio,
  Flame,
  Moon,
  Zap,
  Loader2,
} from "lucide-react";

interface ProjectInitializerProps {
  onLoadAudioFile: (file: File) => void;
  onSelectPreset: (style: "trap" | "neosoul" | "cyberpunk") => void;
  onOpenGenerator: () => void;
  isProcessing: boolean;
}

export const ProjectInitializer: React.FC<ProjectInitializerProps> = ({
  onLoadAudioFile,
  onSelectPreset,
  onOpenGenerator,
  isProcessing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/i)) {
        onLoadAudioFile(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onLoadAudioFile(e.target.files[0]);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordedFile = new File([audioBlob], `Nagranie-Glosowe-${new Date().toISOString().slice(11, 19)}.webm`, {
          type: "audio/webm",
        });
        onLoadAudioFile(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Błąd dostępu do mikrofonu:", err);
      alert("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia przeglądarki.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  return (
    <div className="bg-[#16161A] border border-[#222226] rounded-2xl p-5 sm:p-7 shadow-2xl">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight uppercase">
          Czym chcesz dzisiaj wypełnić studio?
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Wybierz punkt startowy: przeanalizuj własny utwór, zamień surową emocję w muzykę lub zbuduj numer od podstaw.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entrance 1: Wrzuć numer */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group p-5 rounded-xl border transition-all flex flex-col justify-between ${
            isDragging
              ? "bg-[#1A1A1E] border-[#FFB300] shadow-[0_0_15px_rgba(255,179,0,0.3)]"
              : "bg-[#111114] border-[#222226] hover:border-[#FFB300]/50"
          }`}
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-[#FFB300]/10 border border-[#FFB300]/30 text-[#FFB300] flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-100">1. Wrzuć numer</h3>
              <span className="text-[9px] font-mono uppercase bg-[#FFB300]/10 text-[#FFB300] border border-[#FFB300]/20 px-1.5 py-0.5 rounded">AUDIO</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Wgraj plik audio (WAV, MP3, FLAC) lub nagraj pomysł wokalny bezpośrednio przez mikrofon.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#1A1A1E]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="audio/*,.mp3,.wav,.flac,.m4a,.aac"
              className="hidden"
            />
            <button
              id="upload-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-2 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold uppercase text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,179,0,0.3)] disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dekodowanie audio...</span>
                </>
              ) : (
                <>
                  <FileAudio className="w-4 h-4" />
                  <span>Wybierz plik z dysku</span>
                </>
              )}
            </button>

            {/* Mic recording button */}
            <button
              id="record-mic-btn"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`w-full py-2 text-xs font-bold uppercase rounded-lg border transition flex items-center justify-center gap-2 ${
                isRecording
                  ? "bg-red-600 text-white border-red-500 animate-pulse"
                  : "bg-[#1A1A1E] text-zinc-300 border-[#2A2A2E] hover:bg-[#25252B]"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isRecording ? `Zatrzymaj (${recordingSeconds}s)` : "Nagraj wokal / beatbox"}</span>
            </button>
          </div>
        </div>

        {/* Entrance 2: Opisz, co czujesz */}
        <div
          onClick={onOpenGenerator}
          className="group cursor-pointer p-5 rounded-xl border bg-[#111114] border-[#222226] hover:border-purple-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-100">2. Opisz, co czujesz</h3>
              <span className="text-[9px] font-mono uppercase bg-purple-900/40 text-purple-300 border border-purple-800/40 px-1.5 py-0.5 rounded">AI PROMPT</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Zamień wspomnienie, nastrój lub historię w precyzyjny brief muzyczny, aranżację, tekst i prompt AI.
            </p>
          </div>

          <div className="pt-2 border-t border-[#1A1A1E]">
            <button className="w-full py-2 bg-[#1A1A1E] hover:bg-[#25252B] text-purple-300 border border-purple-500/30 font-bold uppercase text-xs rounded-lg transition flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kreator Emocji</span>
            </button>
          </div>
        </div>

        {/* Entrance 3: Zacznij od zera (Presets) */}
        <div className="p-5 rounded-xl border bg-[#111114] border-[#222226] hover:border-cyan-500/50 transition-all flex flex-col justify-between">
          <div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-100">3. Zacznij od zera</h3>
              <span className="text-[9px] font-mono uppercase bg-cyan-950/40 text-cyan-300 border border-cyan-800/40 px-1.5 py-0.5 rounded">SZABLONY</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Wczytaj gotowy szablon studyjny i wygeneruj syntezowane ścieżki w czasie rzeczywistym.
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#1A1A1E]">
            <button
              onClick={() => onSelectPreset("trap")}
              className="w-full text-left px-3 py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-200 text-xs rounded-lg border border-[#2A2A2E] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-[#FFB300]" />
                <span className="font-medium">Dark Trap / Phonk</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">138 BPM</span>
            </button>

            <button
              onClick={() => onSelectPreset("neosoul")}
              className="w-full text-left px-3 py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-200 text-xs rounded-lg border border-[#2A2A2E] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-medium">Neo-Soul & Lo-Fi</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">82 BPM</span>
            </button>

            <button
              onClick={() => onSelectPreset("cyberpunk")}
              className="w-full text-left px-3 py-1.5 bg-[#1A1A1E] hover:bg-[#25252B] text-zinc-200 text-xs rounded-lg border border-[#2A2A2E] transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium">Cyberpunk Ambient</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">110 BPM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
