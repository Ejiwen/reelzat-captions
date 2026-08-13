import { hookBgPalettes } from "../HookBg/themes";
import type { HookBgConfig } from "../HookBg";

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
  background: HookBgConfig;
};

export const hookConfig: HookConfig = {
  fontSizeScale: 1.7,
  yPct: 65,
  bandHeightPct: 24,
  extraHoldSeconds: 2,
  background: {
    enabled: true,
    // ── Set the HookBg theme for the WHOLE project here ──────────────────
    // Ej1-eji1-Eji1 "politics" | "religion" | "culture" | "general" | "social" | null
    // null → per-reel: package hook.backgroundTheme → keywords → defaultTheme.
    themeOverride: "politics",
    defaultTheme: "general",
    // "band" = edge-to-edge cinematic strip (recommended); "ellipse" = the
    // earlier oval veil.
    shape: "band",
    // Height relative to the Hook layout band; width only applies to the
    // ellipse shape (the band always runs edge to edge).
    widthPct: 140,
    heightPct: 146,
    // Master + per-layer strengths (0..1).
    opacity: 1,
    baseOpacity: 0.66,
    primaryFieldOpacity: 0.66,
    secondaryFieldOpacity: 0.44,
    vignetteOpacity: 0.42,
    backdropBlurPx: 0,
    // Entrance (frames at 30 fps, px at 1080 width).
    entranceFrames: 18,
    entranceScaleFrom: 0.96,
    entranceTranslateYPx: 12,
    energyRevealEnabled: true,
    // Kept in sync with HookEnergyBridge ignitionFrames + travelFrames.
    energyRevealDelayFrames: 20,
    energyRevealFrames: 10,
    // Same lower-band destination as HookEnergyBridge targetOffsetPct: 29.
    energyRevealOriginYPct: 79,
    exitScaleTo: 1.03,
    // Stable-period drift — almost imperceptible by design.
    driftAmountPx: 26,
    driftPeriodSeconds: 12,
    // One-pass entrance light sweep.
    lightSweepEnabled: true,
    lightSweepOpacity: 0.16,
    lightSweepWidthPct: 34,
    themes: hookBgPalettes,
  },
};
