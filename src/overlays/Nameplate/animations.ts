import type { MotionSpec } from "../../motion";

// Persistent-but-quiet: slides in from the safe left edge at frame 0, remains
// fully stable for the reel, then gently fades/scales through the final frames.
export const nameplateDefaultAnimation: MotionSpec = {
  enter: "slideEdge",
  exit: "fadeThrough",
};
