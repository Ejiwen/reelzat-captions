import { Easing, interpolate } from "remotion";
import type { OverlayWindow } from "../types";
import type { HookEnergyBridgeConfig } from "./config";

// The bridge's whole choreography lives on one deterministic timeline derived
// from the Hook window — no magic frame numbers scattered across components.
//
//   ignitionStart ─ travelStart ─ arrivalStart ─ settleStart ─ settleEnd
//        (pulse)      (launch)      (expansion)     (dissolve)
//                    … stable hold: bridge fully invisible …
//   returnStart ──────────── returnEnd  (quick, quiet pull back + pulse)
//
// The Hook window itself is never modified; a short window compresses the
// entrance proportionally so every phase stays ordered and inside the window.

export type HookEnergyTimeline = {
  ignitionStart: number;
  travelStart: number;
  arrivalStart: number;
  settleStart: number;
  settleEnd: number;
  returnStart: number;
  returnEnd: number;
};

const atFps = (framesAt30: number, fps: number): number =>
  Math.max(1, Math.round((framesAt30 / 30) * fps));

export const hookEnergyTimeline = ({
  window,
  fps,
  config,
}: {
  window: OverlayWindow;
  fps: number;
  config: HookEnergyBridgeConfig;
}): HookEnergyTimeline => {
  const windowLength = Math.max(2, window.endFrame - window.startFrame);

  let ignition = atFps(config.ignitionFrames, fps);
  let travel = atFps(config.travelFrames, fps);
  let expansion = atFps(config.expansionFrames, fps);
  let settle = atFps(config.settleFrames, fps);
  let ret = atFps(config.returnFrames, fps);

  // Clamp: the entrance may use at most the first half of the window, the
  // return at most the last quarter — a very short hook stays coherent.
  const entranceTotal = ignition + travel + expansion + settle;
  const maxEntrance = Math.max(4, Math.floor(windowLength / 2));
  if (entranceTotal > maxEntrance) {
    const k = maxEntrance / entranceTotal;
    ignition = Math.max(1, Math.floor(ignition * k));
    travel = Math.max(1, Math.floor(travel * k));
    expansion = Math.max(1, Math.floor(expansion * k));
    settle = Math.max(1, Math.floor(settle * k));
  }
  ret = Math.min(ret, Math.max(2, Math.floor(windowLength / 4)));

  const ignitionStart = window.startFrame;
  const travelStart = ignitionStart + ignition;
  const arrivalStart = travelStart + travel;
  const settleStart = arrivalStart + expansion;
  const settleEnd = settleStart + settle;
  // The return finishes just before the window closes, mirroring the Hook's
  // own exit pad, and never starts before the entrance has settled.
  const returnEnd = window.endFrame - 2;
  const returnStart = Math.max(settleEnd, returnEnd - ret);

  return { ignitionStart, travelStart, arrivalStart, settleStart, settleEnd, returnStart, returnEnd };
};

// 0→1 progress helpers, all clamped and eased once here.

export const ignitionProgress = (frame: number, tl: HookEnergyTimeline): number =>
  interpolate(frame, [tl.ignitionStart, tl.travelStart], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

export const travelProgress = (frame: number, tl: HookEnergyTimeline): number =>
  interpolate(frame, [tl.travelStart, tl.arrivalStart], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

export const expansionProgress = (frame: number, tl: HookEnergyTimeline): number =>
  interpolate(frame, [tl.arrivalStart, tl.settleStart], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

export const settleProgress = (frame: number, tl: HookEnergyTimeline): number =>
  interpolate(frame, [tl.settleStart, tl.settleEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

export const returnProgress = (frame: number, tl: HookEnergyTimeline): number =>
  interpolate(frame, [tl.returnStart, tl.returnEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

// One up-and-down envelope (0→1→0) across [start, end], peaking at `peakAt`
// of the interval — drives the source pulse and the return confirmation.
export const pulseEnvelope = (
  frame: number,
  start: number,
  end: number,
  peakAt = 0.4,
): number => {
  const peak = start + Math.max(1, Math.round((end - start) * peakAt));
  return interpolate(frame, [start, peak, end], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// Frame gates: the bridge renders ONLY inside these intervals; during the
// stable hold it is fully unmounted.
export const isInEntranceInterval = (frame: number, tl: HookEnergyTimeline): boolean =>
  frame >= tl.ignitionStart && frame < tl.settleEnd;

export const isInReturnInterval = (frame: number, tl: HookEnergyTimeline): boolean =>
  frame >= tl.returnStart && frame <= tl.returnEnd;
