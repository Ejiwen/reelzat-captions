import type React from "react";
import type { WordTiming } from "../schema/captions";
import { karaoke } from "./karaoke";
import { wordPop } from "./wordPop";

export type WordRenderCtx = {
  word: WordTiming;
  index: number;
  isActive: boolean;
  isPast: boolean;
  isEmphasised: boolean;
  frame: number;
  fps: number;
  segmentStartFrame: number;
  segmentEndFrame: number;
  // Pre-computed from word timings with the global offset already applied,
  // so themes never need to know about offsetMs.
  wordStartFrame: number;
  wordEndFrame: number;
};

export type ContainerRenderCtx = {
  frame: number;
  fps: number;
  segmentStartFrame: number;
  segmentEndFrame: number;
};

export type Theme = {
  id: string;
  renderWord: (ctx: WordRenderCtx) => React.CSSProperties;
  containerStyle?: React.CSSProperties;
  // Frame-dependent container styling (e.g. a segment exit fade).
  renderContainer?: (ctx: ContainerRenderCtx) => React.CSSProperties;
  // When set, CaptionPage wraps the page in <Trail> — but only while
  // frame < segmentStartFrame + entryWindowInFrames. Motion blur is expensive;
  // it must never run on a static line.
  trail?: {
    layers: number;
    lagInFrames: number;
    trailOpacity: number;
    entryWindowInFrames: number;
  };
};

// Adding a theme = one file in src/themes/ + one line here.
export const themes = {
  karaoke,
  wordPop,
} as const satisfies Record<string, Theme>;

export type ThemeId = keyof typeof themes;
