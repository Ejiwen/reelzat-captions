import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { palette } from "../../design/tokens";
import { hookBgMotionStyle } from "./animations";
import type { HookBgSettings } from "./types";

export type HookBgProps = {
  windowStartFrame: number;
  exitProgress: number;
  settings: HookBgSettings;
  reduced?: boolean;
};

const clampPct = (value: number): number => Math.min(100, Math.max(0, value));

// A cinematic focus veil rather than a visible card: it locally lowers video
// contrast, adds a restrained gold centre glow, and dissolves at every edge.
// It inherits its layout box from Hook's configured Y band.
export const HookBg: React.FC<HookBgProps> = ({
  windowStartFrame,
  exitProgress,
  settings,
  reduced,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!settings.enabled) {
    return null;
  }

  const navyOpacity = clampPct(settings.navyOpacityPct);
  const goldOpacity = clampPct(settings.goldGlowOpacityPct);
  const backdropFilter =
    settings.backdropBlurPx > 0
      ? `blur(${settings.backdropBlurPx}px) saturate(0.88)`
      : undefined;
  const motionStyle = hookBgMotionStyle({
    frame,
    fps,
    windowStartFrame,
    exitProgress,
    settings,
    reduced,
  });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${settings.widthPct}%`,
        height: `${settings.heightPct}%`,
        overflow: "hidden",
        borderRadius: "50%",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, black 0%, black 38%, rgba(0,0,0,0.82) 52%, transparent 82%)",
        maskImage:
          "radial-gradient(ellipse at center, black 0%, black 38%, rgba(0,0,0,0.82) 52%, transparent 82%)",
        pointerEvents: "none",
        zIndex: 0,
        background: `radial-gradient(ellipse at center,
          color-mix(in oklch, ${palette.navy} ${navyOpacity}%, transparent) 0%,
          color-mix(in oklch, ${palette.navy} ${Math.round(navyOpacity * 0.72)}%, transparent) 42%,
          color-mix(in oklch, ${palette.navy} ${Math.round(navyOpacity * 0.3)}%, transparent) 64%,
          transparent 82%)`,
        WebkitBackdropFilter: backdropFilter,
        backdropFilter,
        ...motionStyle,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "12% 9%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center,
            color-mix(in oklch, ${palette.gold} ${goldOpacity}%, transparent) 0%,
            color-mix(in oklch, ${palette.gold} ${Math.round(goldOpacity * 0.38)}%, transparent) 38%,
            transparent 72%)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};

export type { HookBgSettings } from "./types";
