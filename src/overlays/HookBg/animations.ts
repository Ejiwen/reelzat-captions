import type React from "react";
import { Easing, interpolate } from "remotion";
import type { HookBgConfig } from "./types";

// All HookBg motion, split into the three phases the design demands:
//  1. entrance — opacity rise, scale/translate settle, one light sweep
//  2. stable reading — only a slow monotonic gradient drift
//  3. exit — dissolve + slight outward ease, driven by the Hook's own
//     exitProgress so background and words always leave together.
// Everything is a pure function of frame state — no springs with side
// effects, no randomness, no loops.

export type HookBgMotionCtx = {
  frame: number;
  fps: number;
  // width / 1080 — px values are authored at 1080 and scale with it.
  pxScale: number;
  windowStartFrame: number;
  exitProgress: number;
  config: HookBgConfig;
  reduced?: boolean;
};

const atFps = (framesAt30: number, fps: number): number =>
  Math.max(1, Math.round((framesAt30 / 30) * fps));

// 0 → 1 eased entrance progress.
export const hookBgEntrance = ({ frame, fps, windowStartFrame, config }: HookBgMotionCtx): number =>
  interpolate(
    frame,
    [windowStartFrame, windowStartFrame + atFps(config.entranceFrames, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

// Container opacity + transform across all three phases. The base transform
// depends on the silhouette: the ellipse is centred on both axes and scales
// uniformly; the band is centred vertically only and scales on Y alone, so
// its edge-to-edge width never reveals a horizontal gap mid-entrance.
export const hookBgContainerStyle = (ctx: HookBgMotionCtx): React.CSSProperties => {
  const { config, exitProgress, reduced, pxScale } = ctx;
  const entrance = hookBgEntrance(ctx);
  const opacity = config.opacity * entrance * (1 - exitProgress);
  const isBand = config.shape === "band";
  const baseTransform = isBand ? "translateY(-50%)" : "translate(-50%, -50%)";

  if (reduced) {
    // Reduced mode: no spatial movement — a plain deterministic cross-fade.
    return { opacity, transform: baseTransform };
  }

  const entranceScale = config.entranceScaleFrom + (1 - config.entranceScaleFrom) * entrance;
  const scale = entranceScale + (config.exitScaleTo - 1) * exitProgress;
  const translateY =
    (config.entranceTranslateYPx * (1 - entrance) - 6 * exitProgress) * pxScale;
  const scalePart = isBand ? `scaleY(${scale.toFixed(4)})` : `scale(${scale.toFixed(4)})`;

  return {
    opacity,
    transform: `${baseTransform} translateY(${translateY.toFixed(2)}px) ${scalePart}`,
  };
};

// Stable-period drift for the two gradient fields. Monotonic travel over
// driftPeriodSeconds, eased so it decelerates instead of stopping dead —
// almost imperceptible while reading, and it never reverses or loops.
// `direction` +1 for the primary field, -1 for the secondary.
export const hookBgDriftStyle = (
  ctx: HookBgMotionCtx,
  direction: 1 | -1,
): React.CSSProperties => {
  const { frame, fps, windowStartFrame, config, reduced, pxScale } = ctx;
  if (reduced) {
    return {};
  }
  const travel = interpolate(
    frame,
    [windowStartFrame, windowStartFrame + Math.max(1, Math.round(config.driftPeriodSeconds * fps))],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    },
  );
  const amount = config.driftAmountPx * pxScale * travel * direction;
  // Diagonal drift, secondary offset on a different axis ratio so the two
  // fields never read as a single moving unit.
  const x = amount * (direction === 1 ? 0.7 : 1);
  const y = amount * (direction === 1 ? -1 : 0.55);
  return { transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)` };
};

// One-pass directional light sweep, entering with the Hook. It starts once
// the veil is mostly up, crosses the band once, then never returns.
export const hookBgSweepStyle = (ctx: HookBgMotionCtx): React.CSSProperties => {
  const { frame, fps, windowStartFrame, config, reduced } = ctx;
  if (!config.lightSweepEnabled || reduced) {
    return { opacity: 0 };
  }
  const start = windowStartFrame + atFps(Math.round(config.entranceFrames * 0.5), fps);
  const end = start + atFps(config.entranceFrames * 2.4, fps);
  const x = interpolate(frame, [start, end], [-160, 260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const peak = start + Math.round((end - start) * 0.35);
  const opacity = interpolate(
    frame,
    [start, peak, end],
    [0, config.lightSweepOpacity, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return {
    opacity,
    transform: `translateX(${x.toFixed(2)}%) rotate(14deg)`,
  };
};
