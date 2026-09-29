import { AUTOMATION_RANGES, mixValueFor, ops, snapTicks, ticksPerBar } from "@hpi/shared";
import type { MixAutomationParam, Track } from "@hpi/shared";
import { memo } from "react";

import { db, pan } from "../mixer/format.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import { LANE_H, laneYToValue, tickToPx, valueToLaneY } from "./geometry.ts";
import { snapTicksFor } from "./snap.ts";
import { swatchCss } from "./swatch.ts";

type Props = { track: Track; param: MixAutomationParam; top: number; width: number };

const format = (param: MixAutomationParam, value: number): string => (param === "volume" ? db(value) : param === "pan" ? pan(value) : value.toFixed(2));

/**
 * One parameter's lane under its track. The line is an SVG so it scales with
 * zoom for free; the points are DOM so they can be grabbed. Click adds a
 * point, dragging one writes once on release, double-click removes it. With no
 * points the lane shows where the fader sits, as a dashed line.
 */
export const AutomationLane = memo(function AutomationLane({ track, param, top, width }: Props) {
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const snap = snapTicksFor(
    useUiStore((s) => s.snap),
    timeSig,
  );
  const tpb = ticksPerBar(timeSig);
  const apply = useSongStore((s) => s.apply);
  const range = AUTOMATION_RANGES[param];
  const points = track.automation[param]?.points ?? [];
  const x = (tick: number) => tickToPx(tick, pxPerBar, tpb);
  const y = (value: number) => valueToLaneY(value, range.min, range.max, LANE_H);

  const tickAt = (clientX: number, lane: HTMLElement, grid = snap || tpb) => Math.max(0, snapTicks((clientX - lane.getBoundingClientRect().left) / pxPerBar * tpb, grid));
  const valueAt = (clientY: number, lane: HTMLElement) => Number(laneYToValue(clientY - lane.getBoundingClientRect().top, range.min, range.max, LANE_H).toFixed(2));

  const onLanePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const lane = e.currentTarget;
    const tick = tickAt(e.clientX, lane);
    const value = valueAt(e.clientY, lane);
    apply("Add automation point", (d) => ops.setAutomationPoint(d, track.id, param, tick, value));
  };

  /**
   * DOM during the drag, one store write on release, like clips and notes. A
   * point never lands on a neighbour's tick: it keeps its own tick and only
   * takes the new value, so nothing is merged away.
   */
  const onPointPointerDown = (e: React.PointerEvent<HTMLDivElement>, startTick: number, startValue: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const lane = el.parentElement!;
    el.setPointerCapture(e.pointerId);
    let tick = startTick;
    let value = startValue;
    const onMove = (ev: PointerEvent) => {
      const wanted = tickAt(ev.clientX, lane, ev.altKey ? 1 : snap || tpb);
      const taken = wanted !== startTick && points.some((p) => p.tick === wanted);
      tick = taken ? tick : wanted;
      value = valueAt(ev.clientY, lane);
      el.style.transform = `translate(${x(tick)}px, ${y(value)}px)`;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      el.style.transform = `translate(${x(startTick)}px, ${y(startValue)}px)`;
      if (tick === startTick && value === startValue) return;
      apply("Move automation point", (d) => {
        if (tick !== startTick) ops.removeAutomationPoint(d, track.id, param, startTick);
        ops.setAutomationPoint(d, track.id, param, tick, value);
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const line = points.length
    ? [`0,${y(points[0]!.value)}`, ...points.map((p) => `${x(p.tick)},${y(p.value)}`), `${width},${y(points[points.length - 1]!.value)}`].join(" ")
    : null;
  const restY = y(mixValueFor(track.mix, param));

  return (
    <div className="automation-lane" style={{ top, width, height: LANE_H, ["--track-colour" as string]: swatchCss(track.colour) }} onPointerDown={onLanePointerDown} title={`${range.label}: click to add a point`}>
      <svg className="lane-svg" width={width} height={LANE_H} aria-hidden="true">
        {line ? <polyline points={line} /> : <line x1={0} x2={width} y1={restY} y2={restY} strokeDasharray="4 4" />}
      </svg>
      {points.map((p) => (
        <div
          key={p.tick}
          className="automation-point"
          style={{ transform: `translate(${x(p.tick)}px, ${y(p.value)}px)` }}
          title={`${format(param, p.value)} · drag to move · double-click to delete`}
          onPointerDown={(e) => onPointPointerDown(e, p.tick, p.value)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            apply("Delete automation point", (d) => ops.removeAutomationPoint(d, track.id, param, p.tick));
          }}
        />
      ))}
    </div>
  );
});
