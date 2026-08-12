import type { HookBgSettings } from "../HookBg";

export type HookConfig = {
  // Hook-only font multiplier. 1 = current size, 1.15 = 15% larger,
  // 0.9 = 10% smaller. The composition's fontScale still applies on top.
  fontSizeScale: number;
  // Vertical centre of the hook as a percentage of the video frame.
  // 0 = top edge, 50 = centre, 100 = bottom edge.
  yPct: number;
  // Internal layout band centred around yPct. Increase this only when a hook
  // needs more vertical room; yPct remains the single positioning control.
  bandHeightPct: number;
  // Extra steady reading time inserted between the unchanged entrance and
  // exit animations. The effective window is capped before the next caption
  // and at the end of the video.
  extraHoldSeconds: number;
  background: HookBgSettings;
};

export const hookConfig: HookConfig = {
  fontSizeScale: 1.7,
  yPct: 65,
  bandHeightPct: 24,
  extraHoldSeconds: 2,
  background: {
    enabled: true,
    widthPct: 124,
    heightPct: 108,
    backdropBlurPx: 0,
    navyOpacityPct: 44,
    goldGlowOpacityPct: 8,
    entryFrames: 18,
    translateYPx: 12,
    scaleFrom: 0.96,
  },
};
