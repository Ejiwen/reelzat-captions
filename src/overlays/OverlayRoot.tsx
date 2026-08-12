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
  animation?: MotionSpec;
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
  // Optional exact bottom anchor for overlays that must clear another
  // screen element (for example CaptionLong above ProgressBar).
  bottomOffsetPx?: number;
  children: React.ReactNode;
};

const zoneStyle = (zone: OverlayTextZone): React.CSSProperties => ({
  left: `${zone.xPct}%`,
  top: `${zone.yPct}%`,
  width: `${zone.wPct}%`,
  height: `${zone.hPct}%`,
  justifyContent: "center",
});

// Bands are the STRIPS the director reserved for text: the top band is the
// top `topPct`% of the frame (hook zone), the bottom band the bottom
// `bottomPct`% (caption zone) — the region between belongs to the video
// content and the faces in it. Content anchors to the band edge that borders
// the content area, so taller elements overflow toward the frame edge, never
// toward a face.
const bandStyle = (position: OverlayPosition, safeArea: OverlaySafeArea): React.CSSProperties =>
  position === "top"
    ? {
        insetInline: `${safeArea.sidePct}%`,
        top: 0,
        height: `${safeArea.topPct}%`,
        justifyContent: "flex-end",
      }
    : {
        insetInline: `${safeArea.sidePct}%`,
        bottom: 0,
        height: `${safeArea.bottomPct}%`,
        justifyContent: "flex-start",
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
  bottomOffsetPx,
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
        ...(bottomOffsetPx !== undefined
          ? {
              insetInline: `${safeArea.sidePct}%`,
              bottom: bottomOffsetPx,
            }
          : textZone
            ? zoneStyle(textZone)
            : bandStyle(position, safeArea)),
        ...(animation ? overlayMotionStyle(animation, ctx) : {}),
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
