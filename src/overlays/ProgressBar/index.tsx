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

export type ProgressBarProps = {
  direction?: "rtl" | "ltr";
  reduced?: boolean;
  config?: Partial<ProgressBarConfig>;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  direction = "rtl",
  reduced,
  config: overrides,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const gradientId = useId().replaceAll(":", "");
  const config = { ...progressBarConfig, ...overrides };

  if (!config.enabled) {
    return null;
  }

  const progress = normalizedReelProgress(frame, durationInFrames);
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
    durationInFrames,
    fps,
    config,
    reduced,
  });

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
          background: `color-mix(in oklch, ${config.backgroundColor} ${Math.round(Math.min(1, Math.max(0, config.backgroundOpacity)) * 100)}%, transparent)`,
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
