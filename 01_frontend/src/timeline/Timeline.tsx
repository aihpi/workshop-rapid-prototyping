import { AUTOMATION_RANGES, MIX_AUTOMATION_PARAMS, ops, ticksPerBar } from "@hpi/shared";
import type { MixAutomationParam } from "@hpi/shared";
import { useCallback, useMemo, useRef } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { actions } from "./actions.ts";
import { AutomationLane } from "./AutomationLane.tsx";
import { Grid, Ruler } from "./Canvases.tsx";
import { ClipView } from "./ClipView.tsx";
import { contentBars, floorToGrid, HEADER_W, LANE_H, layoutHeight, pxToTick, ROW_H, rowAtY, rowLayout, RULER_H } from "./geometry.ts";
import { startClipGesture } from "./gesture.ts";
import { Playhead } from "./Playhead.tsx";
import { SNAP_OPTIONS, snapTicksFor } from "./snap.ts";
import type { SnapName } from "./snap.ts";
import { swatchCss } from "./swatch.ts";
import { useShortcuts } from "./useShortcuts.ts";
import { useViewportWidth } from "./useScroller.ts";

/**
 * The arrangement view. One scroll container holds a CSS grid: the ruler is
 * sticky to the top, track headers sticky to the left, and the two canvases
 * are viewport-sized and redraw with the scroll offset. Clips are DOM. A track
 * with an open automation lane is taller, so rows go through `rowLayout`.
 */
export function Timeline() {
  const doc = useSongStore((s) => s.doc);
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const snapName = useUiStore((s) => s.snap);
  const snap = snapTicksFor(snapName, doc.meta.timeSig);
  const lanes = useUiStore((s) => s.automationLanes);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const viewportTotal = useViewportWidth(scrollerRef);
  const viewportW = Math.max(0, viewportTotal - HEADER_W);
  useShortcuts();

  const tpb = ticksPerBar(doc.meta.timeSig);
  const bars = contentBars(ops.songEndTick(doc), tpb, pxPerBar, viewportW);
  const contentPx = bars * pxPerBar;
  const rows = useMemo(() => rowLayout(doc.trackOrder, lanes), [doc.trackOrder, lanes]);
  const lanesH = layoutHeight(rows);
  const rowTop = useCallback((trackId: string) => rows.find((r) => r.trackId === trackId)?.top ?? 0, [rows]);

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, clipId: string, mode: "move" | "resize") => {
      const lanesEl = lanesRef.current;
      if (!lanesEl || e.button !== 0) return;
      const state = useSongStore.getState().doc;
      const ui = useUiStore.getState();
      startClipGesture(e.nativeEvent, e.currentTarget, clipId, mode, {
        lanes: lanesEl,
        pxPerBar,
        ticksPerBar: tpb,
        snap,
        trackOrder: state.trackOrder,
        trackKind: (id) => state.tracks[id]?.kind,
        rowTop,
        trackAtY: (y) => rowAtY(y, rows)?.row.trackId,
        clip: (id) => state.clips[id],
        group: (id) => (ui.selectedClipIds.includes(id) ? ui.selectedClipIds : [id]),
        onMove: actions.moveClips,
        onResize: actions.resizeClip,
        onClick: (id, additive) => {
          if (additive) ui.toggleSelected(id);
          else ui.select([id]);
        },
      });
    },
    [pxPerBar, tpb, snap, rowTop, rows],
  );

  const onLanesDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const lanesEl = lanesRef.current;
    const onEmptyLane = e.target === lanesEl || (e.target as HTMLElement).classList.contains("grid-canvas");
    if (!lanesEl || !onEmptyLane) return;
    const rect = lanesEl.getBoundingClientRect();
    const hit = rowAtY(e.clientY - rect.top, rows);
    if (!hit || !hit.inClips) return;
    const tick = pxToTick(e.clientX - rect.left, pxPerBar, tpb);
    actions.addClipAt(hit.row.trackId, floorToGrid(tick, snap || tpb));
  };

  const onLanesPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === lanesRef.current || (e.target as HTMLElement).classList.contains("grid-canvas")) {
      useUiStore.getState().clearSelection();
    }
  };

  return (
    <section className="timeline">
      <Toolbar />
      <div className="scroller" ref={scrollerRef}>
        <div className="content" style={{ gridTemplateColumns: `${HEADER_W}px ${contentPx}px`, width: HEADER_W + contentPx }}>
          <div className="corner" style={{ height: RULER_H }} />
          <div className="ruler" style={{ height: RULER_H }}>
            <Ruler scrollerRef={scrollerRef} viewportW={viewportW} />
          </div>
          <div className="headers">
            {rows.map((row) => (
              <TrackHeader key={row.trackId} trackId={row.trackId} lane={row.lane} />
            ))}
            {doc.trackOrder.length === 0 && <div className="track-header muted">No tracks yet</div>}
          </div>
          <div className="lanes" ref={lanesRef} style={{ height: lanesH }} onDoubleClick={onLanesDoubleClick} onPointerDown={onLanesPointerDown}>
            <Grid scrollerRef={scrollerRef} viewportW={viewportW} rows={rows} height={lanesH} />
            <div className="clips">
              {Object.values(doc.clips).map((clip) => {
                const row = rows.find((r) => r.trackId === clip.trackId);
                return row ? <ClipView key={clip.id} clip={clip} top={row.top} onPointerDown={onClipPointerDown} /> : null;
              })}
              {rows.map((row) => {
                const track = row.lane ? doc.tracks[row.trackId] : undefined;
                return track && row.lane ? <AutomationLane key={row.trackId} track={track} param={row.lane} top={row.top + ROW_H} width={contentPx} /> : null;
              })}
            </div>
            <Playhead scrollerRef={scrollerRef} height={lanesH} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackHeader({ trackId, lane }: { trackId: string; lane: MixAutomationParam | null }) {
  const track = useSongStore((s) => s.doc.tracks[trackId]);
  const setLane = useUiStore((s) => s.setAutomationLane);
  if (!track) return null;
  const automated = Object.keys(track.automation).length > 0;
  return (
    <div className="track-block" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <div className="track-header" style={{ height: ROW_H }}>
        <div className="track-swatch" />
        <div className="track-meta">
          <button
            className="track-name"
            onDoubleClick={() => {
              const name = window.prompt("Track name", track.name);
              if (name && name !== track.name) actions.renameTrack(trackId, name);
            }}
            title="Double-click to rename"
          >
            {track.name}
          </button>
          <span className="muted small">
            {track.instrument.kind}
            {track.effects.length ? ` · ${track.effects.length} fx` : ""}
          </span>
        </div>
        <div className="track-buttons">
          <button className={`chip ${track.mix.mute ? "on" : ""}`} onClick={() => actions.toggleMute(trackId)} title="Mute">
            M
          </button>
          <button className={`chip ${track.mix.solo ? "on solo" : ""}`} onClick={() => actions.toggleSolo(trackId)} title="Solo">
            S
          </button>
          <button
            className={`chip ${lane ? "on" : automated ? "dot" : ""}`}
            aria-pressed={lane !== null}
            onClick={() => setLane(trackId, lane ? null : "volume")}
            title={lane ? "Close the automation lane" : "Automation"}
            aria-label="Automation"
          >
            A
          </button>
        </div>
      </div>
      {lane && (
        <div className="lane-header" style={{ height: LANE_H }}>
          <select className="select" value={lane} onChange={(e) => setLane(trackId, e.target.value as MixAutomationParam)} aria-label="Automated parameter">
            {MIX_AUTOMATION_PARAMS.map((p) => (
              <option key={p} value={p}>
                {AUTOMATION_RANGES[p].label}
                {track.automation[p]?.points.length ? " •" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function Toolbar() {
  const snap = useUiStore((s) => s.snap);
  const setSnap = useUiStore((s) => s.setSnap);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="button ghost" onClick={() => actions.zoomBy(1 / 1.4)} title="Zoom out">
          −
        </button>
        <button className="button ghost" onClick={() => actions.zoomBy(1.4)} title="Zoom in">
          +
        </button>
      </div>
      <label className="toolbar-group">
        <span className="muted small">Snap</span>
        <select className="select" value={snap} onChange={(e) => setSnap(e.target.value as SnapName)}>
          {SNAP_OPTIONS.map((o) => (
            <option key={o.name} value={o.name}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="toolbar-group">
        <button className="button ghost" onClick={() => actions.addTrack("drum", "kit", "Drums")}>
          + Drums
        </button>
        <button className="button ghost" onClick={() => actions.addTrack("pitched", "poly", "Synth")}>
          + Synth
        </button>
        <button className="button ghost" onClick={() => actions.addSectionAt(0)}>
          + Section
        </button>
      </div>
      <span className="muted small toolbar-hint">
        Double-click a lane to add a clip · drag to move · edge to resize · A opens automation · D duplicates · U unlinks · Del deletes
      </span>
    </div>
  );
}
