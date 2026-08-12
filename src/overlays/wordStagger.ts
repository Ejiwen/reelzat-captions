import type React from "react";
import { interpolate, spring } from "remotion";
import { motion, springs } from "../design/tokens";

// Word-level entrance for authored captions — the same movement grammar as
// the wordPop theme (rise 28px + scale from 0.94 on springs.enter, 3-frame
// stagger), reused here because authored captions have no per-word timing:
// order alone drives the stagger. The word stays the smallest animatable
// unit; only opacity and transform ever change.

export type WordStaggerCtx = {
  frame: number;
  fps: number;
  index: number;
  windowStartFrame: number;
  reduced?: boolean;
};

export const staggeredWordStyle = ({
  frame,
  fps,
  index,
  windowStartFrame,
  reduced,
}: WordStaggerCtx): React.CSSProperties => {
  const entryFrame = windowStartFrame + index * motion.staggerFrames;
  const local = frame - entryFrame;

  if (reduced) {
    const t = interpolate(local, [0, motion.wordTransitionFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { opacity: t };
  }

  const s = local < 0 ? 0 : spring({ frame: local, fps, config: springs.enter });
  if (Math.abs(s - 1) < 0.001) {
    return {};
  }
  const translateY = motion.popTranslatePx * (1 - s);
  const scale = motion.popScaleFrom + (1 - motion.popScaleFrom) * s;
  return {
    opacity: s,
    transform: `translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
  };
};

// Frames it takes the LAST of `wordCount` words to finish entering — used by
// OverlayRoot's trail gate indirectly (isInEntryWindow) and by demos.
export const staggerSettleFrames = (wordCount: number): number =>
  (wordCount - 1) * motion.staggerFrames + motion.wordTransitionFrames * 3;
