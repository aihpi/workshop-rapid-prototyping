import * as Tone from "tone";

import type { Channels } from "./dsp.ts";

/**
 * Microphone to decoded channels. MediaRecorder captures, the AudioContext
 * decodes, and from there everything is plain arrays: trim, normalise,
 * reverse, encode, upload. Echo cancellation and gain control are off because
 * they are tuned for speech and make percussion sound wrong.
 */
export class Recorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  async stop(): Promise<{ channels: Channels; sampleRate: number; durationSec: number }> {
    const recorder = this.recorder;
    if (!recorder) throw new Error("not recording");
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;

    const blob = new Blob(this.chunks, { type: recorder.mimeType });
    const ctx = Tone.getContext().rawContext as AudioContext;
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
    return { channels, sampleRate: decoded.sampleRate, durationSec: decoded.duration };
  }
}

/** One-shot preview through the master output. The source frees itself when done. */
export function preview(channels: Channels, sampleRate: number): void {
  const ctx = Tone.getContext().rawContext as AudioContext;
  const buffer = ctx.createBuffer(channels.length, channels[0]?.length ?? 0, sampleRate);
  channels.forEach((c, i) => buffer.copyToChannel(c as Float32Array<ArrayBuffer>, i));
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => source.disconnect();
  source.start();
}
