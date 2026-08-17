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
  // Per-word delay. Defaults to the token value; long captions pass the
  // compressed value from wordStaggerFrames() so the block still lands fast.
  staggerFrames?: number;
};

// The stagger a caption of `wordCount` words should use: the token value,
// compressed just enough that the last word starts within
// motion.maxStaggerSpanFrames of the first. Fractional frames are fine —
// spring() reads a continuous frame.
export const wordStaggerFrames = (wordCount: number): number =>
  wordCount <= 1
    ? motion.staggerFrames
    : Math.min(motion.staggerFrames, motion.maxStaggerSpanFrames / (wordCount - 1));

export const staggeredWordStyle = ({
  frame,
  fps,
  index,
  windowStartFrame,
  reduced,
  staggerFrames = motion.staggerFrames,
}: WordStaggerCtx): React.CSSProperties => {
  const entryFrame = windowStartFrame + index * staggerFrames;
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
  (wordCount - 1) * wordStaggerFrames(wordCount) + motion.wordTransitionFrames * 3;
