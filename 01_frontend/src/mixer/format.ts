/** Readouts shared by the mixer strips and the automation lanes, so both say the same thing. */
export const db = (v: number): string => `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`;
export const pan = (v: number): string => (Math.abs(v) < 0.01 ? "C" : `${Math.round(Math.abs(v) * 100)}${v < 0 ? "L" : "R"}`);
