import { motion } from "../design/tokens";
import { enterLinear, enterSpring, exitLinear } from "./timing";
import type { MotionPresetPair } from "./types";

// 8px → 0 blur plus fade and a springPop scale (0.94 → 1) — blur on ENTRY
// ONLY. Blur is expensive and reads as sloppy on exit, so the exit half is a
// plain fade-and-settle. Once the entry resolves the filter is dropped
// entirely so steady-state frames are pixel-identical to unanimated ones.
export const blurIn: MotionPresetPair = {
  id: "blurIn",

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
      opacity: t,
      filter: t >= 1 ? undefined : `blur(${(8 * (1 - t)).toFixed(2)}px)`,
      transform: `scale(${scale.toFixed(4)})`,
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
    return { opacity: 1 - t, transform: `scale(${1 - 0.02 * t})` };
  },
};
