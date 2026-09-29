import * as Tone from "tone";

import { audioBufferChannels } from "./wav.ts";
import type { Channels } from "./dsp.ts";

/** Mirrors the upload limit in 02_backend/src/routes/samples.ts. */
export const MAX_SAMPLE_BYTES = 50 * 1024 * 1024;

/** Size of the 16-bit PCM WAV the sample will be uploaded as. */
export const wavByteLength = (frames: number, channels: number): number => 44 + frames * channels * 2;

/**
 * Any format the browser can decode becomes plain channels, the same shape a
 * microphone recording has, so trimming and saving are shared. Compressed
 * files inflate to PCM at the context's rate, so the size check happens here,
 * not at upload.
 */
export async function decodeFile(file: File): Promise<{ channels: Channels; sampleRate: number; durationSec: number }> {
  const ctx = Tone.getContext().rawContext as AudioContext;
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  if (wavByteLength(decoded.length, decoded.numberOfChannels) > MAX_SAMPLE_BYTES) {
    throw new Error("That file is too long: as a WAV it would be over 50 MB.");
  }
  return { channels: audioBufferChannels(decoded), sampleRate: decoded.sampleRate, durationSec: decoded.duration };
}
