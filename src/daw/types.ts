export type DawSoundType = "kick" | "snare" | "hihat" | "bass808";

export interface DawChannel {
  id: string;
  name: string;
  color: string;
  soundType: DawSoundType;
  volume: number; // 0..1.5
  pan: number; // -1..1
  mute: boolean;
  solo: boolean;
  steps: boolean[]; // exactly 16 steps in Slice 1
}

export interface DawProject {
  version: 1;
  id: string;
  name: string;
  bpm: number;
  channels: DawChannel[];
  updatedAt: string;
}

export interface DawTransportSnapshot {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
}
