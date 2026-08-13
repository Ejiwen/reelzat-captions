// Opening materialization for the source-video layer ONLY. Overlays (hook,
// captions, nameplate, progress bar, outro) are never touched — the effect
// wraps the video inside SourceVideoLayer and nothing else.
//
// Durations are in seconds (converted with the real composition fps at the
// call site); pixel values are authored at 1080px width and scale with the
// actual composition width.

export type VideoIntroDirection = "center" | "top" | "bottom" | "left" | "right";

export type VideoIntroConfig = {
  enabled: boolean;

  // ── Structure ──────────────────────────────────────────────────────────
  // Total time from frame 0 until the video layer is exactly neutral again.
  // The dissolve, focus settle and sweep all complete inside this window.
  durationSeconds: number;

  // ── Pixel-dissolve reveal (seeded mosaic mask) ─────────────────────────
  pixelReveal: boolean;
  // Cell edge as a fraction of composition width (0.06 → ~65px at 1080).
  cellSizeFactor: number;
  // Fraction of cells (0..1) already materializing on frame 0 — the first
  // frame must carry intrigue, never an empty background.
  initialCoverage: number;
  // 0 = cells appear in pure seeded-random order; 1 = strictly ordered by
  // `direction`. Mid values keep the sweep readable but organic.
  directionBias: number;
  direction: VideoIntroDirection;
  // Per-cell alpha ramp width in progress units (temporal softness) and the
  // mask-space gaussian blur as a fraction of cell size (spatial softness).
  feather: number;
  cellEdgeSoftness: number;
  // Any string; changing it reshuffles the cell order deterministically.
  seed: string;

  // ── Focus settle (on the video content, under the mask) ───────────────
  focusSettle: boolean;
  blurStartPx: number;
  // Upscale at frame 0 that eases back to exactly 1. Also serves as the
  // overscan that keeps blur / chroma fringes outside the visible frame.
  scaleStart: number;
  // Brightness lift at frame 0, decaying to exactly 1 (neutral).
  exposureStart: number;

  // ── Restrained chromatic edge (SVG filter, first ~40% only) ───────────
  // Max horizontal R/B split in px at 1080 width. 0 disables the filter.
  chromaticAmountPx: number;

  // ── One-pass light sweep as the dissolve completes ─────────────────────
  lightSweep: boolean;
  lightSweepOpacity: number;
  lightSweepWidthPct: number;

  // ── Brief scan texture (inside the video layer only) ──────────────────
  scanlines: boolean;
  scanlineOpacity: number;
  scanlineSpacingPx: number;
  scanlineThicknessPx: number;

  // ── Reduced motion ─────────────────────────────────────────────────────
  // With `reduced`, everything above collapses to a short blur+opacity
  // reveal with no mask, no scale and no chroma.
  reducedBlurStartPx: number;
  reducedDurationSeconds: number;
};

export const videoIntroConfig: VideoIntroConfig = {
  enabled: true,

  durationSeconds: 0.9,

  pixelReveal: true,
  cellSizeFactor: 0.075,
  initialCoverage: 0.34,
  directionBias: 0.7,
  direction: "center",
  feather: 0.2,
  cellEdgeSoftness: 0.08,
  seed: "reelzy-intro",

  focusSettle: true,
  blurStartPx: 7,
  scaleStart: 1.035,
  exposureStart: 1.04,

  chromaticAmountPx: 3,

  lightSweep: true,
  lightSweepOpacity: 0.14,
  lightSweepWidthPct: 26,

  scanlines: true,
  scanlineOpacity: 0.1,
  scanlineSpacingPx: 7,
  scanlineThicknessPx: 1,

  reducedBlurStartPx: 16,
  reducedDurationSeconds: 0.5,
};
