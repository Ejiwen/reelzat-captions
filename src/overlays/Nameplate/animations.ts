import { interpolate } from "remotion";
import type { MotionSpec } from "../../motion";
import type { OverlayWindow } from "../types";

// Persistent-but-quiet: slides in from the inline-start edge once the hook
// has exited, then just sits there. The exit is a formality — the nameplate
// usually lives until the last frame.
export const nameplateDefaultAnimation: MotionSpec = {
  enter: "slideEdge",
  exit: "fadeThrough",
};

const DIM_RAMP_FRAMES = 8;
const DIM_OPACITY = 0;

// The nameplate must never compete with — or physically collide with — a
// caption sharing its band: while any dim window is active it yields fully
// (opacity 0), ramping over 8 frames on each edge. Multiplied into the
// motion style's opacity.
export const dimFactor = (frame: number, dimWindows: OverlayWindow[]): number => {
  let factor = 1;
  for (const w of dimWindows) {
    const inRamp = interpolate(
      frame,
      [w.startFrame - DIM_RAMP_FRAMES, w.startFrame, w.endFrame - DIM_RAMP_FRAMES, w.endFrame],
      [1, DIM_OPACITY, DIM_OPACITY, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    factor = Math.min(factor, inRamp);
  }
  return factor;
};
