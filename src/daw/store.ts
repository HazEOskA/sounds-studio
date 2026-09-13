import { useSyncExternalStore } from "react";
import {
  createDefaultDawProject,
  loadDawProject,
  normalizeDawProject,
  saveDawProject,
} from "./project";
import { DawChannel, DawProject } from "./types";

type ProjectUpdater = (project: DawProject) => DawProject;
type ChannelUpdater = (channel: DawChannel) => DawChannel;
type Listener = () => void;

const listeners = new Set<Listener>();

function getInitialProject(): DawProject {
  if (typeof window === "undefined") return createDefaultDawProject();
  return loadDawProject() || createDefaultDawProject();
}

let currentProject = getInitialProject();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function commitProject(next: DawProject): DawProject {
  currentProject = normalizeDawProject({
    ...next,
    updatedAt: new Date().toISOString(),
  });
  emitChange();
  return currentProject;
}

export const dawProjectStore = {
  getSnapshot: () => currentProject,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useDawProject(): DawProject {
  return useSyncExternalStore(
    dawProjectStore.subscribe,
    dawProjectStore.getSnapshot,
    dawProjectStore.getSnapshot
  );
}

export function updateDawProject(updater: ProjectUpdater): DawProject {
  return commitProject(updater(currentProject));
}

export function updateDawChannel(channelId: string, updater: ChannelUpdater): DawProject {
  return updateDawProject((project) => ({
    ...project,
    channels: project.channels.map((channel) =>
      channel.id === channelId ? updater(channel) : channel
    ),
  }));
}

export function toggleDawStep(channelId: string, stepIndex: number): DawProject {
  return updateDawChannel(channelId, (channel) => ({
    ...channel,
    steps: channel.steps.map((active, index) =>
      index === stepIndex ? !active : active
    ),
  }));
}

export function setDawBpm(value: number): DawProject {
  const bpm = Math.max(40, Math.min(240, Number.isFinite(value) ? value : 138));
  return updateDawProject((project) => ({ ...project, bpm }));
}

export function saveSharedDawProject(): DawProject {
  currentProject = saveDawProject(currentProject);
  emitChange();
  return currentProject;
}

export function loadSharedDawProject(): DawProject | null {
  const loaded = loadDawProject();
  if (!loaded) return null;
  currentProject = normalizeDawProject(loaded);
  emitChange();
  return currentProject;
}

export function resetSharedDawProject(): DawProject {
  currentProject = createDefaultDawProject();
  emitChange();
  return currentProject;
}
