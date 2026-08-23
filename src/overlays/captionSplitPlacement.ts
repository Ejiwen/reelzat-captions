import type React from "react";
import type { OverlaySafeArea, OverlaySplitWindow } from "./types";

const TRANSITION_FRAMES_AT_30 = 8;

const smoothstep = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export type CaptionSplitPlacement = {
  mix: number;
  centerYPct: number;
};

// Captions arrive at the seam exactly when the split appears, then settle
// back after it ends. The small pre-roll reads as anticipation of the cut and
// guarantees no split-screen frame is rendered with the caption over a face.
export const captionSplitPlacementAtFrame = ({
  frame,
  fps,
  windows,
  reduced = false,
}: {
  frame: number;
  fps: number;
  windows: OverlaySplitWindow[];
  reduced?: boolean;
}): CaptionSplitPlacement => {
  let best: CaptionSplitPlacement = { mix: 0, centerYPct: 50 };
  const transitionFrames = Math.max(
    1,
    Math.round((TRANSITION_FRAMES_AT_30 / 30) * fps),
  );

  for (const window of windows) {
    let mix = 0;
    if (reduced) {
      mix = frame >= window.startFrame && frame < window.endFrame ? 1 : 0;
    } else if (
      frame >= window.startFrame - transitionFrames &&
      frame < window.startFrame
    ) {
      mix = smoothstep(
        (frame - (window.startFrame - transitionFrames)) / transitionFrames,
      );
    } else if (frame >= window.startFrame && frame <= window.endFrame) {
      mix = 1;
    } else if (
      frame > window.endFrame &&
      frame <= window.endFrame + transitionFrames
    ) {
      mix = 1 - smoothstep((frame - window.endFrame) / transitionFrames);
    }

    if (mix > best.mix) {
      best = { mix, centerYPct: window.centerYPct };
    }
  }

  return best;
};

// Natural captions are bottom-anchored. At mix=1 the bottom edge moves to
// the seam and translateY(50%) puts the card's visual centre exactly on it.
export const captionPlacementStyle = ({
  frame,
  fps,
  height,
  safeArea,
  bottomOffsetPx,
  windows,
  reduced,
}: {
  frame: number;
  fps: number;
  height: number;
  safeArea: OverlaySafeArea;
  bottomOffsetPx: number;
  windows: OverlaySplitWindow[];
  reduced?: boolean;
}): React.CSSProperties => {
  const placement = captionSplitPlacementAtFrame({
    frame,
    fps,
    windows,
    reduced,
  });
  const splitBottomPx = height * (1 - placement.centerYPct / 100);
  const bottom =
    bottomOffsetPx + (splitBottomPx - bottomOffsetPx) * placement.mix;

  return {
    insetInline: `${safeArea.sidePct}%`,
    bottom,
    transform:
      placement.mix > 0.0001
        ? `translateY(${(placement.mix * 50).toFixed(3)}%)`
        : undefined,
  };
};
