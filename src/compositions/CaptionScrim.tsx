import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { overlaySurfaces } from "../design/tokens";
import { enterLinear, exitLinear } from "../motion";
import type { OverlaySplitWindow, OverlayWindow } from "../overlays";
import { captionSplitPlacementAtFrame } from "../overlays/captionSplitPlacement";

// Burn-mode only: a subtle gradient scrim behind BOTTOM captions, visible
// only while one of them is — its opacity rides the caption's own enter/exit
// timing so it never sits on the video alone. Alpha mode never renders this
// (the compositor supplies the background), keeping overlay layers
// pixel-identical between modes.
export const CaptionScrim: React.FC<{
  windows: OverlayWindow[];
  bottomPct: number;
  splitWindows?: OverlaySplitWindow[];
  reduced?: boolean;
}> = ({ windows, bottomPct, splitWindows = [], reduced }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let opacity = 0;
  for (const window of windows) {
    if (frame < window.startFrame || frame >= window.endFrame) {
      continue;
    }
    const ctx = { frame, fps, window };
    opacity = Math.max(
      opacity,
      Math.min(enterLinear(ctx), 1 - exitLinear(ctx)),
    );
  }

  if (opacity <= 0) {
    return null;
  }
  const splitPlacement = captionSplitPlacementAtFrame({
    frame,
    fps,
    windows: splitWindows,
    reduced,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: `${bottomPct + 14}%`,
        backgroundImage: overlaySurfaces.captionScrimGradient,
        opacity: opacity * (1 - splitPlacement.mix),
        pointerEvents: "none",
      }}
    />
  );
};
