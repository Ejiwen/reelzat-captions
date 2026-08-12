import { formatHex, interpolate as interpolateColours, oklch } from "culori";

// All colour interpolation goes through OKLCH. Interpolating navy → cyan in
// RGB passes through a muddy grey midpoint; OKLCH stays perceptually clean.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// Returns a t => hex function interpolating through the given stops in OKLCH.
export const oklchRamp = (stops: string[]): ((t: number) => string) => {
  const mixer = interpolateColours(stops, "oklch");
  return (t: number) => formatHex(mixer(clamp01(t)));
};

// Two-colour convenience mix.
export const mixOklch = (from: string, to: string, t: number): string =>
  formatHex(interpolateColours([from, to], "oklch")(clamp01(t)));

// Fade a chromatic colour into a near-neutral without rotating its hue on the
// way. Generic OKLCH interpolation may travel gold → green → cyan when the
// destination has tiny blue chroma; reducing chroma at the source hue avoids
// that unwanted rainbow while retaining perceptual lightness interpolation.
export const fadeToNeutralOklch = (from: string, to: string, t: number): string => {
  const progress = clamp01(t);
  if (progress >= 1) {
    return to;
  }
  const start = oklch(from);
  const end = oklch(to);
  if (!start || !end) {
    return mixOklch(from, to, progress);
  }
  return formatHex({
    mode: "oklch",
    l: start.l + (end.l - start.l) * progress,
    c: (start.c ?? 0) * (1 - progress),
    h: start.h,
  });
};

// Shift perceptual lightness within the same hue — the calm alternative to a
// two-colour swap for the karaoke active-word state.
export const shiftLightness = (colour: string, deltaL: number): string => {
  const c = oklch(colour);
  if (!c) {
    return colour;
  }
  return formatHex({ ...c, l: clamp01((c.l ?? 0) + deltaL) });
};
