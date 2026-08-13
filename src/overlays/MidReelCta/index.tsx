import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily, fontWeights } from "../../design/fonts";
import { palette } from "../../design/tokens";
import { hookBgPalettes, type HookBgTheme } from "../HookBg/themes";
import { progressBarConfig } from "../ProgressBar/config";
import { getProgressBarGeometry } from "../ProgressBar/math";
import type { OverlayWindow } from "../types";
import { midReelCtaConfig, type MidReelCtaConfig } from "./config";

export type MidReelCtaProps = {
  window: OverlayWindow;
  theme: HookBgTheme;
  reduced?: boolean;
  config?: Partial<MidReelCtaConfig>;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const MidReelCta: React.FC<MidReelCtaProps> = ({
  window,
  theme,
  reduced = false,
  config: overrides,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...midReelCtaConfig, ...overrides };

  if (
    !config.enabled ||
    frame < window.startFrame ||
    frame >= window.endFrame
  ) {
    return null;
  }

  const localFrame = frame - window.startFrame;
  const duration = window.endFrame - window.startFrame;
  const scale = width / 1080;
  const geometry = getProgressBarGeometry({
    width,
    height,
    config: progressBarConfig,
  });
  const colors = hookBgPalettes[theme];

  // A long, staged return: typography sinks first, the branches follow, and
  // the ambient ring is the last energy to settle. Every phase reaches zero
  // before the component window ends, avoiding a last-frame disappearance.
  const exitFrames = Math.max(42, Math.round(fps * 1.75));
  const exitStart = duration - exitFrames;
  const exitEase = Easing.inOut(Easing.cubic);
  const textExitDuration = Math.round(fps * 1.14);
  const leftTextExit = interpolate(
    localFrame,
    [exitStart, exitStart + textExitDuration],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: exitEase,
    },
  );
  const rightTextExit = interpolate(
    localFrame,
    [
      exitStart + Math.round(fps * 0.08),
      exitStart + textExitDuration + Math.round(fps * 0.08),
    ],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: exitEase,
    },
  );
  const lineExit = interpolate(
    localFrame,
    [exitStart + Math.round(fps * 0.48), duration - Math.round(fps * 0.12)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: exitEase,
    },
  );
  const pulseExit = interpolate(
    localFrame,
    [exitStart + Math.round(fps * 0.78), duration - 1],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: exitEase,
    },
  );

  const ignition = reduced
    ? interpolate(localFrame, [0, 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : spring({
        frame: localFrame,
        fps,
        config: { damping: 16, mass: 0.62, stiffness: 150 },
      });
  const branchIn = reduced
    ? ignition
    : spring({
        frame: localFrame - Math.round(fps * 0.16),
        fps,
        config: { damping: 19, mass: 0.72, stiffness: 112 },
      });
  const textEntrance = (delaySeconds: number) =>
    reduced
      ? interpolate(localFrame, [8, 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : spring({
          frame: localFrame - Math.round(fps * delaySeconds),
          fps,
          config: { damping: 19, mass: 0.64, stiffness: 118 },
        });

  const rightTextIn = textEntrance(0.58);
  const leftTextIn = textEntrance(0.72);
  const lineProgress = clamp01(branchIn) * (1 - lineExit);
  const rightTextProgress = clamp01(rightTextIn) * (1 - rightTextExit);
  const leftTextProgress = clamp01(leftTextIn) * (1 - leftTextExit);
  const pulseProgress = clamp01(ignition) * (1 - pulseExit);

  const lineReach = config.lineReachPx * scale;
  const branchLength = config.branchLengthPx * scale;
  const clearance = config.circleClearancePx * scale;
  // The line crosses the exact optical centre of the circle. MidReelCta is
  // rendered before ProgressBar, so the logo disc naturally masks its centre
  // and the line reads as one continuous path passing behind it.
  const lineY = Math.round(geometry.centerY);
  const rightStart = Math.round(geometry.centerX + clearance);
  const leftStart = Math.round(geometry.centerX - clearance);
  const lineHeight = Math.max(2, Math.round(2.4 * scale));
  const textY = Math.round(lineY - config.textOffsetPx * scale);
  const fontSize = Math.round(config.fontSizePx * scale);
  const shimmerX = interpolate(localFrame, [0, duration], [-24, 124], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: lineY - lineHeight / 2,
    left: side === "right" ? geometry.centerX : geometry.centerX - lineReach,
    width: lineReach,
    height: lineHeight,
    borderRadius: 999,
    transform: `scaleX(${lineProgress})`,
    transformOrigin: side === "right" ? "left center" : "right center",
    background:
      side === "right"
        ? `linear-gradient(90deg, ${colors.highlight}, ${colors.primary} 72%, transparent)`
        : `linear-gradient(270deg, ${colors.highlight}, ${colors.primary} 72%, transparent)`,
    boxShadow: `0 0 ${12 * scale}px ${colors.highlight}77`,
    opacity: 0.9,
    overflow: "hidden",
  });

  const textMaskStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: textY,
    left: side === "right" ? rightStart : leftStart - branchLength,
    width: branchLength,
    height: config.textOffsetPx * scale,
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  });

  const textInnerStyle = (textProgress: number): React.CSSProperties => {
    const readableOpacity = interpolate(
      textProgress,
      [0, 0.22, 1],
      [0, 0.82, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    const riseY = (1 - textProgress) * config.textOffsetPx * 1.04 * scale;
    const glowPulse =
      0.84 + Math.sin((localFrame / fps) * Math.PI * 1.35) * 0.16;

    return {
      paddingBottom: Math.round(7 * scale),
      direction: "rtl",
      whiteSpace: "nowrap",
      color: palette.ink,
      fontFamily,
      fontWeight: fontWeights.black,
      fontSize,
      lineHeight: 1.35,
      letterSpacing: 0,
      textShadow: `0 2px ${8 * scale}px rgba(0,0,0,.84), 0 0 ${14 * glowPulse * scale}px ${colors.highlight}88, 0 0 ${22 * scale}px ${colors.base}`,
      opacity: readableOpacity,
      transform: `translateY(${riseY}px)`,
      transformOrigin: "bottom center",
    };
  };

  const textEdgeGlowStyle = (
    side: "left" | "right",
    progress: number,
  ): React.CSSProperties => ({
    position: "absolute",
    top: lineY - Math.max(2, 2.4 * scale),
    left: side === "right" ? rightStart : leftStart - branchLength,
    width: branchLength,
    height: Math.max(3, 3 * scale),
    borderRadius: 999,
    background: `linear-gradient(90deg, transparent, ${colors.highlight}, transparent)`,
    filter: `blur(${1.3 * scale}px)`,
    opacity: Math.sin(progress * Math.PI) * 0.72,
    transform: `scaleX(${0.3 + progress * 0.7})`,
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 0 }}>
      {(["left", "right"] as const).map((side) => (
        <div key={side} style={lineStyle(side)}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "22%",
              left: `${shimmerX}%`,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)",
              filter: `blur(${1.4 * scale}px)`,
            }}
          />
        </div>
      ))}

      <div style={textEdgeGlowStyle("right", rightTextProgress)} />
      <div style={textEdgeGlowStyle("left", leftTextProgress)} />

      <div style={textMaskStyle("right")}>
        <div style={textInnerStyle(rightTextProgress)}>استمع للحلقة</div>
      </div>
      <div style={textMaskStyle("left")}>
        <div style={textInnerStyle(leftTextProgress)}>على وازن شنقيط</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: geometry.centerX - 92 * scale,
          top: lineY - 92 * scale,
          width: 184 * scale,
          height: 184 * scale,
          borderRadius: "50%",
          border: `${Math.max(1, scale)}px solid ${colors.highlight}`,
          boxShadow: `0 0 ${24 * scale}px ${colors.primary}66`,
          opacity: pulseProgress * 0.34,
          transform: `scale(${0.82 + pulseProgress * 0.18})`,
        }}
      />
    </AbsoluteFill>
  );
};

export { midReelCtaConfig } from "./config";
export { findMidReelCtaWindow } from "./math";
