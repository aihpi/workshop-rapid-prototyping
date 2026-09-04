import { ops, ticksPerBar } from "@hpi/shared";
import { useCallback, useRef } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { actions, SNAP_OPTIONS } from "./actions.ts";
import { Grid, Ruler } from "./Canvases.tsx";
import { ClipView } from "./ClipView.tsx";
import { contentBars, floorToGrid, HEADER_W, pxToTick, ROW_H, rowAt, RULER_H } from "./geometry.ts";
import { startClipGesture } from "./gesture.ts";
import { Playhead } from "./Playhead.tsx";
import { swatchCss } from "./swatch.ts";
import { useShortcuts } from "./useShortcuts.ts";
import { useViewportWidth } from "./useScroller.ts";

/**
 * The arrangement view. One scroll container holds a CSS grid: the ruler is
 * sticky to the top, track headers sticky to the left, and the two canvases
 * are viewport-sized and redraw with the scroll offset. Clips are DOM.
 */
export function Timeline() {
  const doc = useSongStore((s) => s.doc);
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const snap = useUiStore((s) => s.snapTicks);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const viewportTotal = useViewportWidth(scrollerRef);
  const viewportW = Math.max(0, viewportTotal - HEADER_W);
  useShortcuts();

  const tpb = ticksPerBar(doc.meta.timeSig);
  const bars = contentBars(ops.songEndTick(doc), tpb, pxPerBar, viewportW);
  const contentPx = bars * pxPerBar;
  const lanesH = Math.max(doc.trackOrder.length, 1) * ROW_H;

  const onClipPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, clipId: string, mode: "move" | "resize") => {
      const lanes = lanesRef.current;
      if (!lanes || e.button !== 0) return;
      const state = useSongStore.getState().doc;
      const ui = useUiStore.getState();
      startClipGesture(e.nativeEvent, e.currentTarget, clipId, mode, {
        lanes,
        pxPerBar,
        ticksPerBar: tpb,
        snap,
        trackOrder: state.trackOrder,
        trackKind: (id) => state.tracks[id]?.kind,
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
    [pxPerBar, tpb, snap],
  );

  const onLanesDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const lanes = lanesRef.current;
    const onEmptyLane = e.target === lanes || (e.target as HTMLElement).classList.contains("grid-canvas");
    if (!lanes || !onEmptyLane) return;
    const rect = lanes.getBoundingClientRect();
    const row = rowAt(e.clientY - rect.top, doc.trackOrder.length);
    if (row === null) return;
    const trackId = doc.trackOrder[row]!;
    const tick = pxToTick(e.clientX - rect.left, pxPerBar, tpb);
    actions.addClipAt(trackId, floorToGrid(tick, snap || tpb));
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
            {doc.trackOrder.map((id) => (
              <TrackHeader key={id} trackId={id} />
            ))}
            {doc.trackOrder.length === 0 && <div className="track-header muted">No tracks yet</div>}
          </div>
          <div className="lanes" ref={lanesRef} style={{ height: lanesH }} onDoubleClick={onLanesDoubleClick} onPointerDown={onLanesPointerDown}>
            <Grid scrollerRef={scrollerRef} viewportW={viewportW} />
            <div className="clips">
              {Object.values(doc.clips).map((clip) => {
                const row = doc.trackOrder.indexOf(clip.trackId);
                return row === -1 ? null : <ClipView key={clip.id} clip={clip} row={row} onPointerDown={onClipPointerDown} />;
              })}
            </div>
            <Playhead scrollerRef={scrollerRef} height={lanesH} />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrackHeader({ trackId }: { trackId: string }) {
  const track = useSongStore((s) => s.doc.tracks[trackId]);
  if (!track) return null;
  return (
    <div className="track-header" style={{ height: ROW_H, ["--track-colour" as string]: swatchCss(track.colour) }}>
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
        <span className="muted small">{track.instrument.kind}</span>
      </div>
      <div className="track-buttons">
        <button className={`chip ${track.mix.mute ? "on" : ""}`} onClick={() => actions.toggleMute(trackId)} title="Mute">
          M
        </button>
        <button className={`chip ${track.mix.solo ? "on solo" : ""}`} onClick={() => actions.toggleSolo(trackId)} title="Solo">
          S
        </button>
      </div>
    </div>
  );
}

function Toolbar() {
  const snap = useUiStore((s) => s.snapTicks);
  const setSnap = useUiStore((s) => s.setSnap);
  const tpb = useSongStore((s) => ticksPerBar(s.doc.meta.timeSig));

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
        <select
          className="select"
          value={SNAP_OPTIONS.findIndex((o) => o.ticks(tpb) === snap)}
          onChange={(e) => setSnap(SNAP_OPTIONS[Number(e.target.value)]!.ticks(tpb))}
        >
          {SNAP_OPTIONS.map((o, i) => (
            <option key={o.label} value={i}>
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
        Double-click a lane to add a clip · drag to move · edge to resize · D duplicates · U unlinks · Del deletes
      </span>
    </div>
  );
}
