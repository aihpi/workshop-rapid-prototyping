import type { HpiSwatch } from "@hpi/shared";

/**
 * Brand swatch to a colour. `swatchCss` is for stylesheets and inline styles;
 * `resolveSwatch` gives canvas code an actual rgb string by reading the token
 * from the stylesheet, so canvas and DOM stay on the same palette without any
 * hex leaving hpi.css. Shades are tints toward white, as in the brand manual.
 */
export const swatchCss = (swatch: HpiSwatch): string =>
  swatch.shade === 100
    ? `var(--hpi-${swatch.hue})`
    : `color-mix(in srgb, var(--hpi-${swatch.hue}) ${swatch.shade}%, white)`;

const cache = new Map<string, string>();

export function resolveSwatch(swatch: HpiSwatch): string {
  const key = `${swatch.hue}-${swatch.shade}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const token = getComputedStyle(document.documentElement).getPropertyValue(`--hpi-${swatch.hue}`).trim();
  const [r, g, b] = hexToRgb(token);
  const t = swatch.shade / 100;
  const mix = (c: number) => Math.round(c * t + 255 * (1 - t));
  const out = `rgb(${mix(r)} ${mix(g)} ${mix(b)})`;
  cache.set(key, out);
  return out;
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
