import { encodeAudioBufferToWav } from "../utils/audioEngine";
import { normalizeDawProject } from "./project";
import { DawChannel, DawProject } from "./types";

const SAMPLE_RATE = 44100;

export async function renderDawProjectToWav(project: DawProject): Promise<Blob> {
  const normalized = normalizeDawProject(project);
  const OfflineContext =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

  if (!OfflineContext) {
    throw new Error("OfflineAudioContext nie jest obsługiwany w tej przeglądarce.");
  }

  const secondsPerStep = 60 / normalized.bpm / 4;
  const duration = secondsPerStep * 16;
  const frameCount = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
  const ctx: OfflineAudioContext = new OfflineContext(2, frameCount, SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  const anySolo = normalized.channels.some((channel) => channel.solo);

  normalized.channels.forEach((channel) => {
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const audible = !channel.mute && (!anySolo || channel.solo);

    gain.gain.value = audible ? channel.volume : 0;
    pan.pan.value = channel.pan;
    gain.connect(pan);
    pan.connect(master);

    if (!audible) return;

    channel.steps.forEach((active, stepIndex) => {
      if (!active) return;
      scheduleOfflineSound(ctx, channel, stepIndex * secondsPerStep, gain, duration);
    });
  });

  const rendered = await ctx.startRendering();
  return encodeAudioBufferToWav(rendered);
}

function scheduleOfflineSound(
  ctx: OfflineAudioContext,
  channel: DawChannel,
  when: number,
  destination: AudioNode,
  renderDuration: number
) {
  if (when >= renderDuration) return;

  if (channel.soundType === "kick") {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(45, Math.min(renderDuration, when + 0.12));
    amp.gain.setValueAtTime(1, when);
    amp.gain.exponentialRampToValueAtTime(0.001, Math.min(renderDuration, when + 0.32));
    osc.connect(amp);
    amp.connect(destination);
    osc.start(when);
    osc.stop(Math.min(renderDuration, when + 0.34));
    return;
  }

  if (channel.soundType === "bass808") {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(55, when);
    osc.frequency.exponentialRampToValueAtTime(42, Math.min(renderDuration, when + 0.42));
    amp.gain.setValueAtTime(0.9, when);
    amp.gain.exponentialRampToValueAtTime(0.001, Math.min(renderDuration, when + 0.62));
    osc.connect(amp);
    amp.connect(destination);
    osc.start(when);
    osc.stop(Math.min(renderDuration, when + 0.64));
    return;
  }

  const noiseDuration = channel.soundType === "hihat" ? 0.07 : 0.18;
  const playableDuration = Math.max(0.005, Math.min(noiseDuration, renderDuration - when));
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.ceil(ctx.sampleRate * playableDuration)),
    ctx.sampleRate
  );
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;

  if (channel.soundType === "hihat") {
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, when);
    amp.gain.setValueAtTime(0.38, when);
  } else {
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, when);
    amp.gain.setValueAtTime(0.72, when);
  }

  amp.gain.exponentialRampToValueAtTime(0.001, when + playableDuration);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(destination);
  source.start(when);
  source.stop(when + playableDuration);
}
