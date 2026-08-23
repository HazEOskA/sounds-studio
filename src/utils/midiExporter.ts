import { MidiNote } from "../types";

/**
 * Standard MIDI File (.mid) binary builder (Format 0)
 */

function writeVLQ(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += value & 0x7f;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return bytes;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

export function exportMidiFile(
  notes: MidiNote[],
  bpm: number = 120,
  trackName: string = "OSA SOUL STUDIO Progression"
): Blob {
  const ppq = 480; // Pulses per quarter note
  const microSecondsPerQuarter = Math.round(60000000 / bpm);

  // Collect events with absolute ticks
  interface RawEvent {
    tick: number;
    type: "on" | "off" | "meta";
    pitch?: number;
    velocity?: number;
    data?: number[];
  }

  const rawEvents: RawEvent[] = [];

  // Track name meta event
  const trackNameBytes = stringToBytes(trackName);
  rawEvents.push({
    tick: 0,
    type: "meta",
    data: [0xff, 0x03, trackNameBytes.length, ...trackNameBytes],
  });

  // Set tempo meta event (FF 51 03 tt tt tt)
  const t1 = (microSecondsPerQuarter >> 16) & 0xff;
  const t2 = (microSecondsPerQuarter >> 8) & 0xff;
  const t3 = microSecondsPerQuarter & 0xff;
  rawEvents.push({
    tick: 0,
    type: "meta",
    data: [0xff, 0x51, 0x03, t1, t2, t3],
  });

  // Convert notes to Note On and Note Off events
  notes.forEach((n) => {
    const startTick = Math.round(n.startTime * ppq);
    const endTick = Math.round((n.startTime + n.duration) * ppq);
    const pitch = Math.max(0, Math.min(127, n.pitch));
    const vel = Math.max(1, Math.min(127, n.velocity || 90));

    rawEvents.push({
      tick: startTick,
      type: "on",
      pitch,
      velocity: vel,
    });

    rawEvents.push({
      tick: endTick,
      type: "off",
      pitch,
      velocity: 0,
    });
  });

  // Sort events by tick (note off before note on at same tick for cleanliness)
  rawEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === "off" && b.type === "on") return -1;
    if (a.type === "on" && b.type === "off") return 1;
    return 0;
  });

  // Build track bytes with delta times
  const trackData: number[] = [];
  let currentTick = 0;

  for (const ev of rawEvents) {
    const delta = ev.tick - currentTick;
    currentTick = ev.tick;

    trackData.push(...writeVLQ(delta));

    if (ev.type === "meta" && ev.data) {
      trackData.push(...ev.data);
    } else if (ev.type === "on" && ev.pitch !== undefined) {
      trackData.push(0x90, ev.pitch, ev.velocity || 90);
    } else if (ev.type === "off" && ev.pitch !== undefined) {
      trackData.push(0x80, ev.pitch, 0);
    }
  }

  // End of Track meta event: 00 FF 2F 00
  trackData.push(0x00, 0xff, 0x2f, 0x00);

  // MThd Header Chunk
  // Header ID: "MThd" (4 bytes), Length: 6 (4 bytes), Format: 0 (2 bytes), Tracks: 1 (2 bytes), PPQ: ppq (2 bytes)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // length = 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ppq >> 8) & 0xff, ppq & 0xff, // PPQ
  ];

  // MTrk Track Chunk
  // Track ID: "MTrk" (4 bytes), Length (4 bytes), trackData
  const trackLen = trackData.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  const fullFile = new Uint8Array([...header, ...trackHeader, ...trackData]);
  return new Blob([fullFile], { type: "audio/midi" });
}
