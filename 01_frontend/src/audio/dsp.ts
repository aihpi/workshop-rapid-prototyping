// Sample processing on plain Float32Arrays, one per channel, so it can be
// tested without an AudioContext. The browser decodes, this shapes, wav.ts
// encodes, and the server never needs an audio library.

export type Channels = Float32Array[];

export function trim(channels: Channels, sampleRate: number, startSec: number, endSec: number): Channels {
  const length = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(length, Math.round(startSec * sampleRate)));
  const end = Math.max(start, Math.min(length, Math.round(endSec * sampleRate)));
  return channels.map((c) => c.slice(start, end));
}

export function peak(channels: Channels): number {
  let max = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) max = Math.max(max, Math.abs(c[i]!));
  return max;
}

/** Scales so the loudest sample sits just under full scale. Silence is left alone. */
export function normalise(channels: Channels, target = 0.98): Channels {
  const p = peak(channels);
  if (p < 1e-6) return channels.map((c) => c.slice());
  const gain = target / p;
  return channels.map((c) => c.map((v) => v * gain));
}

export function reverse(channels: Channels): Channels {
  return channels.map((c) => c.slice().reverse());
}

/** Peak per bucket, for drawing a waveform of any length into a fixed width. */
export function envelope(channel: Float32Array, buckets: number): Float32Array {
  const out = new Float32Array(buckets);
  const per = channel.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * per);
    const to = Math.min(channel.length, Math.floor((b + 1) * per));
    let max = 0;
    for (let i = from; i < to; i++) max = Math.max(max, Math.abs(channel[i]!));
    out[b] = max;
  }
  return out;
}

/** Trims leading and trailing near-silence, returning the bounds in seconds. */
export function silenceBounds(channels: Channels, sampleRate: number, threshold = 0.01): [number, number] {
  const length = channels[0]?.length ?? 0;
  let first = length;
  let last = 0;
  for (const c of channels) {
    for (let i = 0; i < c.length; i++) {
      if (Math.abs(c[i]!) > threshold) {
        first = Math.min(first, i);
        break;
      }
    }
    for (let i = c.length - 1; i >= 0; i--) {
      if (Math.abs(c[i]!) > threshold) {
        last = Math.max(last, i + 1);
        break;
      }
    }
  }
  if (first >= last) return [0, length / sampleRate];
  return [first / sampleRate, last / sampleRate];
}
