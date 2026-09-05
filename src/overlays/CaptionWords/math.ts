import type { ResolvedAuthoredCaption } from "../../ingest/resolve";
import type { OverlayWindow } from "../types";

// Pure timing logic for the words template — no React, no DOM — so every
// visual state is a deterministic function of (frame, timing) and can be
// unit-tested in node.
//
// Interval convention everywhere: start-inclusive, end-exclusive. Frames are
// integers already quantised by ingest (Math.floor of the authored seconds),
// and these functions never re-apply a reel offset: caption and word windows
// are both composition frames.

export type WordFrameTiming = {
  startFrame: number;
  endFrame: number;
};

export type WordState = "upcoming" | "active" | "spoken";

export const framesFromSeconds = (seconds: number, fps: number): number =>
  Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * fps)) : Infinity;

// The word's state at `frame`. A word is active from its onset until its
// window ends or `maxActiveHoldFrames` elapse, whichever comes first — the
// hold cap is what keeps a silence from reading as a word still being said,
// because exported windows are contiguous (see config.maxActiveHoldSeconds).
export const wordStateAtFrame = (
  frame: number,
  word: WordFrameTiming,
  maxActiveHoldFrames: number = Infinity,
): WordState => {
  if (frame < word.startFrame) {
    return "upcoming";
  }
  const activeUntil = Math.min(
    word.endFrame,
    word.startFrame + Math.max(1, maxActiveHoldFrames),
  );
  return frame < activeUntil ? "active" : "spoken";
};

// Index of the word being spoken at `frame`, or -1 when no word is active
// (before the first onset, after the last window, or inside a capped hold).
export const activeWordIndexAtFrame = (
  frame: number,
  words: WordFrameTiming[],
  maxActiveHoldFrames: number = Infinity,
): number =>
  words.findIndex(
    (word) => wordStateAtFrame(frame, word, maxActiveHoldFrames) === "active",
  );

// Entrance length for one word: the configured duration, but never longer
// than the word's own window, and at least two frames so there is always a
// visible ramp rather than a pop.
export const wordEntranceFrames = (
  word: WordFrameTiming,
  fps: number,
  enterSeconds: number,
): number => {
  const configured = Math.max(2, Math.round(enterSeconds * fps));
  const duration = Math.max(1, word.endFrame - word.startFrame);
  return Math.max(2, Math.min(configured, duration));
};

// 0→1 progress of the entrance at `frame`. Deliberately reaches 1/n on the
// onset frame itself, so the word is visibly present the moment it is said.
export const wordEntranceProgress = (
  frame: number,
  word: WordFrameTiming,
  entranceFrames: number,
): number => {
  if (frame < word.startFrame) {
    return 0;
  }
  return Math.min(1, (frame - word.startFrame + 1) / entranceFrames);
};

// Does the timing describe a usable per-word alignment? Windows must be
// ordered, non-overlapping and non-empty. Anything else falls back to the
// phrase treatment with no active word — never to synthesised timing.
export const hasUsableWordTiming = (
  words: WordFrameTiming[] | undefined,
  expectedCount: number,
): words is WordFrameTiming[] => {
  if (!words || words.length === 0 || words.length !== expectedCount) {
    return false;
  }
  let previousEnd = -Infinity;
  for (const word of words) {
    if (
      !Number.isInteger(word.startFrame) ||
      !Number.isInteger(word.endFrame) ||
      word.endFrame <= word.startFrame ||
      word.startFrame < previousEnd
    ) {
      return false;
    }
    previousEnd = word.endFrame;
  }
  return true;
};

// ---------------------------------------------------------------------------
// Groups. The authoring stage already breaks speech into short cues, and
// ingest guarantees that captions never overlap in time, so the phrase group
// on screen at `frame` is simply the caption whose window contains it.

export const wordsGroupIndexAtFrame = (
  captions: ResolvedAuthoredCaption[],
  frame: number,
): number =>
  captions.findIndex(
    (caption) =>
      frame >= caption.window.startFrame && frame < caption.window.endFrame,
  );

// Opacity of the group's plate/ink at `frame`: a short fade in from the
// window start and a fade out that reaches 0 on the window's final frame,
// so consecutive groups never share a visible frame.
export const groupPresenceAtFrame = (
  frame: number,
  window: OverlayWindow,
  enterFrames: number,
  exitFrames: number,
): number => {
  if (frame < window.startFrame || frame >= window.endFrame) {
    return 0;
  }
  const length = window.endFrame - window.startFrame;
  const enter = Math.max(1, Math.min(enterFrames, Math.floor(length / 2)));
  const exit = Math.max(1, Math.min(exitFrames, Math.floor(length / 2)));
  const enterT = Math.min(1, (frame - window.startFrame + 1) / enter);
  const lastFrame = window.endFrame - 1;
  const exitT = Math.min(1, (lastFrame - frame) / exit);
  return Math.max(0, Math.min(enterT, exitT));
};

// ---------------------------------------------------------------------------
// Composition-level helpers retained for AuthoredReel (progress-ring
// interaction windows, sound cues) and existing tests.

export type WordsCaptionPair = {
  previous: ResolvedAuthoredCaption | null;
  current: ResolvedAuthoredCaption;
};

export const wordsCaptionPairAtFrame = (
  captions: ResolvedAuthoredCaption[],
  frame: number,
): WordsCaptionPair | null => {
  const ordered = [...captions].sort(
    (a, b) => a.window.startFrame - b.window.startFrame,
  );
  let currentIndex = -1;
  for (const [index, caption] of ordered.entries()) {
    if (caption.window.startFrame <= frame) {
      currentIndex = index;
    } else {
      break;
    }
  }
  if (currentIndex < 0) {
    return null;
  }
  return {
    previous: currentIndex > 0 ? (ordered[currentIndex - 1] ?? null) : null,
    current: ordered[currentIndex]!,
  };
};

export const wordsReaderWindow = (
  captions: ResolvedAuthoredCaption[],
  durationInFrames: number,
): OverlayWindow | null => {
  if (captions.length === 0) {
    return null;
  }
  return {
    startFrame: Math.min(
      ...captions.map((caption) => caption.window.startFrame),
    ),
    endFrame: durationInFrames,
  };
};
