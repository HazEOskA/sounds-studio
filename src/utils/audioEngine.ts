import { EqBand } from "../types";

/**
 * OSA SOUL STUDIO - Core Web Audio API Engine
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // 5-band parametric EQ filters
  private eqFilters: BiquadFilterNode[] = [];
  private eqBypassed: boolean = false;

  // Active audio buffer playback
  private currentBuffer: AudioBuffer | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private isPlayingState: boolean = false;
  private loopEnabled: boolean = false;
  private loopStart: number = 0;
  private loopEnd: number = 0;

  // Stem multi-channel nodes
  private stemNodes: Map<string, { gain: GainNode; pan: StereoPannerNode; filter: BiquadFilterNode }> = new Map();

  // Listeners
  private onTimeUpdateCallbacks: Set<(time: number, duration: number) => void> = new Set();
  private onEndedCallbacks: Set<() => void> = new Set();
  private animFrameId: number | null = null;

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

      // Analyser Node
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.85;

      // Dynamic Compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Build 5-band Parametric EQ
      this.initEqChain();

      // Connect Master chain: [EQ Output] -> [Compressor] -> [MasterGain] -> [Analyser] -> [Destination]
      const lastEq = this.eqFilters[this.eqFilters.length - 1];
      lastEq.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private initEqChain() {
    if (!this.ctx) return;
    this.eqFilters = [];

    // Band 0: Low Shelf (80 Hz)
    const band0 = this.ctx.createBiquadFilter();
    band0.type = "lowshelf";
    band0.frequency.setValueAtTime(80, this.ctx.currentTime);
    band0.gain.setValueAtTime(0, this.ctx.currentTime);

    // Band 1: Low Mid Peaking (250 Hz)
    const band1 = this.ctx.createBiquadFilter();
    band1.type = "peaking";
    band1.frequency.setValueAtTime(250, this.ctx.currentTime);
    band1.Q.setValueAtTime(1.0, this.ctx.currentTime);
    band1.gain.setValueAtTime(0, this.ctx.currentTime);

    // Band 2: Mid Peaking (1000 Hz)
    const band2 = this.ctx.createBiquadFilter();
    band2.type = "peaking";
    band2.frequency.setValueAtTime(1000, this.ctx.currentTime);
    band2.Q.setValueAtTime(1.0, this.ctx.currentTime);
    band2.gain.setValueAtTime(0, this.ctx.currentTime);

    // Band 3: High Mid Peaking (4500 Hz)
    const band3 = this.ctx.createBiquadFilter();
    band3.type = "peaking";
    band3.frequency.setValueAtTime(4500, this.ctx.currentTime);
    band3.Q.setValueAtTime(1.0, this.ctx.currentTime);
    band3.gain.setValueAtTime(0, this.ctx.currentTime);

    // Band 4: High Shelf (12000 Hz)
    const band4 = this.ctx.createBiquadFilter();
    band4.type = "highshelf";
    band4.frequency.setValueAtTime(12000, this.ctx.currentTime);
    band4.gain.setValueAtTime(0, this.ctx.currentTime);

    // Chain them in series
    band0.connect(band1);
    band1.connect(band2);
    band2.connect(band3);
    band3.connect(band4);

    this.eqFilters = [band0, band1, band2, band3, band4];
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    this.init();
    if (!this.ctx) throw new Error("AudioContext nie mógł zostać zainicjalizowany.");
    return await this.ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  public loadBuffer(buffer: AudioBuffer) {
    this.stop();
    this.currentBuffer = buffer;
    this.pauseOffset = 0;
    this.loopStart = 0;
    this.loopEnd = buffer.duration;
  }

  public loadAudioBuffer(buffer: AudioBuffer) {
    this.loadBuffer(buffer);
  }

  public play(offsetSec?: number) {
    this.init();
    if (!this.ctx || !this.currentBuffer) return;

    if (this.isPlayingState) {
      this.stop();
    }

    const startPos = offsetSec !== undefined ? offsetSec : this.pauseOffset;
    const source = this.ctx.createBufferSource();
    source.buffer = this.currentBuffer;

    if (this.loopEnabled && this.loopEnd > this.loopStart) {
      source.loop = true;
      source.loopStart = this.loopStart;
      source.loopEnd = this.loopEnd;
    }

    // Connect source to start of EQ chain
    const firstEq = this.eqFilters[0];
    source.connect(firstEq);

    source.onended = () => {
      if (this.isPlayingState && !this.loopEnabled) {
        this.isPlayingState = false;
        this.pauseOffset = 0;
        this.onEndedCallbacks.forEach((cb) => cb());
      }
    };

    source.start(0, startPos);
    this.currentSource = source;
    this.startTime = this.ctx.currentTime - startPos;
    this.pauseOffset = startPos;
    this.isPlayingState = true;

    this.startTimeTicker();
  }

  public pause() {
    if (!this.isPlayingState || !this.ctx) return;
    this.pauseOffset = (this.ctx.currentTime - this.startTime) % (this.currentBuffer?.duration || 1);
    this.stopSource();
    this.isPlayingState = false;
    this.stopTimeTicker();
  }

  public stop() {
    this.stopSource();
    this.pauseOffset = 0;
    this.isPlayingState = false;
    this.stopTimeTicker();
  }

  public seek(timeSeconds: number) {
    const isPlaying = this.isPlayingState;
    this.stopSource();
    this.pauseOffset = Math.max(0, Math.min(timeSeconds, this.currentBuffer?.duration || 0));
    if (isPlaying) {
      this.play(this.pauseOffset);
    } else {
      this.notifyTimeUpdate(this.pauseOffset, this.currentBuffer?.duration || 0);
    }
  }

  private stopSource() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // already stopped
      }
      this.currentSource = null;
    }
  }

  public setLoop(enabled: boolean, startSec?: number, endSec?: number) {
    this.loopEnabled = enabled;
    if (startSec !== undefined) this.loopStart = startSec;
    if (endSec !== undefined) this.loopEnd = endSec;

    if (this.currentSource && this.isPlayingState) {
      this.currentSource.loop = enabled;
      this.currentSource.loopStart = this.loopStart;
      this.currentSource.loopEnd = this.loopEnd;
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(2, vol)), this.ctx.currentTime, 0.05);
    }
  }

  // Update specific EQ gain
  public setEqGain(band: "low" | "lowMid" | "mid" | "highMid" | "high", gainDb: number) {
    if (!this.ctx || this.eqFilters.length === 0) return;
    const bandMap: Record<string, number> = {
      low: 0,
      lowMid: 1,
      mid: 2,
      highMid: 3,
      high: 4,
    };
    const idx = bandMap[band];
    if (idx !== undefined && this.eqFilters[idx]) {
      this.eqFilters[idx].gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
  }

  // Update EQ bands in real-time
  public applyEqBands(bands: EqBand[], bypass: boolean = false) {
    this.eqBypassed = bypass;
    if (!this.ctx || this.eqFilters.length === 0) return;

    bands.forEach((band, idx) => {
      if (idx < this.eqFilters.length) {
        const filter = this.eqFilters[idx];
        filter.type = band.type as BiquadFilterType;
        filter.frequency.setTargetAtTime(band.frequencyHz, this.ctx!.currentTime, 0.05);
        filter.Q.setTargetAtTime(band.q || 1, this.ctx!.currentTime, 0.05);
        filter.gain.setTargetAtTime(bypass ? 0 : band.gainDb, this.ctx!.currentTime, 0.05);
      }
    });
  }

  // Stem multi-track control setup
  public registerStem(stemId: string, filterRange?: { low: number; high: number }) {
    this.init();
    if (!this.ctx || this.stemNodes.has(stemId)) return;

    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();
    const filter = this.ctx.createBiquadFilter();

    if (filterRange) {
      filter.type = "bandpass";
      const centerFreq = Math.sqrt(filterRange.low * filterRange.high);
      filter.frequency.setValueAtTime(centerFreq || 1000, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    } else {
      filter.type = "allpass";
    }

    gain.connect(pan);
    pan.connect(filter);
    filter.connect(this.eqFilters[0] || this.masterGain);

    this.stemNodes.set(stemId, { gain, pan, filter });
  }

  public setStemVolume(stemId: string, volume: number, muted: boolean, anySoloActive: boolean, isSolo: boolean) {
    const node = this.stemNodes.get(stemId);
    if (!node || !this.ctx) return;

    let targetGain = volume;
    if (muted) {
      targetGain = 0;
    } else if (anySoloActive) {
      targetGain = isSolo ? volume : 0;
    }

    node.gain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  public setStemPan(stemId: string, panVal: number) {
    const node = this.stemNodes.get(stemId);
    if (!node || !this.ctx) return;
    node.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, panVal)), this.ctx.currentTime, 0.05);
  }

  // Polyphonic Synthesizer for MIDI & Chord audition
  public playSynthesizerChord(pitches: (string | number)[], durationSec: number = 1.2, synthType: "warm" | "sub" | "lead" | "pluck" = "warm") {
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    pitches.forEach((p) => {
      const freq = typeof p === "number" ? midiNoteToFrequency(p) : noteNameToFrequency(p);
      if (!freq || isNaN(freq)) return;

      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      if (synthType === "sub") {
        osc.type = "sine";
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, now);
      } else if (synthType === "pluck") {
        osc.type = "triangle";
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + durationSec);
      } else {
        osc.type = "sawtooth";
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2200, now);
      }

      osc.frequency.setValueAtTime(freq, now);

      // ADSR Envelope
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25 / pitches.length, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.15 / pitches.length, now + durationSec * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || this.ctx!.destination);

      osc.start(now);
      osc.stop(now + durationSec + 0.1);
    });
  }

  // Drum Sound Synthesizers for Beat / MPC Lab
  public playDrumSound(type: "kick" | "snare" | "hihat" | "bass808" | "clap" | "perc") {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (type === "kick") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === "snare" || type === "clap") {
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(800, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      whiteNoise.start(now);
    } else if (type === "hihat") {
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7000, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      whiteNoise.start(now);
    } else if (type === "bass808") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.72);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  }

  // Time ticker
  private startTimeTicker() {
    this.stopTimeTicker();
    const tick = () => {
      if (this.isPlayingState && this.ctx && this.currentBuffer) {
        let cur = this.ctx.currentTime - this.startTime;
        if (this.loopEnabled && this.loopEnd > this.loopStart) {
          if (cur >= this.loopEnd) {
            cur = this.loopStart + ((cur - this.loopStart) % (this.loopEnd - this.loopStart));
          }
        }
        this.notifyTimeUpdate(cur, this.currentBuffer.duration);
        this.animFrameId = requestAnimationFrame(tick);
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopTimeTicker() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private notifyTimeUpdate(time: number, duration: number) {
    this.onTimeUpdateCallbacks.forEach((cb) => cb(time, duration));
  }

  public onTimeUpdate(cb: (time: number, duration: number) => void) {
    this.onTimeUpdateCallbacks.add(cb);
    return () => this.onTimeUpdateCallbacks.delete(cb);
  }

  public onPlaybackProgress(cb: (time: number, duration: number) => void) {
    return this.onTimeUpdate(cb);
  }

  public onEnded(cb: () => void) {
    this.onEndedCallbacks.add(cb);
    return () => this.onEndedCallbacks.delete(cb);
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getIsPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentBuffer(): AudioBuffer | null {
    return this.currentBuffer;
  }
}

export const audioEngine = new AudioEngine();

// Helper pitch conversions
export function midiNoteToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const NOTE_NAME_MAP: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export function noteNameToFrequency(noteStr: string): number {
  const match = noteStr.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 440;
  const name = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_NAME_MAP[name] ?? 9;
  const midi = 12 * (octave + 1) + semitone;
  return midiNoteToFrequency(midi);
}

// Convert AudioBuffer / Sub-slice to WAV Blob
export function encodeAudioBufferToWav(buffer: AudioBuffer, startSec: number = 0, endSec?: number): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = endSec !== undefined ? Math.min(Math.floor(endSec * sampleRate), buffer.length) : buffer.length;
  const numSamples = Math.max(0, endSample - startSample);

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = startSample; i < endSample; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
