import type React from "react";

// A motion preset is a pure function of frame context → CSS. Presets never
// know what they animate — overlays pass their own window and direction.

export type MotionWindow = {
  startFrame: number;
  endFrame: number;
};

export type MotionCtx = {
  frame: number;
  fps: number;
  window: MotionWindow;
  // Writing direction of the animated element — lets edge-relative presets
  // (slideEdge) enter from the inline-start side.
  direction?: "rtl" | "ltr";
  // Accessibility escape hatch: collapse movement to a plain cross-fade.
  reduced?: boolean;
};

export type MotionPreset = (ctx: MotionCtx) => React.CSSProperties;

// Every preset ships both halves; overlays may mix (enter from one preset,
// exit from another) via a MotionSpec.
export type MotionPresetPair = {
  id: string;
  enter: MotionPreset;
  exit: MotionPreset;
};
