import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { hookBgPalettes, type HookBgTheme } from "../overlays/HookBg/themes";
import { videoIntroConfig, type VideoIntroConfig } from "./config";
import { buildIntroGrid, buildMaskUri, coverageToProgress } from "./math";

// Wraps ONLY the source-video layer and makes it materialize during the first
// ~videoIntroConfig.durationSeconds: a centre-out seeded pixel dissolve while
// the picture settles from soft/large into exact focus, a restrained R/B
// chromatic edge that collapses early, and one light sweep as the mosaic
// completes. Once the window has passed the component renders its children
// with no wrapper styles at all — opacity 1, scale 1, blur 0, no mask, no
// filter — so steady-state frames are bit-identical to an unwrapped video.
//
// Overlays never pass through this component; they live in their own stack.

const CHROMA_FILTER_ID = "video-intro-chroma";

// Timeline inside the intro window (fractions of the total duration). The
// dissolve finishes first, the focus settle lands last, and two spare frames
// remain before the wrapper unmounts so the handoff is a visual no-op.
const REVEAL_END = 0.78;
const SETTLE_END = 0.9;
const CHROMA_END = 0.42;
const SWEEP_START = 0.5;
const SWEEP_END = 0.95;
const SCANLINES_END = 0.58;

export const VideoIntroReveal: React.FC<{
  reduced: boolean;
  theme: HookBgTheme;
  config?: VideoIntroConfig;
  children: React.ReactNode;
}> = ({ reduced, theme, config = videoIntroConfig, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const introFrames = Math.max(2, Math.round(config.durationSeconds * fps));
  const reducedFrames = Math.max(2, Math.round(config.reducedDurationSeconds * fps));
  const activeFrames = reduced ? reducedFrames : introFrames;
  const active = config.enabled && frame < activeFrames;

  const grid = useMemo(
    () =>
      buildIntroGrid({
        width,
        height,
        cellSizeFactor: config.cellSizeFactor,
        direction: config.direction,
        directionBias: config.directionBias,
        seed: config.seed,
      }),
    [width, height, config],
  );

  if (!config.enabled) {
    return <>{children}</>;
  }

  // px values are authored at 1080 composition width.
  const pxScale = width / 1080;
  const themePalette = hookBgPalettes[theme];

  // Motion-free fallback values. They resolve to exact identity while the
  // wrapper stays mounted, so OffthreadVideo is never recreated at handoff.
  const reducedProgress = interpolate(frame, [0, reducedFrames - 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const at = (endFraction: number, easing = Easing.out(Easing.cubic)) =>
    interpolate(frame, [0, Math.max(1, Math.round(introFrames * endFraction))], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing,
    });

  // ── Pixel dissolve ───────────────────────────────────────────────────
  // Start at the progress where `initialCoverage` of the cells are already
  // materializing, so frame 0 carries real image content. The slow-in/
  // slow-out curve holds the sparse teaser for a beat, sweeps through the
  // assembly, then decelerates into completion — an ease-out here would
  // finish the whole dissolve in a handful of frames.
  const startProgress = coverageToProgress(grid, config.initialCoverage);
  const revealProgress = active && !reduced && config.pixelReveal
    ? startProgress + (1 - startProgress) * at(REVEAL_END, Easing.bezier(0.45, 0, 0.22, 1))
    : 1;
  const maskUri = active && !reduced && config.pixelReveal
    ? buildMaskUri({
        grid,
        progress: revealProgress,
        feather: config.feather,
        cellEdgeSoftness: config.cellEdgeSoftness,
        width,
        height,
      })
    : null;

  // ── Focus settle ─────────────────────────────────────────────────────
  const settle = active && !reduced && config.focusSettle ? at(SETTLE_END) : 1;
  const blur = reduced
    ? config.reducedBlurStartPx * pxScale * (1 - reducedProgress)
    : config.blurStartPx * pxScale * (1 - settle);
  const scale = 1 + (config.scaleStart - 1) * (1 - settle);
  const exposure = 1 + (config.exposureStart - 1) * (1 - settle);

  // ── Chromatic edge ───────────────────────────────────────────────────
  const chroma = active && !reduced
    ? config.chromaticAmountPx * pxScale * (1 - at(CHROMA_END))
    : 0;
  const chromaActive = chroma > 0.1;

  const filters: string[] = [];
  if (chromaActive) {
    filters.push(`url(#${CHROMA_FILTER_ID})`);
  }
  if (blur > 0.05) {
    filters.push(`blur(${blur.toFixed(2)}px)`);
  }
  if (Math.abs(exposure - 1) > 0.002) {
    filters.push(`brightness(${exposure.toFixed(4)})`);
  }

  // ── Light sweep ──────────────────────────────────────────────────────
  const sweepP = interpolate(
    frame,
    [Math.round(introFrames * SWEEP_START), Math.round(introFrames * SWEEP_END)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
  );
  const sweepVisible = active && !reduced && config.lightSweep && sweepP > 0 && sweepP < 1;
  // Fade in fast, out slow — the sweep must be exactly gone before handoff.
  const sweepOpacity = config.lightSweepOpacity * Math.sin(Math.PI * sweepP);
  const scanlineFade = interpolate(
    frame,
    [0, Math.max(1, Math.round(introFrames * SCANLINES_END))],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    },
  );
  const scanlinesVisible = active && !reduced && config.scanlines && scanlineFade > 0.001;
  const reducedOpacity = reduced ? 0.72 + 0.28 * reducedProgress : 1;

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        opacity: reducedOpacity,
      }}
    >
      {maskUri ? (
        <AbsoluteFill
          style={{
            background: `
              radial-gradient(ellipse 72% 58% at 50% 40%, color-mix(in oklch, ${themePalette.primary} 48%, ${themePalette.base}) 0%, ${themePalette.base} 58%, ${themePalette.vignette} 100%)`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          transform: scale > 1.0001 ? `scale(${scale.toFixed(5)})` : undefined,
          filter: filters.length > 0 ? filters.join(" ") : undefined,
          maskImage: maskUri ?? undefined,
          WebkitMaskImage: maskUri ?? undefined,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      >
        {children}
      </AbsoluteFill>
      {scanlinesVisible ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: scanlineFade * config.scanlineOpacity,
            backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.72) 0, rgba(255,255,255,0.72) ${config.scanlineThicknessPx * pxScale}px, rgba(0,0,0,0.48) ${config.scanlineThicknessPx * pxScale}px, rgba(0,0,0,0.48) ${config.scanlineSpacingPx * pxScale}px)`,
            backgroundPositionY: `${(frame * 0.7 * pxScale).toFixed(2)}px`,
            mixBlendMode: "soft-light",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {sweepVisible ? (
        <div
          style={{
            position: "absolute",
            top: "-15%",
            bottom: "-15%",
            left: 0,
            width: `${config.lightSweepWidthPct}%`,
            transform: `translateX(${(-100 + 300 * sweepP).toFixed(2)}%) rotate(12deg)`,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,1) 50%, transparent)",
            opacity: sweepOpacity,
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {chromaActive ? (
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter id={CHROMA_FILTER_ID} colorInterpolationFilters="sRGB">
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="r"
              />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="g"
              />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                result="b"
              />
              <feOffset in="r" dx={chroma.toFixed(2)} dy="0" result="ro" />
              <feOffset in="b" dx={(-chroma).toFixed(2)} dy="0" result="bo" />
              <feComposite in="ro" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
              <feComposite in="rg" in2="bo" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
          </defs>
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export { videoIntroConfig } from "./config";
export type { VideoIntroConfig, VideoIntroDirection } from "./config";
