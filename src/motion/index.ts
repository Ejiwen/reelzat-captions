import type React from "react";
import { z } from "zod";
import { blurIn } from "./blurIn";
import { dipExit } from "./dipExit";
import { fadeThrough } from "./fadeThrough";
import { mergeMotionStyles } from "./merge";
import { riseMask } from "./riseMask";
import { slideEdge } from "./slideEdge";
import { springPop } from "./springPop";
import { enterDuration, EXIT_PAD_FRAMES } from "./timing";
import type { MotionCtx, MotionPresetPair } from "./types";

export * from "./types";
export * from "./merge";
export {
  enterDuration,
  exitDuration,
  exitStartFrame,
  EXIT_PAD_FRAMES,
  enterSpring,
  enterLinear,
  exitLinear,
  exitSpring,
} from "./timing";

// Adding an effect = one file in src/motion/ + one line here — the same
// pattern as the theme registry in src/themes/index.ts.
export const motionPresets = {
  fadeThrough,
  springPop,
  riseMask,
  blurIn,
  slideEdge,
  dipExit,
} as const satisfies Record<string, MotionPresetPair>;

export type MotionPresetName = keyof typeof motionPresets;

const presetNames = Object.keys(motionPresets) as [MotionPresetName, ...MotionPresetName[]];

// Every overlay accepts `animation={{ enter, exit }}` — this is the Studio
// schema for that prop.
export const motionSpecSchema = z.object({
  enter: z.enum(presetNames),
  exit: z.enum(presetNames),
});
export type MotionSpec = z.infer<typeof motionSpecSchema>;

// The style an overlay applies to its root: the enter half of one preset
// merged with the exit half of another. Outside their transition windows
// both return identity, so steady-state frames carry no animation styles.
export const overlayMotionStyle = (spec: MotionSpec, ctx: MotionCtx): React.CSSProperties =>
  mergeMotionStyles(motionPresets[spec.enter].enter(ctx), motionPresets[spec.exit].exit(ctx));

// Motion-blur gate: Trail may wrap an overlay only while its entry motion is
// still resolving (plus a few settle frames) — never on a static element.
export const isInEntryWindow = (ctx: MotionCtx): boolean =>
  ctx.frame < ctx.window.startFrame + enterDuration(ctx.fps) + 6;
