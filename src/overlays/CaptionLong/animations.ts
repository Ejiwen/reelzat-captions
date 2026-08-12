import type { MotionSpec } from "../../motion";

// Same philosophy as CaptionShort: the word stagger (running flat across both
// lines) is the entrance; the container stays quiet.
export const captionLongDefaultAnimation: MotionSpec = {
  enter: "fadeThrough",
  exit: "fadeThrough",
};
