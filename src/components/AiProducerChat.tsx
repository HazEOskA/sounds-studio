import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Sliders,
  HelpCircle,
  Loader2,
  Clock,
  Music,
} from "lucide-react";
import { ChatMessage, AudioAnalysis } from "../types";

interface AiProducerChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnalysis: AudioAnalysis | null;
  trackTitle: string;
  currentTime: number;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

export const AiProducerChat: React.FC<AiProducerChatProps> = ({
  isOpen,
  onClose,
  currentAnalysis,
  trackTitle,
  currentTime,
  initialQuery,
  onClearInitialQuery,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      timestamp: Date.now(),
      text: "Siema w OSA SOUL STUDIO! Jestem Twoim osobistym producentem i inżynierem dźwięku. Słyszę to, co tworzysz i rozumiem emocje, które chcesz przekazać. Zapytaj mnie o cokolwiek: od miksu stopy z basem 808 po budowanie melancholijnego refrenu.",
      category: "both",
      suggestedDAWAction: "Załaduj swój projekt lub wybierz jeden z gotowych szablonów, abyśmy mogli zacząć pracę.",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Dlaczego mój kick gryzie się z basem 808?",
    "Jak zrobić refren bardziej przestrzenny i emocjonalny?",
    "Co w tym numerze brzmi surowo albo amatorsko?",
    "Jakie nasycenie lampowe dobrać na szynę główną?",
    "Jaką progresję akordów polecasz po tym fragmencie?",
  ];

  // Auto handle initial query from timestamp pin
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      sendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: Date.now(),
      text: userText,
      timestampReference: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat-producer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          projectContext: {
            title: trackTitle,
            currentTime,
            bpm: currentAnalysis?.estimatedBpm || 138,
            key: currentAnalysis?.estimatedKey || "F-moll",
            genre: currentAnalysis?.detectedGenre || "Dark Trap",
            analysis: currentAnalysis,
          },
          history: messages.slice(-8).map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          timestamp: Date.now(),
          text: data.reply,
          category: data.category || "both",
          suggestedDAWAction: data.suggestedDAWAction,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("Błąd serwera");
      }
    } catch (e) {
      const errorReply: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        timestamp: Date.now(),
        text: "Przepraszam, chwilowo nie udało się połączyć z modelem AI. Sprawdź swoje połączenie sieciowe lub ponów pytanie.",
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSec = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-[#111114] border border-[#222226] rounded-xl shadow-2xl transition-all flex flex-col overflow-hidden ${
        isMinimized
          ? "w-80 h-14"
          : "w-[94vw] sm:w-[460px] h-[580px] max-h-[85vh]"
      }`}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 bg-[#16161A] border-b border-[#222226] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-gray-100 uppercase tracking-tight">Producent & Realizator AI</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB300] animate-pulse" />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              {trackTitle || "Projekt Studyjny"} • {formatSec(currentTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-[#222226] transition"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-[#222226] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-[#0A0A0C] border-b border-[#222226] overflow-x-auto scrollbar-none flex gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#16161A] text-zinc-300 hover:text-[#FFB300] hover:bg-[#1A1A1E] border border-[#222226] whitespace-nowrap transition disabled:opacity-50 font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0A0A0C]">
            {messages.map((m) => {
              const isAi = m.sender === "ai";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isAi ? "items-start" : "items-start flex-row-reverse"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                      isAi
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                        : "bg-[#FFB300]/20 text-[#FFB300] border border-[#FFB300]/30"
                    }`}
                  >
                    {isAi ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      isAi
                        ? "bg-[#16161A] text-zinc-200 border border-[#222226]"
                        : "bg-[#FFB300] text-black font-semibold shadow-md"
                    }`}
                  >
                    {/* Timestamp badge if referenced */}
                    {m.timestampReference !== undefined && !isAi && (
                      <div className="flex items-center gap-1 text-[10px] text-black/80 font-mono mb-1 font-bold">
                        <Clock className="w-3 h-3" />
                        <span>Dotyczy momentu: {formatSec(m.timestampReference)}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {/* DAW Action suggestion card */}
                    {m.suggestedDAWAction && (
                      <div className="mt-2.5 pt-2 border-t border-[#222226] bg-[#111114] p-2 rounded-lg text-[11px] text-[#FFB300] font-mono">
                        🎛️ <strong>Krok w DAW:</strong> {m.suggestedDAWAction}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-zinc-400">
                <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>Producent analizuje brzmienie i przygotowuje odpowiedź...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-[#161824] border-t border-[#222226]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Napisz do producenta AI..."
                className="flex-1 bg-[#0A0A0C] border border-[#222226] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#FFB300]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-[#FFB300] hover:bg-[#ffbe1a] text-black font-bold rounded-lg transition disabled:opacity-50 shadow-[0_0_10px_rgba(255,179,0,0.2)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
