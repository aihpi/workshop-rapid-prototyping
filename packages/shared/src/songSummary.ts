// A deterministic, line-oriented description of a song for the AI assistant.
// It is what the model reasons over, so it uses the same bar-and-step
// convention as the ops it may emit and names every id it may reference.
// Roughly 1.6k tokens for the demo; a budget guard trims detail past 6k chars.

import { EFFECT_SPECS } from "./effectSpecs.ts";
import { INSTRUMENT_SPECS } from "./instrumentSpecs.ts";
import { DRUM_LANES, DRUM_VOICES, STEP_TICKS, midiToNoteName, ticksPerBar } from "./music.ts";
import type { Effect, Pattern, SongDoc, Track } from "./song.ts";

const PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const SUMMARY_BUDGET = 6000;

const round = (v: number, places = 2): string => String(Number(v.toFixed(places)));

/** Pitch classes in use, most frequent first, so key questions are answerable. */
function pitchClasses(notes: readonly { pitch: number }[]): string {
  const counts = new Map<number, number>();
  for (const n of notes) counts.set(n.pitch % 12, (counts.get(n.pitch % 12) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([pc]) => PITCH_CLASSES[pc]).join(",");
}

export function summariseSong(doc: SongDoc, focusPatternIds: readonly string[] = []): string {
  const full = render(doc, focusPatternIds, { lanes: true, clips: "each" });
  if (full.length <= SUMMARY_BUDGET) return full;
  const noLanes = render(doc, focusPatternIds, { lanes: false, clips: "each" });
  if (noLanes.length <= SUMMARY_BUDGET) return noLanes;
  return render(doc, focusPatternIds, { lanes: false, clips: "collapsed" });
}

type Detail = { lanes: boolean; clips: "each" | "collapsed" };

function render(doc: SongDoc, focus: readonly string[], detail: Detail): string {
  const BAR = ticksPerBar(doc.meta.timeSig);
  const stepsPerBar = BAR / STEP_TICKS;
  const toBar = (t: number) => round(t / BAR);
  const lines: string[] = [];

  const endTick = Math.max(0, ...Object.values(doc.clips).map((c) => c.startTick + c.lengthTicks), ...doc.sections.map((s) => s.endTick));
  lines.push(`song "${doc.meta.title}" bpm=${doc.meta.bpm} sig=${doc.meta.timeSig.join("/")} length=${toBar(endTick)} bars master=${doc.meta.masterVolume}dB`);
  lines.push(`time: bars are 0-based and end-exclusive; steps are sixteenths, ${stepsPerBar} per bar, 0-based from the pattern start`);
  lines.push(`drum pitches (GM): ${Object.entries(DRUM_VOICES).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  const pitched = Object.values(doc.patterns).filter((p) => p.kind === "pitched").flatMap((p) => p.notes);
  if (pitched.length) lines.push(`pitch classes used across the song, most frequent first: ${pitchClasses(pitched)}`);

  lines.push("", "sections:");
  for (const s of doc.sections) lines.push(`  ${s.id} "${s.name}" bars ${toBar(s.startTick)}-${toBar(s.endTick)}`);

  lines.push("", "tracks (in order):");
  for (const id of doc.trackOrder) {
    const t = doc.tracks[id]!;
    const specs = INSTRUMENT_SPECS[t.instrument.kind];
    const params = specs
      .filter((s) => typeof t.instrument.params[s.key] === "number" && t.instrument.params[s.key] !== s.default)
      .map((s) => `${s.key}=${t.instrument.params[s.key]}`)
      .join(",");
    const m = t.mix;
    const flags = `${m.mute ? " muted" : ""}${m.solo ? " solo" : ""}`;
    lines.push(`  ${t.id} "${t.name}" kind=${t.kind} instrument=${t.instrument.kind}{${params}} vol=${m.volume}dB pan=${m.pan} reverb=${m.sends.reverb} delay=${m.sends.delay}${flags}${effectsSummary(t, detail.lanes)}${automationSummary(t, detail.lanes ? BAR : null)}`);
  }

  lines.push("", "patterns:");
  const sortedPatterns = Object.values(doc.patterns).sort((a, b) => a.id.localeCompare(b.id));
  for (const p of sortedPatterns) {
    const placements = Object.values(doc.clips)
      .filter((c) => c.patternId === p.id)
      .sort((a, b) => a.startTick - b.startTick);
    const where = placements.map((c) => `${c.trackId}@${toBar(c.startTick)}-${toBar(c.startTick + c.lengthTicks)}`).join(" ");
    lines.push(`  ${p.id} "${p.name}" kind=${p.kind} bars=${round(p.lengthTicks / BAR)} notes=${p.notes.length} used: ${where || "unused"}`);
    if (focus.includes(p.id)) {
      lines.push(`    notes: ${p.notes.map((n) => `${n.pitch}@${n.start / STEP_TICKS}:${n.duration / STEP_TICKS}${n.velocity !== 1 ? `v${round(n.velocity)}` : ""}`).join(" ")}`);
    } else if (p.kind === "drum" && detail.lanes) {
      for (const line of drumLanes(p, stepsPerBar)) lines.push(`    ${line}`);
    } else if (p.kind === "pitched" && p.notes.length) {
      const pitches = p.notes.map((n) => n.pitch);
      const lo = Math.min(...pitches);
      const hi = Math.max(...pitches);
      const starts = new Set(p.notes.map((n) => n.start));
      const velocities = p.notes.map((n) => n.velocity);
      lines.push(`    range ${midiToNoteName(lo)}-${midiToNoteName(hi)} (${lo}-${hi}) pitch-classes=${pitchClasses(p.notes)} chords=${starts.size < p.notes.length ? "yes" : "no"} vel=${round(Math.min(...velocities))}-${round(Math.max(...velocities))}`);
    }
  }

  lines.push("", "clips:");
  const clips = Object.values(doc.clips).sort((a, b) => a.startTick - b.startTick || a.trackId.localeCompare(b.trackId));
  if (detail.clips === "each") {
    for (const c of clips) {
      const p = doc.patterns[c.patternId];
      const loops = p ? c.lengthTicks / p.lengthTicks : 1;
      lines.push(`  ${c.id} track=${c.trackId} pattern=${c.patternId} bars ${toBar(c.startTick)}-${toBar(c.startTick + c.lengthTicks)}${loops > 1 ? ` (loops ${round(loops)}x)` : ""}`);
    }
  } else {
    for (const id of doc.trackOrder) {
      const mine = clips.filter((c) => c.trackId === id);
      lines.push(`  ${id}: ${mine.map((c) => `${c.id}[${c.patternId} ${toBar(c.startTick)}-${toBar(c.startTick + c.lengthTicks)}]`).join(" ")}`);
    }
  }
  return lines.join("\n");
}

/** `kind:id` per insert in chain order, so the model can reference the id. Params go with the lanes when the budget bites. */
function effectsSummary(t: Track, withParams: boolean): string {
  if (!t.effects.length) return "";
  return ` fx=[${t.effects.map((e) => effectSummary(e, withParams)).join(",")}]`;
}

function effectSummary(e: Effect, withParams: boolean): string {
  const state = e.enabled ? "" : "(off)";
  if (!withParams) return `${e.kind}:${e.id}${state}`;
  const params = EFFECT_SPECS[e.kind]
    .filter((s) => e.params[s.key] !== undefined && e.params[s.key] !== s.default)
    .map((s) => `${s.key}=${e.params[s.key]}`)
    .join(",");
  return `${e.kind}:${e.id}${state}{${params}}`;
}

/**
 * Lanes with points only; the fader owns everything else. With the bar length
 * the points are spelled out as bar:step=value, the shape setAutomation takes,
 * because that op replaces the lane and the model must resend what it keeps.
 */
function automationSummary(t: Track, barTicks: number | null): string {
  const lanes = Object.entries(t.automation)
    .filter(([, lane]) => lane.points.length > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!lanes.length) return "";
  const points = (lane: Track["automation"][string]) =>
    barTicks === null
      ? ""
      : `[${lane.points.map((p) => `${Math.floor(p.tick / barTicks)}:${round((p.tick % barTicks) / STEP_TICKS)}=${round(p.value)}`).join(",")}]`;
  return ` auto=${lanes.map(([param, lane]) => `${param}(${lane.points.length}pts)${points(lane)}`).join(",")}`;
}

/**
 * One 16-character lane per drum voice for the first bar, `x` where a note
 * starts, plus whether the remaining bars repeat bar 1. Exported for tests.
 */
export function drumLanes(p: Pattern, stepsPerBar: number): string[] {
  const out: string[] = [];
  const barTicks = stepsPerBar * STEP_TICKS;
  const bars = Math.max(1, Math.round(p.lengthTicks / barTicks));
  for (const voice of DRUM_LANES) {
    const pitch = DRUM_VOICES[voice];
    const hits = p.notes.filter((n) => n.pitch === pitch);
    if (!hits.length) continue;
    const lane = Array.from({ length: stepsPerBar }, (_, step) => (hits.some((n) => n.start === step * STEP_TICKS) ? "x" : "."));
    out.push(`${voice.padEnd(9)} ${lane.join("")}`);
  }
  if (bars > 1) {
    const bar1 = new Set(p.notes.filter((n) => n.start < barTicks).map((n) => `${n.pitch}@${n.start}`));
    let same = true;
    for (let b = 1; b < bars && same; b++) {
      const barN = new Set(p.notes.filter((n) => n.start >= b * barTicks && n.start < (b + 1) * barTicks).map((n) => `${n.pitch}@${n.start - b * barTicks}`));
      same = barN.size === bar1.size && [...barN].every((k) => bar1.has(k));
    }
    out.push(same ? `bars 2-${bars} repeat bar 1` : `bars 2-${bars} differ from bar 1`);
  }
  return out;
}
