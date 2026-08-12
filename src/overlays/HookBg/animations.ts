import type React from "react";
import { Easing, interpolate } from "remotion";
import type { HookBgSettings } from "./types";

export const hookBgMotionStyle = ({
  frame,
  fps,
  windowStartFrame,
  exitProgress,
  settings,
  reduced,
}: {
  frame: number;
  fps: number;
  windowStartFrame: number;
  exitProgress: number;
  settings: HookBgSettings;
  reduced?: boolean;
}): React.CSSProperties => {
  const entryDuration = Math.max(1, Math.round((settings.entryFrames / 30) * fps));
  const entry = interpolate(
    frame,
    [windowStartFrame, windowStartFrame + entryDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const opacity = entry * (1 - exitProgress);

  if (reduced) {
    return {
      opacity,
      transform: "translate(-50%, -50%)",
    };
  }

  const scale = settings.scaleFrom + (1 - settings.scaleFrom) * entry + 0.025 * exitProgress;
  const translateY = settings.translateYPx * (1 - entry) - settings.translateYPx * 0.5 * exitProgress;

  return {
    opacity,
    transform: `translate(-50%, -50%) translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
  };
};
