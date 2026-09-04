import { z } from "zod";

// The brand manual allows the four primary CI colours in 100/75/50/25 percent
// gradations, and only one secondary colour on screen at a time. Encoding a
// swatch as hue plus shade, rather than as a hex value, makes it impossible to
// store an off-brand colour in a song document.
export const HPI_HUES = ["red", "orange", "yellow", "grey"] as const;
export const HPI_SHADES = [100, 75, 50, 25] as const;

export const HpiSwatchSchema = z.object({
  hue: z.enum(HPI_HUES),
  shade: z.union([z.literal(100), z.literal(75), z.literal(50), z.literal(25)]),
});

export type HpiHue = (typeof HPI_HUES)[number];
export type HpiShade = (typeof HPI_SHADES)[number];
export type HpiSwatch = z.infer<typeof HpiSwatchSchema>;

/** Cycles through hues, then shades, so the first eight tracks are all distinct. */
export const swatchForIndex = (index: number): HpiSwatch => {
  const hue = HPI_HUES[index % HPI_HUES.length]!;
  const shade = HPI_SHADES[Math.floor(index / HPI_HUES.length) % HPI_SHADES.length]!;
  return { hue, shade };
};
