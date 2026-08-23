import { AudioAnalysis, StemTrack, MidiNote, ChordVariation, SchoolLesson, DspMetrics } from "../types";

/**
 * Creates high quality Web Audio algorithmic demo buffers
 */
export function generateSyntheticDemoTrack(
  ctx: AudioContext,
  style: "trap" | "neosoul" | "cyberpunk"
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const durationSec = 16;
  const totalSamples = sampleRate * durationSec;
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = style === "trap" ? 138 : style === "neosoul" ? 82 : 110;
  const beatSec = 60 / bpm;

  if (style === "trap") {
    const chords = [
      [87.31, 130.81, 174.61],
      [103.83, 155.56, 207.65],
      [69.30, 103.83, 138.59],
      [77.78, 116.54, 155.56],
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatSec) % 16;
      const barIndex = Math.floor(beat / 4);
      const chord = chords[barIndex % 4];

      let pad = 0;
      chord.forEach((freq, idx) => {
        const detune = idx === 0 ? 1 : 1.006;
        pad += Math.sin(2 * Math.PI * freq * detune * t) * 0.08;
        pad += Math.sin(4 * Math.PI * freq * t) * 0.04;
      });

      const beatPos = beat % 4;
      let bass = 0;
      if (beatPos < 1.2 || (beatPos > 1.5 && beatPos < 2.3) || (beatPos > 2.7 && beatPos < 3.8)) {
        const rootFreq = chord[0] * 0.5;
        const env = Math.exp(-(beatPos % 1.5) * 3);
        bass = Math.sin(2 * Math.PI * rootFreq * t + Math.sin(2 * Math.PI * 10 * t) * 0.2) * env * 0.35;
      }

      let kick = 0;
      const kickDist1 = beat % 4;
      const kickDist2 = Math.abs((beat % 4) - 2.5);
      const kEnv1 = Math.exp(-kickDist1 * 8);
      const kEnv2 = Math.exp(-kickDist2 * 8);
      if (kickDist1 < 0.25) kick += Math.sin(2 * Math.PI * (140 - kickDist1 * 400) * t) * kEnv1 * 0.4;
      if (kickDist2 < 0.25) kick += Math.sin(2 * Math.PI * (140 - kickDist2 * 400) * t) * kEnv2 * 0.35;

      let snare = 0;
      const snareDist = Math.abs((beat % 2) - 1);
      if (snareDist < 0.18) {
        const sEnv = Math.exp(-snareDist * 16);
        const noise = (Math.random() * 2 - 1) * sEnv * 0.25;
        const tone = Math.sin(2 * Math.PI * 220 * t) * sEnv * 0.15;
        snare = noise + tone;
      }

      let hihat = 0;
      const hatDist = (beat * 4) % 1;
      if (hatDist < 0.08) {
        hihat = (Math.random() * 2 - 1) * Math.exp(-hatDist * 35) * 0.08;
      }

      left[i] = Math.max(-0.95, Math.min(0.95, pad * 0.8 + bass + kick + snare + hihat * 0.7));
      right[i] = Math.max(-0.95, Math.min(0.95, pad * 0.85 + bass + kick + snare + hihat * 0.9));
    }
  } else if (style === "neosoul") {
    const chords = [
      [146.83, 174.61, 220.00, 261.63],
      [130.81, 164.81, 196.00, 246.94],
      [116.54, 146.83, 174.61, 220.00],
      [110.00, 138.59, 164.81, 220.00],
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatSec) % 16;
      const barIndex = Math.floor(beat / 4);
      const chord = chords[barIndex % 4];

      let rhodes = 0;
      const strokeDist = beat % 2;
      const rEnv = Math.exp(-strokeDist * 1.8);
      chord.forEach((freq) => {
        rhodes += (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t)) * rEnv * 0.06;
      });

      const rootFreq = chord[0] * 0.5;
      const bassEnv = Math.exp(-(beat % 1) * 2.2);
      const bass = Math.sin(2 * Math.PI * rootFreq * t) * bassEnv * 0.28;

      let drum = 0;
      const kDist = beat % 2;
      if (kDist < 0.2) drum += Math.sin(2 * Math.PI * 65 * t) * Math.exp(-kDist * 8) * 0.3;
      const rimDist = Math.abs((beat % 2) - 1);
      if (rimDist < 0.1) drum += (Math.random() * 2 - 1) * Math.exp(-rimDist * 25) * 0.15;

      left[i] = Math.max(-0.95, Math.min(0.95, rhodes + bass + drum));
      right[i] = Math.max(-0.95, Math.min(0.95, rhodes * 1.1 + bass + drum));
    }
  } else {
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const lfo = Math.sin(2 * Math.PI * 0.2 * t);
      const sub = Math.sin(2 * Math.PI * (55 + lfo * 2) * t) * 0.3;
      const saw = (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 221.5 * t)) * 0.09 * (1 + lfo * 0.3);
      const pulse = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-((t * 2) % 1) * 6) * 0.07;
      left[i] = sub + saw + pulse;
      right[i] = sub + saw * 1.1 - pulse * 0.8;
    }
  }

  return buffer;
}

export function generateSyntheticTrackAudio(style: "trap" | "neosoul" | "cyberpunk"): AudioBuffer {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  return generateSyntheticDemoTrack(ctx, style);
}

export const DEFAULT_DSP_METRICS: DspMetrics = {
  bpm: 138,
  detectedKey: "F-moll",
  rmsLevel: -14.2,
  peakDb: -0.8,
  spectralCentroid: 1850,
  dynamicRangeDb: 13.4,
};

export const INITIAL_DEMO_ANALYSIS: AudioAnalysis = {
  emotionalNarrative:
    "Ten numer brzmi jak samotna nocna jazda przez oświetlone neonami miasto o czwartej rano. Ciężki, gęsty sub-bas buduje intymny fundament, podczas gdy przestrzenne syntezatory i wokalny pogłos tworzą aurę tęsknoty i surowej melancholii.",
  moodKeywords: ["samotność", "nocny trans", "surowy bas", "przestrzeń", "melancholia", "cyberpunk"],
  detectedGenre: "Dark Melodic Trap / Phonk / Ambient Wave",
  estimatedKey: "F-moll (F Minor)",
  estimatedBpm: 138,
  energyContour: "Stopniowe budowanie napięcia od intymnego intro (30%) przez ciężki drop w zwrotce (75%) do kulminacyjnego refrenu (90%) i hipnotycznego wygaszenia.",
  sections: [
    {
      name: "Intro (Nocny Pustostan)",
      startSeconds: 0,
      endSeconds: 3.5,
      energy: 35,
      description: "Przestrzenne, zgaszone pady z filtrem dolnoprzepustowym i odległym pogłosem.",
    },
    {
      name: "Drop / Zwrotka 1 (Wejście Basu)",
      startSeconds: 3.5,
      endSeconds: 8.5,
      energy: 78,
      description: "Eksplozja subbasu 808, precyzyjne trapowe hi-haty i surowy groove rytmiczny.",
    },
    {
      name: "Bridge (Napięcie Harmoniczne)",
      startSeconds: 8.5,
      endSeconds: 12.0,
      energy: 60,
      description: "Zdjęcie stopy, filtracja harmoniczna, przejście w tonację Db-dur dające promyk nadziei.",
    },
    {
      name: "Refren / Kulminacja",
      startSeconds: 12.0,
      endSeconds: 16.0,
      energy: 92,
      description: "Pełny aranż z szerokimi warstwami syntezatorów i przesterowaną dynamiką.",
    },
  ],
  soundDesignBreakdown: {
    bass: "Syntetyczny 808 nasycony parzystymi harmonicznymi (saturacja taśmowa ~150Hz), z silnym fundamentem subbasowym 42-55Hz.",
    drums: "Krótka, klikająca stopa z punchy transjentem przy 3.2kHz i stłumiony clap z dodatkowym pogłosem plate.",
    vocals: "Wokal przetworzony formantowo (-2 semitony), zapięty w długi stereo shimmer reverb z duckingiem od stopy.",
    spaceFx: "Wielowymiarowy delay ping-pong w metrum 3/16 z nasyceniem analogowym.",
    synths: "Detunowany analogowy supersaw (4 głosy) z modulacją LFO na odcięciu filtra 24dB/oct.",
  },
  producerVerdict:
    "Brzmienie ma wspaniały, głęboki klimat, który natychmiast wciąga słuchacza. Warto jednak uważać na maskowanie w paśmie 250-400Hz między padem a basem — wycięcie 2dB w padzie sprawi, że cały dół zyska potężną czytelność.",
};

export const DEFAULT_ANALYSIS = INITIAL_DEMO_ANALYSIS;

export const INITIAL_STEMS: StemTrack[] = [
  {
    id: "stem-vocals",
    name: "Wokal Główny & Ad-liby",
    category: "vocal",
    color: "#ec4899",
    volume: 1.0,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 94,
    frequencyRange: "180 Hz - 14 kHz",
    suggestedFxChain: {
      eqTip: "High-pass na 110Hz, wycięcie 2.5dB przy 350Hz (usuwa puszkę), podbicie air +3dB na 12kHz.",
      compressorTip: "Opto-kompresor 4:1 z atakiem 15ms i release 100ms, redukcja 3-5dB.",
      spaceTip: "Wysyłka na stereo plate reverb (czas wybrzmienia 2.2s, predelay 25ms).",
    },
  },
  {
    id: "stem-drums",
    name: "Perkusja (Suma Drum Bus)",
    category: "drums",
    color: "#f59e0b",
    volume: 1.0,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 96,
    frequencyRange: "30 Hz - 18 kHz",
    suggestedFxChain: {
      eqTip: "Podbicie 60Hz dla ciężaru i 8kHz dla blasku talerzy.",
      compressorTip: "VCA Bus Compressor 2:1, atak 30ms, auto release, klejenie transjentów.",
      spaceTip: "Krótki ambient room (0.6s) tylko dla werbla.",
    },
  },
  {
    id: "stem-kick",
    name: "Stopa (Kick Sub & Transient)",
    category: "kick",
    color: "#ef4444",
    volume: 1.0,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 91,
    frequencyRange: "35 Hz - 4.5 kHz",
    suggestedFxChain: {
      eqTip: "Podbicie 55Hz (+2dB), nacięcie 300Hz (-3dB dla miejsca basu), klik 3.2kHz.",
      compressorTip: "Szybki limiter szczytowy zapobiegający przesterowaniu.",
      spaceTip: "Czyste mono, brak pogłosu.",
    },
  },
  {
    id: "stem-snare",
    name: "Werbel & Clap",
    category: "snare",
    color: "#f97316",
    volume: 0.95,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 89,
    frequencyRange: "150 Hz - 12 kHz",
    suggestedFxChain: {
      eqTip: "Pudło na 200Hz, chrupkość przy 4.5kHz.",
      compressorTip: "FET / 1176 Styl: szybki atak, 4:1 dla mocnego strzału.",
      spaceTip: "Gated reverb w klimacie lat 80 lub vintage plate.",
    },
  },
  {
    id: "stem-hihat",
    name: "Hi-haty & Perkusjonalia",
    category: "hihat",
    color: "#fbbf24",
    volume: 0.85,
    pan: 0.2,
    mute: false,
    solo: false,
    confidencePercent: 92,
    frequencyRange: "3.5 kHz - 20 kHz",
    suggestedFxChain: {
      eqTip: "High-pass na 400Hz, nasycenie taśmowe.",
      compressorTip: "Lekka kompresja optyczna wyrównująca velocity.",
      spaceTip: "Szeroka panorama stereo LCR.",
    },
  },
  {
    id: "stem-bass",
    name: "Bas & Sub 808",
    category: "bass",
    color: "#8b5cf6",
    volume: 1.1,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 95,
    frequencyRange: "28 Hz - 600 Hz",
    suggestedFxChain: {
      eqTip: "Sub-fundament 42Hz, saturacja nasycająca drugą harmoniczną przy 90Hz.",
      compressorTip: "Sidechain ducking sterowany stopą (kick) na 3dB redukcji.",
      spaceTip: "Mono poniżej 120Hz.",
    },
  },
  {
    id: "stem-synths",
    name: "Syntezatory & Arpeggia",
    category: "synths",
    color: "#06b6d4",
    volume: 0.9,
    pan: -0.15,
    mute: false,
    solo: false,
    confidencePercent: 88,
    frequencyRange: "200 Hz - 15 kHz",
    suggestedFxChain: {
      eqTip: "Wycięcie dołu poniżej 180Hz, stereo widener powyżej 2kHz.",
      compressorTip: "Dynamiczny EQ na 400Hz tłumiący rezonanse.",
      spaceTip: "Chorus trójfazowy + tape delay.",
    },
  },
  {
    id: "stem-fx",
    name: "Efekty, Tło & Dźwięki Otoczenia",
    category: "fx",
    color: "#10b981",
    volume: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    confidencePercent: 85,
    frequencyRange: "50 Hz - 18 kHz",
    suggestedFxChain: {
      eqTip: "Telefonowy filtr bandpass (400Hz - 3.5kHz) dla klimatu lo-fi.",
      compressorTip: "Pump compressor dla efektu oddychania.",
      spaceTip: "100% Wet lush shimmer.",
    },
  },
];

export const DEFAULT_STEMS = INITIAL_STEMS;

export const INITIAL_MIDI_NOTES: MidiNote[] = [
  { id: "m1", pitch: 41, noteName: "F2", startTime: 0, duration: 4, velocity: 100 },
  { id: "m2", pitch: 53, noteName: "F3", startTime: 0, duration: 4, velocity: 85 },
  { id: "m3", pitch: 56, noteName: "Ab3", startTime: 0, duration: 4, velocity: 80 },
  { id: "m4", pitch: 60, noteName: "C4", startTime: 0, duration: 4, velocity: 85 },
  { id: "m5", pitch: 63, noteName: "Eb4", startTime: 0, duration: 4, velocity: 90 },
  { id: "m6", pitch: 67, noteName: "G4", startTime: 0, duration: 4, velocity: 95 },

  { id: "m7", pitch: 44, noteName: "Ab2", startTime: 4, duration: 4, velocity: 95 },
  { id: "m8", pitch: 56, noteName: "Ab3", startTime: 4, duration: 4, velocity: 85 },
  { id: "m9", pitch: 60, noteName: "C4", startTime: 4, duration: 4, velocity: 85 },
  { id: "m10", pitch: 63, noteName: "Eb4", startTime: 4, duration: 4, velocity: 85 },
  { id: "m11", pitch: 67, noteName: "G4", startTime: 4, duration: 4, velocity: 90 },

  { id: "m12", pitch: 37, noteName: "Db2", startTime: 8, duration: 4, velocity: 100 },
  { id: "m13", pitch: 49, noteName: "Db3", startTime: 8, duration: 4, velocity: 85 },
  { id: "m14", pitch: 53, noteName: "F3", startTime: 8, duration: 4, velocity: 80 },
  { id: "m15", pitch: 56, noteName: "Ab3", startTime: 8, duration: 4, velocity: 85 },
  { id: "m16", pitch: 60, noteName: "C4", startTime: 8, duration: 4, velocity: 90 },
  { id: "m17", pitch: 63, noteName: "Eb4", startTime: 8, duration: 4, velocity: 95 },

  { id: "m18", pitch: 39, noteName: "Eb2", startTime: 12, duration: 2, velocity: 95 },
  { id: "m19", pitch: 51, noteName: "Eb3", startTime: 12, duration: 2, velocity: 85 },
  { id: "m20", pitch: 56, noteName: "Ab3", startTime: 12, duration: 2, velocity: 80 },
  { id: "m21", pitch: 58, noteName: "Bb3", startTime: 12, duration: 2, velocity: 85 },
  { id: "m22", pitch: 63, noteName: "Eb4", startTime: 12, duration: 2, velocity: 90 },

  { id: "m23", pitch: 36, noteName: "C2", startTime: 14, duration: 2, velocity: 100 },
  { id: "m24", pitch: 48, noteName: "C3", startTime: 14, duration: 2, velocity: 85 },
  { id: "m25", pitch: 52, noteName: "E3", startTime: 14, duration: 2, velocity: 85 },
  { id: "m26", pitch: 55, noteName: "G3", startTime: 14, duration: 2, velocity: 85 },
  { id: "m27", pitch: 58, noteName: "Bb3", startTime: 14, duration: 2, velocity: 95 },
];

export const INITIAL_CHORD_VARIATIONS: ChordVariation[] = [
  {
    name: "Wariant 1: Mroczny Kinowy (Cinematic Darkness)",
    chords: ["Fm9", "Abmaj7", "Dbmaj9", "C7alt"],
    romanNumerals: "i9 - IIImaj7 - VImaj9 - V7alt",
    emotionalReasoning:
      "Tritonowe napięcie w akordzie dominantowym C7alt tworzy potężną chęć powrotu do Fm9, wzmagając poczucie niepokoju i filmowego dramatyzmu.",
    midiNotes: [
      ["F2", "Ab3", "C4", "Eb4", "G4"],
      ["Ab2", "C4", "Eb4", "G4"],
      ["Db2", "F3", "Ab3", "C4", "Eb4"],
      ["C2", "E3", "Bb3", "Db4", "Ab4"],
    ],
    recommendedBassline: "F1 -> Ab1 -> Db1 -> C1 z akcentami synkopowanymi",
  },
  {
    name: "Wariant 2: Neo-Soul & Jazzowe Napięcie",
    chords: ["Fm11", "Bbm9", "Eb13", "Abmaj9#11"],
    romanNumerals: "i11 - iv9 - VII13 - IIImaj9#11",
    emotionalReasoning:
      "Interwał kwarty zwiększonej (#11) w Abmaj9 wprowadza eteryczną przestrzeń, przypominającą nowoczesne produkcje D'Angelo czy Thundercata.",
    midiNotes: [
      ["F2", "Ab3", "Bb3", "Eb4", "G4"],
      ["Bb2", "Db3", "F3", "Ab3", "C4"],
      ["Eb2", "G3", "Db4", "F4", "C5"],
      ["Ab2", "C3", "G3", "D4", "Eb4"],
    ],
    recommendedBassline: "F1 -> F2 -> Bb1 -> Eb1 -> Ab1",
  },
  {
    name: "Wariant 3: Epicki i Podnoszący na Duchu",
    chords: ["Dbmaj7", "Eb", "Fm7", "Ab/C"],
    romanNumerals: "VImaj7 - VII - i7 - III6",
    emotionalReasoning:
      "Rozpoczęcie od subdominantowego Dbmaj7 przenosi słuchacza w stan uniesienia, dając poczucie przełamania mroku i walki o zwycięstwo.",
    midiNotes: [
      ["Db2", "F3", "Ab3", "C4"],
      ["Eb2", "G3", "Bb3", "Eb4"],
      ["F2", "Ab3", "C4", "Eb4"],
      ["C2", "Ab3", "C4", "Eb4"],
    ],
    recommendedBassline: "Db1 -> Eb1 -> F1 -> C1",
  },
  {
    name: "Wariant 4: Hipnotyczny Nocny Trans (2-Chord Loop)",
    chords: ["Fm9", "Dbmaj7#11", "Fm9", "Bbm7/Db"],
    romanNumerals: "i9 - VImaj7#11 - i9 - iv7",
    emotionalReasoning:
      "Minimalistyczna wymiana dwóch biegunów harmonicznych tworzy transowy stan skupienia idealny pod nocną jazdę i hipnotyczny flow wokalny.",
    midiNotes: [
      ["F2", "C3", "Eb3", "G3", "Ab3"],
      ["Db2", "Ab2", "F3", "G3", "C4"],
      ["F2", "C3", "Eb3", "G3", "Ab3"],
      ["Db2", "Bb2", "Db3", "F3", "Ab3"],
    ],
    recommendedBassline: "F1 (pedal point) -> Db1 z przejściem na C1",
  },
];

export const STATIC_SCHOOL_LESSONS: SchoolLesson[] = [
  {
    id: "lesson-1",
    title: "Jak zbudowany jest ten beat? Anatomia transjentów i fundamentu",
    level: "Producent",
    summary:
      "Poznaj relację między stopą a subbasem w utworze i dowiedz się, jak uzyskać maksymalny punch bez przesterowania sumy miksu.",
    coreTheory:
      "Stopa (Kick) operuje w dwóch kluczowych obszarach: klik uderzenia (transjent 2-4 kHz) oraz ciało (50-70 Hz). Subbas (808) wypełnia fundament 30-55 Hz. Gdy grają w tej samej milisekundzie, dochodzi do znoszenia fazy.",
    practicalSteps: [
      {
        stepNumber: 1,
        title: "Dostrojenie tonacji stopy do utworu",
        instruction: "Upewnij się, że ton podstawowy stopy współgra z tonacją F-moll (F1 = 43.65 Hz lub C1 = 32.7 Hz).",
        technicalSetting: "Pitch shift w samplerze: +/- semitony, monitoruj analizatorem widma.",
        proTip: "Nie używaj sampli stopy w innej tonacji, bo dół miksu będzie brzmiał brudno.",
      },
      {
        stepNumber: 2,
        title: "Sidechain Ducking na basie",
        instruction: "Ustaw kompresor na ścieżce basu 808 ze sterowaniem z szyny Kick.",
        technicalSetting: "Ratio 4:1, Attack 0.5ms, Release dopasowany do tempa (ok. 65ms przy 138 BPM). Redukcja: 4 dB.",
        proTip: "Automatyzacja wyciszenia (Volume Shaper) często daje czystszy rezultat niż tradycyjny kompresor.",
      },
      {
        stepNumber: 3,
        title: "Saturacja harmoniczna dla małych głośników",
        instruction: "Zastosuj saturator taśmowy lub przester lampowy na basie, generując 2. i 3. harmoniczną (100-250 Hz).",
        technicalSetting: "Drive +3.5dB, filtr górnoprzepustowy saturatora na 80Hz (nasycaj tylko środek basu).",
        proTip: "Dzięki temu bas będzie potężnie słyszalny nawet na głośniku telefonu.",
      },
    ],
    listeningExercise: "Załóż słuchawki, wycisz wszystkie instrumenty oprócz stopy i basu. Sprawdź, czy każde uderzenie stopy ma wyraźny punkt ataku, a bas płynnie rozwija się ułamki sekund później.",
    audioExampleType: "sub_808",
  },
  {
    id: "lesson-2",
    title: "Dlaczego ta progresja wzbudza melancholię i dreszcze?",
    level: "Początkujący",
    summary:
      "Zbadaj psychologię akordów nonowych i septymowych w F-moll oraz dowiedz się, jak interwały przekładają się na ludzkie emocje.",
    coreTheory:
      "Dodanie nony (9th, interwał 2 sekund wielkich powyżej prymy) do akordu molowego (Fm9) wprowadza słodko-gorzkie napięcie. Nie jest to czysty smutek, lecz tęsknota i nostalgia.",
    practicalSteps: [
      {
        stepNumber: 1,
        title: "Budowa akordu Fm9 na klawiaturze",
        instruction: "Zagraj w lewej ręce prymę F1 i kwintę C2. W prawej ręce zagraj tercję małą Ab3, kwintę C4, septymę Eb4 i nonę G4.",
        technicalSetting: "Dźwięki: F - C - Ab - C - Eb - G.",
        proTip: "Pominięcie prymy w prawej ręce (tzw. rootless voicing) daje aksamitne, profesjonalne brzmienie.",
      },
      {
        stepNumber: 2,
        title: "Przejście na akord Dbmaj9 (Światło w mroku)",
        instruction: "Zmień bas na Db. Zauważ, jak ten sam zestaw dźwięków (F, Ab, C, Eb) z basem Db staje się ciepłym akordem durowym.",
        technicalSetting: "Relacja submedianty (VI stopień skali).",
        proTip: "To klasyczny zabieg w kinowych balladach i nowoczesnym trapie.",
      },
    ],
    listeningExercise: "Przełącz się do modułu MIDI Lab i kliknij 'Odtwórz wariację 2'. Skup się na momencie wejścia akordu z septymą.",
    audioExampleType: "rhodes_chords",
  },
  {
    id: "lesson-3",
    title: "Sztuka Przestrzeni: Jak ustawić wokal w miksie, by nie zginął",
    level: "Inżynier",
    summary:
      "Kompleksowy poradnik realizacji wokalu: od de-maskingu po wysyłki delay z duckingiem.",
    coreTheory:
      "Wokal potrzebuje pierwszego planu. Zamiast zapinać pogłos bezpośrednio na ścieżce (co oddala wokal i rozmywa intymność), używamy wysyłek Aux z kompresją sidechain.",
    practicalSteps: [
      {
        stepNumber: 1,
        title: "Rzeźbienie miejsca w instrumentale",
        instruction: "Wytnij wąskim filtrem dzwonowym (Q=2.5) 1.5-2.5 dB w paśmie 1.5 kHz - 3.5 kHz na sumie syntezatorów.",
        technicalSetting: "EQ dynamiczny reagujący na obecność wokalu.",
        proTip: "W ten sposób wokal siedzi idealnie w miksie bez podbijania jego głośności.",
      },
      {
        stepNumber: 2,
        title: "Plate Reverb z Predelay 30ms",
        instruction: "Ustaw predelay w pogłosie na 25-35ms. Pozwala to na wybrzmienie czystego głosu zanim pojawi się ogon pogłosu.",
        technicalSetting: "Predelay: 30ms, Decay: 2.4s, Low Cut: 200Hz, High Cut: 6kHz.",
        proTip: "Zawsze odcinaj dół i górę pogłosu, aby nie zabrudzić miksu.",
      },
    ],
    listeningExercise: "W module Mix i Mastering włącz podgląd zaleceń 'Popraw czytelność wokalu' i odsłuchaj różnicę w czytelności sybilantów.",
    audioExampleType: "vocal_plate",
  },
  {
    id: "lesson-4",
    title: "Mastering pod serwisy streamingowe: -14 LUFS bez utraty dynamiki",
    level: "Eksperymentator",
    summary:
      "Jak uzyskać głośny, zwarty i punchy master, który zachowa transjenty i nie zostanie zniekształcony przez algorytmy Spotify i Apple Music.",
    coreTheory:
      "Limiter to ostatnia linia obrony. Prawdziwa głośność i energia pochodzi z nasycania (clipper) szczytów perkusji przed wejściem w limiter.",
    practicalSteps: [
      {
        stepNumber: 1,
        title: "Soft Clipper przed Limiterem",
        instruction: "Odetnij najkrótsze transjenty stopy i werbla (1-2 dB) za pomocą soft clippera.",
        technicalSetting: "Soft Knee, Ceiling -0.5 dBTP.",
        proTip: "Clipper ścina szczyty bez pompowania całego miksu.",
      },
      {
        stepNumber: 2,
        title: "Kontrola True Peak na poziomie -1.0 dBTP",
        instruction: "Ustaw True Peak Ceiling na -1.0 dBFS, aby uniknąć zniekształceń inter-sample podczas konwersji do AAC/MP3.",
        technicalSetting: "True Peak Limiter: Ceiling -1.0 dBTP, Target Integrated LUFS: -13.5 do -14.0.",
        proTip: "Algorytmy loudness normalization nie obniżą wtedy Twojego numeru.",
      },
    ],
    listeningExercise: "Zwróć uwagę na spójność dynamiki w module Miks i Mastering. Sprawdź miernik True Peak.",
    audioExampleType: "mastering_chain",
  },
];
