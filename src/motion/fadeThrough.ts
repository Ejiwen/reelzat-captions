import { enterLinear, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// The quiet default exit. Fade paired with a 2% scale settle — never opacity
// alone (project rule).
export const fadeThrough: MotionPresetPair = {
  id: "fadeThrough",

  enter: (ctx) => {
    const t = enterLinear(ctx);
    if (t >= 1) {
      return {};
    }
    if (ctx.reduced) {
      return { opacity: t };
    }
    return { opacity: t, transform: `scale(${0.98 + 0.02 * t})` };
  },

  exit: (ctx) => {
    const t = exitLinear(ctx);
    if (t <= 0) {
      return {};
    }
    if (ctx.reduced) {
      return { opacity: 1 - t };
    }
    return { opacity: 1 - t, transform: `scale(${1 - 0.02 * t})` };
  },
};
