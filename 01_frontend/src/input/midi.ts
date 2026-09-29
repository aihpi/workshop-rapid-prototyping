import { parseMidi } from "./midiParse.ts";
import type { NoteEvent } from "./midiParse.ts";

/**
 * Web MIDI, Chromium only. Every input is listened to; the first one's name is
 * shown in the top bar so the user knows the keyboard was found.
 */
export async function startMidi(onEvent: (event: NoteEvent) => void, onDevice: (name: string | null) => void): Promise<() => void> {
  if (!("requestMIDIAccess" in navigator)) {
    onDevice(null);
    return () => {};
  }
  let access: MIDIAccess;
  try {
    access = await navigator.requestMIDIAccess();
  } catch {
    onDevice(null);
    return () => {};
  }
  const attach = () => {
    let name: string | null = null;
    access.inputs.forEach((input) => {
      name ??= input.name ?? "MIDI device";
      input.onmidimessage = (message) => {
        const event = message.data ? parseMidi(message.data) : null;
        if (event) onEvent(event);
      };
    });
    onDevice(name);
  };
  attach();
  access.onstatechange = attach;
  return () => {
    access.onstatechange = null;
    access.inputs.forEach((input) => {
      input.onmidimessage = null;
    });
  };
}
