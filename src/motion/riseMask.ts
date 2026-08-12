import { motion } from "../design/tokens";
import { enterLinear, enterSpring, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// Masked rise: the element travels up 28px into place on the shared enter
// spring (≈4% overshoot) while a clip window reveals it from below. Negative
// insets leave headroom so Arabic diacritics and the overshoot never clip.
export const riseMask: MotionPresetPair = {
  id: "riseMask",

  enter: (ctx) => {
    const t = enterLinear(ctx);
    if (ctx.reduced) {
      return t >= 1 ? {} : { opacity: t };
    }
    const s = enterSpring(ctx);
    if (t >= 1 && Math.abs(s - 1) < 0.001) {
      return {};
    }
    const translateY = motion.popTranslatePx * (1 - s);
    const bottomInset = Math.max(-20, 70 * (1 - t) - 20);
    return {
      opacity: Math.min(1, t * 2),
      transform: `translateY(${translateY.toFixed(2)}px)`,
      clipPath: `inset(-30% -10% ${bottomInset.toFixed(2)}% -10%)`,
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
    return {
      opacity: 1 - t,
      transform: `translateY(${(0.4 * motion.popTranslatePx * t).toFixed(2)}px)`,
    };
  },
};
