import { motion } from "../design/tokens";
import { enterLinear, enterSpring, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// Scale 0.94 → 1 on the shared enter spring (slight overshoot, then settle),
// opacity resolving over the first half of the entry.
export const springPop: MotionPresetPair = {
  id: "springPop",

  enter: (ctx) => {
    const t = enterLinear(ctx);
    if (ctx.reduced) {
      return t >= 1 ? {} : { opacity: t };
    }
    const s = enterSpring(ctx);
    if (t >= 1 && Math.abs(s - 1) < 0.001) {
      return {};
    }
    const scale = motion.popScaleFrom + (1 - motion.popScaleFrom) * s;
    return {
      opacity: Math.min(1, t * 2),
      transform: `scale(${scale})`,
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
    return { opacity: 1 - t, transform: `scale(${1 - 0.04 * t})` };
  },
};
