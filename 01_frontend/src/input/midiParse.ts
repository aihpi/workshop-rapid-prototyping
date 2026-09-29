/** Just note on and note off. Everything else a controller sends is ignored. */
export type NoteEvent = { type: "on" | "off"; pitch: number; velocity: number };

export function parseMidi(data: Uint8Array): NoteEvent | null {
  const status = data[0];
  if (status === undefined) return null;
  const kind = status & 0xf0;
  const pitch = data[1] ?? 0;
  const velocity = data[2] ?? 0;
  // Running status keyboards send note-on with velocity 0 instead of note-off.
  if (kind === 0x90 && velocity > 0) return { type: "on", pitch, velocity: velocity / 127 };
  if (kind === 0x80 || (kind === 0x90 && velocity === 0)) return { type: "off", pitch, velocity: 0 };
  return null;
}
