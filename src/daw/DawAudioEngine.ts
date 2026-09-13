import { DawChannel, DawProject } from "./types";

interface ChannelNodes {
  gain: GainNode;
  pan: StereoPannerNode;
}

class DawAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channelNodes = new Map<string, ChannelNodes>();
  private project: DawProject | null = null;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private nextStepIndex = 0;
  private isPlayingState = false;
  private onStepCallback: ((step: number) => void) | null = null;
  private scheduledNodes = new Set<AudioScheduledSourceNode>();

  private readonly lookAheadMs = 25;
  private readonly scheduleAheadSeconds = 0.12;

  public async init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  public async play(project: DawProject, onStep?: (step: number) => void) {
    await this.init();
    if (!this.ctx) return;

    if (this.isPlayingState) {
      this.stop();
    }

    this.project = project;
    this.onStepCallback = onStep || null;
    this.syncMixer(project);
    this.nextStepIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.isPlayingState = true;
    this.scheduler();
    this.schedulerTimer = window.setInterval(() => this.scheduler(), this.lookAheadMs);
  }

  public stop() {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    this.scheduledNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // already finished
      }
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    });
    this.scheduledNodes.clear();

    this.isPlayingState = false;
    this.nextStepIndex = 0;
    this.onStepCallback?.(-1);
  }

  public updateProject(project: DawProject) {
    this.project = project;
    this.syncMixer(project);
  }

  public async triggerChannel(channelId: string, project?: DawProject) {
    const targetProject = project || this.project;
    if (!targetProject) return;

    await this.init();
    if (!this.ctx) return;

    this.project = targetProject;
    this.syncMixer(targetProject);

    const channel = targetProject.channels.find((item) => item.id === channelId);
    if (!channel) return;

    const anySolo = targetProject.channels.some((item) => item.solo);
    if (channel.mute || (anySolo && !channel.solo)) return;

    this.scheduleSound(channel, this.ctx.currentTime + 0.01);
  }

  public setMasterVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      Math.max(0, Math.min(1.5, volume)),
      this.ctx.currentTime,
      0.015
    );
  }

  public syncMixer(project: DawProject) {
    if (!this.ctx || !this.masterGain) return;
    const anySolo = project.channels.some((channel) => channel.solo);

    project.channels.forEach((channel) => {
      const nodes = this.ensureChannelNodes(channel.id);
      let targetVolume = channel.volume;
      if (channel.mute) targetVolume = 0;
      if (anySolo && !channel.solo) targetVolume = 0;

      nodes.gain.gain.setTargetAtTime(targetVolume, this.ctx!.currentTime, 0.01);
      nodes.pan.pan.setTargetAtTime(channel.pan, this.ctx!.currentTime, 0.01);
    });
  }

  public isPlaying() {
    return this.isPlayingState;
  }

  private scheduler() {
    if (!this.ctx || !this.project || !this.isPlayingState) return;

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadSeconds) {
      const stepToSchedule = this.nextStepIndex;
      const timeToSchedule = this.nextStepTime;
      this.scheduleStep(stepToSchedule, timeToSchedule, this.project);

      const visualDelayMs = Math.max(0, (timeToSchedule - this.ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (this.isPlayingState) this.onStepCallback?.(stepToSchedule);
      }, visualDelayMs);

      const secondsPerSixteenth = 60 / this.project.bpm / 4;
      this.nextStepTime += secondsPerSixteenth;
      this.nextStepIndex = (this.nextStepIndex + 1) % 16;
    }
  }

  private scheduleStep(step: number, when: number, project: DawProject) {
    const anySolo = project.channels.some((channel) => channel.solo);

    project.channels.forEach((channel) => {
      if (!channel.steps[step]) return;
      if (channel.mute) return;
      if (anySolo && !channel.solo) return;
      this.scheduleSound(channel, when);
    });
  }

  private scheduleSound(channel: DawChannel, when: number) {
    if (!this.ctx) return;
    const nodes = this.ensureChannelNodes(channel.id);

    if (channel.soundType === "kick") {
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.frequency.setValueAtTime(150, when);
      osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
      amp.gain.setValueAtTime(1, when);
      amp.gain.exponentialRampToValueAtTime(0.001, when + 0.32);
      osc.connect(amp);
      amp.connect(nodes.gain);
      this.trackSource(osc);
      osc.start(when);
      osc.stop(when + 0.34);
      return;
    }

    if (channel.soundType === "bass808") {
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, when);
      osc.frequency.exponentialRampToValueAtTime(42, when + 0.42);
      amp.gain.setValueAtTime(0.9, when);
      amp.gain.exponentialRampToValueAtTime(0.001, when + 0.62);
      osc.connect(amp);
      amp.connect(nodes.gain);
      this.trackSource(osc);
      osc.start(when);
      osc.stop(when + 0.64);
      return;
    }

    const noiseDuration = channel.soundType === "hihat" ? 0.07 : 0.18;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseDuration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();

    if (channel.soundType === "hihat") {
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, when);
      amp.gain.setValueAtTime(0.38, when);
      amp.gain.exponentialRampToValueAtTime(0.001, when + noiseDuration);
    } else {
      filter.type = "highpass";
      filter.frequency.setValueAtTime(900, when);
      amp.gain.setValueAtTime(0.72, when);
      amp.gain.exponentialRampToValueAtTime(0.001, when + noiseDuration);
    }

    source.connect(filter);
    filter.connect(amp);
    amp.connect(nodes.gain);
    this.trackSource(source);
    source.start(when);
    source.stop(when + noiseDuration + 0.01);
  }

  private ensureChannelNodes(channelId: string): ChannelNodes {
    const existing = this.channelNodes.get(channelId);
    if (existing) return existing;
    if (!this.ctx || !this.masterGain) {
      throw new Error("DAW Audio Engine nie jest zainicjalizowany");
    }

    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    gain.connect(pan);
    pan.connect(this.masterGain);

    const nodes = { gain, pan };
    this.channelNodes.set(channelId, nodes);
    return nodes;
  }

  private trackSource(source: AudioScheduledSourceNode) {
    this.scheduledNodes.add(source);
    source.addEventListener("ended", () => {
      this.scheduledNodes.delete(source);
      try {
        source.disconnect();
      } catch {
        // already disconnected
      }
    });
  }
}

export const dawAudioEngine = new DawAudioEngine();
