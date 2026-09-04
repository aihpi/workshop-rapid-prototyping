import { mixerActions } from "./mixerActions.ts";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  vertical?: boolean;
  format?: (v: number) => string;
  onChange: (value: number) => void;
};

/**
 * A range input that opens an undo transaction on press and closes it on
 * release, so dragging is one step. Double-click resets to the midpoint of the
 * range, or to 0 when 0 is inside it.
 */
export function Fader({ label, value, min, max, step, unit, vertical, format, onChange }: Props) {
  const shown = format ? format(value) : `${Number.isInteger(step ?? 1) ? Math.round(value) : value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
  const reset = min <= 0 && max >= 0 ? 0 : (min + max) / 2;
  return (
    <label className={`fader ${vertical ? "vertical" : ""}`}>
      <span className="fader-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? (max - min) / 200}
        value={value}
        onPointerDown={() => mixerActions.begin(label)}
        onPointerUp={mixerActions.end}
        onPointerCancel={mixerActions.end}
        onBlur={mixerActions.end}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(reset)}
        aria-label={label}
        {...(vertical ? { style: { writingMode: "vertical-lr" as const, direction: "rtl" as const } } : {})}
      />
      <span className="fader-value mono">{shown}</span>
    </label>
  );
}
