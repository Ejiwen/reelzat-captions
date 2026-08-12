import { interpolate, spring } from "remotion";
import { springs } from "../../design/tokens";
import { enterDuration, type MotionSpec } from "../../motion";

// The hook is the strongest element on screen: blur-in + springPop entrance
// (blurIn's scale already rides springs.enter from 0.94), quick dip exit.
export const hookDefaultAnimation: MotionSpec = { enter: "blurIn", exit: "dipExit" };

// Accent underline sweep: scaleX 0 → 1 on the shared enter spring, starting
// once the text itself has resolved so it reads as punctuation, not noise.
export const underlineSweep = (
  frame: number,
  fps: number,
  windowStartFrame: number,
  reduced?: boolean,
): number => {
  const sweepStart = windowStartFrame + Math.round(enterDuration(fps) * 0.6);
  const local = frame - sweepStart;
  if (reduced) {
    return interpolate(local, [0, enterDuration(fps)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }
  return local < 0 ? 0 : spring({ frame: local, fps, config: springs.enter });
};
