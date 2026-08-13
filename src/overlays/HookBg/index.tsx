import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  hookBgContainerStyle,
  hookBgDriftStyle,
  hookBgSweepStyle,
  type HookBgMotionCtx,
} from "./animations";
import { parseHookBgTheme, type HookBgTheme } from "./themes";
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
//   base veil  → darkest theme tone, radial falloff, carries text contrast
//   primary    → large restrained gradient field, offset top-inline
//   secondary  → softer complementary mass, offset the other way
//   sweep      → one broad diagonal highlight pass during the entrance
//   vignette   → subtle edge darkening for text separation
// The whole stack lives inside a feathered elliptical mask, so it dissolves
// into the video at every edge — no rectangle, no visible panel. It inherits
// its layout box from Hook's configured Y band and always sits under the
// hook text (Hook renders it at zIndex 0).
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

  const palette =
    config.themes[parseHookBgTheme(theme) ?? config.defaultTheme] ??
    config.themes[config.defaultTheme];

  const ctx: HookBgMotionCtx = {
    frame,
    fps,
    pxScale: width / 1080,
    windowStartFrame,
    exitProgress,
    config,
    reduced,
  };

  const basePct = Math.round(Math.min(1, Math.max(0, config.baseOpacity)) * 100);
  const backdropFilter =
    config.backdropBlurPx > 0
      ? `blur(${(config.backdropBlurPx * ctx.pxScale).toFixed(2)}px) saturate(0.9)`
      : undefined;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${config.widthPct}%`,
        height: `${config.heightPct}%`,
        overflow: "hidden",
        borderRadius: "50%",
        // Feathered elliptical mask — a wide stable plateau so the veil stays
        // strong under the OUTER words too, then a soft dissolve into video.
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 0%, black 52%, rgba(0,0,0,0.85) 66%, transparent 88%)",
        maskImage:
          "radial-gradient(ellipse at center, black 0%, black 52%, rgba(0,0,0,0.85) 66%, transparent 88%)",
        pointerEvents: "none",
        zIndex: 0,
        // Base veil: the darkest, most stable tone of the theme. The plateau
        // extends to ~48% so text at the band edges keeps full contrast.
        background: `radial-gradient(ellipse at center,
          color-mix(in oklch, ${palette.base} ${basePct}%, transparent) 0%,
          color-mix(in oklch, ${palette.base} ${Math.round(basePct * 0.85)}%, transparent) 48%,
          color-mix(in oklch, ${palette.base} ${Math.round(basePct * 0.45)}%, transparent) 68%,
          transparent 88%)`,
        WebkitBackdropFilter: backdropFilter,
        backdropFilter,
        ...hookBgContainerStyle(ctx),
      }}
    >
      {/* Primary gradient field — offset top-inline, slow drift. */}
      <div
        style={{
          position: "absolute",
          inset: "-18% -12%",
          borderRadius: "50%",
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
          inset: "-18% -12%",
          borderRadius: "50%",
          opacity: config.secondaryFieldOpacity,
          background: `radial-gradient(ellipse 58% 54% at 73% 78%,
            ${palette.secondary} 0%,
            color-mix(in oklch, ${palette.secondary} 50%, transparent) 36%,
            transparent 70%)`,
          ...hookBgDriftStyle(ctx, -1),
        }}
      />
      {/* Edge vignette — separation without a panel. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          opacity: config.vignetteOpacity,
          background: `radial-gradient(ellipse at center,
            transparent 46%,
            color-mix(in oklch, ${palette.vignette} 55%, transparent) 74%,
            ${palette.vignette} 100%)`,
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
            mixBlendMode: "screen",
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
export type { HookBgConfig, HookBgSettings } from "./types";
