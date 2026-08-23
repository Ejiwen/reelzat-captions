import type React from "react";
import { Easing, interpolate, spring } from "remotion";
import { fadeToNeutralOklch } from "../../design/colour";
import { palette, springs } from "../../design/tokens";
import { enterDuration } from "../../motion";
import type { OverlayWindow } from "../types";

// Inspired by the attached SerenityTitle reference. Its character reveal is
// adapted to WORDS so Arabic shaping is never split or animated per letter.
const ENTRY_STAGGER_AT_30 = 4;
const ENTRY_OPACITY_AT_30 = 25;
const ENTRY_RISE_AT_30 = 30;
const ENTRY_RISE_PX = 20;
const EXIT_STAGGER_AT_30 = 3;
const EXIT_DURATION_AT_30 = 16;
const EXIT_RISE_PX = 14;
const EXIT_PAD_AT_30 = 2;

const atFps = (framesAt30: number, fps: number): number =>
  Math.max(1, Math.round((framesAt30 / 30) * fps));

const exitTiming = (fps: number, window: OverlayWindow, wordCount: number) => {
  const stagger = atFps(EXIT_STAGGER_AT_30, fps);
  const duration = atFps(EXIT_DURATION_AT_30, fps);
  const pad = atFps(EXIT_PAD_AT_30, fps);
  return {
    stagger,
    duration,
    startFrame:
      window.endFrame - pad - duration - Math.max(0, wordCount - 1) * stagger,
  };
};

export const hookExitProgress = (
  frame: number,
  fps: number,
  window: OverlayWindow,
  wordCount: number,
): number => {
  const exit = exitTiming(fps, window, wordCount);
  return interpolate(
    frame,
    [exit.startFrame, window.endFrame - atFps(EXIT_PAD_AT_30, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    },
  );
};

export const hookWordStyle = ({
  frame,
  fps,
  index,
  wordCount,
  window,
  reduced,
  accentColor = palette.gold,
  settledColor = palette.ink,
}: {
  frame: number;
  fps: number;
  index: number;
  wordCount: number;
  window: OverlayWindow;
  reduced?: boolean;
  accentColor?: string;
  settledColor?: string;
}): React.CSSProperties => {
  const exit = exitTiming(fps, window, wordCount);

  if (reduced) {
    const entryOpacity = interpolate(
      frame,
      [window.startFrame, window.startFrame + enterDuration(fps)],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const exitOpacity = interpolate(
      frame,
      [exit.startFrame, window.endFrame],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    const goldPresence = Math.max(1 - entryOpacity, 1 - exitOpacity);
    return {
      color: fadeToNeutralOklch(accentColor, settledColor, 1 - goldPresence),
      opacity: entryOpacity * exitOpacity,
    };
  }

  const entryDelay = index * atFps(ENTRY_STAGGER_AT_30, fps);
  const entryLocal = frame - window.startFrame - entryDelay;
  const entryOpacity = interpolate(
    entryLocal,
    [0, atFps(ENTRY_OPACITY_AT_30, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  // Stay visibly golden for the first part of the fade, then settle into the
  // normal ink colour as the word finishes rising.
  const entryColourProgress = interpolate(
    entryLocal,
    [0, atFps(ENTRY_RISE_AT_30, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const entryY = interpolate(
    entryLocal,
    [0, atFps(ENTRY_RISE_AT_30, fps)],
    [ENTRY_RISE_PX, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    },
  );

  // The reference has no outro, so its calm rise is mirrored into a short,
  // reverse-order word cascade that clears fully before the window closes.
  const reverseIndex = wordCount - 1 - index;
  const exitLocal = frame - exit.startFrame - reverseIndex * exit.stagger;
  const exitProgress = interpolate(exitLocal, [0, exit.duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  const goldPresence = Math.max(1 - entryColourProgress, exitProgress);

  return {
    color: fadeToNeutralOklch(accentColor, settledColor, 1 - goldPresence),
    opacity: entryOpacity * (1 - exitProgress),
    filter:
      goldPresence > 0.01
        ? `drop-shadow(0 0 ${(3 + goldPresence * 7).toFixed(2)}px ${accentColor})`
        : undefined,
    transform: `translateY(${(entryY - EXIT_RISE_PX * exitProgress).toFixed(2)}px)`,
  };
};

export const shimmerStyle = ({
  frame,
  fps,
  window,
  wordCount,
  reduced,
}: {
  frame: number;
  fps: number;
  window: OverlayWindow;
  wordCount: number;
  reduced?: boolean;
}): React.CSSProperties => {
  if (reduced) {
    return { opacity: 0 };
  }

  const start = window.startFrame + atFps(20, fps);
  const nominalEnd = window.startFrame + atFps(110, fps);
  const end = Math.max(
    start + 1,
    Math.min(nominalEnd, exitTiming(fps, window, wordCount).startFrame),
  );
  const progress = interpolate(frame, [start, end], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const peak = start + Math.min(atFps(6, fps), (end - start) / 2);
  const opacity = interpolate(frame, [start, peak, end], [0, 0.62, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { opacity, backgroundPosition: `${progress}% 0%` };
};

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
