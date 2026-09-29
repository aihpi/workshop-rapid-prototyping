import { AI_LIMITS, EFFECT_KINDS, EFFECT_SPECS, INSTRUMENT_SPECS, MIX_AUTOMATION_PARAMS, isChoiceSpec, summariseSong } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";

import type { ChatMessage } from "./client.ts";

export type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Older turns are cut first, and each is capped, so the summary always fits. */
const HISTORY_TURNS = 6;
const HISTORY_CHARS = 2000;

const params = Object.entries(INSTRUMENT_SPECS)
  .filter(([kind]) => kind !== "sampler")
  .map(([kind, specs]) => `  ${kind}: ${specs.map((s) => `${s.key} ${s.min}..${s.max} (default ${s.default}${s.unit ? ` ${s.unit}` : ""})`).join(", ")}`)
  .join("\n");

const effectParams = Object.entries(EFFECT_SPECS)
  .map(
    ([kind, specs]) =>
      `  ${kind}: ${specs
        .map((s) => (isChoiceSpec(s) ? `${s.key} ${s.choices.join("|")} (default ${s.default})` : `${s.key} ${s.min}..${s.max} (default ${s.default}${s.unit ? ` ${s.unit}` : ""})`))
        .join(", ")}`,
  )
  .join("\n");

const VOCABULARY = `Each op is one JSON object. Ids you introduce are lowercase slugs (a-z, 0-9, - and _). Ids you reference must appear in the song description.
{"op":"setBpm","bpm":120}
{"op":"addTrack","id":"trumpet-1","name":"Trumpet 1","kind":"pitched","instrument":"fm","params":{"harmonicity":2},"volume":-6,"pan":-0.3}   kind drum needs instrument kit; pitched tracks take pluck (bass, guitar), fm (brass, horns) or poly (keys, pads, leads)
{"op":"renameTrack","trackId":"bass","name":"Sub bass"}
{"op":"removeTrack","trackId":"lead"}   also removes its clips
{"op":"setInstrument","trackId":"lead","instrument":"pluck","params":{}}
{"op":"setInstrumentParam","trackId":"drums","key":"tune","value":-4}
{"op":"setMix","trackId":"keys","volume":-6,"pan":-0.8,"reverb":0.7,"delay":0.2,"mute":false,"solo":false}   all fields optional; volume is absolute dB (-60..6), pan -1..1, sends 0..1
{"op":"addPattern","id":"kick-four","name":"Four on the floor","kind":"drum","bars":1,"notes":[{"pitch":36,"step":0},{"pitch":36,"step":4},{"pitch":36,"step":8},{"pitch":36,"step":12}]}   notes: pitch (MIDI, or GM drum number), step (sixteenths from pattern start), len (steps, default 1), vel (0..1, default 0.85)
{"op":"replaceNotes","patternId":"bass-bridge","notes":[...]}   replaces every note of the pattern; edits every clip that uses it
{"op":"rampVelocity","patternId":"brass-hook","from":0.3,"to":0.9}   linear crescendo across the pattern
{"op":"addClip","id":"trumpet-1-hook","trackId":"trumpet-1","patternId":"trumpet-line","bar":14,"bars":8}   the pattern loops to fill the clip; pattern kind must match track kind
{"op":"resizeClip","clipId":"c12-brass-hook","bars":4}
{"op":"removeClip","clipId":"c4-guitar-verse"}
{"op":"makeUnique","clipId":"c12-brass-hook","newPatternId":"brass-hook-b"}   gives that clip its own copy so it can differ from its siblings
{"op":"addSection","id":"coda","name":"Coda","bar":40,"bars":2}
{"op":"renameSection","sectionId":"hook1","name":"Chorus"}
{"op":"addEffect","trackId":"drums","id":"drums-comp","kind":"compressor","params":{"threshold":-18,"ratio":4},"enabled":true}   kinds: ${EFFECT_KINDS.join(", ")}; params and enabled optional; appended to the end of the track's chain
{"op":"removeEffect","trackId":"drums","effectId":"drums-comp"}
{"op":"setEffectParam","trackId":"drums","effectId":"drums-comp","key":"threshold","value":-24}
{"op":"setEffectEnabled","trackId":"drums","effectId":"drums-comp","enabled":false}   false bypasses the effect without removing it
{"op":"setTimeSig","beats":3,"unit":4}   unit is 4 or 8
{"op":"setAutomation","trackId":"keys","param":"volume","points":[{"bar":0,"value":-30},{"bar":2,"step":8,"value":-8}]}   param ${MIX_AUTOMATION_PARAMS.join("|")}; the points replace the whole lane and ramp linearly between them; step (sixteenths into the bar) defaults to 0; an empty list clears the lane
{"op":"quantiseNotes","patternId":"lead-hook","grid":"1/8","strength":1}   grid 1/4, 1/8 or 1/16 (default); strength 0..1 (default 1), 0.5 moves notes halfway`;

const RULES = `Rules:
- Reply with one JSON object only: {"thoughts": "<short plan, optional>", "message": "<one or two sentences for the user>", "ops": [...]}. No prose outside the JSON.
- Use only ids that appear in the description, or ids you introduced earlier in the same ops list. Never invent clip, pattern or track ids to reference.
- Time is bars (0-based, end exclusive) and sixteenth steps. Never use ticks or seconds.
- Automation: setAutomation drives a track's volume, pan or sends over time (fades, sweeps, build-ups). Its points replace the whole lane, so send every point you want kept. For note-level dynamics use velocities and rampVelocity instead; for arrangement changes use makeUnique and staggered clip entries.
- A pattern is shared by all clips that use it. To change one section only, makeUnique that clip first, then replaceNotes on the new pattern.
- Changing the meter: put setTimeSig first; bars in the ops after it use the new bar length.
- Keep the musical key and style unless asked. Pitched notes are MIDI numbers; drum notes are the GM numbers listed.
- Adjusting a level means reading the current value from the description and writing the new absolute value.
- Prefer few, decisive ops. At most ${AI_LIMITS.ops} ops, ${AI_LIMITS.newTracks} new tracks, ${AI_LIMITS.notesPerPattern} notes per pattern, ${AI_LIMITS.effectsPerTrack} effects per track, ${AI_LIMITS.automationPoints} points per automation lane.
- If the request is a question or needs no change, answer in "message" and return "ops": [].
- Samples and recordings cannot be touched from here; say so if asked.`;

export function buildMessages(doc: SongDoc, history: HistoryMessage[], focusPatternIds: string[] = []): ChatMessage[] {
  const system = [
    "You are the assistant inside HPI Studio, a small digital audio workstation. You edit the user's song by returning operations in the app's own vocabulary.",
    "",
    "Instrument parameters (per instrument kind):",
    params,
    "",
    "Effect parameters (per effect kind):",
    effectParams,
    "",
    "Operations:",
    VOCABULARY,
    "",
    RULES,
    "",
    "Current song:",
    summariseSong(doc, focusPatternIds),
  ].join("\n");
  const recent = history.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, HISTORY_CHARS) }));
  return [{ role: "system", content: system }, ...recent];
}

export function repairMessage(problems: string[]): string {
  return [
    "Your reply could not be applied:",
    ...problems.map((p) => `- ${p}`),
    "Reply again with only the JSON object. Keep the ops that were fine, fix or drop the ones listed.",
  ].join("\n");
}
