import { interpolate, spring } from "remotion";
import { motion, palette, springs } from "../design/tokens";
import type { Theme } from "./index";

// Words enter sequentially with a 3-frame stagger and stay once entered.
// The whole segment fades out over its last 6 frames (paired with a settle
// transform — never opacity alone).

export const wordPop: Theme = {
  id: "wordPop",

  renderWord: ({ frame, fps, index, isEmphasised, segmentStartFrame }) => {
    const entryFrame = segmentStartFrame + index * motion.staggerFrames;
    const local = frame - entryFrame;
    const s = local < 0 ? 0 : spring({ frame: local, fps, config: springs.enter });

    const translateY = motion.popTranslatePx * (1 - s);
    const scale = motion.popScaleFrom + (1 - motion.popScaleFrom) * s;

    return {
      color: isEmphasised ? palette.cyan : palette.ink,
      opacity: s,
      transform: `translateY(${translateY}px) scale(${scale})`,
    };
  },

  renderContainer: ({ frame, segmentEndFrame }) => {
    const t = interpolate(
      frame,
      [segmentEndFrame - motion.segmentExitFrames, segmentEndFrame],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    return {
      opacity: t,
      transform: `scale(${0.98 + 0.02 * t})`,
    };
  },

  // Entry moves 28px in ~4 frames — over the ~25px/5-frame blur threshold, so
  // Trail applies, but only during the entry window.
  trail: { layers: 3, lagInFrames: 0.5, trailOpacity: 0.6, entryWindowInFrames: 24 },
};
