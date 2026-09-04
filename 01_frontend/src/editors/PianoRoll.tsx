import { inScale, midiToNoteName, STEP_TICKS } from "@hpi/shared";
import type { Clip, Note, Pattern, Track } from "@hpi/shared";
import { useEffect, useRef } from "react";

import { useUiStore } from "../state/index.ts";
import { cssVar, swatchCss } from "../timeline/swatch.ts";
import { editorActions } from "./editorActions.ts";
import { startNoteGesture } from "./noteGesture.ts";
import { StepCursor } from "./StepCursor.tsx";

const PX_PER_STEP = 28;
const ROW_H = 16;
const KEY_W = 56;
const TOP_PITCH = 84; // C6
const LOW_PITCH = 36; // C2
const ROWS = TOP_PITCH - LOW_PITCH + 1;

const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

type Props = { clip: Clip; pattern: Pattern; track: Track };

/**
 * Four octaves, sixteenth-note columns. The grid is a canvas (a 49 x 128 cell
 * DOM grid would be six thousand elements), notes are DOM so they can be
 * dragged. Click empty space to add a step-long note, click a note to remove
 * it, drag its body to move, drag its right edge to lengthen.
 */
export function PianoRoll({ clip, pattern, track }: Props) {
  const steps = Math.round(pattern.lengthTicks / STEP_TICKS);
  const width = steps * PX_PER_STEP;
  const height = ROWS * ROW_H;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scaleRoot = useUiStore((s) => s.scaleRoot);
  const scaleName = useUiStore((s) => s.scaleName);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const inKey = cssVar("--roll-in-scale");
    const outKey = cssVar("--roll-out-scale");
    const line = cssVar("--grid-line");
    const strong = cssVar("--grid-line-strong");
    for (let row = 0; row < ROWS; row++) {
      const pitch = TOP_PITCH - row;
      ctx.fillStyle = inScale(pitch, scaleRoot, scaleName) ? inKey : outKey;
      ctx.fillRect(0, row * ROW_H, width, ROW_H);
      if (pitch % 12 === 0) {
        ctx.fillStyle = strong;
        ctx.fillRect(0, row * ROW_H + ROW_H - 1, width, 1);
      }
    }
    for (let s = 0; s <= steps; s++) {
      ctx.fillStyle = s % 16 === 0 ? strong : s % 4 === 0 ? line : line;
      ctx.globalAlpha = s % 4 === 0 ? 1 : 0.5;
      ctx.fillRect(s * PX_PER_STEP, 0, 1, height);
    }
    ctx.globalAlpha = 1;
  }, [width, height, steps, scaleRoot, scaleName]);

  // Open scrolled to the notes, or to C3 when there are none.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pitches = pattern.notes.map((n) => n.pitch);
    const centre = pitches.length ? (Math.max(...pitches) + Math.min(...pitches)) / 2 : 55;
    el.scrollTop = Math.max(0, (TOP_PITCH - centre) * ROW_H - el.clientHeight / 2);
  }, [pattern.id]);

  const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && e.target !== canvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = Math.floor(x / PX_PER_STEP);
    const pitch = TOP_PITCH - Math.floor(y / ROW_H);
    if (step < 0 || step >= steps || pitch < LOW_PITCH || pitch > TOP_PITCH) return;
    editorActions.addNote(pattern.id, pitch, step * STEP_TICKS, STEP_TICKS);
  };

  const gesture = (e: React.PointerEvent<HTMLElement>, note: Note, mode: "move" | "resize") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget.closest<HTMLElement>(".roll-note");
    if (!el) return;
    startNoteGesture(e.nativeEvent, el, note, mode, {
      pxPerStep: PX_PER_STEP,
      stepTicks: STEP_TICKS,
      rowH: ROW_H,
      topPitch: TOP_PITCH,
      lowestPitch: LOW_PITCH,
      onMove: (start, pitch) => editorActions.moveNote(pattern.id, note.id, start, pitch),
      onResize: (duration) => editorActions.resizeNote(pattern.id, note.id, duration),
      onClick: (shift) => (shift ? editorActions.cycleVelocity(pattern.id, note.id) : editorActions.removeNote(pattern.id, note.id)),
    });
  };

  return (
    <div className="piano-roll" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <div className="piano-roll-scroll" ref={scrollRef}>
        <div className="piano-roll-inner" style={{ width: KEY_W + width, height }}>
          <div className="piano-keys" style={{ width: KEY_W }}>
            {Array.from({ length: ROWS }, (_, row) => {
              const pitch = TOP_PITCH - row;
              return (
                <div key={pitch} className={`piano-key ${isBlack(pitch) ? "black" : ""} ${pitch % 12 === 0 ? "c" : ""}`} style={{ height: ROW_H }}>
                  {pitch % 12 === 0 ? midiToNoteName(pitch) : ""}
                </div>
              );
            })}
          </div>
          <div className="piano-grid" style={{ left: KEY_W, width, height }} onPointerDown={onGridPointerDown}>
            <canvas ref={canvasRef} />
            {pattern.notes.map((note) => {
              const row = TOP_PITCH - note.pitch;
              if (row < 0 || row >= ROWS) return null;
              return (
                <div
                  key={note.id}
                  className="roll-note"
                  style={{
                    transform: `translate(${(note.start / STEP_TICKS) * PX_PER_STEP}px, ${row * ROW_H}px)`,
                    width: (note.duration / STEP_TICKS) * PX_PER_STEP - 1,
                    height: ROW_H - 1,
                    opacity: 0.55 + note.velocity * 0.45,
                  }}
                  title={`${midiToNoteName(note.pitch)} · click to delete · shift-click for velocity`}
                  onPointerDown={(e) => gesture(e, note, "move")}
                >
                  <div className="roll-note-handle" onPointerDown={(e) => gesture(e, note, "resize")} />
                </div>
              );
            })}
            <StepCursor clip={clip} pattern={pattern} pxPerStep={PX_PER_STEP} stepTicks={STEP_TICKS} height={height} />
          </div>
        </div>
      </div>
    </div>
  );
}
