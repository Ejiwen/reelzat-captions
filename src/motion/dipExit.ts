import { motion } from "../design/tokens";
import { enterLinear, enterSpring, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// The hook's signature exit: a quick downward dip while fading — decisive,
// reads as "done", clears the frame fast. Enter half is a plain rise so the
// pair is usable standalone.
export const dipExit: MotionPresetPair = {
  id: "dipExit",

  enter: (ctx) => {
    const t = enterLinear(ctx);
    if (ctx.reduced) {
      return t >= 1 ? {} : { opacity: t };
    }
    const s = enterSpring(ctx);
    if (t >= 1 && Math.abs(s - 1) < 0.001) {
      return {};
    }
    return {
      opacity: Math.min(1, t * 2),
      transform: `translateY(${(motion.popTranslatePx * (1 - s)).toFixed(2)}px)`,
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
    // Ease-in: the dip accelerates away.
    const eased = t * t;
    return {
      opacity: 1 - t,
      transform: `translateY(${(20 * eased).toFixed(2)}px) scale(${1 - 0.03 * t})`,
    };
  },
};
