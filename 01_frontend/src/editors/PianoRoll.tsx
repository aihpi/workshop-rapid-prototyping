import { inScale, midiToNoteName, STEP_TICKS } from "@hpi/shared";
import type { Clip, Note, Pattern, Track } from "@hpi/shared";
import { useEffect, useRef } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { cssVar, swatchCss } from "../timeline/swatch.ts";
import { editorActions } from "./editorActions.ts";
import { startNoteGesture } from "./noteGesture.ts";
import type { GestureNote } from "./noteGesture.ts";
import { StepCursor } from "./StepCursor.tsx";

const PX_PER_STEP = 28;
const ROW_H = 16;
const KEY_W = 56;
const VEL_H = 48;
const TOP_PITCH = 84; // C6
const LOW_PITCH = 36; // C2
const ROWS = TOP_PITCH - LOW_PITCH + 1;

const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

type Props = { clip: Clip; pattern: Pattern; track: Track };

/**
 * Four octaves, sixteenth-note columns, a velocity lane underneath. The grid is
 * a canvas (a 49 x 128 cell DOM grid would be six thousand elements), notes
 * are DOM so they can be dragged. Click empty space to add a step-long note,
 * click a note to select it (shift adds), double-click to delete, drag its
 * body to move the selection, drag its right edge to lengthen, drag a bar in
 * the velocity lane to change how hard the note is hit.
 */
export function PianoRoll({ clip, pattern, track }: Props) {
  const steps = Math.round(pattern.lengthTicks / STEP_TICKS);
  const width = steps * PX_PER_STEP;
  const height = ROWS * ROW_H;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scaleRoot = useUiStore((s) => s.scaleRoot);
  const scaleName = useUiStore((s) => s.scaleName);
  const selected = useUiStore((s) => s.selectedNoteIds);
  const selectNotes = useUiStore((s) => s.selectNotes);
  const toggleNote = useUiStore((s) => s.toggleNote);

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
    // Beat lines are drawn strong, sixteenths in the hairline colour, at full alpha: on paper a
    // translucent line just disappears.
    for (let s = 0; s <= steps; s++) {
      ctx.fillStyle = s % 4 === 0 ? strong : line;
      ctx.fillRect(s * PX_PER_STEP, 0, 1, height);
    }
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
    selectNotes([]);
    editorActions.addNote(pattern.id, pitch, step * STEP_TICKS, STEP_TICKS);
  };

  const gesture = (e: React.PointerEvent<HTMLElement>, note: Note, mode: "move" | "resize") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget.closest<HTMLElement>(".roll-note");
    const grid = gridRef.current;
    if (!el || !grid) return;
    // The rest of the selection rides along only when the pressed note is part of it.
    const others: GestureNote[] = selected.includes(note.id)
      ? selected
          .map((id) => ({ el: grid.querySelector<HTMLElement>(`[data-note-id="${id}"]`), note: pattern.notes.find((n) => n.id === id) }))
          .filter((g): g is GestureNote => g.el !== null && g.note !== undefined)
      : [];
    startNoteGesture(
      e.nativeEvent,
      el,
      note,
      mode,
      {
        pxPerStep: PX_PER_STEP,
        stepTicks: STEP_TICKS,
        rowH: ROW_H,
        topPitch: TOP_PITCH,
        lowestPitch: LOW_PITCH,
        onMove: (moves) => editorActions.moveNotes(pattern.id, moves),
        onResize: (duration) => editorActions.resizeNote(pattern.id, note.id, duration),
        onClick: (shift) => (shift ? toggleNote(note.id) : selectNotes([note.id])),
      },
      others,
    );
  };

  return (
    <div className="piano-roll" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <div className="piano-roll-scroll" ref={scrollRef}>
        <div className="piano-roll-inner" style={{ width: KEY_W + width, height: height + VEL_H }}>
          <div className="piano-keys" style={{ width: KEY_W }}>
            {Array.from({ length: ROWS }, (_, row) => {
              const pitch = TOP_PITCH - row;
              return (
                <div key={pitch} className={`piano-key ${isBlack(pitch) ? "black" : ""} ${pitch % 12 === 0 ? "c" : ""}`} style={{ height: ROW_H }}>
                  {pitch % 12 === 0 ? midiToNoteName(pitch) : ""}
                </div>
              );
            })}
            <div className="piano-key velocity-label" style={{ height: VEL_H }}>
              Velocity
            </div>
          </div>
          <div className="piano-grid" ref={gridRef} style={{ left: KEY_W, width, height }} onPointerDown={onGridPointerDown}>
            <canvas ref={canvasRef} />
            {pattern.notes.map((note) => {
              const row = TOP_PITCH - note.pitch;
              if (row < 0 || row >= ROWS) return null;
              return (
                <div
                  key={note.id}
                  data-note-id={note.id}
                  className={`roll-note ${selected.includes(note.id) ? "selected" : ""}`}
                  style={{
                    transform: `translate(${(note.start / STEP_TICKS) * PX_PER_STEP}px, ${row * ROW_H}px)`,
                    width: (note.duration / STEP_TICKS) * PX_PER_STEP - 1,
                    height: ROW_H - 1,
                    ["--vel" as string]: note.velocity,
                  }}
                  title={`${midiToNoteName(note.pitch)} · click to select · double-click to delete`}
                  onPointerDown={(e) => gesture(e, note, "move")}
                  onDoubleClick={() => editorActions.removeNote(pattern.id, note.id)}
                >
                  <div className="roll-note-handle" onPointerDown={(e) => gesture(e, note, "resize")} />
                </div>
              );
            })}
            <StepCursor clip={clip} pattern={pattern} pxPerStep={PX_PER_STEP} stepTicks={STEP_TICKS} height={height} />
          </div>
          <VelocityLane pattern={pattern} selected={selected} left={KEY_W} top={height} width={width} />
        </div>
      </div>
    </div>
  );
}

/** One bar per note. A vertical drag is one undo step, and moves every selected note when the dragged one is selected. */
function VelocityLane({ pattern, selected, left, top, width }: { pattern: Pattern; selected: readonly string[]; left: number; top: number; width: number }) {
  const begin = useSongStore((s) => s.begin);
  const commit = useSongStore((s) => s.commit);

  const drag = (e: React.PointerEvent<HTMLDivElement>, note: Note) => {
    if (e.button !== 0) return;
    const lane = e.currentTarget.parentElement!;
    const ids = selected.includes(note.id) ? selected : [note.id];
    const rect = lane.getBoundingClientRect();
    const velocityAt = (clientY: number) => Math.min(1, Math.max(0.05, (rect.bottom - clientY) / rect.height));
    e.currentTarget.setPointerCapture(e.pointerId);
    begin("Velocity");
    editorActions.setVelocity(pattern.id, ids, velocityAt(e.clientY));
    const onMove = (ev: PointerEvent) => editorActions.setVelocity(pattern.id, ids, velocityAt(ev.clientY));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      commit();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div className="velocity-lane" style={{ left, top, width, height: VEL_H }}>
      {pattern.notes.map((note) => (
        <div
          key={note.id}
          className={`vel-bar ${selected.includes(note.id) ? "selected" : ""}`}
          style={{
            left: (note.start / STEP_TICKS) * PX_PER_STEP,
            width: Math.max(4, (note.duration / STEP_TICKS) * PX_PER_STEP - 3),
            height: `${Math.round(note.velocity * 100)}%`,
          }}
          title={`Velocity ${Math.round(note.velocity * 100)}`}
          onPointerDown={(e) => drag(e, note)}
        />
      ))}
    </div>
  );
}
