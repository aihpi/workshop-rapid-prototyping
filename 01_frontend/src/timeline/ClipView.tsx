import { ops, ticksPerBar } from "@hpi/shared";
import type { Clip } from "@hpi/shared";
import { memo } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { CLIP_PAD, RESIZE_HANDLE_W, ROW_H, tickToPx } from "./geometry.ts";
import { swatchCss } from "./swatch.ts";

type Props = {
  clip: Clip;
  row: number;
  onPointerDown: (e: React.PointerEvent<HTMLElement>, clipId: string, mode: "move" | "resize") => void;
};

/**
 * One clip on the timeline. Position is a transform, width is a width, both
 * from ticks. Memoised on the clip object, so a note edit that leaves this
 * clip's reference alone does not re-render it.
 */
export const ClipView = memo(function ClipView({ clip, row, onPointerDown }: Props) {
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const selected = useUiStore((s) => s.selectedClipIds.includes(clip.id));
  const editing = useUiStore((s) => s.editingClipId === clip.id);
  const track = useSongStore((s) => s.doc.tracks[clip.trackId]);
  const pattern = useSongStore((s) => s.doc.patterns[clip.patternId]);
  const linked = useSongStore((s) => ops.placementCount(s.doc, clip.patternId));
  const tpb = useSongStore((s) => ticksPerBar(s.doc.meta.timeSig));
  const setEditing = useUiStore((s) => s.setEditingClip);

  if (!track || !pattern) return null;

  const x = tickToPx(clip.startTick, pxPerBar, tpb);
  const w = tickToPx(clip.lengthTicks, pxPerBar, tpb);
  const className = ["clip", selected && "selected", editing && "editing"].filter(Boolean).join(" ");

  return (
    <div
      className={className}
      data-clip-id={clip.id}
      style={{
        transform: `translate(${x}px, ${row * ROW_H + CLIP_PAD}px)`,
        width: w - 1,
        height: ROW_H - CLIP_PAD * 2,
        ["--clip-colour" as string]: swatchCss(track.colour),
      }}
      onPointerDown={(e) => onPointerDown(e, clip.id, "move")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(clip.id);
      }}
    >
      <span className="clip-name">{pattern.name}</span>
      {linked > 1 && (
        <span className="clip-link" title={`${linked} clips share this pattern. Edit one, all change. Press U to make this one unique.`}>
          ⧉{linked}
        </span>
      )}
      <span className="clip-notes">{pattern.notes.length ? `${pattern.notes.length} notes` : "empty"}</span>
      <div
        className="clip-handle"
        style={{ width: RESIZE_HANDLE_W }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(e, clip.id, "resize");
        }}
      />
    </div>
  );
});
