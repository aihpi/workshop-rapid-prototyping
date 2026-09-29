import { DRUM_VOICES } from "@hpi/shared";
import { describe, expect, it } from "vitest";

import { clampOctave, DEFAULT_OCTAVE, keyToPitch } from "./keyboardPiano.ts";

describe("keyboard piano", () => {
  it("maps A to middle C at the default octave and K to the C above", () => {
    expect(keyToPitch("KeyA", DEFAULT_OCTAVE)).toBe(60);
    expect(keyToPitch("KeyK", DEFAULT_OCTAVE)).toBe(72);
    expect(keyToPitch("KeyW", 3)).toBe(49);
  });

  it("ignores keys that are not on the piano", () => {
    expect(keyToPitch("KeyQ", 4)).toBeNull();
    expect(keyToPitch("Space", 4)).toBeNull();
  });

  it("picks drum voices on a drum track, kick first", () => {
    expect(keyToPitch("KeyA", 4, "drum")).toBe(DRUM_VOICES.kick);
    expect(keyToPitch("KeyW", 4, "drum")).toBe(DRUM_VOICES.snare);
    expect(keyToPitch("KeyK", 4, "drum")).toBeNull();
  });

  it("keeps the octave on the keyboard", () => {
    expect(clampOctave(-2)).toBe(0);
    expect(clampOctave(11)).toBe(8);
  });
});
