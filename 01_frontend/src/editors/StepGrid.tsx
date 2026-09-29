import { DRUM_LANES, DRUM_VOICES, STEP_TICKS } from "@hpi/shared";
import type { Clip, Pattern, Track } from "@hpi/shared";
import { memo } from "react";

import { swatchCss } from "../timeline/swatch.ts";
import { editorActions } from "./editorActions.ts";
import { StepCursor } from "./StepCursor.tsx";

const PX_PER_STEP = 28;
const ROW_H = 28;
const LABEL_W = 88;

const LANE_LABELS: Record<keyof typeof DRUM_VOICES, string> = {
  kick: "Kick",
  snare: "Snare",
  clap: "Clap",
  closedHat: "Closed hat",
  openHat: "Open hat",
  lowTom: "Low tom",
  highTom: "High tom",
};

type Props = { clip: Clip; pattern: Pattern; track: Track };

/** The part 1 drum grid, one lane per GM voice. Click toggles, shift-click cycles velocity. */
export function StepGrid({ clip, pattern, track }: Props) {
  const steps = Math.round(pattern.lengthTicks / STEP_TICKS);
  const width = steps * PX_PER_STEP;
  const height = DRUM_LANES.length * ROW_H;

  return (
    <div className="step-grid" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <div className="step-grid-labels" style={{ width: LABEL_W }}>
        <div className="step-grid-corner" />
        {DRUM_LANES.map((lane) => (
          <div key={lane} className="step-grid-label" style={{ height: ROW_H }}>
            {LANE_LABELS[lane]}
          </div>
        ))}
      </div>
      <div className="step-grid-scroll">
        <div className="step-grid-header" style={{ width }}>
          {Array.from({ length: steps }, (_, i) => (
            <div key={i} className={`step-num ${i % 4 === 0 ? "beat" : ""}`} style={{ width: PX_PER_STEP }}>
              {i % 4 === 0 ? i / 4 + 1 : ""}
            </div>
          ))}
        </div>
        <div className="step-grid-body" style={{ width, height }}>
          {DRUM_LANES.map((lane, row) => (
            <Lane key={lane} pattern={pattern} pitch={DRUM_VOICES[lane]} row={row} steps={steps} />
          ))}
          <StepCursor clip={clip} pattern={pattern} pxPerStep={PX_PER_STEP} stepTicks={STEP_TICKS} height={height} />
        </div>
      </div>
    </div>
  );
}

type LaneProps = { pattern: Pattern; pitch: number; row: number; steps: number };

/** One drum lane. Memoised on the pattern reference so an untouched pattern never re-renders. */
const Lane = memo(function Lane({ pattern, pitch, row, steps }: LaneProps) {
  const byStep = new Map<number, { id: string; velocity: number }>();
  for (const n of pattern.notes) if (n.pitch === pitch) byStep.set(Math.round(n.start / STEP_TICKS), n);

  return (
    <div className="step-lane" style={{ height: ROW_H, top: row * ROW_H }}>
      {Array.from({ length: steps }, (_, i) => {
        const note = byStep.get(i);
        return (
          <button
            key={i}
            className={`step ${note ? "on" : ""} ${i % 4 === 0 ? "beat" : ""}`}
            style={{ width: PX_PER_STEP, ...(note ? { ["--vel" as string]: note.velocity } : {}) }}
            aria-label={`step ${i + 1}${note ? ", on" : ""}`}
            onClick={(e) => {
              if (e.shiftKey && note) editorActions.cycleVelocity(pattern.id, note.id);
              else editorActions.toggleStep(pattern.id, pitch, i * STEP_TICKS);
            }}
          />
        );
      })}
    </div>
  );
});
