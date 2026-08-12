import { interpolate, spring } from "remotion";
import { springs } from "../design/tokens";
import type { MotionCtx } from "./types";

// Shared timing rules for every preset:
//  - entries take ~12 frames at 30 fps (scaled to the actual fps)
//  - exits run at ~60% of the entry duration
//  - exits always finish EXIT_PAD_FRAMES before the window closes, so nothing
//    ever pops off screen mid-motion.

const ENTER_FRAMES_AT_30 = 12;
export const EXIT_PAD_FRAMES = 2;

export const enterDuration = (fps: number): number =>
  Math.max(4, Math.round((ENTER_FRAMES_AT_30 / 30) * fps));

export const exitDuration = (fps: number): number =>
  Math.max(3, Math.ceil(enterDuration(fps) * 0.6));

export const exitStartFrame = (ctx: MotionCtx): number =>
  ctx.window.endFrame - EXIT_PAD_FRAMES - exitDuration(ctx.fps);

// 0→1 on the shared enter spring. Slightly underdamped — peaks around 1.04
// (the "4% overshoot" every rise/pop preset shares), then settles at 1.
export const enterSpring = (ctx: MotionCtx): number => {
  const local = ctx.frame - ctx.window.startFrame;
  return local < 0 ? 0 : spring({ frame: local, fps: ctx.fps, config: springs.enter });
};

// 0→1 linear progress through the entry, clamped.
export const enterLinear = (ctx: MotionCtx): number =>
  interpolate(
    ctx.frame,
    [ctx.window.startFrame, ctx.window.startFrame + enterDuration(ctx.fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

// 0→1 linear progress through the exit, clamped. 0 until the exit begins.
export const exitLinear = (ctx: MotionCtx): number => {
  const start = exitStartFrame(ctx);
  return interpolate(ctx.frame, [start, start + exitDuration(ctx.fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

// 0→1 on the shared exit spring, starting at the exit window.
export const exitSpring = (ctx: MotionCtx): number => {
  const local = ctx.frame - exitStartFrame(ctx);
  return local < 0 ? 0 : spring({ frame: local, fps: ctx.fps, config: springs.exit });
};
