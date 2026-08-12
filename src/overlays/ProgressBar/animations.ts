import type React from "react";
import { Easing, interpolate } from "remotion";
import type { ProgressBarConfig } from "./config";

export const progressBarVisibilityStyle = ({
  frame,
  durationInFrames,
  fps,
  config,
  reduced,
}: {
  frame: number;
  durationInFrames: number;
  fps: number;
  config: ProgressBarConfig;
  reduced?: boolean;
}): React.CSSProperties => {
  if (durationInFrames <= 1) {
    return { opacity: 1, transform: reduced ? undefined : "scale(1)" };
  }

  const fpsScale = fps / 30;
  const introFrames = Math.max(1, Math.round(config.introFrames * fpsScale));
  const outroFrames = Math.max(1, Math.round(config.outroFrames * fpsScale));
  const intro = interpolate(frame, [0, introFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const outroStart = Math.max(0, durationInFrames - 1 - outroFrames);
  const outro = interpolate(
    frame,
    [outroStart, durationInFrames - 1],
    [1, config.outroOpacityTo],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    },
  );
  const opacity = intro * outro;

  return {
    opacity,
    transform: reduced
      ? undefined
      : `scale(${(config.introScaleFrom + (1 - config.introScaleFrom) * intro).toFixed(4)})`,
  };
};
