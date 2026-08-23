export interface EmotionSliders {
  energy: number; // 0-100
  darkness: number; // 0-100
  melancholy: number; // 0-100
  hope: number; // 0-100
  aggression: number; // 0-100
  space: number; // 0-100
  rawness: number; // 0-100
  experimental?: number; // 0-100
  experimentation?: number; // 0-100
}

export interface SongSection {
  name: string;
  startSeconds: number;
  endSeconds: number;
  energy: number;
  description: string;
}

export interface SoundDesignBreakdown {
  bass: string;
  drums: string;
  vocals: string;
  spaceFx?: string;
  synths?: string;
}

export interface AudioAnalysis {
  emotionalNarrative: string;
  moodKeywords: string[];
  detectedGenre: string;
  estimatedKey: string;
  estimatedBpm: number;
  energyContour: string;
  sections: SongSection[];
  soundDesignBreakdown: SoundDesignBreakdown;
  producerVerdict: string;
  timestampGenerated?: string;
}

export interface DspMetrics {
  bpm: number;
  detectedKey: string;
  rmsLevel: number;
  peakDb: number;
  spectralCentroid: number;
  dynamicRangeDb: number;
}

export interface StemTrack {
  id: string;
  name: string;
  category: "vocal" | "drums" | "kick" | "snare" | "hihat" | "bass" | "piano" | "synths" | "guitars" | "fx";
  color: string;
  volume: number; // 0 to 1.5
  pan: number; // -1 to 1
  mute: boolean;
  solo: boolean;
  confidencePercent: number;
  frequencyRange: string;
  suggestedFxChain: {
    eqTip: string;
    compressorTip: string;
    spaceTip: string;
  };
  audioBuffer?: AudioBuffer | null;
  audioUrl?: string;
}

export interface MidiNote {
  id: string;
  pitch: number; // 21 to 108 (A0 to C8)
  noteName: string;
  startTime: number; // in beats or seconds
  duration: number; // in beats or seconds
  velocity: number; // 0 to 127
}

export interface ChordVariation {
  name: string;
  chords: string[];
  romanNumerals: string;
  emotionalReasoning: string;
  midiNotes: string[][];
  recommendedBassline: string;
}

export interface MidiLabData {
  scale: string;
  rootKey: string;
  bpm: number;
  notes: MidiNote[];
  variations: ChordVariation[];
  scaleExplanation?: string;
}

export interface GeneratedBrief {
  suggestedTitle: string;
  tagline: string;
  targetBpm: number;
  targetKey: string;
  aiMusicPrompt: string;
  instrumentRoles?: Array<{
    instrument: string;
    role: string;
    character: string;
  }>;
  structurePlan: Array<{
    section: string;
    bars: number;
    description: string;
    chords: string;
  }>;
  vocalCues: string;
  lyrics: string;
  mixVibe: string;
}

export type MusicBrief = GeneratedBrief;

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  timestamp: number;
  text: string;
  category?: "emotional" | "technical" | "both";
  timestampReference?: number;
  suggestedDAWAction?: string;
}

export interface EqBand {
  type: "lowpass" | "highpass" | "peaking" | "lowshelf" | "highshelf";
  frequencyHz: number;
  gainDb: number;
  q: number;
  purpose: string;
}

export interface MixSettings {
  eq: {
    low: number;
    lowMid: number;
    mid: number;
    highMid: number;
    high: number;
  };
  compressorThreshold: number;
  compressorRatio: number;
  saturationDrive: number;
  stereoWidth: number;
}

export interface MixRecommendation {
  explanation: string;
  recommendedEq?: {
    low: number;
    lowMid: number;
    mid: number;
    highMid: number;
    high: number;
  };
  keyFixes?: string[];
  targetSummary?: string;
  eqBands?: EqBand[];
  dynamics?: {
    compressorRatio: string;
    thresholdDb: number;
    attackMs: number;
    releaseMs: number;
    makeupGainDb: number;
    saturationType: string;
    saturationDrive: number;
  };
  spatialFx?: {
    reverbType: string;
    reverbDecaySec: number;
    predelayMs: number;
    stereoWidthPercent: number;
    sidechainSource: string;
  };
  masterLoudnessTarget?: {
    targetLufs: number;
    truePeakDb: number;
    dynamicRange: string;
  };
  actionableChecklist?: string[];
}

export interface SchoolLesson {
  id: string;
  title: string;
  level: "Początkujący" | "Producent" | "Inżynier" | "Eksperymentator";
  summary: string;
  coreTheory: string;
  practicalSteps: Array<{
    stepNumber: number;
    title: string;
    instruction: string;
    technicalSetting: string;
    proTip: string;
  }>;
  listeningExercise: string;
  audioExampleType: string;
}

export interface LoopSlice {
  id: string;
  startSec: number;
  endSec: number;
  label: string;
  color: string;
  pitchShiftSemitones: number;
}
