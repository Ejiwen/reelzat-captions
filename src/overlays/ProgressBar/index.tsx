import React, { useId } from "react";
import {
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { progressBarVisibilityStyle } from "./animations";
import { progressBarConfig, type ProgressBarConfig } from "./config";
import { getProgressBarGeometry, normalizedReelProgress } from "./math";
import type { OverlayWindow } from "../types";
import { captionEnergyConfig } from "../CaptionEnergy/config";
import { hookConfig } from "../Hook/config";
import {
  hookBgPalettes,
  parseHookBgTheme,
  type HookBgTheme,
} from "../HookBg/themes";

export type ProgressBarProps = {
  direction?: "rtl" | "ltr";
  reduced?: boolean;
  config?: Partial<ProgressBarConfig>;
  // Caption windows make the circle physically react when it emits and
  // reabsorbs a caption. Optional, so the component remains reusable.
  interactionWindows?: OverlayWindow[];
  // Uses the same resolved editorial identity as HookBg and captions.
  theme?: HookBgTheme;
  // Keep progress tied to the source reel when the composition has a
  // post-roll outro appended to it.
  progressDurationInFrames?: number;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  direction = "rtl",
  reduced,
  config: overrides,
  interactionWindows = [],
  theme,
  progressDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const gradientId = useId().replaceAll(":", "");
  const config = { ...progressBarConfig, ...overrides };
  const resolvedTheme =
    parseHookBgTheme(theme) ??
    parseHookBgTheme(hookConfig.background.themeOverride) ??
    hookConfig.background.defaultTheme;
  const themePalette = hookBgPalettes[resolvedTheme];

  if (!config.enabled) {
    return null;
  }

  const reelDurationInFrames = progressDurationInFrames ?? durationInFrames;
  const progress = normalizedReelProgress(frame, reelDurationInFrames);
  // Single source of truth for the circle's placement and size — shared with
  // HookEnergyBridge so the energy always originates from the true centre.
  const geometry = getProgressBarGeometry({ width, height, config });
  const { scale, centerX, centerY, ringRadius: radius } = geometry;
  const size = geometry.ringSizePx;
  const logoDiscSize = geometry.logoRadius * 2;
  const trackWidth = config.trackHeightPx * scale;
  const indicatorSize = config.indicatorSizePx * scale;
  const borderWidth = config.indicatorBorderWidthPx * scale;
  const center = size / 2;
  const circumference = Math.PI * 2 * radius;
  const angle = (-90 + progress * 360) * (Math.PI / 180);
  const indicatorX = center + radius * Math.cos(angle);
  const indicatorY = center + radius * Math.sin(angle);
  const animatedLogoDurationFrames = Math.max(
    1,
    Math.round(config.animatedLogoDurationSeconds * fps),
  );
  const logoTransitionFrames = Math.max(
    1,
    Math.round(config.logoTransitionFrames * (fps / 30)),
  );
  const logoTransitionStart = Math.max(
    0,
    animatedLogoDurationFrames - logoTransitionFrames,
  );
  const staticLogoOpacity = interpolate(
    frame,
    [logoTransitionStart, animatedLogoDurationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const animatedLogoOpacity = 1 - staticLogoOpacity;
  const visibility = progressBarVisibilityStyle({
    frame,
    durationInFrames: reelDurationInFrames,
    fps,
    config,
    reduced,
  });
  const pulseFrames = Math.max(
    2,
    Math.round((captionEnergyConfig.circlePulseFrames / 30) * fps),
  );
  const pulse = reduced
    ? 0
    : interactionWindows.reduce((strongest, window) => {
        const entry = interpolate(
          frame,
          [window.startFrame, window.startFrame + pulseFrames * 0.38, window.startFrame + pulseFrames],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const exitStart = window.endFrame - pulseFrames;
        const exit = interpolate(
          frame,
          [exitStart, exitStart + pulseFrames * 0.62, window.endFrame],
          [0, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        return Math.max(strongest, entry, exit);
      }, 0);
  const reactionScale = 1 + pulse * (captionEnergyConfig.circlePulseScale - 1);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        zIndex: 1,
        left: centerX - center,
        top: centerY - center,
        width: size,
        height: size,
        pointerEvents: "none",
        transformOrigin: "center",
        ...visibility,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${reactionScale.toFixed(4)})`,
          transformOrigin: "center",
        }}
      >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: logoDiscSize,
          height: logoDiscSize,
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "50%",
          background: `
            radial-gradient(circle at 34% 24%, color-mix(in oklch, ${themePalette.highlight} 24%, transparent) 0%, transparent 42%),
            radial-gradient(circle at 76% 82%, color-mix(in oklch, ${themePalette.secondary} 58%, transparent) 0%, transparent 60%),
            linear-gradient(145deg, ${themePalette.primary} 0%, ${themePalette.base} 58%, ${themePalette.vignette} 100%)`,
          boxShadow: `
            inset 0 1px 0 color-mix(in oklch, ${themePalette.highlight} 32%, transparent),
            inset 0 0 ${24 * scale}px color-mix(in oklch, ${themePalette.vignette} 72%, transparent),
            0 0 ${18 * scale}px color-mix(in oklch, ${themePalette.primary} 24%, transparent)`,
        }}
      >
        <Img
          src={staticFile(config.staticLogoSrc)}
          style={{
            position: "absolute",
            width: `${config.logoSizePct}%`,
            height: `${config.logoSizePct}%`,
            objectFit: "contain",
            opacity: staticLogoOpacity,
            // Logo media is authored over black. Screen blending preserves
            // its white/gold strokes while revealing the editorial theme
            // gradient underneath instead of showing a black square.
            mixBlendMode: "screen",
          }}
        />
        <Sequence durationInFrames={animatedLogoDurationFrames} layout="none">
          <OffthreadVideo
            src={staticFile(config.animatedLogoSrc)}
            muted
            pauseWhenBuffering
            style={{
              position: "absolute",
              width: `${config.logoSizePct}%`,
              height: `${config.logoSizePct}%`,
              objectFit: "contain",
              opacity: animatedLogoOpacity,
              mixBlendMode: "screen",
            }}
          />
        </Sequence>
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={config.fillColorStart} />
            <stop offset="100%" stopColor={config.fillColorEnd} />
          </linearGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={config.trackColor}
          strokeOpacity={config.trackOpacity}
          strokeWidth={trackWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={trackWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress * circumference} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            filter: `drop-shadow(0 0 ${4 * scale}px color-mix(in oklch, ${config.fillColorEnd} 48%, transparent))`,
          }}
        />

        <circle
          cx={indicatorX}
          cy={indicatorY}
          r={indicatorSize / 2}
          fill={config.indicatorColor}
          stroke={config.indicatorBorderColor}
          strokeWidth={borderWidth}
          style={{
            filter: `drop-shadow(0 0 ${8 * scale}px color-mix(in oklch, ${config.indicatorGlowColor} ${Math.round(Math.min(1, Math.max(0, config.indicatorGlowOpacity)) * 100)}%, transparent))`,
          }}
        />
      </svg>
      </div>
      {pulse > 0.002 ? (
        <div
          style={{
            position: "absolute",
            inset: -18 * scale,
            borderRadius: "50%",
            border: `${Math.max(2, 4 * scale)}px solid color-mix(in oklch, ${config.indicatorColor} 82%, ${config.fillColorEnd})`,
            boxShadow: `0 0 ${30 * scale}px ${10 * scale}px color-mix(in oklch, ${config.indicatorColor} 62%, transparent)`,
            opacity: pulse * captionEnergyConfig.circlePulseGlowOpacity,
            transform: `scale(${(0.9 + pulse * 0.22).toFixed(4)})`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </div>
  );
};

export { progressBarConfig, type ProgressBarConfig } from "./config";
export {
  facebookSafeRegionBottomPct,
  facebookSafeRegionBottomPx,
  facebookSafeRegionTopPct,
  facebookSafeRegionTopPx,
  normalizedReelProgress,
} from "./math";
