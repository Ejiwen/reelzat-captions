import { enterLinear, enterSpring, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// Slides in from the inline-start edge — the right for RTL, the left for LTR
// — over 32px (inside the 20–40px translation band). Exit retreats toward the
// same edge over ~60% of the distance.
const EDGE_TRAVEL_PX = 32;

const edgeSign = (direction: "rtl" | "ltr" | undefined): number =>
  direction === "ltr" ? -1 : 1;

export const slideEdge: MotionPresetPair = {
  id: "slideEdge",

  enter: (ctx) => {
    const t = enterLinear(ctx);
    if (ctx.reduced) {
      return t >= 1 ? {} : { opacity: t };
    }
    const s = enterSpring(ctx);
    if (t >= 1 && Math.abs(s - 1) < 0.001) {
      return {};
    }
    const translateX = edgeSign(ctx.direction) * EDGE_TRAVEL_PX * (1 - s);
    return {
      opacity: Math.min(1, t * 2),
      transform: `translateX(${translateX.toFixed(2)}px)`,
    };
  },

  exit: (ctx) => {
    const t = exitLinear(ctx);
    if (t <= 0) {
      return {};
    }
    if (ctx.reduced) {
      return { opacity: 1 - t };
    }
    const translateX = edgeSign(ctx.direction) * EDGE_TRAVEL_PX * 0.6 * t;
    return { opacity: 1 - t, transform: `translateX(${translateX.toFixed(2)}px)` };
  },
};
