import type { MotionSpec } from "../../motion";

// The container stays quiet — the word-level rise IS the entrance. A loud
// container preset on top of the stagger would double the movement.
export const captionShortDefaultAnimation: MotionSpec = {
  enter: "fadeThrough",
  exit: "fadeThrough",
};
