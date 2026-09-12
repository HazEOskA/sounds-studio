import { DawChannel, DawProject, DawSoundType } from "./types";

export const DAW_PROJECT_STORAGE_KEY = "osa-soul:daw-dev:v1";
export const DAW_STEPS = 16;

const makeSteps = (active: number[]) =>
  Array.from({ length: DAW_STEPS }, (_, index) => active.includes(index));

const makeChannel = (
  id: string,
  name: string,
  color: string,
  soundType: DawSoundType,
  activeSteps: number[]
): DawChannel => ({
  id,
  name,
  color,
  soundType,
  volume: 0.9,
  pan: 0,
  mute: false,
  solo: false,
  steps: makeSteps(activeSteps),
});

export function createDefaultDawProject(): DawProject {
  return {
    version: 1,
    id: `osa-daw-${Date.now()}`,
    name: "OSA SOUL - DAW DEV Project",
    bpm: 138,
    updatedAt: new Date().toISOString(),
    channels: [
      makeChannel("kick", "Kick", "#FFB300", "kick", [0, 8]),
      makeChannel("snare", "Snare / Clap", "#8B5CF6", "snare", [4, 12]),
      makeChannel("hihat", "Hi-Hat", "#22D3EE", "hihat", [0, 2, 4, 6, 8, 10, 12, 14, 15]),
      makeChannel("bass808", "808 Sub", "#EF4444", "bass808", [0, 6, 14]),
    ],
  };
}

export function normalizeDawProject(input: unknown): DawProject {
  if (!input || typeof input !== "object") {
    return createDefaultDawProject();
  }

  const source = input as Partial<DawProject>;
  const defaults = createDefaultDawProject();
  const rawChannels = Array.isArray(source.channels) ? source.channels : defaults.channels;

  const channels = rawChannels.slice(0, 4).map((raw, index) => {
    const fallback = defaults.channels[index] || defaults.channels[0];
    const channel = (raw || {}) as Partial<DawChannel>;
    const steps = Array.isArray(channel.steps)
      ? Array.from({ length: DAW_STEPS }, (_, stepIndex) => Boolean(channel.steps?.[stepIndex]))
      : fallback.steps;

    return {
      id: typeof channel.id === "string" ? channel.id : fallback.id,
      name: typeof channel.name === "string" ? channel.name : fallback.name,
      color: typeof channel.color === "string" ? channel.color : fallback.color,
      soundType: ["kick", "snare", "hihat", "bass808"].includes(String(channel.soundType))
        ? (channel.soundType as DawSoundType)
        : fallback.soundType,
      volume: clampNumber(channel.volume, 0, 1.5, fallback.volume),
      pan: clampNumber(channel.pan, -1, 1, fallback.pan),
      mute: Boolean(channel.mute),
      solo: Boolean(channel.solo),
      steps,
    };
  });

  while (channels.length < 4) {
    channels.push(defaults.channels[channels.length]);
  }

  return {
    version: 1,
    id: typeof source.id === "string" ? source.id : defaults.id,
    name: typeof source.name === "string" ? source.name : defaults.name,
    bpm: Math.round(clampNumber(source.bpm, 40, 240, defaults.bpm)),
    channels,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
  };
}

export function saveDawProject(project: DawProject): DawProject {
  const snapshot = normalizeDawProject({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  window.localStorage.setItem(DAW_PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function loadDawProject(): DawProject | null {
  try {
    const raw = window.localStorage.getItem(DAW_PROJECT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeDawProject(JSON.parse(raw));
  } catch (error) {
    console.warn("Nie udało się odczytać projektu DAW DEV z localStorage", error);
    return null;
  }
}

export function clearSavedDawProject() {
  window.localStorage.removeItem(DAW_PROJECT_STORAGE_KEY);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}
