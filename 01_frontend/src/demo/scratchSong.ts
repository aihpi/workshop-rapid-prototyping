import { DRUM_VOICES, emptySong, makeTrack, ops, STEP_TICKS, ticksPerBar } from "@hpi/shared";
import type { Note, SongDoc } from "@hpi/shared";

// A two-bar loop to prove the engine, until the real demo song lands as a seed.
// F minor, 104 BPM: kick on the floor, offbeat hats, clap on two and four,
// plucked bass, a pad chord and one brass stab.

const BAR = ticksPerBar([4, 4]);
const S = STEP_TICKS;

let n = 0;
const note = (pitch: number, start: number, duration = S, velocity = 1): Note => ({
  id: `n${n++}`,
  start,
  duration,
  pitch,
  velocity,
});

export function scratchSong(): SongDoc {
  const song = emptySong("scratch", "Scratch loop");
  song.meta.bpm = 104;

  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum", index: 0 }));
  ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched", instrument: { kind: "pluck", params: { dampening: 1800 } }, index: 1 }));
  ops.addTrack(song, makeTrack({ id: "keys", name: "Keys", kind: "pitched", instrument: { kind: "poly", params: {} }, index: 2 }));
  ops.addTrack(song, makeTrack({ id: "brass", name: "Brass", kind: "pitched", instrument: { kind: "fm", params: {} }, index: 3 }));
  ops.setSend(song, "keys", "reverb", 0.4);
  ops.setSend(song, "brass", "delay", 0.25);
  ops.setMix(song, "brass", { volume: -6 });

  const drums: Note[] = [];
  for (let bar = 0; bar < 2; bar++) {
    const b = bar * BAR;
    for (let beat = 0; beat < 4; beat++) {
      drums.push(note(DRUM_VOICES.kick, b + beat * 4 * S, S, 1));
      drums.push(note(DRUM_VOICES.closedHat, b + beat * 4 * S + 2 * S, S, 0.7));
    }
    drums.push(note(DRUM_VOICES.clap, b + 4 * S, S, 0.9));
    drums.push(note(DRUM_VOICES.clap, b + 12 * S, S, 0.9));
    drums.push(note(DRUM_VOICES.openHat, b + 14 * S, S, 0.6));
  }
  ops.addPattern(song, { id: "p-drums", name: "Beat", kind: "drum", lengthTicks: 2 * BAR, notes: drums });

  // F1 root, Ab and C passing, eighth notes.
  const bassLine = [41, 41, 41, 44, 41, 41, 48, 44];
  const bass = bassLine.flatMap((pitch, i) => [note(pitch, i * 2 * S, 2 * S, 0.9), note(pitch, BAR + i * 2 * S, 2 * S, 0.9)]);
  ops.addPattern(song, { id: "p-bass", name: "Bass line", kind: "pitched", lengthTicks: 2 * BAR, notes: bass });

  // Fm then Db, one chord per bar.
  const keys = [
    ...[53, 56, 60].map((p) => note(p, 0, BAR, 0.6)),
    ...[49, 53, 56].map((p) => note(p, BAR, BAR, 0.6)),
  ];
  ops.addPattern(song, { id: "p-keys", name: "Pad", kind: "pitched", lengthTicks: 2 * BAR, notes: keys });

  const brass = [note(65, BAR + 8 * S, 2 * S, 0.9), note(68, BAR + 10 * S, 2 * S, 0.9), note(72, BAR + 12 * S, 4 * S, 1)];
  ops.addPattern(song, { id: "p-brass", name: "Stab", kind: "pitched", lengthTicks: 2 * BAR, notes: brass });

  for (const id of ["drums", "bass", "keys", "brass"]) {
    ops.addClip(song, { id: `c-${id}`, trackId: id, patternId: `p-${id}`, startTick: 0, lengthTicks: 2 * BAR, offsetTicks: 0 });
  }
  ops.addSection(song, { id: "loop", name: "Loop", startTick: 0, endTick: 2 * BAR, colour: { hue: "grey", shade: 75 } });
  return song;
}
