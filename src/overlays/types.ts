import type { MotionSpec } from "../motion";

// The shared overlay contract. Overlays are pure props-in, pixels-out: they
// never read files, never know about reel packages, and can be lifted into
// any other Remotion project together with src/motion/ and src/design/.

export type OverlayWindow = {
  startFrame: number;
  endFrame: number;
};

export type OverlaySplitWindow = OverlayWindow & {
  // The seam between the full-width top and bottom panels.
  centerYPct: number;
};

export type OverlayPosition = "top" | "bottom";

export type TextDirection = "rtl" | "ltr";

// The strips the director reserved for text, as percent of frame height:
// the hook band is the TOP topPct% (≈14), the caption band the BOTTOM
// bottomPct% (≈20). Everything between belongs to the video content.
export type OverlaySafeArea = {
  topPct: number;
  bottomPct: number;
  sidePct: number;
};

export const DEFAULT_SAFE_AREA: OverlaySafeArea = {
  topPct: 14,
  bottomPct: 20,
  sidePct: 7,
};

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
  // Full-width 50/50 top/bottom split-screen intervals. Caption overlays use
  // these to sit on the seam instead of covering either speaker's face.
  splitWindows?: OverlaySplitWindow[];
  fontScale?: number;
  // Collapse movement to plain cross-fades.
  reduced?: boolean;
};
