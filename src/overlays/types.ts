import type { MotionSpec } from "../motion";

// The shared overlay contract. Overlays are pure props-in, pixels-out: they
// never read files, never know about reel packages, and can be lifted into
// any other Remotion project together with src/motion/ and src/design/.

export type OverlayWindow = {
  startFrame: number;
  endFrame: number;
};

export type OverlayPosition = "top" | "bottom";

export type TextDirection = "rtl" | "ltr";

// Percent margins of the frame that overlays must respect.
// topPct ≈ 14 → the hook band; bottomPct ≈ 20 → the caption band.
export type OverlaySafeArea = {
  topPct: number;
  bottomPct: number;
  sidePct: number;
};

export const DEFAULT_SAFE_AREA: OverlaySafeArea = { topPct: 14, bottomPct: 20, sidePct: 7 };

// A director-provided text-safe rectangle (percent of frame). When present it
// wins over the generic band — the director knows where the faces are.
export type OverlayTextZone = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  position?: OverlayPosition;
};

export type OverlayBaseProps = {
  // Frames during which the overlay owns the screen. Enter starts at
  // startFrame; exit finishes just before endFrame (see src/motion/timing.ts).
  window: OverlayWindow;
  position: OverlayPosition;
  direction: TextDirection;
  // Enter/exit preset names from the motion registry. Every overlay has its
  // own defaults in its animations.ts.
  animation?: MotionSpec;
  safeArea?: OverlaySafeArea;
  // Director text-safe zone — preferred over the band when provided.
  textZone?: OverlayTextZone | null;
  fontScale?: number;
  // Collapse movement to plain cross-fades.
  reduced?: boolean;
};
