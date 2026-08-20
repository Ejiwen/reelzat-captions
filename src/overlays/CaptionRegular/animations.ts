import type { MotionSpec } from "../../motion";

export const captionRegularDefaultAnimation: MotionSpec = {
  enter: "fadeThrough",
  exit: "fadeThrough",
};

// Verse arrives as one composed block. The masked rise is deliberately calm:
// authored hemistichs must never cascade independently or reflow.
export const captionRegularVerseAnimation: MotionSpec = {
  enter: "riseMask",
  exit: "fadeThrough",
};
