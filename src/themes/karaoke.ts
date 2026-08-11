import { interpolate, spring } from "remotion";
import { mixOklch, oklchRamp } from "../design/colour";
import { motion, palette, springs } from "../design/tokens";
import type { Theme } from "./index";

// The restrained default. The full segment is visible for its whole duration;
// the active word shifts colour and scales on a short spring. Highlight
// progresses right to left because the container is RTL — no theme logic needed.

const accentRamp = oklchRamp([palette.sky, palette.cyan]);

const T = motion.wordTransitionFrames;

export const karaoke: Theme = {
  id: "karaoke",

  renderWord: ({ frame, fps, isEmphasised, wordStartFrame, wordEndFrame }) => {
    // Progress into and out of the word, each over ~4 frames.
    const tIn = interpolate(frame, [wordStartFrame, wordStartFrame + T], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const tOut = interpolate(frame, [wordEndFrame, wordEndFrame + T], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    // Emphasised words travel the sky→cyan ramp and keep the accent
    // permanently; normal words go muted → ink and settle at ink.
    const activeColour = isEmphasised ? accentRamp(tIn) : mixOklch(palette.muted, palette.ink, tIn);
    const settledColour = isEmphasised ? palette.cyan : palette.ink;
    const colour = tOut > 0 ? settledColour : activeColour;

    // Scale to 1.06 on the shared enter spring, settle back on exit.
    const springIn =
      frame < wordStartFrame
        ? 0
        : spring({ frame: frame - wordStartFrame, fps, config: springs.enter });
    const springOut =
      frame < wordEndFrame
        ? 0
        : spring({ frame: frame - wordEndFrame, fps, config: springs.exit });
    const scale = 1 + (motion.karaokeActiveScale - 1) * (springIn - springOut);

    // Past words settle at 0.85 opacity — paired with the scale settle above,
    // never opacity alone.
    const opacity = interpolate(tOut, [0, 1], [1, isEmphasised ? 0.95 : 0.85]);

    return {
      color: colour,
      opacity,
      transform: `scale(${scale})`,
    };
  },
};
