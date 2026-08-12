import { Trail } from "@remotion/motion-blur";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { entryTrail } from "../design/tokens";
import { isInEntryWindow, overlayMotionStyle, type MotionCtx, type MotionSpec } from "../motion";
import type { OverlayBaseProps, OverlayPosition, OverlaySafeArea, OverlayTextZone } from "./types";
import { DEFAULT_SAFE_AREA } from "./types";

// Shared chassis for every overlay: window gating, safe-area / director-zone
// positioning, motion style, and (optionally) entry-window motion blur.
// Overlays render nothing outside their window, so compositions can mount
// them unconditionally.

type OverlayRootProps = {
  window: OverlayBaseProps["window"];
  position: OverlayPosition;
  direction: OverlayBaseProps["direction"];
  animation: MotionSpec;
  safeArea?: OverlaySafeArea;
  textZone?: OverlayTextZone | null;
  reduced?: boolean;
  // Wrap in <Trail> during the entry window — only for overlays whose entry
  // actually moves (captions' word rise). Motion blur never runs on a static
  // element.
  trailOnEntry?: boolean;
  // Cross-axis alignment inside the band: captions centre, the nameplate
  // hugs the inline-start corner.
  align?: "center" | "start";
  children: React.ReactNode;
};

const zoneStyle = (zone: OverlayTextZone): React.CSSProperties => ({
  left: `${zone.xPct}%`,
  top: `${zone.yPct}%`,
  width: `${zone.wPct}%`,
  height: `${zone.hPct}%`,
  justifyContent: "center",
});

const bandStyle = (position: OverlayPosition, safeArea: OverlaySafeArea): React.CSSProperties =>
  position === "top"
    ? {
        insetInline: `${safeArea.sidePct}%`,
        top: `${safeArea.topPct}%`,
      }
    : {
        insetInline: `${safeArea.sidePct}%`,
        bottom: `${safeArea.bottomPct}%`,
        justifyContent: "flex-end",
      };

export const OverlayRoot: React.FC<OverlayRootProps> = ({
  window,
  position,
  direction,
  animation,
  safeArea = DEFAULT_SAFE_AREA,
  textZone = null,
  reduced,
  trailOnEntry = false,
  align = "center",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < window.startFrame || frame >= window.endFrame) {
    return null;
  }

  const ctx: MotionCtx = { frame, fps, window, direction, reduced };

  const content = (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: align === "start" ? "flex-start" : "center",
        direction,
        pointerEvents: "none",
        ...(textZone ? zoneStyle(textZone) : bandStyle(position, safeArea)),
        ...overlayMotionStyle(animation, ctx),
      }}
    >
      {children}
    </div>
  );

  if (trailOnEntry && !reduced && isInEntryWindow(ctx)) {
    return (
      <Trail
        layers={entryTrail.layers}
        lagInFrames={entryTrail.lagInFrames}
        trailOpacity={entryTrail.trailOpacity}
      >
        {content}
      </Trail>
    );
  }

  return content;
};
