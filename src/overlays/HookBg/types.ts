import type { HookBgPalette, HookBgTheme } from "./themes";

// The silhouette of the background:
//  - "band": edge-to-edge horizontal colour band, feathered only top and
//    bottom — reads as a cinematic grade, never as a shape (the default)
//  - "ellipse": the earlier feathered oval veil, kept for reuse elsewhere.
export type HookBgShape = "band" | "ellipse";

// Every visual, thematic, placement and motion control of the hook
// background. Production values live in ../Hook/config.ts under
// `hookConfig.background`, keeping all hook controls in one place.
//
// Conventions:
//  - frame counts are authored at 30 fps and scale with the actual fps
//  - pixel values are authored at 1080 px width and scale with width / 1080
//  - opacities are 0..1
//
// Deliberate deviations from the generic config sketch:
//  - no `borderRadiusPx`: the veil is shaped by a feathered elliptical mask,
//    so its edges can never form a rectangle to round
//  - no `exitFrames`: the exit rides the Hook's own word-cascade progress
//    (`exitProgress` prop), which keeps both perfectly in sync by construction
//  - no separate `highlightOpacity`: the highlight IS the one-pass light
//    sweep, controlled by `lightSweepOpacity`.
export type HookBgConfig = {
  enabled: boolean;
  // THE EASY SWITCH: set to one of the five themes to use it for every reel
  // in the project — wins over the packages' hook.backgroundTheme and the
  // keyword fallback, without touching any authoring.json. null = per-reel
  // behaviour. (The Studio prop `hookBgTheme` still wins over this, so a
  // single reel can be re-themed at render time.)
  themeOverride: HookBgTheme | null;
  // Used when neither the reel package nor the caller picks a theme.
  defaultTheme: HookBgTheme;

  // Silhouette — see HookBgShape.
  shape: HookBgShape;
  // Size relative to the Hook layout band (not the full composition).
  // In "band" shape the width is ignored: the band always runs edge to edge.
  widthPct: number;
  heightPct: number;

  // Master strength of the whole background.
  opacity: number;
  // Per-layer strengths.
  baseOpacity: number;
  primaryFieldOpacity: number;
  secondaryFieldOpacity: number;
  vignetteOpacity: number;
  // Optional local video blur behind the veil (0 = off).
  backdropBlurPx: number;

  // Entrance: opacity rise + scale/translate settle.
  entranceFrames: number;
  entranceScaleFrom: number;
  entranceTranslateYPx: number;
  // The exit eases the veil slightly outward while it dissolves.
  exitScaleTo: number;

  // Stable-period drift: total travel of the gradient fields (primary moves
  // one way, secondary the other) completed over driftPeriodSeconds. Small
  // values on purpose — the drift should be almost imperceptible.
  driftAmountPx: number;
  driftPeriodSeconds: number;

  // One-pass directional light sweep during the entrance. Never loops.
  lightSweepEnabled: boolean;
  lightSweepOpacity: number;
  lightSweepWidthPct: number;

  themes: Record<HookBgTheme, HookBgPalette>;
};

// Backward-compatible alias — earlier code imported HookBgSettings.
export type HookBgSettings = HookBgConfig;
