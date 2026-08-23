import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  hookBgContainerStyle,
  hookBgDriftStyle,
  hookBgSweepStyle,
  type HookBgMotionCtx,
} from "./animations";
import {
  parseHookBgTheme,
  type HookBgPalette,
  type HookBgTheme,
} from "./themes";
import type { HookBgConfig } from "./types";

export type HookBgProps = {
  windowStartFrame: number;
  // Supplied by Hook so the background dissolves in sync with the word exit.
  exitProgress: number;
  settings: HookBgConfig;
  // Editorial theme. Falls back to settings.defaultTheme when omitted or
  // unknown — a bad value can never break a render.
  theme?: HookBgTheme;
  // Per-instance overrides merged over `settings`.
  config?: Partial<HookBgConfig>;
  reduced?: boolean;
};

// A premium solid-gradient motion background behind the hook — layered
// colour fields rather than a card:
//   base       → darkest theme tone, carries text contrast
//   primary    → large restrained gradient field, offset top-inline
//   secondary  → softer complementary mass, offset the other way
//   sweep      → one broad diagonal highlight pass during the entrance
//   vignette   → subtle edge darkening for text separation
//
// Two silhouettes (config.shape):
//   "band"    — edge-to-edge horizontal strip, feathered only top and
//               bottom. It reads as a cinematic colour grade across the
//               frame, never as a shape with an outline. (default)
//   "ellipse" — the earlier feathered oval veil.
// Either way it inherits its layout box from Hook's configured Y band and
// always sits under the hook text (Hook renders it at zIndex 0).

// Shape geometry. The band must escape its parent (the hook layout zone is
// only ~86% of the frame wide) to reach the true frame edges; scaling is
// vertical-only there so entrances never reveal a horizontal gap.
const shapeContainerStyle = (
  config: HookBgConfig,
  palette: HookBgPalette,
  basePct: number,
): React.CSSProperties =>
  config.shape === "band"
    ? {
        left: "-12%",
        right: "-12%",
        top: "50%",
        height: `${config.heightPct}%`,
        // Vertical feather only — horizontally the band runs edge to edge.
        // Wide plateau: both hook lines must sit on FULL-strength band, the
        // feather belongs above/below the text, never behind it.
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 17%, black 83%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 17%, black 83%, transparent 100%)",
        // Flat base tone; the mask supplies the falloff.
        background:
          palette.surface === "light"
            ? `radial-gradient(ellipse 36% 120% at 18% 28%, color-mix(in oklch, ${palette.highlight} 48%, transparent), transparent 74%),
               radial-gradient(ellipse 42% 130% at 82% 72%, color-mix(in oklch, ${palette.secondary} 38%, transparent), transparent 76%),
               radial-gradient(ellipse 34% 95% at 68% 4%, color-mix(in oklch, ${palette.accent} 10%, transparent), transparent 68%),
               linear-gradient(112deg, color-mix(in oklch, ${palette.highlight} 70%, transparent) 0%, color-mix(in oklch, ${palette.primary} 62%, transparent) 34%, color-mix(in oklch, ${palette.secondary} 54%, transparent) 68%, color-mix(in oklch, ${palette.base} ${Math.max(64, basePct)}%, transparent) 100%)`
            : `color-mix(in oklch, ${palette.base} ${basePct}%, transparent)`,
      }
    : {
        left: "50%",
        top: "50%",
        width: `${config.widthPct}%`,
        height: `${config.heightPct}%`,
        borderRadius: "50%",
        // Feathered elliptical mask with a wide stable plateau so the veil
        // stays strong under the OUTER words too.
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 0%, black 52%, rgba(0,0,0,0.85) 66%, transparent 88%)",
        maskImage:
          "radial-gradient(ellipse at center, black 0%, black 52%, rgba(0,0,0,0.85) 66%, transparent 88%)",
        background: `radial-gradient(ellipse at center,
          color-mix(in oklch, ${palette.base} ${palette.surface === "light" ? Math.max(90, basePct) : basePct}%, transparent) 0%,
          color-mix(in oklch, ${palette.base} ${Math.round(basePct * 0.85)}%, transparent) 48%,
          color-mix(in oklch, ${palette.base} ${Math.round(basePct * 0.45)}%, transparent) 68%,
          transparent 88%)`,
      };

const vignetteStyle = (
  config: HookBgConfig,
  palette: HookBgPalette,
): React.CSSProperties =>
  config.shape === "band"
    ? {
        // Reinforce the top/bottom feather for text separation.
        background: `linear-gradient(to bottom,
          color-mix(in oklch, ${palette.vignette} 60%, transparent) 0%,
          transparent 26%,
          transparent 74%,
          color-mix(in oklch, ${palette.vignette} 60%, transparent) 100%)`,
      }
    : {
        borderRadius: "50%",
        background: `radial-gradient(ellipse at center,
          transparent 46%,
          color-mix(in oklch, ${palette.vignette} 55%, transparent) 74%,
          ${palette.vignette} 100%)`,
      };

export const HookBg: React.FC<HookBgProps> = ({
  windowStartFrame,
  exitProgress,
  settings,
  theme,
  config: overrides,
  reduced,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const config: HookBgConfig = { ...settings, ...overrides };
  if (!config.enabled) {
    return null;
  }

  const resolvedTheme = parseHookBgTheme(theme) ?? config.defaultTheme;
  const palette =
    config.themes[resolvedTheme] ??
    config.themes[config.defaultTheme];
  const pearl = resolvedTheme === "featured";

  const ctx: HookBgMotionCtx = {
    frame,
    fps,
    pxScale: width / 1080,
    windowStartFrame,
    exitProgress,
    config,
    reduced,
  };

  const basePct = Math.round(
    Math.min(1, Math.max(0, config.baseOpacity)) * 100,
  );
  const backdropFilter =
    config.backdropBlurPx > 0
      ? `blur(${(config.backdropBlurPx * ctx.pxScale).toFixed(2)}px) saturate(0.9)`
      : undefined;
  const fieldRadius = config.shape === "band" ? undefined : "50%";
  const fieldInset = config.shape === "band" ? "-45% -4%" : "-18% -12%";

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        ...shapeContainerStyle(config, palette, basePct),
        WebkitBackdropFilter: backdropFilter,
        backdropFilter,
        ...hookBgContainerStyle(ctx),
      }}
    >
      {/* Primary gradient field — offset top-inline, slow drift. */}
      <div
        style={{
          position: "absolute",
          inset: fieldInset,
          borderRadius: fieldRadius,
          opacity: config.primaryFieldOpacity,
          background: `radial-gradient(ellipse 62% 58% at 31% 26%,
            ${palette.primary} 0%,
            color-mix(in oklch, ${palette.primary} 55%, transparent) 34%,
            transparent 68%)`,
          ...hookBgDriftStyle(ctx, 1),
        }}
      />
      {/* Secondary field — complementary mass offset the other way. */}
      <div
        style={{
          position: "absolute",
          inset: fieldInset,
          borderRadius: fieldRadius,
          opacity: config.secondaryFieldOpacity,
          background: `radial-gradient(ellipse 58% 54% at 73% 78%,
            ${palette.secondary} 0%,
            color-mix(in oklch, ${palette.secondary} 50%, transparent) 36%,
            transparent 70%)`,
          ...hookBgDriftStyle(ctx, -1),
        }}
      />
      {/* Edge vignette — separation without a panel. */}
      {pearl ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(ellipse 48% 115% at 12% 42%, color-mix(in oklch, ${palette.primary} 38%, transparent) 0%, transparent 70%),
              radial-gradient(ellipse 52% 125% at 88% 64%, color-mix(in oklch, ${palette.secondary} 30%, transparent) 0%, transparent 72%),
              linear-gradient(180deg, rgba(255,255,255,0.48) 0%, transparent 18%, transparent 76%, color-mix(in oklch, ${palette.vignette} 16%, transparent) 100%)
            `,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -18px 42px rgba(42,63,88,0.1)",
            mixBlendMode: "soft-light",
            opacity: 0.7,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: config.vignetteOpacity,
          ...vignetteStyle(config, palette),
        }}
      />
      {/* One-pass directional light sweep, entrance only. */}
      {config.lightSweepEnabled ? (
        <div
          style={{
            position: "absolute",
            top: "-30%",
            bottom: "-30%",
            left: 0,
            width: `${config.lightSweepWidthPct}%`,
            background: `linear-gradient(90deg,
              transparent 0%,
              color-mix(in oklch, ${palette.highlight} 65%, transparent) 50%,
              transparent 100%)`,
            mixBlendMode: palette.surface === "light" ? "soft-light" : "screen",
            ...hookBgSweepStyle(ctx),
          }}
        />
      ) : null}
    </div>
  );
};

export {
  HOOK_BG_THEMES,
  hookBgPalettes,
  keywordThemeFor,
  parseHookBgTheme,
  resolveHookBgTheme,
  type HookBgPalette,
  type HookBgTheme,
  type HookBgThemeInput,
} from "./themes";
export type { HookBgConfig, HookBgSettings, HookBgShape } from "./types";
