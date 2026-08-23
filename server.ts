import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy Google Gen AI client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Health check & Provider status
app.get("/api/status", (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    geminiConfigured: hasGeminiKey,
    lyriaAvailable: hasGeminiKey,
    dspEngine: "WebAudio-v2-Native",
    version: "1.0.0",
    studioName: "OSA SOUL STUDIO",
  });
});

// 2. Emotional and Acoustic Song Analysis
app.post("/api/analyze-song", async (req, res) => {
  try {
    const { title, duration, bpm, detectedKey, energyMetrics, userNotes } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "Brak skonfigurowanego klucza GEMINI_API_KEY na serwerze.",
        code: "KEY_MISSING",
      });
    }

    const prompt = `Jesteś głównym producentem muzycznym i realizatorem dźwięku w OSA SOUL STUDIO.
Dokonaj głębokiej, emocjonalnej i technicznej analizy utworu na podstawie danych wejściowych:
Tytuł/Plik: ${title || "Projekt bez nazwy"}
Długość: ${duration ? Math.round(duration) + "s" : "nieznana"}
Wstępny estymowany BPM: ${bpm || 120}
Wstępna estymowana tonacja: ${detectedKey || "C-moll"}
Wskaźniki energetyczne DSP: ${JSON.stringify(energyMetrics || {})}
Notatki artysty: ${userNotes || "Brak dodatkowych notatek"}

Zwróć odpowiedź w czystym formacie JSON o podanym schemacie.
Pamiętaj: nie odpowiadaj jak sucha maszyna. Bądź producentem z uchem i sercem do muzyki:
- "emotionalNarrative": emocjonalna interpretacja utworu (np. "Ten numer brzmi jak samotna nocna jazda przez miasto...", 2-4 zdania z duszą),
- "moodKeywords": tablica 4-6 emocjonalnych słów kluczowych (np. ["melancholia", "surowy bas", "nocny trans", "nostalgia"]),
- "detectedGenre": nazwa gatunku/stylu (np. "Dark Melodic Trap / Phonk / Ambient Wave"),
- "estimatedKey": zweryfikowana tonacja (np. "F-moll / Ab-dur"),
- "estimatedBpm": zweryfikowane tempo (np. 138),
- "energyContour": opis dynamiki energii w czasie (wstęp, narastanie, drop, wyciszenie),
- "sections": tablica sekcji utworu z polami { "name": string, "startSeconds": number, "endSeconds": number, "energy": number (0-100), "description": string },
- "soundDesignBreakdown": { "bass": string, "drums": string, "vocals": string, "spaceFx": string, "synths": string },
- "producerVerdict": konkretne uwagi producenta: co działa wspaniale, a co wymaga dopracowania w aranżu lub miksie.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotionalNarrative: { type: Type.STRING },
            moodKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            detectedGenre: { type: Type.STRING },
            estimatedKey: { type: Type.STRING },
            estimatedBpm: { type: Type.NUMBER },
            energyContour: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  startSeconds: { type: Type.NUMBER },
                  endSeconds: { type: Type.NUMBER },
                  energy: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                },
                required: ["name", "startSeconds", "endSeconds", "energy", "description"],
              },
            },
            soundDesignBreakdown: {
              type: Type.OBJECT,
              properties: {
                bass: { type: Type.STRING },
                drums: { type: Type.STRING },
                vocals: { type: Type.STRING },
                spaceFx: { type: Type.STRING },
                synths: { type: Type.STRING },
              },
              required: ["bass", "drums", "vocals", "spaceFx", "synths"],
            },
            producerVerdict: { type: Type.STRING },
          },
          required: [
            "emotionalNarrative",
            "moodKeywords",
            "detectedGenre",
            "estimatedKey",
            "estimatedBpm",
            "energyContour",
            "sections",
            "soundDesignBreakdown",
            "producerVerdict",
          ],
        },
      },
    });

    const analysis = JSON.parse(response.text || "{}");
    res.json(analysis);
  } catch (error: any) {
    console.error("Błąd analizy utworu:", error);
    res.status(500).json({
      error: "Nie udało się przeprowadzić analizy AI.",
      details: error?.message || "Nieznany błąd",
    });
  }
});

// 3. AI Producer / Audio Engineer Conversation (Context-Aware)
app.post("/api/chat-producer", async (req, res) => {
  try {
    const { messages, projectContext, timestampQuery } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "Brak klucza API Gemini. Skonfiguruj GEMINI_API_KEY.",
      });
    }

    const systemInstruction = `Jesteś osobistym producentem muzycznym, inżynierem dźwięku i mentorem w OSA SOUL STUDIO.
Twoja tożsamość:
- Łączysz głębokie zrozumienie emocji z precyzyjną wiedzą inżynieryjną (częstotliwości w Hz, czasy kompresji w ms, struktura harmoniczna, aranżacja, mikro-dynamika).
- Twoja odpowiedź ZAWSZE odpowiada na dwóch poziomach:
  1. 🎨 **Emocjonalno-artystyczny** (klimat, narracja, psychologia słuchacza, dramaturgia utworu).
  2. 🎛️ **Techniczno-produkcyjny** (konkretne pasma EQ, ustawienia kompresora, saturacja, sidechain, łańcuchy efektów, zabiegi w DAW).
- Mówisz po polsku, żywym, producenckim językiem (bez sztywnego żargonu korporacyjnego, z szacunkiem i pasją do dźwięku).
- Masz pełny wgląd w aktualny projekt:
${JSON.stringify(projectContext || {}, null, 2)}
${timestampQuery ? `Słuchacz zadaje pytanie o konkretny moment w utworze (znacznik czasu: ${timestampQuery.time}s - sekcja "${timestampQuery.section || 'wybrany fragment'}").` : ""}`;

    // Convert messages for gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.75,
      },
    });

    res.json({
      role: "assistant",
      content: response.text || "Producent nie mógł wygenerować odpowiedzi w tym momencie.",
    });
  } catch (error: any) {
    console.error("Błąd czatu producenta:", error);
    res.status(500).json({
      error: "Błąd podczas rozmowy z producentem.",
      details: error?.message || "Nieznany błąd",
    });
  }
});

// 4. Music School - Dynamic Lesson Generator based on Project
app.post("/api/generate-lesson", async (req, res) => {
  try {
    const { topic, level, projectContext } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });
    }

    const prompt = `Stwórz interaktywną, mistrzowską lekcję w Szkole Muzycznej OSA SOUL STUDIO.
Temat: ${topic || "Aranżacja i sound design emocjonalnego beatu"}
Poziom zaawansowania: ${level || "Producent"} (Dostępne poziomy: Początkujący, Producent, Inżynier, Eksperymentator)
Kontekst aktualnego projektu użytkownika:
${JSON.stringify(projectContext || {}, null, 2)}

Wygeneruj lekcję, która bezpośrednio odnosi się do tego, co dzieje się w numerze użytkownika.
Zwróć odpowiedź w formacie JSON o polach:
- "title": chwytliwy tytuł lekcji,
- "summary": 2 zdania wstępu dlaczego to kluczowe w tym utworze,
- "coreTheory": wytłumaczenie koncepcji muzycznej/emocjonalnej (np. rola subbasu, polyrytmika, tonacja molowa),
- "practicalSteps": tablica 4-5 kroków w DAW/studio z polami { "stepNumber": number, "title": string, "instruction": string, "technicalSetting": string, "proTip": string },
- "listeningExercise": zadanie odsłuchowe na co zwrócić uwagę w słuchawkach/monitorach,
- "audioExampleType": jaki typ dźwięku najlepiej to ilustruje (np. "sub_808", "vocal_plate", "drum_sidechain").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            coreTheory: { type: Type.STRING },
            practicalSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  technicalSetting: { type: Type.STRING },
                  proTip: { type: Type.STRING },
                },
                required: ["stepNumber", "title", "instruction", "technicalSetting", "proTip"],
              },
            },
            listeningExercise: { type: Type.STRING },
            audioExampleType: { type: Type.STRING },
          },
          required: ["title", "summary", "coreTheory", "practicalSteps", "listeningExercise", "audioExampleType"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Błąd generowania lekcji:", error);
    res.status(500).json({ error: "Nie udało się wygenerować lekcji.", details: error?.message });
  }
});

// 5. Music Generator (Brief, Prompts, Structure & Lyrics Engine)
app.post("/api/generate-brief", async (req, res) => {
  try {
    const { emotionSliders, genre, description, structureType, bpm, key, instrumentation, referenceSnippet } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });
    }

    const prompt = `Jesteś architektem kompozycji i producentem w OSA SOUL STUDIO.
Użytkownik chce stworzyć utwór lub motyw muzyczny:
Opis emocji / wspomnienia / historii: "${description || "Ciemna noc, neonowy deszcz i tęsknota za kimś, kto zniknął"}"
Gatunek muzyczny: ${genre || "Dark R&B / Synthwave"}
Typ struktury: ${structureType || "Pełny utwór"} (np. Instrumental, Pełny utwór, Beat, Pętla, Intro, Refren, Podkład pod wokal, Ambient, Ścieżka filmowa)
Preferowane tempo: ${bpm || "Automatyczne dopasowanie do nastroju"}
Preferowana tonacja: ${key || "Automatyczne dopasowanie"}
Preferowane instrumenty: ${instrumentation || "Ciężki bas 808, analogowe pady, przesterowany wokal w tle"}
Wektor emocjonalny (0-100):
- Energia: ${emotionSliders?.energy ?? 50}
- Mrok: ${emotionSliders?.darkness ?? 70}
- Melancholia: ${emotionSliders?.melancholy ?? 85}
- Nadzieja: ${emotionSliders?.hope ?? 30}
- Agresja: ${emotionSliders?.aggression ?? 20}
- Przestrzeń: ${emotionSliders?.space ?? 90}
- Surowość: ${emotionSliders?.rawness ?? 65}
- Eksperymentalność: ${emotionSliders?.experimental ?? 45}
${referenceSnippet ? `Referencja z analizowanego utworu: "${referenceSnippet}"` : ""}

Wygeneruj kompletny profesjonalny brief muzyczny, profesjonalny prompt dla modeli generujących dźwięk (np. Lyria/Suno), strukturę sekcji, sugerowane akordy i tekst piosenki / motyw wokalny.

Format odpowiedzi JSON:
- "title": roboczy tytuł numeru,
- "styleTagline": krótki opis stylu (np. "Nocturnal Neo-Soul z analogowym basem i przestrzennym reverbem"),
- "targetBpm": rekomendowane BPM (liczba),
- "targetKey": rekomendowana tonacja (np. "D-moll"),
- "aiAudioPrompt": zoptymalizowany prompt techniczny do modelu audio (po angielsku i polsku),
- "instrumentationPlan": lista instrumentów i ich roli w miksie (tablica obiektów { "instrument": string, "role": string, "character": string }),
- "arrangementSections": tablica sekcji { "section": string, "bars": number, "description": string, "chords": string },
- "lyricsOrVocalCues": tekst piosenki z podziałem na sekcje (Intro, Zwrotka, Refren, Outro) z oznaczeniami wykonawczymi w nawiasach kwadratowych np. [Szeptany, intymny wokal],
- "mixVibeAdvice": 2-3 zdania jak zrealizować ten miks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            styleTagline: { type: Type.STRING },
            targetBpm: { type: Type.NUMBER },
            targetKey: { type: Type.STRING },
            aiAudioPrompt: { type: Type.STRING },
            instrumentationPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instrument: { type: Type.STRING },
                  role: { type: Type.STRING },
                  character: { type: Type.STRING },
                },
                required: ["instrument", "role", "character"],
              },
            },
            arrangementSections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  section: { type: Type.STRING },
                  bars: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  chords: { type: Type.STRING },
                },
                required: ["section", "bars", "description", "chords"],
              },
            },
            lyricsOrVocalCues: { type: Type.STRING },
            mixVibeAdvice: { type: Type.STRING },
          },
          required: [
            "title",
            "styleTagline",
            "targetBpm",
            "targetKey",
            "aiAudioPrompt",
            "instrumentationPlan",
            "arrangementSections",
            "lyricsOrVocalCues",
            "mixVibeAdvice",
          ],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Błąd generowania briefu:", error);
    res.status(500).json({ error: "Nie udało się wygenerować briefu muzycznego.", details: error?.message });
  }
});

// 6. MIDI Lab - Chord progressions & Emotional scale explanations
app.post("/api/midi-progressions", async (req, res) => {
  try {
    const { scale, mood, baseChords } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });
    }

    const prompt = `Jesteś mistrzem harmonii muzycznej w OSA SOUL STUDIO.
Przeanalizuj i zaproponuj wariacje progresji akordów:
Skala/Tonacja: ${scale || "A-moll naturalny"}
Docelowy nastrój: ${mood || "Głęboka melancholia z nutą nadziei"}
Aktualne akordy bazowe: ${baseChords || "Am - F - C - G"}

Wygeneruj 4 unikalne, emocjonalne progresje akordów:
1. Wariant "Ciemniejszy / Kinowy"
2. Wariant "Neo-Soul / Jazzowe napięcie (7th, 9th, sus)"
3. Wariant "Podnoszący na duchu / Epicki"
4. Wariant "Surowy / Hipnotyczny"

Dla każdej progresji podaj:
- "name": nazwa wariantu,
- "chords": tablica akordów np. ["Am9", "Fmaj7#11", "Cadd9", "Em7"],
- "romanNumerals": zapis stopniami skali np. "i9 - VImaj7 - IIIadd9 - v7",
- "emotionalReasoning": dlaczego ta sekwencja wywołuje konkretną emocję (wyjaśnienie interwałów i psychologii słuchacza),
- "midiNotes": tablica 4 taktów z nutami w zapisie MIDI (dla syntezatora i piano roll) np. [["A2", "C3", "E3", "G3", "B3"], ["F2", "A3", "C4", "E4", "B4"], ...],
- "recommendedBassline": sugerowane dźwięki basu (root notes i passing notes).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scaleExplanation: { type: Type.STRING },
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  chords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  romanNumerals: { type: Type.STRING },
                  emotionalReasoning: { type: Type.STRING },
                  midiNotes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  recommendedBassline: { type: Type.STRING },
                },
                required: ["name", "chords", "romanNumerals", "emotionalReasoning", "midiNotes", "recommendedBassline"],
              },
            },
          },
          required: ["scaleExplanation", "variations"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Błąd harmonii MIDI:", error);
    res.status(500).json({ error: "Błąd analizy MIDI.", details: error?.message });
  }
});

// 7. Mix & Mastering recommendations
app.post("/api/recommend-mix", async (req, res) => {
  try {
    const { targetGoal, trackAnalysis, selectedStem } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });
    }

    const prompt = `Jesteś głównym inżynierem miksu i masteringu w OSA SOUL STUDIO.
Cel / zadanie realizatorskie: "${targetGoal || "Popraw czytelność wokalu i zrób mocniejszy dół"}"
Wybrana ścieżka / cała suma: "${selectedStem || "Cały miks (Master Bus)"}"
Kontekst analizy utworu:
${JSON.stringify(trackAnalysis || {}, null, 2)}

Przygotuj precyzyjną, profesjonalną specyfikację łańcucha efektów (FX Chain) oraz parametryczne zalecenia:
Zwróć JSON:
- "targetSummary": podsumowanie zabiegu realizatorskiego,
- "eqBands": tablica 4-5 filtrów z polami { "type": "lowpass"|"highpass"|"peaking"|"lowshelf"|"highshelf", "frequencyHz": number, "gainDb": number, "q": number, "purpose": string },
- "dynamics": { "compressorRatio": string, "thresholdDb": number, "attackMs": number, "releaseMs": number, "makeupGainDb": number, "saturationType": string, "saturationDrive": number },
- "spatialFx": { "reverbType": string, "reverbDecaySec": number, "predelayMs": number, "stereoWidthPercent": number, "sidechainSource": string },
- "masterLoudnessTarget": { "targetLufs": number, "truePeakDb": number, "dynamicRange": string },
- "actionableChecklist": tablica 4 konkretnych kroków do wdrożenia w DAW.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetSummary: { type: Type.STRING },
            eqBands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  frequencyHz: { type: Type.NUMBER },
                  gainDb: { type: Type.NUMBER },
                  q: { type: Type.NUMBER },
                  purpose: { type: Type.STRING },
                },
                required: ["type", "frequencyHz", "gainDb", "q", "purpose"],
              },
            },
            dynamics: {
              type: Type.OBJECT,
              properties: {
                compressorRatio: { type: Type.STRING },
                thresholdDb: { type: Type.NUMBER },
                attackMs: { type: Type.NUMBER },
                releaseMs: { type: Type.NUMBER },
                makeupGainDb: { type: Type.NUMBER },
                saturationType: { type: Type.STRING },
                saturationDrive: { type: Type.NUMBER },
              },
              required: ["compressorRatio", "thresholdDb", "attackMs", "releaseMs", "makeupGainDb", "saturationType", "saturationDrive"],
            },
            spatialFx: {
              type: Type.OBJECT,
              properties: {
                reverbType: { type: Type.STRING },
                reverbDecaySec: { type: Type.NUMBER },
                predelayMs: { type: Type.NUMBER },
                stereoWidthPercent: { type: Type.NUMBER },
                sidechainSource: { type: Type.STRING },
              },
              required: ["reverbType", "reverbDecaySec", "predelayMs", "stereoWidthPercent", "sidechainSource"],
            },
            masterLoudnessTarget: {
              type: Type.OBJECT,
              properties: {
                targetLufs: { type: Type.NUMBER },
                truePeakDb: { type: Type.NUMBER },
                dynamicRange: { type: Type.STRING },
              },
              required: ["targetLufs", "truePeakDb", "dynamicRange"],
            },
            actionableChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["targetSummary", "eqBands", "dynamics", "spatialFx", "masterLoudnessTarget", "actionableChecklist"],
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Błąd zaleceń miksu:", error);
    res.status(500).json({ error: "Błąd generowania łańcucha miksu.", details: error?.message });
  }
});

// 8. Lyria audio generation check & generation endpoint (if Lyria model is enabled)
app.post("/api/lyria-generate", async (req, res) => {
  try {
    const { prompt } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "Brak klucza API. Provider audio wymaga skonfigurowanego klucza.",
        status: "WYMAGA KONFIGURACJI",
      });
    }

    // Attempt Lyria generation using streaming
    try {
      const response = await ai.models.generateContentStream({
        model: "lyria-3-clip-preview",
        contents: prompt || "Atmospheric emotional instrumental with deep bass and ambient pads",
      });

      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (audioBase64) {
        return res.json({
          status: "DZIAŁA",
          audioBase64,
          mimeType,
          lyrics,
        });
      } else {
        return res.status(422).json({
          status: "WYMAGA MODELU AUDIO",
          message: "Model Lyria zwrócił odpowiedź tekstową bez danych audio. Skonfiguruj model Lyria lub użyj wbudowanego syntezatora Web Audio.",
          textResponse: lyrics,
        });
      }
    } catch (modelError: any) {
      console.warn("Lyria direct call note:", modelError?.message);
      return res.status(422).json({
        status: "WYMAGA MODELU AUDIO",
        message: `Model generowania dźwięku Lyria wymaga uprawnień lub płatnego klucza API: ${modelError?.message || "Niedostępny w tym regionie"}`,
        details: modelError?.message,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      status: "BŁĄD",
      error: error?.message || "Błąd serwera audio.",
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OSA SOUL STUDIO Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
